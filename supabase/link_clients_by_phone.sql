-- =============================================================================
-- Миграция: автолинковка клиентов YClients с контактами мессенджеров по телефону
-- -----------------------------------------------------------------------------
-- Проблема: при импорте из YClients клиент приходит с phone, но без
--           telegram_user_id / whatsapp_user_id / max_user_id.
--           Если пользователь мессенджера уже существует в БД с тем же
--           номером — связь не создаётся автоматически.
--
-- Решение: AFTER INSERT OR UPDATE trigger на clients, который:
--   1. Нормализует телефон клиента
--   2. Ищет совпадения в telegram_users / whatsapp_users / max_users
--   3. Линкует найденные контакты (client_id ↔ *_user_id)
--   4. Upsert в client_channels
--   5. Защита от дублей: не трогаем контакт, уже привязанный к ДРУГОМУ клиенту
--
-- Применить: Supabase SQL editor
-- =============================================================================


-- =============================================================================
-- Вспомогательная функция: нормализация телефона (10–11 цифр, 7-формат)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF p_phone IS NULL THEN RETURN NULL; END IF;

  -- Оставляем только цифры
  v_digits := REGEXP_REPLACE(p_phone, '\D', '', 'g');

  -- Слишком короткий → не телефон
  IF LENGTH(v_digits) < 10 THEN RETURN NULL; END IF;

  -- 8XXXXXXXXXX → 7XXXXXXXXXX
  IF LEFT(v_digits, 1) = '8' AND LENGTH(v_digits) = 11 THEN
    v_digits := '7' || SUBSTRING(v_digits, 2);
  END IF;

  -- 10-значный → добавляем 7
  IF LENGTH(v_digits) = 10 THEN
    v_digits := '7' || v_digits;
  END IF;

  -- Только 11-значные в итоге считаем валидными
  IF LENGTH(v_digits) <> 11 THEN RETURN NULL; END IF;

  RETURN v_digits;
END;
$$;


-- =============================================================================
-- Основная функция: линковка клиента с контактами мессенджеров по телефону
-- =============================================================================
CREATE OR REPLACE FUNCTION public.link_client_to_messenger_by_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_phone_norm     TEXT;
  v_tg_user_id     BIGINT;
  v_wa_user_id     TEXT;
  v_max_user_id    TEXT;
BEGIN
  -- Нормализуем телефон нового/обновлённого клиента
  v_phone_norm := public.normalize_phone(
    COALESCE(NEW.normalized_phone, NEW.phone)
  );

  -- Телефон отсутствует или невалидный — ничего не делаем
  IF v_phone_norm IS NULL THEN
    RETURN NEW;
  END IF;

  -- Если у клиента уже проставлены все три поля — пропускаем
  -- (защита от лишних запросов на обычных апдейтах)
  IF NEW.telegram_user_id IS NOT NULL
     AND NEW.whatsapp_user_id IS NOT NULL
     AND NEW.max_user_id IS NOT NULL
  THEN
    RETURN NEW;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────────
  -- 1. Telegram: ищем по client_phone
  -- ────────────────────────────────────────────────────────────────────────────
  IF NEW.telegram_user_id IS NULL THEN
    SELECT tu.user_id
    INTO v_tg_user_id
    FROM public.telegram_users tu
    WHERE tu.org_uid = NEW.org_uid
      AND public.normalize_phone(tu.client_phone) = v_phone_norm
      -- Защита от дублей: берём только свободный контакт или уже наш
      AND (tu.client_id IS NULL OR tu.client_id = NEW.id)
    ORDER BY tu.user_id   -- детерминированный выбор при нескольких строках
    LIMIT 1;

    IF v_tg_user_id IS NOT NULL THEN
      -- Привязываем TG пользователя к клиенту
      UPDATE public.telegram_users
      SET client_id = NEW.id
      WHERE org_uid = NEW.org_uid
        AND user_id = v_tg_user_id
        AND (client_id IS NULL OR client_id = NEW.id);

      -- Проставляем telegram_user_id в самого клиента (через NEW — BEFORE-эффект
      -- недоступен в AFTER, поэтому делаем отдельный UPDATE)
      UPDATE public.clients
      SET telegram_user_id = v_tg_user_id
      WHERE id = NEW.id
        AND telegram_user_id IS NULL;

      -- Upsert в client_channels
      INSERT INTO public.client_channels (
        client_id, channel, channel_user_id, priority,
        is_active, can_notify, identified_via
      )
      VALUES (
        NEW.id, 'telegram', v_tg_user_id::text, 1,
        true, true, 'phone_match'
      )
      ON CONFLICT (client_id, channel) DO UPDATE SET
        channel_user_id = EXCLUDED.channel_user_id,
        is_active       = true,
        identified_via  = CASE
          WHEN client_channels.identified_via IN ('self_reported','booking')
            THEN client_channels.identified_via
          ELSE 'phone_match'
        END,
        updated_at      = NOW();
    END IF;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────────
  -- 2. WhatsApp: ищем по user_id (=телефон) и по client_phone
  -- ────────────────────────────────────────────────────────────────────────────
  IF NEW.whatsapp_user_id IS NULL THEN
    SELECT wu.user_id
    INTO v_wa_user_id
    FROM public.whatsapp_users wu
    WHERE wu.org_uid = NEW.org_uid
      AND (
        public.normalize_phone(wu.user_id)        = v_phone_norm
        OR public.normalize_phone(wu.client_phone) = v_phone_norm
      )
      AND (wu.client_id IS NULL OR wu.client_id = NEW.id)
    ORDER BY wu.user_id
    LIMIT 1;

    IF v_wa_user_id IS NOT NULL THEN
      UPDATE public.whatsapp_users
      SET client_id = NEW.id
      WHERE org_uid = NEW.org_uid
        AND user_id = v_wa_user_id
        AND (client_id IS NULL OR client_id = NEW.id);

      UPDATE public.clients
      SET whatsapp_user_id = v_wa_user_id
      WHERE id = NEW.id
        AND whatsapp_user_id IS NULL;

      INSERT INTO public.client_channels (
        client_id, channel, channel_user_id, priority,
        is_active, can_notify, identified_via
      )
      VALUES (
        NEW.id, 'whatsapp', v_wa_user_id, 2,
        true, true, 'phone_match'
      )
      ON CONFLICT (client_id, channel) DO UPDATE SET
        channel_user_id = EXCLUDED.channel_user_id,
        is_active       = true,
        identified_via  = CASE
          WHEN client_channels.identified_via IN ('self_reported','booking')
            THEN client_channels.identified_via
          ELSE 'phone_match'
        END,
        updated_at      = NOW();
    END IF;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────────
  -- 3. Max: ищем по client_phone
  -- ────────────────────────────────────────────────────────────────────────────
  IF NEW.max_user_id IS NULL THEN
    SELECT mu.user_id
    INTO v_max_user_id
    FROM public.max_users mu
    WHERE mu.org_uid = NEW.org_uid
      AND public.normalize_phone(mu.client_phone) = v_phone_norm
      AND (mu.client_id IS NULL OR mu.client_id = NEW.id)
    ORDER BY mu.user_id
    LIMIT 1;

    IF v_max_user_id IS NOT NULL THEN
      UPDATE public.max_users
      SET client_id = NEW.id
      WHERE org_uid = NEW.org_uid
        AND user_id = v_max_user_id
        AND (client_id IS NULL OR client_id = NEW.id);

      UPDATE public.clients
      SET max_user_id = v_max_user_id
      WHERE id = NEW.id
        AND max_user_id IS NULL;

      INSERT INTO public.client_channels (
        client_id, channel, channel_user_id, priority,
        is_active, can_notify, identified_via
      )
      VALUES (
        NEW.id, 'max', v_max_user_id, 3,
        true, true, 'phone_match'
      )
      ON CONFLICT (client_id, channel) DO UPDATE SET
        channel_user_id = EXCLUDED.channel_user_id,
        is_active       = true,
        identified_via  = CASE
          WHEN client_channels.identified_via IN ('self_reported','booking')
            THEN client_channels.identified_via
          ELSE 'phone_match'
        END,
        updated_at      = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- =============================================================================
-- Триггер на clients: срабатывает при INSERT или изменении телефона
-- =============================================================================
DROP TRIGGER IF EXISTS clients_link_by_phone ON public.clients;
CREATE TRIGGER clients_link_by_phone
AFTER INSERT OR UPDATE OF phone, normalized_phone
ON public.clients
FOR EACH ROW
WHEN (COALESCE(NEW.phone, NEW.normalized_phone) IS NOT NULL)
EXECUTE FUNCTION public.link_client_to_messenger_by_phone();


-- =============================================================================
-- Обратная сторона: когда в *_users появляется client_phone — тоже линкуем
-- (случай: пользователь мессенджера регистрирует телефон ПОСЛЕ импорта клиента)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.link_messenger_user_to_client_by_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_phone_norm  TEXT;
  v_client_id   UUID;
  v_channel     TEXT;
  v_priority    INTEGER;
BEGIN
  -- Уже привязан к клиенту — пропускаем
  IF NEW.client_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Определяем канал и телефон в зависимости от таблицы
  IF TG_TABLE_NAME = 'telegram_users' THEN
    v_channel  := 'telegram';
    v_priority := 1;
    v_phone_norm := public.normalize_phone(NEW.client_phone);
  ELSIF TG_TABLE_NAME = 'whatsapp_users' THEN
    v_channel  := 'whatsapp';
    v_priority := 2;
    -- WA: user_id сам является телефоном
    v_phone_norm := public.normalize_phone(
      COALESCE(NULLIF(NEW.client_phone, ''), NEW.user_id::text)
    );
  ELSIF TG_TABLE_NAME = 'max_users' THEN
    v_channel  := 'max';
    v_priority := 3;
    v_phone_norm := public.normalize_phone(NEW.client_phone);
  END IF;

  IF v_phone_norm IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ищем клиента по телефону
  SELECT c.id INTO v_client_id
  FROM public.clients c
  WHERE c.org_uid = NEW.org_uid
    AND public.normalize_phone(COALESCE(c.normalized_phone, c.phone)) = v_phone_norm
  ORDER BY c.created_at   -- старейший = основной клиент
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Привязываем
  NEW.client_id := v_client_id;

  -- Обновляем *_user_id в clients
  IF TG_TABLE_NAME = 'telegram_users' THEN
    UPDATE public.clients
    SET telegram_user_id = NEW.user_id::bigint
    WHERE id = v_client_id AND telegram_user_id IS NULL;
  ELSIF TG_TABLE_NAME = 'whatsapp_users' THEN
    UPDATE public.clients
    SET whatsapp_user_id = NEW.user_id::text
    WHERE id = v_client_id AND whatsapp_user_id IS NULL;
  ELSIF TG_TABLE_NAME = 'max_users' THEN
    UPDATE public.clients
    SET max_user_id = NEW.user_id::text
    WHERE id = v_client_id AND max_user_id IS NULL;
  END IF;

  -- Upsert client_channels
  INSERT INTO public.client_channels (
    client_id, channel, channel_user_id, priority,
    is_active, can_notify, identified_via
  )
  VALUES (
    v_client_id, v_channel, NEW.user_id::text, v_priority,
    true, true, 'phone_match'
  )
  ON CONFLICT (client_id, channel) DO UPDATE SET
    channel_user_id = EXCLUDED.channel_user_id,
    is_active       = true,
    identified_via  = CASE
      WHEN client_channels.identified_via IN ('self_reported','booking')
        THEN client_channels.identified_via
      ELSE 'phone_match'
    END,
    updated_at      = NOW();

  RETURN NEW;
END;
$$;

-- Триггеры на таблицах мессенджеров
DROP TRIGGER IF EXISTS tg_link_by_phone ON public.telegram_users;
CREATE TRIGGER tg_link_by_phone
BEFORE INSERT OR UPDATE OF client_phone
ON public.telegram_users
FOR EACH ROW
WHEN (NEW.client_id IS NULL)
EXECUTE FUNCTION public.link_messenger_user_to_client_by_phone();

DROP TRIGGER IF EXISTS wa_link_by_phone ON public.whatsapp_users;
CREATE TRIGGER wa_link_by_phone
BEFORE INSERT OR UPDATE OF client_phone, user_id
ON public.whatsapp_users
FOR EACH ROW
WHEN (NEW.client_id IS NULL)
EXECUTE FUNCTION public.link_messenger_user_to_client_by_phone();

DROP TRIGGER IF EXISTS max_link_by_phone ON public.max_users;
CREATE TRIGGER max_link_by_phone
BEFORE INSERT OR UPDATE OF client_phone
ON public.max_users
FOR EACH ROW
WHEN (NEW.client_id IS NULL)
EXECUTE FUNCTION public.link_messenger_user_to_client_by_phone();


-- =============================================================================
-- Backfill: однократный прогон по существующим клиентам с телефоном
-- Запускать вручную после миграции (или через Supabase SQL editor)
-- =============================================================================
-- DO $$
-- DECLARE
--   v_count INTEGER := 0;
--   v_client RECORD;
-- BEGIN
--   FOR v_client IN
--     SELECT id, org_uid, phone, normalized_phone,
--            telegram_user_id, whatsapp_user_id, max_user_id
--     FROM public.clients
--     WHERE (phone IS NOT NULL OR normalized_phone IS NOT NULL)
--       AND (telegram_user_id IS NULL OR whatsapp_user_id IS NULL OR max_user_id IS NULL)
--   LOOP
--     -- Искусственно вызываем trigger-функцию через UPDATE телефона
--     UPDATE public.clients
--     SET normalized_phone = COALESCE(normalized_phone, phone)
--     WHERE id = v_client.id;
--     v_count := v_count + 1;
--   END LOOP;
--   RAISE NOTICE 'Backfill complete: % clients processed', v_count;
-- END;
-- $$;
