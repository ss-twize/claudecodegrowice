#!/usr/bin/env python3
"""
Fix Campaign Launcher: remove duplicate logging nodes added twice.
Keep the FIRST occurrence of each node (by name), remove duplicates.
Also update JS code in Code nodes with fixed versions.
"""
import json, urllib.request, urllib.error

N8N_BASE    = "https://n8n.srv1090249.hstgr.cloud"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjhkYWM1Yi01ZmEyLTRiNWUtYTcyOS03NmE4MzI1YWNiNzciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNjkxMjE4ZDEtY2JmZC00YmFlLWE2ZjQtZWI5OGNhYjNjYTI3IiwiaWF0IjoxNzc1NDc2NDAzfQ.aCtDzJ0bnIIrlRZgixs_4yH_iNpB1FKAV7uOU9OxYeg"
WF_ID       = "UiPsFwkEoofL29mY"

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

if (!resp.ok) {
  const errText = await resp.text();
  throw new Error(`campaign_runs INSERT failed (HTTP ${resp.status}): ${errText}`);
}

const data = await resp.json();
if (data.error) throw new Error(`campaign_runs INSERT failed: ${data.error.message || JSON.stringify(data.error)}`);
const campaignRunId = Array.isArray(data) ? data[0].id : data.id;

return [{ json: { ...original, campaign_run_id: campaignRunId } }];
"""

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
if (!item.campaign_run_id) {
  return [{ json: { success: false, error: 'campaign_run_id missing — skipping finish' } }];
}
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

CODE_UPDATES = {
    "Создать campaign_run": CREATE_RUN_CODE,
    "Collect Results": COLLECT_RESULTS_CODE,
    "Завершить campaign_run": FINISH_RUN_CODE,
}

DEDUP_NAMES = {"Создать campaign_run", "Merge Results", "Collect Results", "Завершить campaign_run"}


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


def main():
    print(f"Fetching workflow {WF_ID}…")
    wf = fetch_wf(WF_ID)
    print(f"  Current node count: {len(wf['nodes'])}")

    # Print current node names
    for n in wf["nodes"]:
        print(f"    {n['name']}")

    # Dedup: keep first occurrence of each name, remove extras
    seen = {}
    keep_ids = set()
    for n in wf["nodes"]:
        name = n["name"]
        if name not in seen:
            seen[name] = n["id"]
            keep_ids.add(n["id"])
        else:
            print(f"  x Removing duplicate: '{name}' (id={n['id']})")

    before = len(wf["nodes"])
    wf["nodes"] = [n for n in wf["nodes"] if n["id"] in keep_ids]
    print(f"  Dedup: {before} -> {len(wf['nodes'])} nodes")

    # Also clean up connections pointing to removed duplicate node IDs
    # (connections reference by name, not id, so this should be ok)
    # But remove any duplicate connections in the connections dict
    conns = wf["connections"]
    for src_name, src_conns in conns.items():
        main_ports = src_conns.get("main", [])
        for port in main_ports:
            # Remove duplicate targets in same port
            seen_targets = set()
            unique = []
            for item in port:
                key = (item.get("node"), item.get("index", 0))
                if key not in seen_targets:
                    seen_targets.add(key)
                    unique.append(item)
                else:
                    print(f"  x Removed duplicate connection: {src_name} -> {item['node']} (port {item.get('index',0)})")
            port[:] = unique

    # Update JS code in Code nodes with fixed versions
    for n in wf["nodes"]:
        if n["name"] in CODE_UPDATES:
            n["parameters"]["jsCode"] = CODE_UPDATES[n["name"]].strip()
            print(f"  + Updated JS in '{n['name']}'")

    result = push_wf(WF_ID, wf)
    print(f"\nDONE: Uploaded '{result['name']}': {len(result.get('nodes', []))} nodes")
    if len(result.get("nodes", [])) != 13:
        print(f"  WARNING: Expected 13 nodes, got {len(result.get('nodes', []))}")
        print("  Remaining nodes:")
        for n in result.get("nodes", []):
            print(f"    {n['name']}")


if __name__ == "__main__":
    main()
