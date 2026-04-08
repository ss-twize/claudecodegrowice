-- ============================================================
-- Config Model Migration
-- Run manually in Supabase SQL editor:
-- https://supabase.com/dashboard/project/ugocvtuomyopullvilim/sql
-- ============================================================

-- 1. New table: integration_settings
CREATE TABLE IF NOT EXISTS integration_settings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid          uuid NOT NULL,
  integration_code text NOT NULL,  -- 'yclients' | 'green_api' | 'telegram'
  enabled          boolean DEFAULT true,
  status           text DEFAULT 'not_configured'
                   CHECK (status IN ('connected','error','not_configured')),
  credentials      jsonb DEFAULT '{}',
  meta             jsonb DEFAULT '{}',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(org_uid, integration_code)
);

-- 2. New table: client_config
CREATE TABLE IF NOT EXISTS client_config (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid              uuid UNIQUE NOT NULL,
  -- Client statuses
  vip_revenue_min      integer DEFAULT 80000,
  vip_visits_min       integer DEFAULT 12,
  lost_days            integer DEFAULT 120,
  sleeping_days        integer DEFAULT 60,
  active_days          integer DEFAULT 30,
  at_risk_days         integer DEFAULT 90,
  -- Client value
  high_value_revenue   integer DEFAULT 50000,
  medium_value_revenue integer DEFAULT 15000,
  -- Reactivation
  reactivation_days    integer DEFAULT 45,
  -- Service categories
  service_category_map jsonb DEFAULT '{}',
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- Auto-update updated_at on modifications
CREATE OR REPLACE FUNCTION set_updated_at_generic()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_integration_settings_updated_at ON integration_settings;
CREATE TRIGGER trg_integration_settings_updated_at
  BEFORE UPDATE ON integration_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_generic();

DROP TRIGGER IF EXISTS trg_client_config_updated_at ON client_config;
CREATE TRIGGER trg_client_config_updated_at
  BEFORE UPDATE ON client_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_generic();

-- 3. Extend system_states with is_available
ALTER TABLE system_states
  ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;

-- Mark in-development systems as unavailable
UPDATE system_states SET is_available = false
WHERE system_code IN ('avto_sdvig', 'analitika_otmeny', 'obrabotchik_otzyvov');

-- 4. Extend org_settings with new fields
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS support_url text,
  ADD COLUMN IF NOT EXISTS timezone    text DEFAULT 'Europe/Moscow',
  ADD COLUMN IF NOT EXISTS currency    text DEFAULT 'RUB';

-- 5. Seed data for default organization
INSERT INTO client_config (org_uid, service_category_map)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '{"Маникюр":"Ногтевой сервис","Педикюр":"Ногтевой сервис","Окрашивание":"Волосы","Стрижка":"Волосы","Брови":"Брови и ресницы","Косметология":"Косметология","Массаж":"SPA"}'::jsonb
)
ON CONFLICT (org_uid) DO NOTHING;

INSERT INTO integration_settings (org_uid, integration_code) VALUES
  ('11111111-1111-1111-1111-111111111111', 'yclients'),
  ('11111111-1111-1111-1111-111111111111', 'green_api'),
  ('11111111-1111-1111-1111-111111111111', 'telegram')
ON CONFLICT (org_uid, integration_code) DO NOTHING;
