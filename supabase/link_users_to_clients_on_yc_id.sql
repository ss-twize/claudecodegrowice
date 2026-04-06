-- =============================================================================
-- Автосвязь "юзер -> клиент" при появлении yc_id / yclients_id
-- -----------------------------------------------------------------------------
-- Логика:
-- 1) Пользователь сначала попадает в telegram_users / whatsapp_users / max_users.
-- 2) Когда у него появляется yc_id (первая запись в YClients), автоматически
--    создаём/обновляем строку в public.clients.
-- 3) Заполняем user.client_id и регистрируем канал в client_channels.
--
-- Важно: импорт из YClients не ломается, т.к. upsert в clients идёт по
-- (org_uid, yc_id), а данные из users-потока только дополняют пустые поля.
-- =============================================================================

-- 1) Добавляем недостающие поля в users-таблицы (идемпотентно)
ALTER TABLE public.telegram_users
  ADD COLUMN IF NOT EXISTS yc_id TEXT,
  ADD COLUMN IF NOT EXISTS yclients_id BIGINT,
  ADD COLUMN IF NOT EXISTS client_fullname TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT;

ALTER TABLE public.whatsapp_users
  ADD COLUMN IF NOT EXISTS yc_id TEXT,
  ADD COLUMN IF NOT EXISTS yclients_id BIGINT,
  ADD COLUMN IF NOT EXISTS client_fullname TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT;

ALTER TABLE public.max_users
  ADD COLUMN IF NOT EXISTS yc_id TEXT,
  ADD COLUMN IF NOT EXISTS yclients_id BIGINT,
  ADD COLUMN IF NOT EXISTS client_fullname TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- На случай, если колонка отсутствовала в старой схеме clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS yclients_id BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT,
  ADD COLUMN IF NOT EXISTS whatsapp_user_id TEXT,
  ADD COLUMN IF NOT EXISTS max_user_id TEXT;

-- 2) Индексы для быстрых апдейтов/поиска
CREATE INDEX IF NOT EXISTS idx_tg_users_org_yc_id ON public.telegram_users (org_uid, yc_id);
CREATE INDEX IF NOT EXISTS idx_wa_users_org_yc_id ON public.whatsapp_users (org_uid, yc_id);
CREATE INDEX IF NOT EXISTS idx_max_users_org_yc_id ON public.max_users (org_uid, yc_id);
CREATE INDEX IF NOT EXISTS idx_clients_org_tg_user ON public.clients (org_uid, telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_org_wa_user ON public.clients (org_uid, whatsapp_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_org_max_user ON public.clients (org_uid, max_user_id);

-- 3) Функция синхронизации пользователя с clients
CREATE OR REPLACE FUNCTION public.sync_user_to_clients_by_yc_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_uid UUID := COALESCE(NEW.org_uid, '11111111-1111-1111-1111-111111111111'::uuid);
  v_channel TEXT;
  v_priority INTEGER;
  v_yc_id TEXT;
  v_yclients_id BIGINT;
  v_fullname TEXT;
  v_name TEXT;
  v_surname TEXT;
  v_phone TEXT;
  v_client_id UUID;
  v_telegram_user_id BIGINT;
  v_whatsapp_user_id TEXT;
  v_max_user_id TEXT;
BEGIN
  v_yc_id := NULLIF(BTRIM(COALESCE(NEW.yc_id, '')), '');
  v_yclients_id := NEW.yclients_id;

  IF v_yc_id IS NULL AND v_yclients_id IS NOT NULL THEN
    v_yc_id := v_yclients_id::text;
  END IF;

  -- Без yc_id клиент не создаётся: это ещё просто "юзер"
  IF v_yc_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_name := NULLIF(BTRIM(COALESCE(NEW.first_name, '')), '');
  v_surname := NULLIF(BTRIM(COALESCE(NEW.last_name, '')), '');
  v_fullname := NULLIF(BTRIM(COALESCE(NEW.client_fullname, '')), '');
  v_phone := NULLIF(BTRIM(COALESCE(NEW.client_phone, '')), '');

  IF v_fullname IS NULL THEN
    v_fullname := NULLIF(CONCAT_WS(' ', v_name, v_surname), '');
  END IF;

  IF v_fullname IS NULL THEN
    v_fullname := CONCAT('Клиент ', v_yc_id);
  END IF;

  -- Для WhatsApp user_id часто уже номер
  IF v_phone IS NULL AND TG_TABLE_NAME = 'whatsapp_users' THEN
    v_phone := NULLIF(BTRIM(COALESCE(NEW.user_id::text, '')), '');
  END IF;

  v_telegram_user_id := CASE WHEN TG_TABLE_NAME = 'telegram_users' THEN NEW.user_id::bigint ELSE NULL END;
  v_whatsapp_user_id := CASE WHEN TG_TABLE_NAME = 'whatsapp_users' THEN NEW.user_id::text ELSE NULL END;
  v_max_user_id := CASE WHEN TG_TABLE_NAME = 'max_users' THEN NEW.user_id::text ELSE NULL END;

  INSERT INTO public.clients (
    org_uid,
    yc_id,
    yclients_id,
    fullname,
    display_name,
    name,
    surname,
    phone,
    telegram_user_id,
    whatsapp_user_id,
    max_user_id
  )
  VALUES (
    v_org_uid,
    v_yc_id,
    v_yclients_id,
    v_fullname,
    v_fullname,
    v_name,
    v_surname,
    v_phone,
    v_telegram_user_id,
    v_whatsapp_user_id,
    v_max_user_id
  )
  ON CONFLICT (org_uid, yc_id)
  DO UPDATE SET
    yclients_id = COALESCE(EXCLUDED.yclients_id, public.clients.yclients_id),
    fullname = COALESCE(NULLIF(public.clients.fullname, ''), EXCLUDED.fullname),
    display_name = COALESCE(NULLIF(public.clients.display_name, ''), EXCLUDED.display_name),
    name = COALESCE(NULLIF(public.clients.name, ''), EXCLUDED.name),
    surname = COALESCE(NULLIF(public.clients.surname, ''), EXCLUDED.surname),
    phone = COALESCE(NULLIF(public.clients.phone, ''), EXCLUDED.phone),
    telegram_user_id = COALESCE(public.clients.telegram_user_id, EXCLUDED.telegram_user_id),
    whatsapp_user_id = COALESCE(public.clients.whatsapp_user_id, EXCLUDED.whatsapp_user_id),
    max_user_id = COALESCE(public.clients.max_user_id, EXCLUDED.max_user_id)
  RETURNING id INTO v_client_id;

  NEW.client_id := v_client_id;

  v_channel := CASE TG_TABLE_NAME
    WHEN 'telegram_users' THEN 'telegram'
    WHEN 'whatsapp_users' THEN 'whatsapp'
    WHEN 'max_users' THEN 'max'
    ELSE NULL
  END;

  v_priority := CASE v_channel
    WHEN 'telegram' THEN 1
    WHEN 'whatsapp' THEN 2
    WHEN 'max' THEN 3
    ELSE 99
  END;

  IF v_channel IS NOT NULL THEN
    INSERT INTO public.client_channels (
      client_id,
      channel,
      channel_user_id,
      priority,
      is_active,
      can_notify,
      identified_via
    )
    VALUES (
      v_client_id,
      v_channel,
      NEW.user_id::text,
      v_priority,
      true,
      COALESCE(NEW.can_message, true),
      'self_reported'
    )
    ON CONFLICT (client_id, channel)
    DO UPDATE SET
      channel_user_id = EXCLUDED.channel_user_id,
      is_active = true,
      can_notify = EXCLUDED.can_notify,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Триггеры (до записи, чтобы NEW.client_id сохранился в той же операции)
DROP TRIGGER IF EXISTS tg_sync_user_to_clients ON public.telegram_users;
CREATE TRIGGER tg_sync_user_to_clients
BEFORE INSERT OR UPDATE OF yc_id, yclients_id, client_fullname, client_phone, first_name, last_name, user_id
ON public.telegram_users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_to_clients_by_yc_id();

DROP TRIGGER IF EXISTS wa_sync_user_to_clients ON public.whatsapp_users;
CREATE TRIGGER wa_sync_user_to_clients
BEFORE INSERT OR UPDATE OF yc_id, yclients_id, client_fullname, client_phone, first_name, last_name, user_id
ON public.whatsapp_users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_to_clients_by_yc_id();

DROP TRIGGER IF EXISTS max_sync_user_to_clients ON public.max_users;
CREATE TRIGGER max_sync_user_to_clients
BEFORE INSERT OR UPDATE OF yc_id, yclients_id, client_fullname, client_phone, first_name, last_name, user_id
ON public.max_users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_to_clients_by_yc_id();

-- 5) Обратная синхронизация: clients -> user tables по org_uid + *_user_id
CREATE OR REPLACE FUNCTION public.sync_client_links_to_user_tables()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.telegram_user_id IS NOT NULL THEN
    UPDATE public.telegram_users
    SET client_id = NEW.id
    WHERE org_uid = NEW.org_uid
      AND user_id = NEW.telegram_user_id
      AND (client_id IS DISTINCT FROM NEW.id);
  END IF;

  IF NEW.whatsapp_user_id IS NOT NULL THEN
    UPDATE public.whatsapp_users
    SET client_id = NEW.id
    WHERE org_uid = NEW.org_uid
      AND user_id = NEW.whatsapp_user_id
      AND (client_id IS DISTINCT FROM NEW.id);
  END IF;

  IF NEW.max_user_id IS NOT NULL THEN
    UPDATE public.max_users
    SET client_id = NEW.id
    WHERE org_uid = NEW.org_uid
      AND user_id = NEW.max_user_id
      AND (client_id IS DISTINCT FROM NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_sync_links_to_users ON public.clients;
CREATE TRIGGER clients_sync_links_to_users
AFTER INSERT OR UPDATE OF telegram_user_id, whatsapp_user_id, max_user_id, org_uid
ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.sync_client_links_to_user_tables();
