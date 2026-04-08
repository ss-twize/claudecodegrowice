-- =============================================================================
-- Миграция: таблица контактов сотрудников + автообновление при сообщениях
-- -----------------------------------------------------------------------------
-- Проблема: masters синхронизируется из YClients и перезаписывается;
--           нет таблицы для хранения Telegram/WA/Max идентификаторов
--           сотрудников; OWNER_WA_ID в n8n нигде не хранится.
--
-- Решение: отдельная таблица staff_contacts, не зависящая от YC-синхронизации.
--   - Хранит tg_id, tg_username, wa_id, max_id для каждого сотрудника
--   - Может быть привязана к masters через master_id (nullable)
--   - Автообновляется при каждом входящем сообщении (через RPC из n8n)
--   - Роли: owner | admin | master | staff
--
-- Дополнительно: добавляем phone/email в masters (приходят из YClients)
-- =============================================================================


-- =============================================================================
-- 1. Добавить phone и email в masters (данные из YClients)
-- =============================================================================
ALTER TABLE public.masters
  ADD COLUMN IF NOT EXISTS phone   TEXT,
  ADD COLUMN IF NOT EXISTS email   TEXT;

COMMENT ON COLUMN public.masters.phone IS 'Телефон из YClients';
COMMENT ON COLUMN public.masters.email IS 'Email из YClients';


-- =============================================================================
-- 2. Таблица контактов сотрудников
--    Не зависит от YC-синхронизации. Обновляется вручную или автоматически
--    при входящих сообщениях.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.staff_contacts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid     UUID        NOT NULL,
  master_id   UUID        REFERENCES public.masters(id) ON DELETE SET NULL,

  -- Идентификация
  name        TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'master'
                CHECK (role IN ('owner','admin','master','staff')),
  is_active   BOOLEAN     NOT NULL DEFAULT true,

  -- Telegram
  tg_id       BIGINT,                 -- числовой Telegram user_id
  tg_username TEXT,                   -- @handle без @, автообновляется

  -- WhatsApp (GREEN-API формат: phone@c.us)
  wa_id       TEXT,

  -- Max
  max_id      TEXT,

  -- Телефон и email (могут браться из masters.phone/email)
  phone       TEXT,
  email       TEXT,

  -- Произвольные заметки (для ручного ввода)
  notes       TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Уникальность по каналам внутри организации
  CONSTRAINT uq_staff_tg   UNIQUE (org_uid, tg_id),
  CONSTRAINT uq_staff_wa   UNIQUE (org_uid, wa_id),
  CONSTRAINT uq_staff_max  UNIQUE (org_uid, max_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_contacts_org
  ON public.staff_contacts (org_uid, role, is_active);

CREATE INDEX IF NOT EXISTS idx_staff_contacts_tg_id
  ON public.staff_contacts (tg_id)
  WHERE tg_id IS NOT NULL;

COMMENT ON TABLE public.staff_contacts IS
  'Контакты сотрудников (владелец, администратор, мастер). '
  'Независима от YC-синхронизации. Источник данных для OWNER_WA_ID, уведомлений и т.д.';

COMMENT ON COLUMN public.staff_contacts.tg_id       IS 'Числовой Telegram user_id (автообновляется)';
COMMENT ON COLUMN public.staff_contacts.tg_username IS '@handle в Telegram (автообновляется при каждом сообщении)';
COMMENT ON COLUMN public.staff_contacts.wa_id       IS 'WhatsApp ID в формате 79161234567@c.us';
COMMENT ON COLUMN public.staff_contacts.max_id      IS 'Max messenger user_id';


-- =============================================================================
-- 3. RPC: обновить контакт сотрудника при входящем сообщении
--    Вызывается из n8n параллельно с upsert_channel_user_profile.
--    Возвращает JSONB с флагом is_staff и данными сотрудника.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_staff_contact_on_message(
  p_channel    TEXT,       -- 'telegram' | 'whatsapp' | 'max'
  p_org_uid    UUID,
  p_user_id    TEXT,       -- числовой строкой для TG, phone@c.us для WA, text для Max
  p_first_name TEXT DEFAULT NULL,
  p_last_name  TEXT DEFAULT NULL,
  p_username   TEXT DEFAULT NULL   -- @handle для Telegram
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_staff      RECORD;
  v_first      TEXT := NULLIF(TRIM(COALESCE(p_first_name, '')), '');
  v_last       TEXT := NULLIF(TRIM(COALESCE(p_last_name,  '')), '');
  v_username   TEXT := NULLIF(TRIM(COALESCE(p_username,   '')), '');
BEGIN
  -- ── Поиск сотрудника по каналу ───────────────────────────────────────────
  IF p_channel = 'telegram' THEN
    SELECT * INTO v_staff
    FROM public.staff_contacts
    WHERE org_uid = p_org_uid
      AND tg_id   = p_user_id::BIGINT
      AND is_active = true
    LIMIT 1;

  ELSIF p_channel = 'whatsapp' THEN
    SELECT * INTO v_staff
    FROM public.staff_contacts
    WHERE org_uid = p_org_uid
      AND wa_id   = p_user_id
      AND is_active = true
    LIMIT 1;

  ELSIF p_channel = 'max' THEN
    SELECT * INTO v_staff
    FROM public.staff_contacts
    WHERE org_uid = p_org_uid
      AND max_id  = p_user_id
      AND is_active = true
    LIMIT 1;
  END IF;

  -- ── Сотрудник не найден ───────────────────────────────────────────────────
  IF NOT FOUND THEN
    RETURN jsonb_build_object('is_staff', false);
  END IF;

  -- ── Сотрудник найден — обновляем контактные данные ───────────────────────
  UPDATE public.staff_contacts SET
    -- tg_username обновляем всегда если пришло непустое значение
    tg_username = CASE
      WHEN p_channel = 'telegram' AND v_username IS NOT NULL
        THEN v_username
      ELSE tg_username
    END,
    -- Имя: обновляем только если пришло непустое и текущее NULL
    name = CASE
      WHEN (v_first IS NOT NULL OR v_last IS NOT NULL)
           AND name = id::text   -- name не было задано осмысленно
        THEN TRIM(COALESCE(v_first,'') || ' ' || COALESCE(v_last,''))
      ELSE name
    END,
    -- Подставляем tg_id если ещё не был задан (связь по wa→tg или max→tg невозможна,
    -- но если пришёл Telegram — фиксируем ID)
    tg_id = CASE
      WHEN p_channel = 'telegram' AND tg_id IS NULL
        THEN p_user_id::BIGINT
      ELSE tg_id
    END,
    updated_at = NOW()
  WHERE id = v_staff.id;

  -- ── Также обновляем masters если привязан ────────────────────────────────
  IF v_staff.master_id IS NOT NULL AND p_channel = 'telegram' THEN
    -- masters не имеет tg_username, но можно добавить в notes или просто
    -- обновить updated_at для сигнала что мастер активен
    UPDATE public.masters
    SET updated_at = NOW()
    WHERE id = v_staff.master_id;
  END IF;

  RETURN jsonb_build_object(
    'is_staff',     true,
    'staff_id',     v_staff.id,
    'role',         v_staff.role,
    'name',         v_staff.name,
    'master_id',    v_staff.master_id,
    'tg_username',  COALESCE(v_username, v_staff.tg_username)
  );
END;
$$;


-- =============================================================================
-- 4. Триггер: автоматический updated_at на staff_contacts
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at_staff_contacts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_contacts_updated_at ON public.staff_contacts;
CREATE TRIGGER trg_staff_contacts_updated_at
BEFORE UPDATE ON public.staff_contacts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_staff_contacts();


-- =============================================================================
-- 5. View: активные сотрудники с данными из masters (для дашборда)
-- =============================================================================
CREATE OR REPLACE VIEW public.v_staff_with_master AS
SELECT
  sc.id,
  sc.org_uid,
  sc.master_id,
  sc.name,
  sc.role,
  sc.is_active,
  sc.tg_id,
  sc.tg_username,
  sc.wa_id,
  sc.max_id,
  sc.phone,
  sc.email,
  sc.notes,
  sc.updated_at          AS contact_updated_at,
  -- Данные из masters
  m.yc_id                AS master_yc_id,
  m.specialization,
  m.bookable,
  m.fired,
  m.avatar,
  m.rating
FROM public.staff_contacts sc
LEFT JOIN public.masters m ON m.id = sc.master_id
WHERE sc.is_active = true;

COMMENT ON VIEW public.v_staff_with_master IS
  'Активные сотрудники с объединёнными данными из staff_contacts и masters';


-- =============================================================================
-- 6. RLS на staff_contacts
-- =============================================================================
ALTER TABLE public.staff_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_staff_contacts" ON public.staff_contacts;
CREATE POLICY "service_role_all_staff_contacts" ON public.staff_contacts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_read_own_org_staff" ON public.staff_contacts;
CREATE POLICY "anon_read_own_org_staff" ON public.staff_contacts
  FOR SELECT TO anon USING (true);
