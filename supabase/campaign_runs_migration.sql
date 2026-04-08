CREATE TABLE IF NOT EXISTS campaign_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid       uuid NOT NULL,
  campaign_name text,
  channels      text[],
  recipient_ids uuid[],
  total_sent    int DEFAULT 0,
  total_failed  int DEFAULT 0,
  failed_ids    jsonb DEFAULT '[]',
  status        text DEFAULT 'running',
  created_at    timestamptz DEFAULT now(),
  finished_at   timestamptz
);

CREATE INDEX IF NOT EXISTS campaign_runs_org_uid_idx ON campaign_runs(org_uid);
CREATE INDEX IF NOT EXISTS campaign_runs_created_at_idx ON campaign_runs(created_at DESC);
