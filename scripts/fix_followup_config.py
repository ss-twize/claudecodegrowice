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
    claim["parameters"].pop("queryParameters", None)
    print("  ✓ Claim Client Follow-up: PATCH → RPC POST claim_followup()")

    # ── 5. Add IF node "Claim: успешно?" ───────────────────────────────────
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
    build_claimed = nodes_by_name["Build Claimed Message"]
    build_claimed["position"][0] += 220

    conns["Claim Client Follow-up"] = {"main": [[{"node": "Claim: успешно?", "type": "main", "index": 0}]]}
    conns["Claim: успешно?"] = {
        "main": [
            [{"node": "Build Claimed Message", "type": "main", "index": 0}],
            []
        ]
    }
    print("  ✓ Claim → Claim: успешно? → Build Claimed Message (IF guard)")

    # ── Push ─────────────────────────────────────────────────────────────────
    result = push(WF_ID, wf)
    node_count = len(result.get("nodes", []))
    print(f"\n✅ Uploaded '{result['name']}': {node_count} nodes")


if __name__ == "__main__":
    main()
