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

if (!resp.ok) {
  const errText = await resp.text();
  throw new Error(`campaign_runs INSERT failed (HTTP ${resp.status}): ${errText}`);
}

const data = await resp.json();
if (data.error) throw new Error(`campaign_runs INSERT failed: ${data.error.message || JSON.stringify(data.error)}`);
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
if (!item.campaign_run_id) {
  return [{ json: { success: false, error: 'campaign_run_id missing — skipping finish' } }];
}
const SUPABASE_URL = 'https://ugocvtuomyopullvilim.supabase.co';
const SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;

const patchResp = await fetch(`${SUPABASE_URL}/rest/v1/campaign_runs?id=eq.${item.campaign_run_id}`, {
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
if (!patchResp.ok) {
  const errText = await patchResp.text();
  throw new Error(`campaign_runs PATCH failed (HTTP ${patchResp.status}): ${errText}`);
}

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
        print("  To update JS code only (without re-adding nodes), run the dedup script.")
        return

    conns = wf["connections"]

    # Discover send node names from Route By Channel outputs (port order = TG/WA/Max/SMS)
    route_main = conns.get("Route By Channel", {}).get("main", [])
    print(f"  Route By Channel has {len(route_main)} output ports")
    for i, port in enumerate(route_main):
        names = [c["node"] for c in port]
        print(f"    port[{i}]: {names}")

    # Get positions for layout
    nr_pos    = nodes_by_name["Normalize Request"]["position"]
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

    # 3. Enable fallback output on Route By Channel (failed items skip sends → Merge)
    for n in wf["nodes"]:
        if n["name"] == "Route By Channel":
            n["parameters"]["fallbackOutput"] = "extra"
            print("  ✓ Route By Channel: fallbackOutput=extra")
            break

    # 4. Route By Channel fallback → Merge Results (extra output = port after last send port)
    fallback_merge_port = len(route_main)  # 0-indexed, after TG/WA/Max/SMS ports
    route_main.append([{"node": "Merge Results", "type": "main", "index": fallback_merge_port}])
    print(f"  ✓ Route By Channel fallback → Merge Results (port {fallback_merge_port})")

    # 5. Send nodes → Merge Results (use port index from route_main order, before fallback was appended)
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
