-- =============================================
-- GROWICE: New tables migration
-- Does NOT modify existing tables
-- =============================================

-- 1. User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid uuid,
  org_uid uuid NOT NULL,
  role text NOT NULL DEFAULT 'администратор' CHECK (role IN ('владелец', 'администратор')),
  display_name text,
  created_at timestamptz DEFAULT now()
);

-- 2. Organization settings
CREATE TABLE IF NOT EXISTS org_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid uuid UNIQUE NOT NULL,
  minutes_per_contact_min integer DEFAULT 3,
  minutes_per_contact_max integer DEFAULT 5,
  work_start time DEFAULT '09:00',
  work_end time DEFAULT '21:00',
  drive_folder_uid text,
  active_threshold_days integer DEFAULT 30,
  at_risk_threshold_days integer DEFAULT 50,
  inactive_threshold_days integer DEFAULT 90,
  greeting_message text DEFAULT 'Привет! Я ваш ИИ-помощник салона красоты. Как могу помочь?',
  salon_name text DEFAULT 'Салон красоты',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. System states (auto-systems toggle)
CREATE TABLE IF NOT EXISTS system_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid uuid NOT NULL,
  system_code text NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_uid, system_code)
);

-- 4. Map ratings (Yandex / 2GIS)
CREATE TABLE IF NOT EXISTS map_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('яндекс', '2гис')),
  rating numeric(3,1) DEFAULT 0,
  reviews_count integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_uid, source)
);

-- 5. Knowledge base files
CREATE TABLE IF NOT EXISTS knowledge_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid uuid NOT NULL,
  name text NOT NULL,
  file_type text,
  storage_url text,
  drive_url text,
  status text DEFAULT 'загружен',
  created_at timestamptz DEFAULT now()
);

-- 6. Action log (webhook call journal)
CREATE TABLE IF NOT EXISTS action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid uuid NOT NULL,
  user_uid uuid,
  role text,
  action_code text NOT NULL,
  params jsonb,
  status text DEFAULT 'успех',
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- 7. Daily metrics snapshot
CREATE TABLE IF NOT EXISTS metrics_day (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid uuid NOT NULL,
  date date NOT NULL,
  unique_contacts integer DEFAULT 0,
  incoming_messages integer DEFAULT 0,
  outgoing_messages integer DEFAULT 0,
  appointments integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  no_shows integer DEFAULT 0,
  new_clients integer DEFAULT 0,
  UNIQUE(org_uid, date)
);

-- 8. Monthly metrics snapshot
CREATE TABLE IF NOT EXISTS metrics_month (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid uuid NOT NULL,
  month date NOT NULL,
  unique_contacts integer DEFAULT 0,
  incoming_messages integer DEFAULT 0,
  outgoing_messages integer DEFAULT 0,
  appointments integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  no_shows integer DEFAULT 0,
  new_clients integer DEFAULT 0,
  avg_check numeric DEFAULT 0,
  UNIQUE(org_uid, month)
);

-- 9. Webhook registry
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid uuid NOT NULL,
  action_code text NOT NULL,
  url text NOT NULL,
  enabled boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_uid, action_code)
);

-- =============================================
-- SEED DATA for org 11111111-1111-1111-1111-111111111111
-- =============================================

INSERT INTO org_settings (org_uid) VALUES ('11111111-1111-1111-1111-111111111111')
ON CONFLICT (org_uid) DO NOTHING;

INSERT INTO map_ratings (org_uid, source, rating, reviews_count) VALUES
  ('11111111-1111-1111-1111-111111111111', 'яндекс', 4.8, 127),
  ('11111111-1111-1111-1111-111111111111', '2гис', 4.9, 89)
ON CONFLICT (org_uid, source) DO NOTHING;

INSERT INTO system_states (org_uid, system_code, name, description, enabled) VALUES
  ('11111111-1111-1111-1111-111111111111', 'main_agent', 'Основной агент', 'Обработка входящих обращений и запись клиентов', true),
  ('11111111-1111-1111-1111-111111111111', 'vozvrat_klienta', 'Возврат клиента', 'Авторассылка клиентам, не посещавшим более 50 дней', false),
  ('11111111-1111-1111-1111-111111111111', 'blagodarnost', 'Благодарность', 'Запрос отзыва и чаевых после визита', true),
  ('11111111-1111-1111-1111-111111111111', 'napominaniya', 'Напоминания', 'Поэтапное подтверждение записи (24ч, 2ч, 1ч)', true),
  ('11111111-1111-1111-1111-111111111111', 'otchetnost', 'Отчётность', 'Еженедельный отчёт владельцу', true),
  ('11111111-1111-1111-1111-111111111111', 'avto_sdvig', 'Авто-сдвиг', 'Предложить более раннее время при появлении окна', false),
  ('11111111-1111-1111-1111-111111111111', 'doprodazha', 'Допродажа', 'Смежные услуги после записи', false),
  ('11111111-1111-1111-1111-111111111111', 'analitika_otmeny', 'Аналитика отмены', 'Уточнение причины отмены или неявки', true),
  ('11111111-1111-1111-1111-111111111111', 'obrabotchik_otzyvov', 'Обработчик отзывов', 'Автоответы на отзывы + уведомление администратора', false)
ON CONFLICT (org_uid, system_code) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_month ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Allow anon read on non-sensitive tables (for demo - in production use proper auth)
CREATE POLICY IF NOT EXISTS "anon_read_map_ratings" ON map_ratings FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "anon_read_system_states" ON system_states FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "anon_read_org_settings" ON org_settings FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "anon_read_knowledge_files" ON knowledge_files FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "anon_all_action_log" ON action_log FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_metrics_day" ON metrics_day FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_metrics_month" ON metrics_month FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_read_webhooks" ON webhooks FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "anon_all_system_states" ON system_states FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_org_settings" ON org_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_knowledge_files" ON knowledge_files FOR ALL TO anon USING (true) WITH CHECK (true);
