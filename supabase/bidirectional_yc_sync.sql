-- =============================================================================
-- Миграция: двусторонняя синхронизация клиентов СЕРВЕКС ↔ YClients
-- -----------------------------------------------------------------------------
-- Синхронизируемые поля: name, surname, patronymic, phone, email,
--                        birth_date, comment, discount
--
-- Разрешение конфликтов:
--   - sync_source = 'yclients': YClients обновил последним
--   - sync_source = 'servex':   СЕРВЕКС обновил последним, ждёт push в YC
--   - При upsert из YClients: побеждает тот, у кого last_change_date новее
--
-- Защита от цикла:
--   Trigger queue_client_update_to_yc проверяет sync_source — если 'yclients',
--   изменение пришло из YC и в очередь не добавляется.
-- =============================================================================


-- =============================================================================
-- 1. Новые колонки на clients
-- =============================================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS sync_source TEXT
    CHECK (sync_source IN ('servex', 'yclients')),
  ADD COLUMN IF NOT EXISTS last_synced_to_yc TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_synced_from_yc TIMESTAMPTZ;

COMMENT ON COLUMN public.clients.sync_source IS
  'Последний источник изменения синхронизируемых полей: servex | yclients';
COMMENT ON COLUMN public.clients.last_synced_to_yc IS
  'Когда последний раз успешно отправили изменения в YClients';
COMMENT ON COLUMN public.clients.last_synced_from_yc IS
  'Когда последний раз получили данные из YClients';


-- =============================================================================
-- 2. Таблица очереди синхронизации (СЕРВЕКС → YClients)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.client_sync_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  org_uid       UUID NOT NULL,
  yc_id         TEXT NOT NULL,
  changed_fields TEXT[] NOT NULL,          -- список изменённых полей
  new_values    JSONB NOT NULL,            -- {name, surname, ...} — что слать в YC
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','done','error','failed')),
  retry_count   INT NOT NULL DEFAULT 0,
  error_msg     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ,

  -- Уникальность: один pending/error на клиента (новое изменение мержится)
  CONSTRAINT uq_sync_queue_client_pending
    EXCLUDE USING btree (client_id WITH =)
    WHERE (status IN ('pending','processing'))
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_pending
  ON public.client_sync_queue (org_uid, status, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_sync_queue_client
  ON public.client_sync_queue (client_id);


-- =============================================================================
-- 3. Таблица лога синхронизации (аудит всех операций)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.client_sync_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  org_uid         UUID,
  yc_id           TEXT,
  direction       TEXT NOT NULL CHECK (direction IN ('to_yclients','from_yclients')),
  changed_fields  TEXT[],
  payload         JSONB,     -- что отправляли
  yc_response     JSONB,     -- что ответил YClients
  status          TEXT NOT NULL CHECK (status IN ('success','error','skipped','conflict_skip')),
  error_msg       TEXT,
  conflict_winner TEXT,      -- 'servex' | 'yclients' | null
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_client
  ON public.client_sync_log (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_direction
  ON public.client_sync_log (org_uid, direction, created_at DESC);


-- =============================================================================
-- 4. Trigger: ставить в очередь изменения из СЕРВЕКС
-- =============================================================================
CREATE OR REPLACE FUNCTION public.queue_client_update_to_yc()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_changed TEXT[] := '{}';
  v_new_vals JSONB;
BEGIN
  -- Изменение пришло из YClients — в очередь не добавляем (разрыв цикла)
  IF NEW.sync_source = 'yclients' THEN
    RETURN NEW;
  END IF;

  -- Клиент без yc_id — не синхронизируем (лид без YC-карточки)
  IF NEW.yc_id IS NULL OR NEW.yc_id = '' THEN
    RETURN NEW;
  END IF;

  -- Вычисляем список изменённых полей
  IF OLD.name       IS DISTINCT FROM NEW.name       THEN v_changed := v_changed || 'name'; END IF;
  IF OLD.surname    IS DISTINCT FROM NEW.surname    THEN v_changed := v_changed || 'surname'; END IF;
  IF OLD.patronymic IS DISTINCT FROM NEW.patronymic THEN v_changed := v_changed || 'patronymic'; END IF;
  IF OLD.phone      IS DISTINCT FROM NEW.phone      THEN v_changed := v_changed || 'phone'; END IF;
  IF OLD.email      IS DISTINCT FROM NEW.email      THEN v_changed := v_changed || 'email'; END IF;
  IF OLD.birth_date IS DISTINCT FROM NEW.birth_date THEN v_changed := v_changed || 'birth_date'; END IF;
  IF OLD.comment    IS DISTINCT FROM NEW.comment    THEN v_changed := v_changed || 'comment'; END IF;
  IF OLD.discount   IS DISTINCT FROM NEW.discount   THEN v_changed := v_changed || 'discount'; END IF;

  -- Нет синхронизируемых изменений — пропускаем
  IF array_length(v_changed, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Снимок новых значений для отправки в YClients
  v_new_vals := jsonb_build_object(
    'name',        NEW.name,
    'surname',     NEW.surname,
    'patronymic',  NEW.patronymic,
    'phone',       NEW.phone,
    'email',       NEW.email,
    'birth_date',  NEW.birth_date,
    'comment',     NEW.comment,
    'discount',    NEW.discount
  );

  -- Upsert в очередь: если уже есть pending для этого клиента — мержим изменения
  INSERT INTO public.client_sync_queue
    (client_id, org_uid, yc_id, changed_fields, new_values, status)
  VALUES
    (NEW.id, NEW.org_uid, NEW.yc_id, v_changed, v_new_vals, 'pending')
  ON CONFLICT ON CONSTRAINT uq_sync_queue_client_pending
  DO UPDATE SET
    changed_fields = (
      SELECT ARRAY(
        SELECT DISTINCT unnest(
          client_sync_queue.changed_fields || EXCLUDED.changed_fields
        )
      )
    ),
    new_values     = EXCLUDED.new_values,   -- последний снимок
    created_at     = NOW();                  -- обновляем время

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_queue_yc_sync ON public.clients;
CREATE TRIGGER clients_queue_yc_sync
AFTER UPDATE OF name, surname, patronymic, phone, email, birth_date, comment, discount
ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.queue_client_update_to_yc();


-- =============================================================================
-- 5. RPC-функция: умный upsert клиента из YClients с разрешением конфликтов
--    Вызывается из n8n вместо прямого POST на /rest/v1/clients
-- =============================================================================
CREATE OR REPLACE FUNCTION public.upsert_client_from_yclients(p_client JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_uid           UUID  := (p_client->>'org_uid')::UUID;
  v_yc_id             TEXT  := p_client->>'yc_id';
  v_yc_last_change    TIMESTAMPTZ := (p_client->>'last_change_date')::TIMESTAMPTZ;
  v_existing          RECORD;
  v_result            JSONB;
  v_conflict_winner   TEXT;
  v_skip_fields       TEXT[] := '{}';   -- поля, которые YC не должен перезаписывать
BEGIN
  -- Находим существующего клиента
  SELECT id, updated_at, sync_source, name, surname, patronymic,
         phone, email, birth_date, comment, discount
  INTO v_existing
  FROM public.clients
  WHERE org_uid = v_org_uid AND yc_id = v_yc_id
  LIMIT 1;

  IF NOT FOUND THEN
    -- Новый клиент — просто вставляем, sync_source = 'yclients'
    INSERT INTO public.clients (
      org_uid, yc_id, yclients_id, fullname, display_name,
      name, surname, patronymic, phone, email, birth_date,
      comment, discount, sex, sex_id, visits, spent, paid, balance,
      importance_id, importance, categories, custom_fields,
      card, last_visit, last_change_date, raw_payload,
      lifecycle_status, source,
      sync_source, last_synced_from_yc
    )
    VALUES (
      v_org_uid,
      v_yc_id,
      (p_client->>'yclients_id')::BIGINT,
      p_client->>'fullname',
      p_client->>'display_name',
      p_client->>'name',
      p_client->>'surname',
      p_client->>'patronymic',
      p_client->>'phone',
      p_client->>'email',
      p_client->>'birth_date',
      p_client->>'comment',
      (p_client->>'discount')::NUMERIC,
      p_client->>'sex',
      (p_client->>'sex_id')::INT,
      (p_client->>'visits')::INT,
      (p_client->>'spent')::NUMERIC,
      (p_client->>'paid')::NUMERIC,
      (p_client->>'balance')::NUMERIC,
      (p_client->>'importance_id')::INT,
      p_client->>'importance',
      COALESCE((p_client->>'categories')::JSONB, '[]'::JSONB),
      COALESCE((p_client->>'custom_fields')::JSONB, '{}'::JSONB),
      p_client->>'card',
      (p_client->>'last_visit')::DATE,
      v_yc_last_change,
      COALESCE((p_client->>'raw_payload')::JSONB, '{}'::JSONB),
      'client',
      'YClients',
      'yclients',
      NOW()
    )
    ON CONFLICT (org_uid, yc_id) DO NOTHING;   -- race condition guard

    RETURN jsonb_build_object('action','insert','yc_id', v_yc_id);
  END IF;

  -- ── Конфликт: клиент уже существует ────────────────────────────────────────
  -- Разрешение: если СЕРВЕКС обновился ПОЗЖЕ чем YClients last_change_date,
  -- не перезаписываем синхронизируемые поля (YClients данные устарели)

  IF v_existing.sync_source = 'servex'
     AND v_existing.updated_at IS NOT NULL
     AND (v_yc_last_change IS NULL OR v_existing.updated_at > v_yc_last_change)
  THEN
    -- СЕРВЕКС победил по timestamp — не трогаем sync-поля, только мета
    v_conflict_winner := 'servex';
    v_skip_fields := ARRAY['name','surname','patronymic','phone','email','birth_date','comment','discount'];

    UPDATE public.clients SET
      -- Мета-поля обновляем всегда (статистика, визиты и т.д.)
      yclients_id     = (p_client->>'yclients_id')::BIGINT,
      fullname        = COALESCE(NULLIF(fullname,''), p_client->>'fullname'),
      display_name    = COALESCE(NULLIF(display_name,''), p_client->>'display_name'),
      sex             = p_client->>'sex',
      sex_id          = (p_client->>'sex_id')::INT,
      visits          = (p_client->>'visits')::INT,
      spent           = (p_client->>'spent')::NUMERIC,
      paid            = (p_client->>'paid')::NUMERIC,
      balance         = (p_client->>'balance')::NUMERIC,
      importance_id   = (p_client->>'importance_id')::INT,
      importance      = p_client->>'importance',
      categories      = COALESCE((p_client->>'categories')::JSONB, '[]'::JSONB),
      custom_fields   = COALESCE((p_client->>'custom_fields')::JSONB, '{}'::JSONB),
      card            = p_client->>'card',
      last_visit      = (p_client->>'last_visit')::DATE,
      last_change_date = v_yc_last_change,
      last_synced_from_yc = NOW(),
      lifecycle_status = 'client'
      -- sync_source НЕ меняем (остаётся 'servex', ожидает push)
    WHERE id = v_existing.id;

  ELSE
    -- YClients победил — обновляем все поля включая синхронизируемые
    v_conflict_winner := 'yclients';

    UPDATE public.clients SET
      yclients_id     = (p_client->>'yclients_id')::BIGINT,
      fullname        = p_client->>'fullname',
      display_name    = p_client->>'display_name',
      name            = p_client->>'name',
      surname         = p_client->>'surname',
      patronymic      = p_client->>'patronymic',
      phone           = p_client->>'phone',
      email           = p_client->>'email',
      birth_date      = p_client->>'birth_date',
      comment         = p_client->>'comment',
      discount        = (p_client->>'discount')::NUMERIC,
      sex             = p_client->>'sex',
      sex_id          = (p_client->>'sex_id')::INT,
      visits          = (p_client->>'visits')::INT,
      spent           = (p_client->>'spent')::NUMERIC,
      paid            = (p_client->>'paid')::NUMERIC,
      balance         = (p_client->>'balance')::NUMERIC,
      importance_id   = (p_client->>'importance_id')::INT,
      importance      = p_client->>'importance',
      categories      = COALESCE((p_client->>'categories')::JSONB, '[]'::JSONB),
      custom_fields   = COALESCE((p_client->>'custom_fields')::JSONB, '{}'::JSONB),
      card            = p_client->>'card',
      last_visit      = (p_client->>'last_visit')::DATE,
      last_change_date = v_yc_last_change,
      last_synced_from_yc = NOW(),
      lifecycle_status = 'client',
      sync_source      = 'yclients'
    WHERE id = v_existing.id;
  END IF;

  -- Пишем в лог
  INSERT INTO public.client_sync_log
    (client_id, org_uid, yc_id, direction, status, conflict_winner, created_at)
  VALUES
    (v_existing.id, v_org_uid, v_yc_id, 'from_yclients',
     CASE WHEN v_conflict_winner = 'servex' THEN 'conflict_skip' ELSE 'success' END,
     v_conflict_winner, NOW());

  RETURN jsonb_build_object(
    'action',          'update',
    'yc_id',           v_yc_id,
    'conflict_winner', v_conflict_winner,
    'skip_fields',     v_skip_fields
  );
END;
$$;


-- =============================================================================
-- 6. Функция: пометить элемент очереди как успешно обработанный (вызывается n8n)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.complete_sync_queue_item(
  p_queue_id    UUID,
  p_status      TEXT,      -- 'done' | 'error' | 'failed'
  p_error_msg   TEXT DEFAULT NULL,
  p_yc_response JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_queue RECORD;
BEGIN
  SELECT * INTO v_queue FROM public.client_sync_queue WHERE id = p_queue_id;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.client_sync_queue
  SET
    status       = p_status,
    error_msg    = p_error_msg,
    retry_count  = CASE WHEN p_status = 'error' THEN retry_count + 1 ELSE retry_count END,
    processed_at = CASE WHEN p_status = 'done' THEN NOW() ELSE NULL END
  WHERE id = p_queue_id;

  -- Если успешно — обновляем last_synced_to_yc в клиенте
  IF p_status = 'done' THEN
    UPDATE public.clients
    SET last_synced_to_yc = NOW()
    WHERE id = v_queue.client_id;
  END IF;

  -- Пишем лог
  INSERT INTO public.client_sync_log
    (client_id, org_uid, yc_id, direction, changed_fields, payload,
     yc_response, status, error_msg, created_at)
  VALUES
    (v_queue.client_id, v_queue.org_uid, v_queue.yc_id,
     'to_yclients', v_queue.changed_fields, v_queue.new_values,
     p_yc_response,
     CASE p_status WHEN 'done' THEN 'success' ELSE 'error' END,
     p_error_msg, NOW());
END;
$$;


-- =============================================================================
-- 7. Индекс на clients по sync_source для поиска ожидающих клиентов
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_sync_source
  ON public.clients (org_uid, sync_source)
  WHERE sync_source = 'servex';


-- =============================================================================
-- 8. RLS на новые таблицы
-- =============================================================================
ALTER TABLE public.client_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sync_log   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_sync_queue" ON public.client_sync_queue;
CREATE POLICY "service_role_all_sync_queue" ON public.client_sync_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_sync_log" ON public.client_sync_log;
CREATE POLICY "service_role_all_sync_log" ON public.client_sync_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_read_sync_log" ON public.client_sync_log;
CREATE POLICY "anon_read_sync_log" ON public.client_sync_log
  FOR SELECT TO anon USING (true);
