-- =============================================================================
-- Миграция: автолинковка пользователя мессенджера с клиентом при первой записи
-- Применена: 2026-04-07 (через Supabase MCP)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Создать таблицу client_channels (не существовала в live DB)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_channels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel          TEXT NOT NULL CHECK (channel IN ('telegram', 'whatsapp', 'max', 'phone')),
  channel_user_id  TEXT NOT NULL,
  priority         INTEGER NOT NULL DEFAULT 99,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  can_notify       BOOLEAN NOT NULL DEFAULT true,
  identified_via   TEXT,
  last_used        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (client_id, channel)
);

CREATE OR REPLACE FUNCTION update_client_channels_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_channels_ts ON client_channels;
CREATE TRIGGER client_channels_ts
  BEFORE UPDATE ON client_channels
  FOR EACH ROW EXECUTE FUNCTION update_client_channels_ts();

CREATE INDEX IF NOT EXISTS idx_client_channels_client   ON client_channels (client_id);
CREATE INDEX IF NOT EXISTS idx_client_channels_routing  ON client_channels (client_id, is_active, can_notify, priority);
CREATE INDEX IF NOT EXISTS idx_client_channels_lookup   ON client_channels (channel, channel_user_id);

ALTER TABLE client_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_client_channels" ON client_channels;
CREATE POLICY "anon_read_client_channels" ON client_channels FOR SELECT TO anon USING (true);

-- Индексы для user таблиц (если не существуют)
CREATE INDEX IF NOT EXISTS idx_tg_users_client_id ON telegram_users (client_id);
CREATE INDEX IF NOT EXISTS idx_wa_users_client_id ON whatsapp_users (client_id);
CREATE INDEX IF NOT EXISTS idx_max_users_client_id ON max_users (client_id) WHERE client_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Добавить tg_id в appointments (именно это поле пишет n8n)
-- -----------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS tg_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_appointments_tg_id ON appointments (tg_id) WHERE tg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_phone ON appointments (phone) WHERE phone IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. Функция автолинковки: appointment → telegram_user → client → client_channels
--
-- Логика:
--   a) Есть tg_id → ищем telegram_user по (org_uid, user_id)
--   b) Есть phone → ищем по clients.phone
--   c) Нашли user → берём его client_id, или создаём client
--   d) Обновляем appointments.client_id
--   e) Upsert в client_channels
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_appointment_to_client()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_uid        UUID    := COALESCE(NEW.org_uid, '11111111-1111-1111-1111-111111111111'::uuid);
  v_client_id      UUID    := NEW.client_id;
  v_tg_user_id     BIGINT;
  v_wa_user_id     TEXT;
  v_channel        TEXT    := NULL;
  v_channel_uid    TEXT    := NULL;
  v_priority       INTEGER := 99;
  v_phone_norm     TEXT;
  v_fullname       TEXT    := COALESCE(NEW.client_name, '');
BEGIN
  -- Уже привязан — ничего не делаем
  IF v_client_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Нормализуем телефон
  IF NEW.phone IS NOT NULL THEN
    v_phone_norm := REGEXP_REPLACE(NEW.phone, '\D', '', 'g');
    IF LEFT(v_phone_norm, 1) = '8' THEN
      v_phone_norm := '7' || SUBSTRING(v_phone_norm, 2);
    END IF;
    IF LENGTH(v_phone_norm) < 10 THEN
      v_phone_norm := NULL;
    END IF;
  END IF;

  -- ── Путь A: есть tg_id ──────────────────────────────────────────────────
  IF NEW.tg_id IS NOT NULL THEN
    -- Сначала пробуем найти клиента через telegram_user.client_id
    SELECT tu.client_id
    INTO v_client_id
    FROM public.telegram_users tu
    WHERE tu.org_uid = v_org_uid
      AND tu.user_id = NEW.tg_id
      AND tu.client_id IS NOT NULL
    LIMIT 1;

    IF v_client_id IS NULL THEN
      -- Ищем по телефону
      IF v_phone_norm IS NOT NULL THEN
        SELECT c.id INTO v_client_id
        FROM public.clients c
        WHERE c.org_uid = v_org_uid
          AND REGEXP_REPLACE(COALESCE(c.phone, c.normalized_phone, ''), '\D', '', 'g') = v_phone_norm
        LIMIT 1;
      END IF;

      -- Создаём нового клиента (раз создаёт запись — уже 'client')
      IF v_client_id IS NULL THEN
        INSERT INTO public.clients (
          org_uid, fullname, display_name, phone, normalized_phone,
          telegram_user_id, lifecycle_status, source_channel
        )
        VALUES (
          v_org_uid,
          NULLIF(TRIM(v_fullname), ''),
          NULLIF(TRIM(v_fullname), ''),
          v_phone_norm,
          v_phone_norm,
          NEW.tg_id,
          'client',
          'telegram'
        )
        RETURNING id INTO v_client_id;
      ELSE
        -- Нашли по телефону — добавляем telegram_user_id
        UPDATE public.clients
        SET telegram_user_id = NEW.tg_id,
            lifecycle_status = 'client'
        WHERE id = v_client_id
          AND telegram_user_id IS NULL;
      END IF;

      -- Проставляем client_id в telegram_user
      UPDATE public.telegram_users
      SET client_id = v_client_id
      WHERE org_uid = v_org_uid
        AND user_id = NEW.tg_id
        AND (client_id IS NULL OR client_id IS DISTINCT FROM v_client_id);
    ELSE
      -- Клиент уже привязан — апгрейд статуса
      UPDATE public.clients
      SET lifecycle_status = 'client'
      WHERE id = v_client_id AND lifecycle_status = 'lead';
    END IF;

    v_channel := 'telegram';
    v_channel_uid := NEW.tg_id::text;
    v_priority := 1;
  END IF;

  -- ── Путь B: нет tg_id, но есть phone ────────────────────────────────────
  IF v_client_id IS NULL AND v_phone_norm IS NOT NULL THEN
    SELECT c.id INTO v_client_id
    FROM public.clients c
    WHERE c.org_uid = v_org_uid
      AND REGEXP_REPLACE(COALESCE(c.phone, c.normalized_phone, ''), '\D', '', 'g') = v_phone_norm
    LIMIT 1;

    IF v_client_id IS NULL THEN
      INSERT INTO public.clients (
        org_uid, fullname, display_name, phone, normalized_phone,
        lifecycle_status, source_channel
      )
      VALUES (
        v_org_uid,
        NULLIF(TRIM(v_fullname), ''),
        NULLIF(TRIM(v_fullname), ''),
        v_phone_norm,
        v_phone_norm,
        'client',
        'yclients'
      )
      RETURNING id INTO v_client_id;
    ELSE
      UPDATE public.clients
      SET lifecycle_status = 'client'
      WHERE id = v_client_id AND lifecycle_status = 'lead';
    END IF;
  END IF;

  -- ── Записываем client_id в appointment ──────────────────────────────────
  IF v_client_id IS NOT NULL THEN
    NEW.client_id := v_client_id;

    IF v_channel IS NOT NULL AND v_channel_uid IS NOT NULL THEN
      INSERT INTO public.client_channels (
        client_id, channel, channel_user_id, priority,
        is_active, can_notify, identified_via
      )
      VALUES (
        v_client_id, v_channel, v_channel_uid, v_priority,
        true, true, 'booking'
      )
      ON CONFLICT (client_id, channel) DO UPDATE SET
        channel_user_id = EXCLUDED.channel_user_id,
        is_active       = true,
        identified_via  = CASE
          WHEN client_channels.identified_via = 'booking' THEN 'booking'
          ELSE client_channels.identified_via
        END,
        updated_at      = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_link_client ON public.appointments;
CREATE TRIGGER appointments_link_client
BEFORE INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.link_appointment_to_client();
