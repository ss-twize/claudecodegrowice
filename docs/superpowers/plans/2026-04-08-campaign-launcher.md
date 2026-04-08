# Campaign Launcher — Multi-Channel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the legacy `clients_tg` dead branch and add campaign_runs logging to workflow `UiPsFwkEoofL29mY` (Growice Campaign Launcher).

**Architecture:** SQL migration creates `campaign_runs` table. Two Python scripts patch the workflow via n8n REST API: Script 1 removes `Load Telegram Recipient`, rewrites `Resolve Targets` with clean multi-channel logic (no hardcoded credentials), updates `Split Recipient IDs1` to pass `campaign_run_id`. Script 2 adds four new nodes (`Создать campaign_run`, `Merge Results`, `Collect Results`, `Завершить campaign_run`) and rewires all connections.

**Tech Stack:** n8n REST API (PUT /api/v1/workflows/{id}), Python 3 urllib, Supabase PostgREST, n8n Code nodes (JS)

**Constants used throughout:**
- Workflow ID: `UiPsFwkEoofL29mY`
- n8n base: `https://n8n.srv1090249.hstgr.cloud`
- n8n API key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjhkYWM1Yi01ZmEyLTRiNWUtYTcyOS03NmE4MzI1YWNiNzciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNjkxMjE4ZDEtY2JmZC00YmFlLWE2ZjQtZWI5OGNhYjNjYTI3IiwiaWF0IjoxNzc1NDc2NDAzfQ.aCtDzJ0bnIIrlRZgixs_4yH_iNpB1FKAV7uOU9OxYeg`
- Supabase URL: `https://ugocvtuomyopullvilim.supabase.co`
- ORG_UID: `11111111-1111-1111-1111-111111111111`

---

## Files

| Action | Path | Purpose |
|---|---|---|
| Create | `supabase/campaign_runs_migration.sql` | New table for campaign logging |
| Create | `scripts/fix_campaign_launcher_1_cleanup.py` | Remove legacy node, rewrite Resolve Targets, fix Split |
| Create | `scripts/fix_campaign_launcher_2_logging.py` | Add campaign_run logging nodes + rewire |
| Modify | `docs/PROGRESS.md` | Progress entry |

---

## Task 1: SQL Migration — campaign_runs Table

**Files:**
- Create: `supabase/campaign_runs_migration.sql`

- [ ] **Step 1: Write migration file**

```sql
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
```

Save to `supabase/campaign_runs_migration.sql`.

- [ ] **Step 2: Run in Supabase SQL editor**

Open: `https://supabase.com/dashboard/project/ugocvtuomyopullvilim/sql`

Paste and run. Expected: no errors, table visible in Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/campaign_runs_migration.sql
git commit -m "feat: add campaign_runs table migration"
```

---

## Task 2: Remove Legacy Branch + Rewrite Resolve Targets

**Files:**
- Create: `scripts/fix_campaign_launcher_1_cleanup.py`

This script does three things:
1. Removes `Load Telegram Recipient` node (dead branch reading `clients_tg`)
2. Rewrites `Resolve Targets` — clean code, no `legacyWhatsAppConfig`, batch Supabase fetches, proper channel priority + SMS fallback
3. Updates `Split Recipient IDs1` to pass `campaign_run_id` through (needed by Task 3)

**Before running:** Open the workflow in n8n UI and check the WA and Max send nodes. Look at their request body fields — note what field names they use for `chatId` and `message`. The rewritten `Resolve Targets` outputs `wa_chat_id` and `text` — confirm these match. If not, update the field names in `RESOLVE_TARGETS_CODE` before running.

- [ ] **Step 1: Write the script**

```python
#!/usr/bin/env python3
"""
Campaign Launcher cleanup (UiPsFwkEoofL29mY):
1. Remove Load Telegram Recipient (dead branch, reads legacy clients_tg)
2. Rewrite Resolve Targets — clean code, no legacyWhatsAppConfig, batch Supabase fetches
3. Update Split Recipient IDs1 to also pass campaign_run_id (needed for logging)
"""
import json, urllib.request, urllib.error

N8N_BASE    = "https://n8n.srv1090249.hstgr.cloud"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjhkYWM1Yi01ZmEyLTRiNWUtYTcyOS03NmE4MzI1YWNiNzciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNjkxMjE4ZDEtY2JmZC00YmFlLWE2ZjQtZWI5OGNhYjNjYTI3IiwiaWF0IjoxNzc1NDc2NDAzfQ.aCtDzJ0bnIIrlRZgixs_4yH_iNpB1FKAV7uOU9OxYeg"
WF_ID       = "UiPsFwkEoofL29mY"


def fetch_wf(wf_id):
    req = urllib.request.Request(
        f"{N8N_BASE}/api/v1/workflows/{wf_id}",
        headers={"X-N8N-API-KEY": N8N_API_KEY},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def push_wf(wf_id, wf):
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


# Outputs: { client_id, campaign_run_id, channel, recipient, provider_url, wa_chat_id, text, failed, fail_reason }
# wa_chat_id is used by the existing WA/Max send nodes for chatId field
# provider_url is used by the existing WA/Max send nodes for the request URL
RESOLVE_TARGETS_CODE = r"""
const items = $input.all();
const SUPABASE_URL = 'https://ugocvtuomyopullvilim.supabase.co';
const SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

const clientIds = items.map(i => i.json.client_id);
const requestedChannels = items[0]?.json.channels || ['telegram', 'whatsapp', 'max'];
const campaignRunId = items[0]?.json.campaign_run_id;
const text = items[0]?.json.text;

const idsParam = clientIds.map(id => `"${id}"`).join(',');

// Batch fetch: client_channels, channel_connections, client phones
const [ccRaw, connRaw, clientsRaw] = await Promise.all([
  fetch(`${SUPABASE_URL}/rest/v1/client_channels?client_id=in.(${idsParam})&is_active=eq.true&can_notify=eq.true&order=priority.asc`, { headers }).then(r => r.json()),
  fetch(`${SUPABASE_URL}/rest/v1/channel_connections?channel_code=in.("whatsapp","max")`, { headers }).then(r => r.json()),
  fetch(`${SUPABASE_URL}/rest/v1/clients?id=in.(${idsParam})&select=id,phone`, { headers }).then(r => r.json()),
]);

// Fetch channel user records (only for IDs we actually have)
const tgIds = ccRaw.filter(c => c.channel_code === 'telegram').map(c => `"${c.channel_user_id}"`);
const waIds = ccRaw.filter(c => c.channel_code === 'whatsapp').map(c => `"${c.channel_user_id}"`);
const maxIds = ccRaw.filter(c => c.channel_code === 'max').map(c => `"${c.channel_user_id}"`);

const [tgRaw, waRaw, maxRaw] = await Promise.all([
  tgIds.length ? fetch(`${SUPABASE_URL}/rest/v1/telegram_users?id=in.(${tgIds.join(',')})`, { headers }).then(r => r.json()) : Promise.resolve([]),
  waIds.length ? fetch(`${SUPABASE_URL}/rest/v1/whatsapp_users?id=in.(${waIds.join(',')})`, { headers }).then(r => r.json()) : Promise.resolve([]),
  maxIds.length ? fetch(`${SUPABASE_URL}/rest/v1/max_users?id=in.(${maxIds.join(',')})`, { headers }).then(r => r.json()) : Promise.resolve([]),
]);

// Index by id
const tgUsers = Object.fromEntries(tgRaw.map(u => [u.id, u]));
const waUsers = Object.fromEntries(waRaw.map(u => [u.id, u]));
const maxUsers = Object.fromEntries(maxRaw.map(u => [u.id, u]));
const clientPhones = Object.fromEntries(clientsRaw.map(c => [c.id, c.phone]));

// Channel credentials from channel_connections (no hardcoded fallback)
const waConn = connRaw.find(c => c.channel_code === 'whatsapp');
const maxConn = connRaw.find(c => c.channel_code === 'max');

// Group client_channels by client_id
const channelsByClient = {};
for (const cc of ccRaw) {
  if (!channelsByClient[cc.client_id]) channelsByClient[cc.client_id] = [];
  channelsByClient[cc.client_id].push(cc);
}

// Priority: requested channels first, then remaining non-SMS channels
const NON_SMS = ['telegram', 'whatsapp', 'max'];
const priorityOrder = [
  ...requestedChannels.filter(c => NON_SMS.includes(c)),
  ...NON_SMS.filter(c => !requestedChannels.includes(c))
];

const results = [];

for (const item of items) {
  const clientId = item.json.client_id;
  const myChannels = channelsByClient[clientId] || [];
  let resolved = null;

  for (const channelCode of priorityOrder) {
    const cc = myChannels.find(c => c.channel_code === channelCode);
    if (!cc) continue;

    if (channelCode === 'telegram') {
      const u = tgUsers[cc.channel_user_id];
      if (u?.tg_id) {
        resolved = {
          client_id: clientId, campaign_run_id: campaignRunId,
          channel: 'telegram', recipient: String(u.tg_id),
          provider_url: null, wa_chat_id: null,
          text, failed: false, fail_reason: null
        };
        break;
      }
    } else if (channelCode === 'whatsapp' && waConn) {
      const u = waUsers[cc.channel_user_id];
      if (u?.phone) {
        resolved = {
          client_id: clientId, campaign_run_id: campaignRunId,
          channel: 'whatsapp', recipient: u.phone,
          provider_url: `${waConn.api_url}/waInstance${waConn.instance_id}/sendMessage/${waConn.api_token}`,
          wa_chat_id: `${u.phone}@c.us`,
          text, failed: false, fail_reason: null
        };
        break;
      }
    } else if (channelCode === 'max' && maxConn) {
      const u = maxUsers[cc.channel_user_id];
      if (u?.user_id) {
        resolved = {
          client_id: clientId, campaign_run_id: campaignRunId,
          channel: 'max', recipient: u.user_id,
          provider_url: `${maxConn.api_url}/waInstance${maxConn.instance_id}/sendMessage/${maxConn.api_token}`,
          wa_chat_id: `${u.user_id}@c.us`,
          text, failed: false, fail_reason: null
        };
        break;
      }
    }
  }

  // SMS fallback (always attempted if no channel found)
  if (!resolved) {
    const phone = clientPhones[clientId];
    if (phone) {
      resolved = {
        client_id: clientId, campaign_run_id: campaignRunId,
        channel: 'sms', recipient: phone,
        provider_url: null, wa_chat_id: null,
        text, failed: false, fail_reason: null
      };
    } else {
      resolved = {
        client_id: clientId, campaign_run_id: campaignRunId,
        channel: null, recipient: null,
        provider_url: null, wa_chat_id: null,
        text, failed: true, fail_reason: 'no_channel'
      };
    }
  }

  results.push({ json: resolved });
}

return results;
"""

# Pass campaign_run_id through (added alongside existing fields)
SPLIT_CODE = r"""
const src = $input.first().json;
const { recipient_ids, channels, text, campaign_name, campaign_run_id } = src;
return (recipient_ids || []).map(id => ({
  json: { client_id: id, channels, text, campaign_name, campaign_run_id }
}));
"""


def main():
    print(f"Fetching workflow {WF_ID}…")
    wf = fetch_wf(WF_ID)
    nodes_by_name = {n["name"]: n for n in wf["nodes"]}

    REQUIRED = ["Load Telegram Recipient", "Resolve Targets", "Split Recipient IDs1", "Normalize Request"]
    missing = [n for n in REQUIRED if n not in nodes_by_name]
    if missing:
        print(f"  ✗ Required nodes missing: {missing} — abort")
        return

    # 1. Remove Load Telegram Recipient
    before = len(wf["nodes"])
    wf["nodes"] = [n for n in wf["nodes"] if n["name"] != "Load Telegram Recipient"]
    print(f"  ✓ Removed 'Load Telegram Recipient' ({before} → {len(wf['nodes'])} nodes)")

    # 2. Remove connection Normalize Request → Load Telegram Recipient
    nr_conns = wf["connections"].get("Normalize Request", {}).get("main", [[]])
    for port in nr_conns:
        before_len = len(port)
        port[:] = [c for c in port if c.get("node") != "Load Telegram Recipient"]
        if len(port) < before_len:
            print("  ✓ Removed connection Normalize Request → Load Telegram Recipient")

    # 3. Rewrite Resolve Targets
    for n in wf["nodes"]:
        if n["name"] == "Resolve Targets":
            n["parameters"]["jsCode"] = RESOLVE_TARGETS_CODE.strip()
            print("  ✓ Rewrote 'Resolve Targets' Code node")
            break

    # 4. Update Split Recipient IDs1 to pass campaign_run_id
    for n in wf["nodes"]:
        if n["name"] == "Split Recipient IDs1":
            n["parameters"]["jsCode"] = SPLIT_CODE.strip()
            print("  ✓ Updated 'Split Recipient IDs1' to pass campaign_run_id")
            break

    result = push_wf(WF_ID, wf)
    print(f"\n✅ Uploaded '{result['name']}': {len(result.get('nodes', []))} nodes")


if __name__ == "__main__":
    main()
```

Save to `scripts/fix_campaign_launcher_1_cleanup.py`.

- [ ] **Step 2: Run the script**

```bash
python3 scripts/fix_campaign_launcher_1_cleanup.py
```

Expected output:
```
Fetching workflow UiPsFwkEoofL29mY…
  ✓ Removed 'Load Telegram Recipient' (10 → 9 nodes)
  ✓ Removed connection Normalize Request → Load Telegram Recipient
  ✓ Rewrote 'Resolve Targets' Code node
  ✓ Updated 'Split Recipient IDs1' to pass campaign_run_id
✅ Uploaded 'Growice Campaign Launcher': 9 nodes
```

- [ ] **Step 3: Verify in n8n UI**

Open: `https://n8n.srv1090249.hstgr.cloud`
- `Load Telegram Recipient` is gone — workflow shows 9 nodes
- Click `Resolve Targets` → code contains `$input.all()` and `Promise.all` — no `legacyWhatsAppConfig`
- Click `Split Recipient IDs1` → code destructures `campaign_run_id`

- [ ] **Step 4: Commit**

```bash
git add scripts/fix_campaign_launcher_1_cleanup.py
git commit -m "fix: remove clients_tg legacy branch, rewrite Resolve Targets clean multi-channel"
```

---

## Task 3: Add Campaign_Run Logging Nodes

**Files:**
- Create: `scripts/fix_campaign_launcher_2_logging.py`

This script adds four nodes and rewires connections:
- `Создать campaign_run` — Code node between `Normalize Request` and `Split Recipient IDs1`: INSERTs a `campaign_runs` record, returns merged data with `campaign_run_id`
- `Merge Results` — Merge node (append mode) collecting all 5 branches (TG/WA/Max/SMS/failed)
- `Collect Results` — Code node: counts sent/failed, builds `failed_ids`
- `Завершить campaign_run` — Code node: PATCHes `campaign_runs` with totals, sets `status=done`
- Enables fallback output on `Route By Channel` so `failed: true` items skip send nodes and go directly to `Merge Results`

- [ ] **Step 1: Write the script**

```python
#!/usr/bin/env python3
"""
Campaign Launcher logging (UiPsFwkEoofL29mY):
Adds campaign_run lifecycle: INSERT on start, PATCH on finish.
New nodes: Создать campaign_run, Merge Results, Collect Results, Завершить campaign_run
"""
import json, uuid, urllib.request, urllib.error

N8N_BASE    = "https://n8n.srv1090249.hstgr.cloud"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjhkYWM1Yi01ZmEyLTRiNWUtYTcyOS03NmE4MzI1YWNiNzciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNjkxMjE4ZDEtY2JmZC00YmFlLWE2ZjQtZWI5OGNhYjNjYTI3IiwiaWF0IjoxNzc1NDc2NDAzfQ.aCtDzJ0bnIIrlRZgixs_4yH_iNpB1FKAV7uOU9OxYeg"
WF_ID       = "UiPsFwkEoofL29mY"


def fetch_wf(wf_id):
    req = urllib.request.Request(
        f"{N8N_BASE}/api/v1/workflows/{wf_id}",
        headers={"X-N8N-API-KEY": N8N_API_KEY},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def push_wf(wf_id, wf):
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


CREATE_RUN_CODE = r"""
const original = $input.first().json;
const SUPABASE_URL = 'https://ugocvtuomyopullvilim.supabase.co';
const SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;

const resp = await fetch(`${SUPABASE_URL}/rest/v1/campaign_runs`, {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    org_uid: '11111111-1111-1111-1111-111111111111',
    campaign_name: original.campaign_name || null,
    channels: original.channels || [],
    recipient_ids: original.recipient_ids || [],
    status: 'running'
  })
});

const data = await resp.json();
const campaignRunId = Array.isArray(data) ? data[0].id : data.id;

return [{ json: { ...original, campaign_run_id: campaignRunId } }];
"""

# Checks both failed:true (no channel) and error (send failed with continueOnFail)
COLLECT_RESULTS_CODE = r"""
const items = $input.all();
const campaign_run_id = items.find(i => i.json.campaign_run_id)?.json.campaign_run_id;

const isFailed = i => i.json.failed === true || Boolean(i.json.error);

const total_sent = items.filter(i => !isFailed(i)).length;
const total_failed = items.filter(isFailed).length;
const failed_ids = items
  .filter(isFailed)
  .map(i => ({
    client_id: i.json.client_id,
    reason: i.json.failed ? (i.json.fail_reason || 'no_channel') : 'send_failed'
  }));

return [{ json: { campaign_run_id, total_sent, total_failed, failed_ids } }];
"""

FINISH_RUN_CODE = r"""
const item = $input.first().json;
const SUPABASE_URL = 'https://ugocvtuomyopullvilim.supabase.co';
const SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;

await fetch(`${SUPABASE_URL}/rest/v1/campaign_runs?id=eq.${item.campaign_run_id}`, {
  method: 'PATCH',
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    total_sent: item.total_sent,
    total_failed: item.total_failed,
    failed_ids: item.failed_ids,
    status: 'done',
    finished_at: new Date().toISOString()
  })
});

return [{ json: {
  success: true,
  campaign_run_id: item.campaign_run_id,
  total_sent: item.total_sent,
  total_failed: item.total_failed
} }];
"""


def make_code_node(name, code, position):
    return {
        "id": str(uuid.uuid4()),
        "name": name,
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": position,
        "parameters": {
            "mode": "runOnceForAllItems",
            "jsCode": code.strip()
        }
    }


def make_merge_node(name, position, num_inputs):
    return {
        "id": str(uuid.uuid4()),
        "name": name,
        "type": "n8n-nodes-base.merge",
        "typeVersion": 3,
        "position": position,
        "parameters": {
            "mode": "append",
            "numberInputs": num_inputs
        }
    }


def main():
    print(f"Fetching workflow {WF_ID}…")
    wf = fetch_wf(WF_ID)
    nodes_by_name = {n["name"]: n for n in wf["nodes"]}

    REQUIRED = ["Normalize Request", "Split Recipient IDs1", "Route By Channel"]
    missing = [n for n in REQUIRED if n not in nodes_by_name]
    if missing:
        print(f"  ✗ Required nodes missing: {missing} — abort")
        return

    if "Создать campaign_run" in nodes_by_name:
        print("⚠ 'Создать campaign_run' already exists — abort (already patched?)")
        return

    conns = wf["connections"]

    # Discover send node names from Route By Channel outputs (port order = TG/WA/Max/SMS)
    route_main = conns.get("Route By Channel", {}).get("main", [])
    print(f"  Route By Channel has {len(route_main)} output ports")
    for i, port in enumerate(route_main):
        names = [c["node"] for c in port]
        print(f"    port[{i}]: {names}")

    # Get positions for layout
    nr_pos   = nodes_by_name["Normalize Request"]["position"]
    split_pos = nodes_by_name["Split Recipient IDs1"]["position"]
    route_pos = nodes_by_name["Route By Channel"]["position"]

    # Place new nodes
    create_pos  = [(nr_pos[0] + split_pos[0]) // 2, nr_pos[1]]
    merge_pos   = [route_pos[0] + 500, route_pos[1] + 200]
    collect_pos = [merge_pos[0] + 260, merge_pos[1]]
    finish_pos  = [collect_pos[0] + 260, collect_pos[1]]

    num_merge_inputs = len(route_main) + 1  # existing send ports + 1 for failed fallback

    create_node  = make_code_node("Создать campaign_run", CREATE_RUN_CODE, create_pos)
    merge_node   = make_merge_node("Merge Results", merge_pos, num_merge_inputs)
    collect_node = make_code_node("Collect Results", COLLECT_RESULTS_CODE, collect_pos)
    finish_node  = make_code_node("Завершить campaign_run", FINISH_RUN_CODE, finish_pos)

    wf["nodes"].extend([create_node, merge_node, collect_node, finish_node])
    print(f"  + Создать campaign_run")
    print(f"  + Merge Results ({num_merge_inputs} inputs)")
    print(f"  + Collect Results")
    print(f"  + Завершить campaign_run")

    # 1. Normalize Request → Создать campaign_run (replace current → Split)
    nr_main = conns.get("Normalize Request", {}).get("main", [[]])
    for port in nr_main:
        for item in port:
            if item.get("node") == "Split Recipient IDs1":
                item["node"] = "Создать campaign_run"
                print("  ✓ Normalize Request → Создать campaign_run")
                break

    # 2. Создать campaign_run → Split Recipient IDs1
    conns["Создать campaign_run"] = {
        "main": [[{"node": "Split Recipient IDs1", "type": "main", "index": 0}]]
    }
    print("  ✓ Создать campaign_run → Split Recipient IDs1")

    # 3. Enable fallback output on Route By Channel (items with channel=null skip sends → Merge)
    for n in wf["nodes"]:
        if n["name"] == "Route By Channel":
            n["parameters"]["fallbackOutput"] = "extra"
            print("  ✓ Route By Channel: fallbackOutput=extra")
            break

    # 4. Route By Channel fallback → Merge Results (extra output = port after last send port)
    fallback_merge_port = len(route_main)  # 0-indexed, comes after TG/WA/Max/SMS ports
    route_main.append([{"node": "Merge Results", "type": "main", "index": fallback_merge_port}])
    print(f"  ✓ Route By Channel fallback → Merge Results (port {fallback_merge_port})")

    # 5. Send nodes → Merge Results (use port index from original route_main, before fallback was added)
    original_port_count = len(route_main) - 1  # -1 because we just appended the fallback port
    for merge_idx, port_items in enumerate(route_main[:original_port_count]):
        for item in port_items:
            send_name = item["node"]
            if send_name not in conns:
                conns[send_name] = {"main": [[]]}
            elif "main" not in conns[send_name]:
                conns[send_name]["main"] = [[]]
            elif not conns[send_name]["main"]:
                conns[send_name]["main"] = [[]]
            conns[send_name]["main"][0].append(
                {"node": "Merge Results", "type": "main", "index": merge_idx}
            )
            print(f"  ✓ {send_name} → Merge Results (port {merge_idx})")

    # 6. Merge Results → Collect Results
    conns["Merge Results"] = {
        "main": [[{"node": "Collect Results", "type": "main", "index": 0}]]
    }
    print("  ✓ Merge Results → Collect Results")

    # 7. Collect Results → Завершить campaign_run
    conns["Collect Results"] = {
        "main": [[{"node": "Завершить campaign_run", "type": "main", "index": 0}]]
    }
    print("  ✓ Collect Results → Завершить campaign_run")

    result = push_wf(WF_ID, wf)
    print(f"\n✅ Uploaded '{result['name']}': {len(result.get('nodes', []))} nodes")


if __name__ == "__main__":
    main()
```

Save to `scripts/fix_campaign_launcher_2_logging.py`.

- [ ] **Step 2: Run the script**

```bash
python3 scripts/fix_campaign_launcher_2_logging.py
```

Expected output:
```
Fetching workflow UiPsFwkEoofL29mY…
  Route By Channel has 4 output ports
    port[0]: ['[TG] Send message']
    port[1]: ['[WA] Send message']
    port[2]: ['[MAX] Send message']
    port[3]: ['[SMS] Send message']
  + Создать campaign_run
  + Merge Results (5 inputs)
  + Collect Results
  + Завершить campaign_run
  ✓ Normalize Request → Создать campaign_run
  ✓ Создать campaign_run → Split Recipient IDs1
  ✓ Route By Channel: fallbackOutput=extra
  ✓ Route By Channel fallback → Merge Results (port 4)
  ✓ [TG] Send message → Merge Results (port 0)
  ✓ [WA] Send message → Merge Results (port 1)
  ✓ [MAX] Send message → Merge Results (port 2)
  ✓ [SMS] Send message → Merge Results (port 3)
  ✓ Merge Results → Collect Results
  ✓ Collect Results → Завершить campaign_run
✅ Uploaded 'Growice Campaign Launcher': 13 nodes
```

- [ ] **Step 3: Verify in n8n UI**

Open: `https://n8n.srv1090249.hstgr.cloud`

1. Workflow shows 13 nodes
2. `Создать campaign_run` appears between `Normalize Request` and `Split Recipient IDs1`
3. `Route By Channel` shows 5 outputs (4 channel outputs + 1 fallback)
4. All 4 send nodes connect to `Merge Results`
5. Fallback output of `Route By Channel` also connects to `Merge Results`
6. `Merge Results` → `Collect Results` → `Завершить campaign_run`

- [ ] **Step 4: End-to-end test via curl**

```bash
curl -X POST https://n8n.srv1090249.hstgr.cloud/webhook/growice/rassylka_zapustit \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_ids": ["<known_client_uuid>"],
    "channels": ["telegram"],
    "text": "Тест кампании",
    "campaign_name": "Test 001"
  }'
```

Replace `<known_client_uuid>` with any UUID from the `clients` table. Then check in Supabase SQL editor:

```sql
SELECT id, campaign_name, total_sent, total_failed, status, created_at, finished_at
FROM campaign_runs
ORDER BY created_at DESC
LIMIT 5;
```

Expected: one row with `status = 'done'`, `finished_at` populated.

- [ ] **Step 5: Commit**

```bash
git add scripts/fix_campaign_launcher_2_logging.py
git commit -m "feat: add campaign_run logging to Campaign Launcher (create on start, update on finish)"
```

---

## Task 4: Update PROGRESS.md

**Files:**
- Modify: `docs/PROGRESS.md`

- [ ] **Step 1: Add progress entry**

Open `docs/PROGRESS.md` and add this row to the progress table:

```
| 21 | Campaign Launcher: remove clients_tg legacy branch, rewrite Resolve Targets multi-channel, add campaign_runs logging | ✅ | 8 |
```

- [ ] **Step 2: Commit**

```bash
git add docs/PROGRESS.md
git commit -m "docs: update progress — campaign launcher multi-channel redesign"
```

---

## Verification Checklist

After all tasks complete:

- [ ] `campaign_runs` table exists in Supabase with all columns
- [ ] Workflow has 13 nodes (was 10)
- [ ] `Load Telegram Recipient` is gone
- [ ] `Resolve Targets` has no `legacyWhatsAppConfig` in its code
- [ ] `Resolve Targets` code contains `Promise.all` batch fetch pattern
- [ ] `Split Recipient IDs1` passes `campaign_run_id`
- [ ] `Создать campaign_run` creates a record with `status='running'` at start
- [ ] `Завершить campaign_run` updates with totals and `status='done'`
- [ ] End-to-end test curl produces a `campaign_runs` row with `status='done'`
