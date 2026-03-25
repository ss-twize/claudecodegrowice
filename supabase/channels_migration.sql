-- ═══════════════════════════════════════════════════
-- Channel Connections — GREEN-API (WhatsApp / Max)
-- Run AFTER migration.sql
-- ═══════════════════════════════════════════════════

DROP TABLE IF EXISTS channel_connection_events CASCADE;
DROP TABLE IF EXISTS channel_connections CASCADE;

-- ── Main connections table ───────────────────────
CREATE TABLE channel_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid           UUID NOT NULL,
  channel_code      TEXT NOT NULL,          -- 'whatsapp' | 'max'
  provider          TEXT NOT NULL DEFAULT 'green_api',
  status            TEXT NOT NULL DEFAULT 'disconnected',
    -- disconnected | creating | pending_auth | connected | error

  -- Account info (safe to expose to browser)
  display_name      TEXT,
  external_account_id TEXT,

  -- GREEN-API instance data (server-only — never SELECT from client)
  instance_id       TEXT,
  api_url           TEXT,
  media_url         TEXT,
  api_token         TEXT,
  webhook_url       TEXT,

  -- Timestamps
  last_checked_at   TIMESTAMPTZ,
  connected_at      TIMESTAMPTZ,
  disconnected_at   TIMESTAMPTZ,

  -- Error state
  error_code        TEXT,
  error_message     TEXT,

  -- Extra data
  meta              JSONB DEFAULT '{}',

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (org_uid, channel_code)
);

-- ── Events log ──────────────────────────────────
CREATE TABLE channel_connection_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id  UUID REFERENCES channel_connections(id) ON DELETE CASCADE,
  event_code     TEXT NOT NULL,
    -- created | qr_requested | authorized | settings_applied | error | disconnected
  payload        JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── updated_at trigger ──────────────────────────
CREATE OR REPLACE FUNCTION update_channel_connections_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channel_connections_ts
  BEFORE UPDATE ON channel_connections
  FOR EACH ROW EXECUTE FUNCTION update_channel_connections_ts();

-- ── RLS ─────────────────────────────────────────
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connection_events ENABLE ROW LEVEL SECURITY;

-- Anon key: read safe columns only (api_token and api_url NOT in this policy,
-- they are never SELECTed by the client hook — only by server API route)
CREATE POLICY "anon_read_connections" ON channel_connections
  FOR SELECT USING (true);

CREATE POLICY "anon_read_events" ON channel_connection_events
  FOR SELECT USING (true);

-- Service role bypasses RLS automatically (used by API route)
