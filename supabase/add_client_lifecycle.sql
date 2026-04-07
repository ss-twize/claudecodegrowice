-- =============================================================================
-- Миграция: модель жизненного цикла клиента
-- -----------------------------------------------------------------------------
-- Цель: разделить понятия "лид" и "клиент", добавить источник канала,
--       исправить типы данных и убрать некорректные NOT NULL ограничения.
--
-- Ключевые правила:
--   - clients = бизнес-клиенты (могут быть лидами до первой записи)
--   - telegram_users / whatsapp_users / max_users = контакты в каналах
--   - client_channels = канонические связи клиента с каналами
--   - Главный идентификатор: clients.id (UUID), не yc_id
--   - lifecycle_status: 'lead' → первый контакт без записи
--                        'client' → есть хотя бы одна запись в YClients
--                        'inactive' → явно деактивирован
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Добавить lifecycle_status в clients
--    (отдельно от clientStatus в frontend — тот вычисляемый из revenue/visits)
-- -----------------------------------------------------------------------------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT
    NOT NULL DEFAULT 'lead'
    CHECK (lifecycle_status IN ('lead', 'client', 'inactive'));

-- Backfill: если есть yc_id — это клиент, иначе лид
UPDATE public.clients
SET lifecycle_status = 'client'
WHERE (yc_id IS NOT NULL AND yc_id <> '')
   OR (yclients_id IS NOT NULL);

-- -----------------------------------------------------------------------------
-- 2. Добавить source_channel — из какого канала клиент пришёл впервые
-- -----------------------------------------------------------------------------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS source_channel TEXT
    CHECK (source_channel IN ('telegram', 'whatsapp', 'max', 'yclients', 'manual'));

-- Backfill по наличию *_user_id (приоритет: telegram > whatsapp > max > yclients)
UPDATE public.clients
SET source_channel = CASE
  WHEN telegram_user_id IS NOT NULL THEN 'telegram'
  WHEN whatsapp_user_id IS NOT NULL THEN 'whatsapp'
  WHEN max_user_id IS NOT NULL THEN 'max'
  WHEN yc_id IS NOT NULL OR yclients_id IS NOT NULL THEN 'yclients'
  ELSE 'manual'
END
WHERE source_channel IS NULL;

-- -----------------------------------------------------------------------------
-- 3. Убрать некорректные NOT NULL ограничения в clients
-- -----------------------------------------------------------------------------
-- last_visit должен быть nullable: новый клиент/лид может не иметь визитов
ALTER TABLE public.clients
  ALTER COLUMN last_visit DROP NOT NULL;

-- raw_payload nullable: не все клиенты приходят из YClients API
ALTER TABLE public.clients
  ALTER COLUMN raw_payload DROP NOT NULL;

-- updated_at nullable: часть записей создана до появления этой колонки
ALTER TABLE public.clients
  ALTER COLUMN updated_at DROP NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. Исправить тип telegram_users.blocked: TEXT → BOOLEAN
-- -----------------------------------------------------------------------------
-- Шаг 4.1: добавить временную колонку
ALTER TABLE public.telegram_users
  ADD COLUMN IF NOT EXISTS blocked_bool BOOLEAN DEFAULT FALSE;

-- Шаг 4.2: мигрировать данные
UPDATE public.telegram_users
SET blocked_bool = CASE
  WHEN LOWER(TRIM(COALESCE(blocked, ''))) IN ('true', '1', 'yes', 'да', 'y') THEN TRUE
  ELSE FALSE
END;

-- Шаг 4.3: удалить старую TEXT колонку и переименовать
ALTER TABLE public.telegram_users DROP COLUMN IF EXISTS blocked;
ALTER TABLE public.telegram_users RENAME COLUMN blocked_bool TO blocked;

-- whatsapp_users и max_users уже имеют BOOLEAN — проверочный ALTER (идемпотентен):
-- ничего не делаем

-- -----------------------------------------------------------------------------
-- 5. Индексы для lifecycle_status и source_channel
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clients_lifecycle ON public.clients (org_uid, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_clients_source_channel ON public.clients (org_uid, source_channel);

-- -----------------------------------------------------------------------------
-- 6. Обновить trigger sync_user_to_clients_by_yc_id
--    Теперь создаёт лидов даже без yc_id (если есть хотя бы имя или телефон)
--    и выставляет lifecycle_status корректно.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_user_to_clients_by_yc_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_uid        UUID    := COALESCE(NEW.org_uid, '11111111-1111-1111-1111-111111111111'::uuid);
  v_channel        TEXT;
  v_priority       INTEGER;
  v_yc_id          TEXT;
  v_yclients_id    BIGINT;
  v_fullname       TEXT;
  v_name           TEXT;
  v_surname        TEXT;
  v_phone          TEXT;
  v_client_id      UUID;
  v_lifecycle      TEXT;
  v_telegram_user_id  BIGINT;
  v_whatsapp_user_id  TEXT;
  v_max_user_id       TEXT;
BEGIN
  v_yc_id       := NULLIF(BTRIM(COALESCE(NEW.yc_id, '')), '');
  v_yclients_id := NEW.yclients_id;

  IF v_yc_id IS NULL AND v_yclients_id IS NOT NULL THEN
    v_yc_id := v_yclients_id::text;
  END IF;

  -- lifecycle: 'client' если есть yc_id, иначе 'lead'
  v_lifecycle := CASE WHEN v_yc_id IS NOT NULL THEN 'client' ELSE 'lead' END;

  -- Имя и телефон
  v_name    := NULLIF(BTRIM(COALESCE(NEW.first_name, '')), '');
  v_surname := NULLIF(BTRIM(COALESCE(NEW.last_name, '')), '');
  v_fullname := NULLIF(BTRIM(COALESCE(NEW.client_fullname, '')), '');
  v_phone   := NULLIF(BTRIM(COALESCE(NEW.client_phone, '')), '');

  IF v_fullname IS NULL THEN
    v_fullname := NULLIF(CONCAT_WS(' ', v_name, v_surname), '');
  END IF;

  -- Для WhatsApp user_id обычно уже является номером телефона
  IF v_phone IS NULL AND TG_TABLE_NAME = 'whatsapp_users' THEN
    v_phone := NULLIF(BTRIM(COALESCE(NEW.user_id::text, '')), '');
  END IF;

  -- Без yc_id и без имени/телефона создавать лида не имеет смысла
  IF v_yc_id IS NULL AND v_fullname IS NULL AND v_phone IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_fullname IS NULL THEN
    v_fullname := COALESCE('Клиент ' || v_yc_id, 'Лид ' || COALESCE(v_phone, NEW.user_id::text));
  END IF;

  v_channel := CASE TG_TABLE_NAME
    WHEN 'telegram_users' THEN 'telegram'
    WHEN 'whatsapp_users' THEN 'whatsapp'
    WHEN 'max_users'      THEN 'max'
    ELSE NULL
  END;

  v_priority := CASE v_channel
    WHEN 'telegram'  THEN 1
    WHEN 'whatsapp'  THEN 2
    WHEN 'max'       THEN 3
    ELSE 99
  END;

  v_telegram_user_id := CASE WHEN TG_TABLE_NAME = 'telegram_users' THEN NEW.user_id::bigint ELSE NULL END;
  v_whatsapp_user_id := CASE WHEN TG_TABLE_NAME = 'whatsapp_users' THEN NEW.user_id::text   ELSE NULL END;
  v_max_user_id      := CASE WHEN TG_TABLE_NAME = 'max_users'      THEN NEW.user_id::text   ELSE NULL END;

  IF v_yc_id IS NOT NULL THEN
    -- Клиент с yc_id: upsert по (org_uid, yc_id)
    INSERT INTO public.clients (
      org_uid, yc_id, yclients_id, fullname, display_name, name, surname, phone,
      telegram_user_id, whatsapp_user_id, max_user_id,
      lifecycle_status, source_channel
    )
    VALUES (
      v_org_uid, v_yc_id, v_yclients_id, v_fullname, v_fullname, v_name, v_surname, v_phone,
      v_telegram_user_id, v_whatsapp_user_id, v_max_user_id,
      'client', v_channel
    )
    ON CONFLICT (org_uid, yc_id)
    DO UPDATE SET
      yclients_id       = COALESCE(EXCLUDED.yclients_id, public.clients.yclients_id),
      fullname          = COALESCE(NULLIF(public.clients.fullname, ''), EXCLUDED.fullname),
      display_name      = COALESCE(NULLIF(public.clients.display_name, ''), EXCLUDED.display_name),
      name              = COALESCE(NULLIF(public.clients.name, ''), EXCLUDED.name),
      surname           = COALESCE(NULLIF(public.clients.surname, ''), EXCLUDED.surname),
      phone             = COALESCE(NULLIF(public.clients.phone, ''), EXCLUDED.phone),
      telegram_user_id  = COALESCE(public.clients.telegram_user_id, EXCLUDED.telegram_user_id),
      whatsapp_user_id  = COALESCE(public.clients.whatsapp_user_id, EXCLUDED.whatsapp_user_id),
      max_user_id       = COALESCE(public.clients.max_user_id, EXCLUDED.max_user_id),
      lifecycle_status  = 'client'   -- как только появился yc_id — клиент
    RETURNING id INTO v_client_id;

  ELSE
    -- Лид без yc_id: ищем по *_user_id + org_uid, чтобы не дублировать
    DECLARE
      v_uid_col TEXT := CASE TG_TABLE_NAME
        WHEN 'telegram_users' THEN 'telegram_user_id'
        WHEN 'whatsapp_users' THEN 'whatsapp_user_id'
        WHEN 'max_users'      THEN 'max_user_id'
      END;
    BEGIN
      -- Попытка найти существующий лид по channel user_id
      EXECUTE format(
        'SELECT id FROM public.clients WHERE org_uid = $1 AND %I = $2 LIMIT 1',
        v_uid_col
      ) USING v_org_uid, NEW.user_id::text INTO v_client_id;

      IF v_client_id IS NULL THEN
        INSERT INTO public.clients (
          org_uid, fullname, display_name, name, surname, phone,
          telegram_user_id, whatsapp_user_id, max_user_id,
          lifecycle_status, source_channel
        )
        VALUES (
          v_org_uid, v_fullname, v_fullname, v_name, v_surname, v_phone,
          v_telegram_user_id, v_whatsapp_user_id, v_max_user_id,
          'lead', v_channel
        )
        RETURNING id INTO v_client_id;
      END IF;
    END;
  END IF;

  NEW.client_id := v_client_id;

  IF v_channel IS NOT NULL AND v_client_id IS NOT NULL THEN
    INSERT INTO public.client_channels (
      client_id, channel, channel_user_id, priority, is_active, can_notify, identified_via
    )
    VALUES (
      v_client_id, v_channel, NEW.user_id::text, v_priority,
      true, COALESCE(NEW.can_message, true), 'self_reported'
    )
    ON CONFLICT (client_id, channel)
    DO UPDATE SET
      channel_user_id = EXCLUDED.channel_user_id,
      is_active       = true,
      can_notify      = EXCLUDED.can_notify,
      updated_at      = NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Пересоздаём триггеры (логика та же, просто функция обновлена выше)
DROP TRIGGER IF EXISTS tg_sync_user_to_clients ON public.telegram_users;
CREATE TRIGGER tg_sync_user_to_clients
BEFORE INSERT OR UPDATE OF yc_id, yclients_id, client_fullname, client_phone, first_name, last_name, user_id
ON public.telegram_users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_to_clients_by_yc_id();

DROP TRIGGER IF EXISTS wa_sync_user_to_clients ON public.whatsapp_users;
CREATE TRIGGER wa_sync_user_to_clients
BEFORE INSERT OR UPDATE OF yc_id, yclients_id, client_fullname, client_phone, first_name, last_name, user_id
ON public.whatsapp_users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_to_clients_by_yc_id();

DROP TRIGGER IF EXISTS max_sync_user_to_clients ON public.max_users;
CREATE TRIGGER max_sync_user_to_clients
BEFORE INSERT OR UPDATE OF yc_id, yclients_id, client_fullname, client_phone, first_name, last_name, user_id
ON public.max_users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_to_clients_by_yc_id();

-- -----------------------------------------------------------------------------
-- 7. Триггер "продвижения лида в клиенты"
--    Когда у clients появляется yc_id — автоматически ставим lifecycle='client'
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_lead_to_client()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.yc_id IS NULL OR OLD.yc_id = '') AND
     NEW.yc_id IS NOT NULL AND NEW.yc_id <> '' AND
     NEW.lifecycle_status = 'lead'
  THEN
    NEW.lifecycle_status := 'client';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_promote_lead ON public.clients;
CREATE TRIGGER clients_promote_lead
BEFORE UPDATE OF yc_id
ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.promote_lead_to_client();
