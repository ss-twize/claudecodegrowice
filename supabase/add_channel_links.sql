-- =============================================================================
-- GROWICE: Связи между мессенджерами и клиентами
-- Запускать ПОСЛЕ reset_schema.sql
-- https://supabase.com/dashboard/project/ugocvtuomyopullvilim/sql
-- =============================================================================

-- ── 1. Таблица пользователей Max (если ещё не создана) ───────────────────────

DROP TABLE IF EXISTS max_users CASCADE;

CREATE TABLE max_users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid          UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  user_id          TEXT NOT NULL,           -- Max user ID
  first_name       TEXT,
  last_name        TEXT,
  blocked          BOOLEAN DEFAULT false,
  allow_marketing  BOOLEAN DEFAULT true,
  can_message      BOOLEAN DEFAULT true,
  last_message     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  UNIQUE (org_uid, user_id)
);

-- ── 2. Добавляем client_id в таблицы мессенджеров ────────────────────────────

-- Telegram
ALTER TABLE telegram_users
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- WhatsApp
ALTER TABLE whatsapp_users
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- ── 3. Центральная таблица каналов связи клиента ─────────────────────────────
--
-- Одна строка = один канал одного клиента.
-- Именно по этой таблице n8n определяет, куда слать уведомление.
--
-- Как работает приоритет:
--   priority=1 → пробуем первым (обычно Telegram)
--   priority=2 → если первый недоступен (WhatsApp)
--   priority=3 → последний резерв (Max)
--   can_notify=false → канал есть, но клиент отписался от уведомлений
--   is_active=false  → канал заблокирован / недоступен

DROP TABLE IF EXISTS client_channels CASCADE;

CREATE TABLE client_channels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Клиент
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Канал
  channel          TEXT NOT NULL CHECK (channel IN ('telegram', 'whatsapp', 'max', 'phone')),
  channel_user_id  TEXT NOT NULL,  -- user_id из соответствующей таблицы мессенджера
                                   -- для 'phone' — просто номер телефона

  -- Настройки
  priority         INTEGER NOT NULL DEFAULT 99,  -- 1 = самый приоритетный
  is_active        BOOLEAN NOT NULL DEFAULT true,
  can_notify       BOOLEAN NOT NULL DEFAULT true, -- false = клиент отписался

  -- Мета
  identified_via   TEXT,   -- как была установлена связь: 'phone_match'|'manual'|'self_reported'
  last_used        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),

  -- Один клиент — один канал каждого типа
  UNIQUE (client_id, channel)
);

-- Триггер updated_at
CREATE OR REPLACE FUNCTION update_client_channels_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_channels_ts
  BEFORE UPDATE ON client_channels
  FOR EACH ROW EXECUTE FUNCTION update_client_channels_ts();

-- ── 4. Индексы ────────────────────────────────────────────────────────────────

CREATE INDEX idx_max_users_user_id        ON max_users (user_id);
CREATE INDEX idx_max_users_org            ON max_users (org_uid);
CREATE INDEX idx_max_users_client_id      ON max_users (client_id);

CREATE INDEX idx_tg_users_client_id       ON telegram_users (client_id);
CREATE INDEX idx_wa_users_client_id       ON whatsapp_users (client_id);

CREATE INDEX idx_client_channels_client   ON client_channels (client_id);
CREATE INDEX idx_client_channels_routing  ON client_channels (client_id, is_active, can_notify, priority);
CREATE INDEX idx_client_channels_lookup   ON client_channels (channel, channel_user_id);

-- ── 5. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE max_users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_max_users"      ON max_users       FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_client_channels" ON client_channels FOR SELECT TO anon USING (true);

-- n8n пишет через service_role (обходит RLS автоматически)

-- =============================================================================
-- СПРАВКА ДЛЯ n8n
-- =============================================================================

-- Как n8n должен связывать пользователя с клиентом
-- (например, при записи в YClients пришёл номер телефона):
--
-- 1. Найти клиента по телефону:
--    SELECT id FROM clients WHERE phone = $phone LIMIT 1;
--
-- 2. Если нашли — записать client_id в таблицу мессенджера:
--    UPDATE telegram_users SET client_id = $client_id WHERE user_id = $tg_user_id;
--
-- 3. Зарегистрировать канал с приоритетом:
--    INSERT INTO client_channels
--      (client_id, channel, channel_user_id, priority, identified_via)
--    VALUES
--      ($client_id, 'telegram', $tg_user_id::text, 1, 'phone_match')
--    ON CONFLICT (client_id, channel) DO UPDATE
--      SET channel_user_id = EXCLUDED.channel_user_id,
--          is_active = true,
--          updated_at = now();

-- Как n8n выбирает канал для уведомления (приоритетная рассылка):
--
--    SELECT channel, channel_user_id
--    FROM client_channels
--    WHERE client_id   = $client_id
--      AND is_active   = true
--      AND can_notify  = true
--    ORDER BY priority ASC;
--
-- Результат — список каналов по приоритету.
-- n8n пробует первый, при неудаче — следующий.

-- Типичные приоритеты (выставляет n8n при идентификации):
--   telegram  → priority = 1
--   whatsapp  → priority = 2
--   max       → priority = 3
--   phone     → priority = 4  (SMS / звонок, если всё остальное недоступно)
