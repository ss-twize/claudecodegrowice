-- =============================================================================
-- Миграция: автообновление контактных данных при каждом сообщении
-- -----------------------------------------------------------------------------
-- Добавляет updated_at к таблицам пользователей каналов и RPC-функцию
-- upsert_channel_user_profile(), которая вызывается из n8n при каждом
-- входящем сообщении.
--
-- Логика:
--   1. Обновляет first_name, last_name, tg_username (для TG), last_message,
--      updated_at в нужной таблице — только если новые значения не пустые
--   2. Создаёт запись если пользователь новый (INSERT ... ON CONFLICT DO UPDATE)
--   3. Если пользователь привязан к клиенту — заполняет пустые поля имени
--      у клиента (не перезаписывает существующие данные)
-- =============================================================================


-- =============================================================================
-- 1. Добавить updated_at во все таблицы пользователей каналов
-- =============================================================================
ALTER TABLE public.telegram_users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.whatsapp_users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.max_users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Индексы для поиска "кто давно не писал"
CREATE INDEX IF NOT EXISTS idx_tg_users_last_message
  ON public.telegram_users (org_uid, last_message DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_wa_users_last_message
  ON public.whatsapp_users (org_uid, last_message DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_max_users_last_message
  ON public.max_users (org_uid, last_message DESC NULLS LAST);


-- =============================================================================
-- 2. RPC-функция: upsert_channel_user_profile
--    Вызывается из n8n при каждом входящем сообщении.
--    Возвращает JSONB: {client_id, is_new_user}
-- =============================================================================
CREATE OR REPLACE FUNCTION public.upsert_channel_user_profile(
  p_channel    TEXT,             -- 'telegram' | 'whatsapp' | 'max'
  p_org_uid    UUID,
  p_user_id    TEXT,             -- bigint-строка для TG, текст для WA/Max
  p_first_name TEXT DEFAULT NULL,
  p_last_name  TEXT DEFAULT NULL,
  p_username   TEXT DEFAULT NULL -- @handle для Telegram; NULL для WA/Max
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_client_id    UUID;
  v_is_new_user  BOOLEAN := FALSE;
  v_first_name   TEXT := NULLIF(TRIM(COALESCE(p_first_name, '')), '');
  v_last_name    TEXT := NULLIF(TRIM(COALESCE(p_last_name,  '')), '');
  v_username     TEXT := NULLIF(TRIM(COALESCE(p_username,   '')), '');
BEGIN

  -- ── Telegram ──────────────────────────────────────────────────────────────
  IF p_channel = 'telegram' THEN
    INSERT INTO public.telegram_users
      (org_uid, user_id, first_name, last_name, tg_username, last_message, updated_at)
    VALUES
      (p_org_uid, p_user_id::BIGINT,
       v_first_name, v_last_name, v_username, NOW(), NOW())
    ON CONFLICT (org_uid, user_id) DO UPDATE SET
      -- Обновляем только если новое значение непустое
      first_name   = COALESCE(v_first_name,  telegram_users.first_name),
      last_name    = COALESCE(v_last_name,   telegram_users.last_name),
      tg_username  = COALESCE(v_username,    telegram_users.tg_username),
      last_message = NOW(),
      updated_at   = NOW();

    -- Определяем это новый пользователь или нет
    v_is_new_user := NOT EXISTS (
      SELECT 1 FROM public.telegram_users
      WHERE org_uid = p_org_uid AND user_id = p_user_id::BIGINT
        AND updated_at < NOW() - INTERVAL '5 seconds'
    );

    SELECT client_id INTO v_client_id
    FROM public.telegram_users
    WHERE org_uid = p_org_uid AND user_id = p_user_id::BIGINT;

  -- ── WhatsApp ──────────────────────────────────────────────────────────────
  ELSIF p_channel = 'whatsapp' THEN
    INSERT INTO public.whatsapp_users
      (org_uid, user_id, first_name, last_name, last_message, updated_at)
    VALUES
      (p_org_uid, p_user_id,
       v_first_name, v_last_name, NOW(), NOW())
    ON CONFLICT (org_uid, user_id) DO UPDATE SET
      first_name   = COALESCE(v_first_name,  whatsapp_users.first_name),
      last_name    = COALESCE(v_last_name,   whatsapp_users.last_name),
      last_message = NOW(),
      updated_at   = NOW();

    SELECT client_id INTO v_client_id
    FROM public.whatsapp_users
    WHERE org_uid = p_org_uid AND user_id = p_user_id;

  -- ── Max ───────────────────────────────────────────────────────────────────
  ELSIF p_channel = 'max' THEN
    INSERT INTO public.max_users
      (org_uid, user_id, first_name, last_name, last_message, updated_at)
    VALUES
      (p_org_uid, p_user_id,
       v_first_name, v_last_name, NOW(), NOW())
    ON CONFLICT (org_uid, user_id) DO UPDATE SET
      first_name   = COALESCE(v_first_name,  max_users.first_name),
      last_name    = COALESCE(v_last_name,   max_users.last_name),
      last_message = NOW(),
      updated_at   = NOW();

    SELECT client_id INTO v_client_id
    FROM public.max_users
    WHERE org_uid = p_org_uid AND user_id = p_user_id;

  ELSE
    RAISE EXCEPTION 'Unknown channel: %', p_channel;
  END IF;

  -- ── Если пользователь связан с клиентом — заполняем пустые поля имени ────
  -- (только NULL-поля — не перезаписываем существующие данные из YClients)
  IF v_client_id IS NOT NULL THEN
    UPDATE public.clients
    SET
      first_name   = COALESCE(first_name,   v_first_name),
      last_name    = COALESCE(last_name,    v_last_name),
      -- display_name заполняем только если полностью пусто
      display_name = COALESCE(
        NULLIF(display_name, ''),
        NULLIF(TRIM(COALESCE(v_first_name,'') || ' ' || COALESCE(v_last_name,'')), '')
      )
    WHERE id = v_client_id
      -- Не перезаписываем если все три поля уже заполнены
      AND (first_name IS NULL OR last_name IS NULL OR display_name IS NULL OR display_name = '');
  END IF;

  RETURN jsonb_build_object(
    'client_id',   v_client_id,
    'is_new_user', v_is_new_user
  );
END;
$$;
