-- =============================================
-- GROWICE: Полный сброс и пересоздание схемы
-- Запускать в Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ugocvtuomyopullvilim/sql
-- =============================================

-- ── 1. Удаляем старые таблицы данных ──────────────────────────────────────────

DROP TABLE IF EXISTS messages          CASCADE;
DROP TABLE IF EXISTS clients_tg        CASCADE;
DROP TABLE IF EXISTS about_business    CASCADE;
DROP TABLE IF EXISTS client_channels   CASCADE;
DROP TABLE IF EXISTS appointments      CASCADE;
DROP TABLE IF EXISTS clients           CASCADE;
DROP TABLE IF EXISTS telegram_users    CASCADE;
DROP TABLE IF EXISTS whatsapp_users    CASCADE;
DROP TABLE IF EXISTS max_users         CASCADE;

-- ── 2. Удаляем платформенные таблицы (пересоздадим чистыми) ───────────────────

DROP TABLE IF EXISTS channel_connection_events CASCADE;
DROP TABLE IF EXISTS channel_connections       CASCADE;
DROP TABLE IF EXISTS knowledge_files           CASCADE;
DROP TABLE IF EXISTS action_log                CASCADE;
DROP TABLE IF EXISTS metrics_day               CASCADE;
DROP TABLE IF EXISTS metrics_month             CASCADE;
DROP TABLE IF EXISTS webhooks                  CASCADE;
DROP TABLE IF EXISTS system_states             CASCADE;
DROP TABLE IF EXISTS map_ratings               CASCADE;
DROP TABLE IF EXISTS org_settings              CASCADE;
DROP TABLE IF EXISTS user_profiles             CASCADE;  -- удалена: профили/роли не используются

-- ── 3. Удаляем функции/триггеры предыдущих миграций ───────────────────────────

DROP FUNCTION IF EXISTS update_channel_connections_ts() CASCADE;

-- =============================================================================
-- ПЛАТФОРМЕННЫЕ ТАБЛИЦЫ (для веб-интерфейса)
-- =============================================================================

-- Настройки организации / филиала
CREATE TABLE org_settings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid                  UUID UNIQUE NOT NULL,
  salon_name               TEXT DEFAULT 'Салон красоты',
  contacts_import_source   TEXT DEFAULT 'yclients' CHECK (contacts_import_source IN ('yclients', 'google_sheets')),
  contacts_source_meta     JSONB DEFAULT '{}'::jsonb,
  greeting_message         TEXT DEFAULT 'Привет! Чем могу помочь?',
  work_start               TIME DEFAULT '09:00',
  work_end                 TIME DEFAULT '21:00',
  active_threshold_days    INTEGER DEFAULT 30,
  at_risk_threshold_days   INTEGER DEFAULT 50,
  inactive_threshold_days  INTEGER DEFAULT 90,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);

-- Состояния автосистем
CREATE TABLE system_states (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid      UUID NOT NULL,
  system_code  TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  enabled      BOOLEAN DEFAULT false,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_uid, system_code)
);

-- Рейтинги на картах (Яндекс / 2ГИС)
CREATE TABLE map_ratings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid        UUID NOT NULL,
  source         TEXT NOT NULL CHECK (source IN ('яндекс', '2гис')),
  rating         NUMERIC(3,1) DEFAULT 0,
  reviews_count  INTEGER DEFAULT 0,
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_uid, source)
);

-- База знаний (файлы)
CREATE TABLE knowledge_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid      UUID NOT NULL,
  name         TEXT NOT NULL,
  file_type    TEXT,
  storage_url  TEXT,
  drive_url    TEXT,
  status       TEXT DEFAULT 'загружен',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Журнал действий (вебхук-вызовы)
CREATE TABLE action_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid        UUID NOT NULL,
  action_code    TEXT NOT NULL,
  params         JSONB,
  status         TEXT DEFAULT 'успех',
  error_message  TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Метрики за день
CREATE TABLE metrics_day (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid             UUID NOT NULL,
  date                DATE NOT NULL,
  unique_contacts     INTEGER DEFAULT 0,
  incoming_messages   INTEGER DEFAULT 0,
  outgoing_messages   INTEGER DEFAULT 0,
  appointments        INTEGER DEFAULT 0,
  revenue             NUMERIC DEFAULT 0,
  no_shows            INTEGER DEFAULT 0,
  new_clients         INTEGER DEFAULT 0,
  UNIQUE (org_uid, date)
);

-- Метрики за месяц
CREATE TABLE metrics_month (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid             UUID NOT NULL,
  month               DATE NOT NULL,
  unique_contacts     INTEGER DEFAULT 0,
  incoming_messages   INTEGER DEFAULT 0,
  outgoing_messages   INTEGER DEFAULT 0,
  appointments        INTEGER DEFAULT 0,
  revenue             NUMERIC DEFAULT 0,
  no_shows            INTEGER DEFAULT 0,
  new_clients         INTEGER DEFAULT 0,
  avg_check           NUMERIC DEFAULT 0,
  UNIQUE (org_uid, month)
);

-- Реестр вебхуков
CREATE TABLE webhooks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid      UUID NOT NULL,
  action_code  TEXT NOT NULL,
  url          TEXT NOT NULL,
  enabled      BOOLEAN DEFAULT true,
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_uid, action_code)
);

-- Подключения каналов (WhatsApp / Max через GREEN-API)
CREATE TABLE channel_connections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid              UUID NOT NULL,
  channel_code         TEXT NOT NULL,        -- 'whatsapp' | 'max'
  provider             TEXT NOT NULL DEFAULT 'green_api',
  status               TEXT NOT NULL DEFAULT 'disconnected',
  display_name         TEXT,
  external_account_id  TEXT,
  instance_id          TEXT,
  api_url              TEXT,
  media_url            TEXT,
  api_token            TEXT,
  webhook_url          TEXT,
  last_checked_at      TIMESTAMPTZ,
  connected_at         TIMESTAMPTZ,
  disconnected_at      TIMESTAMPTZ,
  error_code           TEXT,
  error_message        TEXT,
  meta                 JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_uid, channel_code)
);

CREATE TABLE channel_connection_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id  UUID REFERENCES channel_connections(id) ON DELETE CASCADE,
  event_code     TEXT NOT NULL,
  payload        JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Триггер updated_at для channel_connections
CREATE OR REPLACE FUNCTION update_channel_connections_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channel_connections_ts
  BEFORE UPDATE ON channel_connections
  FOR EACH ROW EXECUTE FUNCTION update_channel_connections_ts();

-- =============================================================================
-- ТАБЛИЦЫ ДАННЫХ (для n8n и отображения на платформе)
-- =============================================================================

-- Пользователи Telegram (все, кто написал боту)
CREATE TABLE telegram_users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid          UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  user_id          BIGINT NOT NULL,           -- Telegram user_id
  yc_id            TEXT,                      -- появляется после первой записи в YClients
  yclients_id      BIGINT,                    -- числовой ID клиента из YClients
  client_fullname  TEXT,                      -- имя клиента из диалога/бота до полной синхронизации
  client_phone     TEXT,
  tg_username      TEXT,
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

-- Пользователи WhatsApp (все, кто написал боту)
CREATE TABLE whatsapp_users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid          UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  user_id          TEXT NOT NULL,             -- номер телефона или WA ID
  yc_id            TEXT,                      -- появляется после первой записи в YClients
  yclients_id      BIGINT,                    -- числовой ID клиента из YClients
  client_fullname  TEXT,
  client_phone     TEXT,
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

-- Пользователи Max (все, кто написал боту)
CREATE TABLE max_users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid          UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  user_id          TEXT NOT NULL,             -- Max user ID
  yc_id            TEXT,                      -- появляется после первой записи в YClients
  yclients_id      BIGINT,                    -- числовой ID клиента из YClients
  client_fullname  TEXT,
  client_phone     TEXT,
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

-- Клиенты (те, кто записался — имеют yc_id)
CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid     UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  fullname    TEXT NOT NULL,
  phone       TEXT,
  gender      TEXT CHECK (gender IN ('мужской', 'женский') OR gender IS NULL),
  yc_id       TEXT,    -- ID клиента в YClients
  yclients_id BIGINT,  -- числовой ID клиента в YClients
  telegram_user_id BIGINT, -- связь с telegram_users.user_id
  whatsapp_user_id TEXT,   -- связь с whatsapp_users.user_id
  max_user_id      TEXT,   -- связь с max_users.user_id
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_uid, yc_id)
);

-- Записи (визиты)
CREATE TABLE appointments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid       UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',

  -- Связь с клиентом
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  yc_id         TEXT,          -- yc_id клиента (денормализовано для n8n)
  client_name   TEXT,
  phone         TEXT,
  contact       TEXT,          -- канал контакта (tg/wa/etc)

  -- Запись
  status        TEXT,
  service_name  TEXT,
  service_id    TEXT,
  master_id     TEXT,
  master_name   TEXT,
  date          TIMESTAMPTZ,
  duration_min  INTEGER,
  price         NUMERIC,
  comment       TEXT,

  -- Уникальные идентификаторы YClients
  record_id     TEXT NOT NULL,
  record_hash   TEXT NOT NULL,

  -- Флаги напоминаний (выставляет n8n)
  reminder_1h   BOOLEAN DEFAULT false,
  reminder_2h   BOOLEAN DEFAULT false,
  reminder_12h  BOOLEAN DEFAULT false,
  reminder_8am  BOOLEAN DEFAULT false,
  reminder_24h  BOOLEAN DEFAULT false,

  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (record_id),
  UNIQUE (record_hash)
);

-- Каналы связи клиента (центральная таблица для приоритетной рассылки)
-- priority=1 → самый приоритетный канал (обычно Telegram)
-- can_notify=false → клиент отписался от уведомлений по этому каналу
-- is_active=false  → канал заблокирован или недоступен
CREATE TABLE client_channels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel          TEXT NOT NULL CHECK (channel IN ('telegram', 'whatsapp', 'max', 'phone')),
  channel_user_id  TEXT NOT NULL,  -- user_id из tg/wa/max таблицы, или номер для 'phone'
  priority         INTEGER NOT NULL DEFAULT 99,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  can_notify       BOOLEAN NOT NULL DEFAULT true,
  identified_via   TEXT,           -- 'phone_match' | 'manual' | 'self_reported'
  last_used        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (client_id, channel)
);

CREATE OR REPLACE FUNCTION update_client_channels_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_channels_ts
  BEFORE UPDATE ON client_channels
  FOR EACH ROW EXECUTE FUNCTION update_client_channels_ts();

-- =============================================================================
-- ИНДЕКСЫ
-- =============================================================================

CREATE INDEX idx_telegram_users_user_id     ON telegram_users (user_id);
CREATE INDEX idx_telegram_users_org         ON telegram_users (org_uid);
CREATE INDEX idx_telegram_users_client_id   ON telegram_users (client_id);
CREATE INDEX idx_whatsapp_users_user_id     ON whatsapp_users (user_id);
CREATE INDEX idx_whatsapp_users_org         ON whatsapp_users (org_uid);
CREATE INDEX idx_whatsapp_users_client_id   ON whatsapp_users (client_id);
CREATE INDEX idx_max_users_user_id          ON max_users (user_id);
CREATE INDEX idx_max_users_org              ON max_users (org_uid);
CREATE INDEX idx_max_users_client_id        ON max_users (client_id);
CREATE INDEX idx_clients_org                ON clients (org_uid);
CREATE INDEX idx_clients_phone              ON clients (phone);
CREATE INDEX idx_clients_yc_id              ON clients (yc_id);
CREATE INDEX idx_appointments_org           ON appointments (org_uid);
CREATE INDEX idx_appointments_client_id     ON appointments (client_id);
CREATE INDEX idx_appointments_date          ON appointments (date);
CREATE INDEX idx_appointments_status        ON appointments (status);
CREATE INDEX idx_appointments_record_id     ON appointments (record_id);
CREATE INDEX idx_client_channels_client     ON client_channels (client_id);
CREATE INDEX idx_client_channels_routing    ON client_channels (client_id, is_active, can_notify, priority);
CREATE INDEX idx_client_channels_lookup     ON client_channels (channel, channel_user_id);
CREATE INDEX idx_action_log_org             ON action_log (org_uid, created_at DESC);
CREATE INDEX idx_metrics_day_org_date       ON metrics_day (org_uid, date DESC);
CREATE INDEX idx_metrics_month_org_month    ON metrics_month (org_uid, month DESC);

-- =============================================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ ДЛЯ ОРГАНИЗАЦИИ
-- =============================================================================

INSERT INTO org_settings (org_uid, salon_name, greeting_message)
VALUES ('11111111-1111-1111-1111-111111111111', 'Салон красоты', 'Привет! Чем могу помочь?')
ON CONFLICT (org_uid) DO NOTHING;

INSERT INTO map_ratings (org_uid, source, rating, reviews_count) VALUES
  ('11111111-1111-1111-1111-111111111111', 'яндекс', 4.8, 127),
  ('11111111-1111-1111-1111-111111111111', '2гис',   4.9,  89)
ON CONFLICT (org_uid, source) DO NOTHING;

INSERT INTO system_states (org_uid, system_code, name, description, enabled) VALUES
  ('11111111-1111-1111-1111-111111111111', 'main_agent',        'Основной агент',      'Обработка входящих обращений и запись клиентов',         true),
  ('11111111-1111-1111-1111-111111111111', 'vozvrat_klienta',   'Возврат клиента',     'Авторассылка клиентам, не посещавшим более 50 дней',     false),
  ('11111111-1111-1111-1111-111111111111', 'blagodarnost',      'Благодарность',       'Запрос отзыва и чаевых после визита',                    true),
  ('11111111-1111-1111-1111-111111111111', 'napominaniya',      'Напоминания',         'Поэтапное подтверждение записи (24ч, 12ч, 2ч, 1ч)',      true),
  ('11111111-1111-1111-1111-111111111111', 'otchetnost',        'Отчётность',          'Еженедельный отчёт владельцу',                           true),
  ('11111111-1111-1111-1111-111111111111', 'avto_sdvig',        'Авто-сдвиг',          'Предложить более раннее время при появлении окна',       false),
  ('11111111-1111-1111-1111-111111111111', 'doprodazha',        'Допродажа',           'Смежные услуги после записи',                            false),
  ('11111111-1111-1111-1111-111111111111', 'analitika_otmeny',  'Аналитика отмены',    'Уточнение причины отмены или неявки',                    true),
  ('11111111-1111-1111-1111-111111111111', 'obrabotchik_otzyvov','Обработчик отзывов', 'Автоответы на отзывы + уведомление администратора',      false)
ON CONFLICT (org_uid, system_code) DO NOTHING;

-- =============================================================================
-- RLS (Row Level Security)
-- =============================================================================

ALTER TABLE org_settings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_states             ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_ratings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_files           ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_log                ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_day               ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_month             ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_channels           ENABLE ROW LEVEL SECURITY;

-- Платформенные таблицы — anon может читать и писать (фронтенд)
CREATE POLICY "anon_all_org_settings"    ON org_settings    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_system_states"   ON system_states   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_map_ratings"    ON map_ratings     FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_map_ratings"     ON map_ratings     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_knowledge_files" ON knowledge_files FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_action_log"      ON action_log      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_metrics_day"     ON metrics_day     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_metrics_month"   ON metrics_month   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_webhooks"       ON webhooks        FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_connections"    ON channel_connections       FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_events"         ON channel_connection_events FOR SELECT TO anon USING (true);

-- Таблицы данных — anon читает (фронтенд), n8n пишет через service_role
CREATE POLICY "anon_read_telegram_users"   ON telegram_users   FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_whatsapp_users"   ON whatsapp_users   FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_max_users"        ON max_users        FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_clients"          ON clients          FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_appointments"     ON appointments     FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_client_channels"  ON client_channels  FOR SELECT TO anon USING (true);

-- Service role (n8n) — полный доступ без RLS (автоматически обходит RLS)
-- n8n должен использовать SUPABASE_SERVICE_ROLE_KEY, а не anon key
