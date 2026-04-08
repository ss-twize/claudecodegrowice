# Follow-up Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden workflow `FDFyvtbDWgDakcCA` (22_YClients_Attended_Visit_Followup) for production: fix broken WA/Max send URLs, remove hardcoded credentials, add atomic dedup, error protection, and action_log writes.

**Architecture:** Two Python scripts patch the workflow via n8n REST API. Script 1 adds Supabase loader nodes, rewires the config chain, updates Build Config JS, and fixes the Claim node to use RPC. Script 2 adds `continueOnFail` and `action_log` writes after each send. One SQL migration creates the `claim_followup()` function and adds map URL columns to `org_settings`.

**Tech Stack:** n8n REST API (PUT /api/v1/workflows/{id}), Python 3 urllib, Supabase PostgREST RPC

**Context:**
- Workflow ID: `FDFyvtbDWgDakcCA`
- Supabase n8n credential: `{"id": "N1rBeU14IHpmSfYS", "name": "GrowicePlatform"}`
- `channel_connections` fields: `api_url`, `instance_id`, `api_token`, `channel_code` (`whatsapp` / `max`)
- Supabase service role key (for HTTP node headers): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb2N2dHVvbXlvcHVsbHZpbGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA5NzEyMiwiZXhwIjoyMDg3NjczMTIyfQ.d91fw0hhpwr7dPU33ixPeEWkNhonv-tO0h8DfM8wvbQ`
- `org_uid`: `11111111-1111-1111-1111-111111111111`

---

## Task 1: SQL Migration

**Files:**
- Create: `/tmp/followup_migration.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Add map URL columns to org_settings
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS yandex_maps_url text,
  ADD COLUMN IF NOT EXISTS two_gis_url text;

-- Atomic follow-up claim function
-- Returns the client UUID if claim succeeded (first time this record_id is claimed)
-- Returns NULL if this record_id was already claimed for this client
CREATE OR REPLACE FUNCTION claim_followup(p_client_id uuid, p_record_id bigint)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  UPDATE clients
  SET last_yclients_followup_record_id = p_record_id
  WHERE id = p_client_id
    AND (last_yclients_followup_record_id IS NULL
         OR last_yclients_followup_record_id != p_record_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
```

- [ ] **Step 2: Run the migration via Supabase MCP**

Use `mcp__plugin_supabase_supabase__execute_sql` with the SQL above.

Expected result: no errors, `ALTER TABLE` and `CREATE FUNCTION` succeed.

- [ ] **Step 3: Verify**

Run in Supabase SQL editor or MCP:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'org_settings' AND column_name IN ('yandex_maps_url','two_gis_url');

SELECT proname FROM pg_proc WHERE proname = 'claim_followup';
```

Expected: 2 rows for columns, 1 row for function.

- [ ] **Step 4: Seed map URLs**

Run in Supabase SQL editor:
```sql
UPDATE org_settings 
SET yandex_maps_url = 'https://yandex.ru/maps/org/PLACEHOLDER',
    two_gis_url     = 'https://go.2gis.com/PLACEHOLDER'
WHERE org_uid = '11111111-1111-1111-1111-111111111111';
```

(Replace PLACEHOLDER values with real URLs when the business provides them.)

- [ ] **Step 5: Commit**

```bash
git add /tmp/followup_migration.sql
git commit -m "fix: followup production — SQL migration (claim_followup RPC + org_settings map URLs)"
```

---

## Task 2: Fix Config Chain + Claim Node

**Files:**
- Create: `/tmp/fix_followup_config.py`

- [ ] **Step 1: Write the script**

```python
#!/usr/bin/env python3
"""
Follow-up production hardening — Part 1.

Changes:
1. Add 3 HTTP nodes before Build Follow-up Config:
   - Загрузить org_settings   (GET org_settings for yandex/2gis URLs)
   - Загрузить GREEN-API WA   (GET channel_connections where channel_code=whatsapp)
   - Загрузить GREEN-API Max  (GET channel_connections where channel_code=max)
2. Rewire: both triggers → Загрузить org_settings → WA → Max → Build Follow-up Config
3. Update Build Follow-up Config JS:
   - Remove hardcoded supabase_service_role_key, YClients tokens
   - Read from $env vars
   - Build proper whatsapp_send_url and max_send_url from loaded channel_connections
   - Read yandex_maps_url/two_gis_url from loaded org_settings
4. Replace Claim Client Follow-up (PATCH) with RPC call to claim_followup()
5. Add IF node "Claim: успешно?" after Claim to skip already-claimed clients
6. Rewire: Claim → IF → Build Claimed Message (true); Claim → IF → nothing (false)
"""
import json, uuid, urllib.request, urllib.error

N8N_BASE    = "https://n8n.srv1090249.hstgr.cloud"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjhkYWM1Yi01ZmEyLTRiNWUtYTcyOS03NmE4MzI1YWNiNzciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNjkxMjE4ZDEtY2JmZC00YmFlLWE2ZjQtZWI5OGNhYjNjYTI3IiwiaWF0IjoxNzc1NDc2NDAzfQ.aCtDzJ0bnIIrlRZgixs_4yH_iNpB1FKAV7uOU9OxYeg"
WF_ID       = "FDFyvtbDWgDakcCA"
SUPABASE_URL = "https://ugocvtuomyopullvilim.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb2N2dHVvbXlvcHVsbHZpbGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA5NzEyMiwiZXhwIjoyMDg3NjczMTIyfQ.d91fw0hhpwr7dPU33ixPeEWkNhonv-tO0h8DfM8wvbQ"
ORG_UID     = "11111111-1111-1111-1111-111111111111"

SUPABASE_HEADERS = [
    {"name": "apikey",        "value": SUPABASE_KEY},
    {"name": "Authorization", "value": f"Bearer {SUPABASE_KEY}"},
    {"name": "Content-Type",  "value": "application/json"},
]

NEW_BUILD_CONFIG_JS = """const supabase_url = 'https://ugocvtuomyopullvilim.supabase.co';
const supabase_key = $env.SUPABASE_SERVICE_ROLE_KEY;
const yclients_partner_token = $env.YCLIENTS_PARTNER_TOKEN;
const yclients_user_token    = $env.YCLIENTS_USER_TOKEN;

// org_settings — loaded by upstream node
const orgRow = ($('Загрузить org_settings').first().json || [])[0] || {};
const yandex_maps_url = String(orgRow.yandex_maps_url || '').trim();
const two_gis_url     = String(orgRow.two_gis_url     || '').trim();

// GREEN-API channels — loaded by upstream nodes
const waRow  = ($('Загрузить GREEN-API WA').first().json  || [])[0] || {};
const maxRow = ($('Загрузить GREEN-API Max').first().json || [])[0] || {};

const buildSendUrl = (row) => {
  if (!row.api_url || !row.instance_id || !row.api_token) return '';
  return `${row.api_url}/waInstance${row.instance_id}/sendMessage/${row.api_token}`;
};

const whatsapp_send_url = buildSendUrl(waRow);
const max_send_url      = buildSendUrl(maxRow);

if (!yclients_partner_token || !yclients_user_token) throw new Error('YClients tokens missing from n8n env (YCLIENTS_PARTNER_TOKEN, YCLIENTS_USER_TOKEN)');
if (!supabase_key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing from n8n env');

return [{
  json: {
    request_id: `yclients_visit_followup_${Date.now()}`,
    workflow_name: '22_YClients_Attended_Visit_Followup',
    org_id: '9f5a0e68-7f42-4ca6-bf0d-3ed6bb0c6bf1',
    company_id: 1647948,
    yclients_partner_token,
    yclients_user_token,
    supabase_url,
    supabase_service_role_key: supabase_key,
    fetch_count: 100,
    lookback_minutes: 180,
    yandex_maps_url,
    two_gis_url,
    whatsapp_send_url,
    max_send_url,
    followup_template: '{{name}}, спасибо за визит на {{service}}! Будем благодарны за отзыв:\\nЯндекс Карты: {{yandex_maps_url}}\\n2ГИС: {{two_gis_url}}\\n\\nЕсли захотите записаться снова — просто напишите 🙂'
  }
}];"""


def fetch(wf_id):
    req = urllib.request.Request(
        f"{N8N_BASE}/api/v1/workflows/{wf_id}",
        headers={"X-N8N-API-KEY": N8N_API_KEY},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def push(wf_id, wf):
    allowed = {"name", "nodes", "connections", "settings", "staticData", "pinData"}
    clean = {k: v for k, v in wf.items() if k in allowed}
    allowed_s = {"executionOrder", "saveDataSuccessExecution", "saveDataErrorExecution",
                 "timezone", "callerPolicy", "errorWorkflow", "saveExecutionProgress",
                 "saveManualExecutions"}
    if "settings" in clean:
        clean["settings"] = {k: v for k, v in clean["settings"].items() if k in allowed_s}
    body = json.dumps(clean).encode()
    req = urllib.request.Request(
        f"{N8N_BASE}/api/v1/workflows/{wf_id}",
        data=body, method="PUT",
        headers={"X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()[:500]}")
        raise


def make_http_get_node(name, url, position):
    return {
        "id": str(uuid.uuid4()),
        "name": name,
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": position,
        "parameters": {
            "method": "GET",
            "url": url,
            "sendHeaders": True,
            "headerParameters": {"parameters": SUPABASE_HEADERS},
            "options": {},
        },
        "onError": "continueRegularOutput",
    }


def main():
    print(f"Fetching workflow {WF_ID}…")
    wf = fetch(WF_ID)
    nodes_by_name = {n["name"]: n for n in wf["nodes"]}
    conns = wf["connections"]

    # ── Guard: idempotency ──────────────────────────────────────────────────
    if "Загрузить org_settings" in nodes_by_name:
        print("⚠ 'Загрузить org_settings' already present — aborting (already patched?)")
        return

    # ── Find anchor positions ───────────────────────────────────────────────
    build_cfg = nodes_by_name["Build Follow-up Config"]
    cfg_x, cfg_y = build_cfg["position"]

    # Place 3 new nodes to the left of Build Config, spaced 260px apart
    pos_org  = [cfg_x - 780, cfg_y]
    pos_wa   = [cfg_x - 520, cfg_y]
    pos_max  = [cfg_x - 260, cfg_y]

    # ── 1. Create 3 loader HTTP nodes ───────────────────────────────────────
    node_org = make_http_get_node(
        "Загрузить org_settings",
        f"{SUPABASE_URL}/rest/v1/org_settings?org_uid=eq.{ORG_UID}&select=yandex_maps_url,two_gis_url&limit=1",
        pos_org,
    )
    node_wa = make_http_get_node(
        "Загрузить GREEN-API WA",
        f"{SUPABASE_URL}/rest/v1/channel_connections?org_uid=eq.{ORG_UID}&channel_code=eq.whatsapp&select=api_url,instance_id,api_token&limit=1",
        pos_wa,
    )
    node_max = make_http_get_node(
        "Загрузить GREEN-API Max",
        f"{SUPABASE_URL}/rest/v1/channel_connections?org_uid=eq.{ORG_UID}&channel_code=eq.max&select=api_url,instance_id,api_token&limit=1",
        pos_max,
    )

    wf["nodes"].extend([node_org, node_wa, node_max])
    print("  + Загрузить org_settings")
    print("  + Загрузить GREEN-API WA")
    print("  + Загрузить GREEN-API Max")

    # ── 2. Rewire triggers → loader chain → Build Follow-up Config ───────────
    # Both triggers currently point to Build Follow-up Config
    for trigger_name in ["Schedule Every 5 Minutes", "Manual Trigger"]:
        t_conns = conns.get(trigger_name, {}).get("main", [[]])
        for item in (t_conns[0] if t_conns else []):
            if item.get("node") == "Build Follow-up Config":
                item["node"] = "Загрузить org_settings"
                print(f"  ✓ {trigger_name} → Загрузить org_settings")
                break

    # Chain: org_settings → WA → Max → Build Follow-up Config
    conns["Загрузить org_settings"]  = {"main": [[{"node": "Загрузить GREEN-API WA",   "type": "main", "index": 0}]]}
    conns["Загрузить GREEN-API WA"]  = {"main": [[{"node": "Загрузить GREEN-API Max",  "type": "main", "index": 0}]]}
    conns["Загрузить GREEN-API Max"] = {"main": [[{"node": "Build Follow-up Config",   "type": "main", "index": 0}]]}
    print("  ✓ Loader chain: org_settings → WA → Max → Build Follow-up Config")

    # ── 3. Update Build Follow-up Config JS ────────────────────────────────
    build_cfg["parameters"]["jsCode"] = NEW_BUILD_CONFIG_JS
    print("  ✓ Build Follow-up Config: JS replaced (env vars + loader nodes)")

    # ── 4. Replace Claim node (PATCH → RPC POST) ───────────────────────────
    claim = nodes_by_name["Claim Client Follow-up"]
    claim["parameters"]["method"] = "POST"
    claim["parameters"]["url"] = "={{ $json.supabase_url + '/rest/v1/rpc/claim_followup' }}"
    claim["parameters"]["sendHeaders"] = True
    claim["parameters"]["headerParameters"] = {
        "parameters": [
            {"name": "apikey",        "value": "={{ $json.supabase_service_role_key }}"},
            {"name": "Authorization", "value": "={{ 'Bearer ' + $json.supabase_service_role_key }}"},
            {"name": "Content-Type",  "value": "application/json"},
        ]
    }
    claim["parameters"]["sendBody"]    = True
    claim["parameters"]["specifyBody"] = "json"
    claim["parameters"]["jsonBody"]    = "={{ { p_client_id: $json.client_id, p_record_id: $json.yclients_record_id } }}"
    # Remove PATCH-specific params that no longer apply
    claim["parameters"].pop("queryParameters", None)
    print("  ✓ Claim Client Follow-up: PATCH → RPC POST claim_followup()")

    # ── 5. Add IF node "Claim: успешно?" ───────────────────────────────────
    # Position: between Claim and Build Claimed Message
    claim_pos = claim["position"]
    if_node = {
        "id": str(uuid.uuid4()),
        "name": "Claim: успешно?",
        "type": "n8n-nodes-base.if",
        "typeVersion": 2,
        "position": [claim_pos[0] + 220, claim_pos[1]],
        "parameters": {
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                "conditions": [
                    {
                        "id": str(uuid.uuid4()),
                        "leftValue": "={{ $json }}",
                        "rightValue": "",
                        "operator": {"type": "string", "operation": "notEmpty", "singleValue": True},
                    }
                ],
                "combinator": "and",
            }
        },
    }
    wf["nodes"].append(if_node)
    print("  + Claim: успешно? (IF node)")

    # ── 6. Rewire Claim → IF → Build Claimed Message ────────────────────────
    # Shift Build Claimed Message x-pos to make room
    build_claimed = nodes_by_name["Build Claimed Message"]
    build_claimed["position"][0] += 220

    # Claim → IF (was Claim → Build Claimed Message)
    conns["Claim Client Follow-up"] = {"main": [[{"node": "Claim: успешно?", "type": "main", "index": 0}]]}
    # IF true (port 0) → Build Claimed Message; false (port 1) → nothing
    conns["Claim: успешно?"] = {
        "main": [
            [{"node": "Build Claimed Message", "type": "main", "index": 0}],
            []  # false branch — drop duplicates silently
        ]
    }
    print("  ✓ Claim → Claim: успешно? → Build Claimed Message (IF guard)")

    # ── Push ─────────────────────────────────────────────────────────────────
    result = push(WF_ID, wf)
    node_count = len(result.get("nodes", []))
    print(f"\n✅ Uploaded '{result['name']}': {node_count} nodes")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it**

```bash
python3 /tmp/fix_followup_config.py
```

Expected output:
```
Fetching workflow FDFyvtbDWgDakcCA…
  + Загрузить org_settings
  + Загрузить GREEN-API WA
  + Загрузить GREEN-API Max
  ✓ Schedule Every 5 Minutes → Загрузить org_settings
  ✓ Manual Trigger → Загрузить org_settings
  ✓ Loader chain: org_settings → WA → Max → Build Follow-up Config
  ✓ Build Follow-up Config: JS replaced (env vars + loader nodes)
  ✓ Claim Client Follow-up: PATCH → RPC POST claim_followup()
  + Claim: успешно? (IF node)
  ✓ Claim → Claim: успешно? → Build Claimed Message (IF guard)

✅ Uploaded '22_YClients_Attended_Visit_Followup': 27 nodes
```

- [ ] **Step 3: Add n8n env vars** (if not already set)

In n8n UI → Settings → Environment Variables, add:
- `YCLIENTS_PARTNER_TOKEN` = `ccg63r8xemyb6fm99c2k`
- `YCLIENTS_USER_TOKEN` = `3a3fac28a1cda42c028b46426004b68f`
- `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb2N2dHVvbXlvcHVsbHZpbGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA5NzEyMiwiZXhwIjoyMDg3NjczMTIyfQ.d91fw0hhpwr7dPU33ixPeEWkNhonv-tO0h8DfM8wvbQ`

- [ ] **Step 4: Commit**

```bash
git add /tmp/fix_followup_config.py
git commit -m "fix: followup — loader nodes, env vars, atomic claim RPC"
```

---

## Task 3: Add continueOnFail + action_log

**Files:**
- Create: `/tmp/fix_followup_send.py`

- [ ] **Step 1: Write the script**

```python
#!/usr/bin/env python3
"""
Follow-up production hardening — Part 2.

Changes:
1. Add continueOnFail: true to Telegram: Send Message, Send WhatsApp, Send Max
2. Add 3 action_log HTTP POST nodes after each send (inserted between send and Build Success Output)
"""
import json, uuid, urllib.request, urllib.error

N8N_BASE    = "https://n8n.srv1090249.hstgr.cloud"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjhkYWM1Yi01ZmEyLTRiNWUtYTcyOS03NmE4MzI1YWNiNzciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNjkxMjE4ZDEtY2JmZC00YmFlLWE2ZjQtZWI5OGNhYjNjYTI3IiwiaWF0IjoxNzc1NDc2NDAzfQ.aCtDzJ0bnIIrlRZgixs_4yH_iNpB1FKAV7uOU9OxYeg"
WF_ID       = "FDFyvtbDWgDakcCA"
SUPABASE_URL = "https://ugocvtuomyopullvilim.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb2N2dHVvbXlvcHVsbHZpbGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA5NzEyMiwiZXhwIjoyMDg3NjczMTIyfQ.d91fw0hhpwr7dPU33ixPeEWkNhonv-tO0h8DfM8wvbQ"
ORG_UID     = "11111111-1111-1111-1111-111111111111"

# send node name → channel label for action_log
SEND_NODES = {
    "Telegram: Send Message": "telegram",
    "Send WhatsApp":          "whatsapp",
    "Send Max":               "max",
}


def fetch(wf_id):
    req = urllib.request.Request(
        f"{N8N_BASE}/api/v1/workflows/{wf_id}",
        headers={"X-N8N-API-KEY": N8N_API_KEY},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def push(wf_id, wf):
    allowed = {"name", "nodes", "connections", "settings", "staticData", "pinData"}
    clean = {k: v for k, v in wf.items() if k in allowed}
    allowed_s = {"executionOrder", "saveDataSuccessExecution", "saveDataErrorExecution",
                 "timezone", "callerPolicy", "errorWorkflow", "saveExecutionProgress",
                 "saveManualExecutions"}
    if "settings" in clean:
        clean["settings"] = {k: v for k, v in clean["settings"].items() if k in allowed_s}
    body = json.dumps(clean).encode()
    req = urllib.request.Request(
        f"{N8N_BASE}/api/v1/workflows/{wf_id}",
        data=body, method="PUT",
        headers={"X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()[:500]}")
        raise


def make_action_log_node(send_node_name, channel, position):
    """HTTP POST to action_log table after a successful send."""
    return {
        "id": str(uuid.uuid4()),
        "name": f"Log Follow-up: {channel}",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": position,
        "parameters": {
            "method": "POST",
            "url": f"{SUPABASE_URL}/rest/v1/action_log",
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {"name": "apikey",        "value": SUPABASE_KEY},
                    {"name": "Authorization", "value": f"Bearer {SUPABASE_KEY}"},
                    {"name": "Content-Type",  "value": "application/json"},
                    {"name": "Prefer",        "value": "return=minimal"},
                ]
            },
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": (
                f'={{{{'
                f' JSON.stringify({{'
                f'   org_uid: "{ORG_UID}",'
                f'   type: "followup_sent",'
                f'   payload: {{'
                f'     client_id: $json.client_id,'
                f'     channel: "{channel}",'
                f'     record_id: $json.yclients_record_id'
                f'   }}'
                f' }})'
                f'}}}}'
            ),
            "options": {"timeout": 10000},
        },
        "continueOnFail": True,
    }


def main():
    print(f"Fetching workflow {WF_ID}…")
    wf = fetch(WF_ID)
    nodes_by_name = {n["name"]: n for n in wf["nodes"]}
    conns = wf["connections"]

    # ── Guard ──────────────────────────────────────────────────────────────
    if "Log Follow-up: telegram" in nodes_by_name:
        print("⚠ action_log nodes already present — aborting")
        return

    for send_name, channel in SEND_NODES.items():
        send_node = nodes_by_name.get(send_name)
        if not send_node:
            print(f"  ⚠ '{send_name}' not found — skipping")
            continue

        # 1. Add continueOnFail
        send_node["continueOnFail"] = True
        print(f"  ✓ continueOnFail → '{send_name}'")

        # 2. Create action_log node positioned to the right of send node
        sx, sy = send_node["position"]
        log_node = make_action_log_node(send_name, channel, [sx + 220, sy])
        wf["nodes"].append(log_node)
        log_name = log_node["name"]
        print(f"  + {log_name}")

        # 3. Rewire: send → log → Build Success Output (was send → Build Success Output)
        send_conns = conns.get(send_name, {}).get("main", [[]])
        downstream = send_conns[0] if send_conns else []
        # What send currently points to (e.g. Build Success Output)
        next_nodes = [item.copy() for item in downstream]
        # Redirect send → log node
        conns[send_name] = {"main": [[{"node": log_name, "type": "main", "index": 0}]]}
        # log node → what send used to point to
        conns[log_name] = {"main": [next_nodes]}
        print(f"  ✓ {send_name} → {log_name} → {next_nodes[0]['node'] if next_nodes else '(end)'}")

    result = push(WF_ID, wf)
    node_count = len(result.get("nodes", []))
    print(f"\n✅ Uploaded '{result['name']}': {node_count} nodes")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it**

```bash
python3 /tmp/fix_followup_send.py
```

Expected output:
```
Fetching workflow FDFyvtbDWgDakcCA…
  ✓ continueOnFail → 'Telegram: Send Message'
  + Log Follow-up: telegram
  ✓ Telegram: Send Message → Log Follow-up: telegram → Build Success Output
  ✓ continueOnFail → 'Send WhatsApp'
  + Log Follow-up: whatsapp
  ✓ Send WhatsApp → Log Follow-up: whatsapp → Build Success Output
  ✓ continueOnFail → 'Send Max'
  + Log Follow-up: max
  ✓ Send Max → Log Follow-up: max → Build Success Output

✅ Uploaded '22_YClients_Attended_Visit_Followup': 30 nodes
```

- [ ] **Step 3: Commit**

```bash
git add /tmp/fix_followup_send.py
git commit -m "fix: followup — continueOnFail + action_log on send nodes"
```

---

## Task 4: Update PROGRESS.md

**Files:**
- Modify: `PROGRESS.md`

- [ ] **Step 1: Add entry to PROGRESS.md**

Open `PROGRESS.md` and append to the task table:

```
| 21 | Follow-up: production hardening — loader nodes, atomic dedup RPC, continueOnFail, action_log | ✅ | 6 |
```

- [ ] **Step 2: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: update progress — follow-up production hardening"
```

---

## Verification Checklist

After running both scripts, verify in n8n UI (https://n8n.srv1090249.hstgr.cloud):

1. Open `22_YClients_Attended_Visit_Followup` (30 nodes total)
2. Three new nodes visible before "Build Follow-up Config": `Загрузить org_settings`, `Загрузить GREEN-API WA`, `Загрузить GREEN-API Max`
3. "Build Follow-up Config" JS no longer contains hardcoded `yclients_partner_token` or `supabase_service_role_key` strings
4. "Claim Client Follow-up" is now POST (not PATCH), URL ends in `/rpc/claim_followup`
5. "Claim: успешно?" IF node exists between Claim and Build Claimed Message
6. "Telegram: Send Message", "Send WhatsApp", "Send Max" all have `continueOnFail` checkbox enabled
7. Three "Log Follow-up: {channel}" HTTP nodes exist, each between a send node and "Build Success Output"
8. Test run (Manual Trigger): if no attended visits in last 180 min, should reach "Build Noop Fresh Output" cleanly with no errors
