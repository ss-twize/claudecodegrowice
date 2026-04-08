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


def make_action_log_node(channel, position):
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
            "jsonBody": '={{ JSON.stringify({ org_uid: "' + ORG_UID + '", type: "followup_sent", payload: { client_id: $json.client_id, channel: "' + channel + '", record_id: $json.yclients_record_id } }) }}',
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
        log_node = make_action_log_node(channel, [sx + 220, sy])
        wf["nodes"].append(log_node)
        log_name = log_node["name"]
        print(f"  + {log_name}")

        # 3. Rewire: send → log → Build Success Output (was send → Build Success Output)
        send_conns = conns.get(send_name, {}).get("main", [[]])
        downstream = send_conns[0] if send_conns else []
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
