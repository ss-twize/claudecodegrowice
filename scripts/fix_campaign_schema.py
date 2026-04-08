#!/usr/bin/env python3
import json, urllib.request, urllib.error

N8N_BASE = "https://n8n.srv1090249.hstgr.cloud"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjhkYWM1Yi01ZmEyLTRiNWUtYTcyOS03NmE4MzI1YWNiNzciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNjkxMjE4ZDEtY2JmZC00YmFlLWE2ZjQtZWI5OGNhYjNjYTI3IiwiaWF0IjoxNzc1NDc2NDAzfQ.aCtDzJ0bnIIrlRZgixs_4yH_iNpB1FKAV7uOU9OxYeg"
WF_ID = "UiPsFwkEoofL29mY"

CREATE_RUN_CODE = r"""
const original = $input.first().json;
const SUPABASE_URL = 'https://ugocvtuomyopullvilim.supabase.co';
const SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_UID = '11111111-1111-1111-1111-111111111111';
const hdrs = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};
const campaignResp = await fetch(`${SUPABASE_URL}/rest/v1/campaigns`, {
  method: 'POST', headers: hdrs,
  body: JSON.stringify({ org_id: ORG_UID, title: original.campaign_name || 'Рассылка', message: original.text || '', channels: original.requested_channels || [], status: 'running', created_by: ORG_UID })
});
if (!campaignResp.ok) { const t = await campaignResp.text(); throw new Error(`campaigns INSERT failed (HTTP ${campaignResp.status}): ${t}`); }
const campaignData = await campaignResp.json();
const campaignId = Array.isArray(campaignData) ? campaignData[0].id : campaignData.id;
const runResp = await fetch(`${SUPABASE_URL}/rest/v1/campaign_runs`, {
  method: 'POST', headers: hdrs,
  body: JSON.stringify({ campaign_id: campaignId, status: 'running' })
});
if (!runResp.ok) { const t = await runResp.text(); throw new Error(`campaign_runs INSERT failed (HTTP ${runResp.status}): ${t}`); }
const runData = await runResp.json();
const campaignRunId = Array.isArray(runData) ? runData[0].id : runData.id;
return [{ json: { ...original, campaign_id: campaignId, campaign_run_id: campaignRunId } }];
"""

COLLECT_RESULTS_CODE = r"""
const items = $input.all();
const campaign_run_id = items.find(i => i.json.campaign_run_id)?.json.campaign_run_id;
const campaign_id = items.find(i => i.json.campaign_id)?.json.campaign_id;
const isFailed = i => i.json.failed === true || Boolean(i.json.error);
const sent = items.filter(i => !isFailed(i)).length;
const errors = items.filter(isFailed).length;
const details = { failed: items.filter(isFailed).map(i => ({ client_id: i.json.client_id, reason: i.json.failed ? (i.json.fail_reason || 'no_channel') : 'send_failed' })) };
return [{ json: { campaign_run_id, campaign_id, sent, errors, details } }];
"""

FINISH_RUN_CODE = r"""
const item = $input.first().json;
if (!item.campaign_run_id) { return [{ json: { success: false, error: 'campaign_run_id missing' } }]; }
const SUPABASE_URL = 'https://ugocvtuomyopullvilim.supabase.co';
const SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;
const hdrs = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const patchResp = await fetch(`${SUPABASE_URL}/rest/v1/campaign_runs?id=eq.${item.campaign_run_id}`, { method: 'PATCH', headers: hdrs, body: JSON.stringify({ sent: item.sent, errors: item.errors, details: item.details, status: 'done', finished_at: new Date().toISOString() }) });
if (!patchResp.ok) { const t = await patchResp.text(); throw new Error(`campaign_runs PATCH failed (HTTP ${patchResp.status}): ${t}`); }
if (item.campaign_id) { await fetch(`${SUPABASE_URL}/rest/v1/campaigns?id=eq.${item.campaign_id}`, { method: 'PATCH', headers: hdrs, body: JSON.stringify({ status: 'done' }) }); }
return [{ json: { success: true, campaign_run_id: item.campaign_run_id, sent: item.sent, errors: item.errors } }];
"""

UPDATES = {
    "Создать campaign_run": CREATE_RUN_CODE,
    "Collect Results": COLLECT_RESULTS_CODE,
    "Завершить campaign_run": FINISH_RUN_CODE,
}

def fetch_wf(wf_id):
    req = urllib.request.Request(f"{N8N_BASE}/api/v1/workflows/{wf_id}", headers={"X-N8N-API-KEY": N8N_API_KEY})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def push_wf(wf_id, wf):
    allowed = {"name", "nodes", "connections", "settings", "staticData", "pinData"}
    clean = {k: v for k, v in wf.items() if k in allowed}
    allowed_s = {"executionOrder", "saveDataSuccessExecution", "saveDataErrorExecution", "timezone", "callerPolicy", "errorWorkflow", "saveExecutionProgress", "saveManualExecutions"}
    if "settings" in clean:
        clean["settings"] = {k: v for k, v in clean["settings"].items() if k in allowed_s}
    body = json.dumps(clean).encode()
    req = urllib.request.Request(f"{N8N_BASE}/api/v1/workflows/{wf_id}", data=body, method="PUT",
        headers={"X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()[:300]}")
        raise

def main():
    wf = fetch_wf(WF_ID)
    updated = 0
    for n in wf["nodes"]:
        if n["name"] in UPDATES:
            n["parameters"]["jsCode"] = UPDATES[n["name"]].strip()
            print(f"  OK: {n['name']}")
            updated += 1
    if updated != len(UPDATES):
        print(f"  Missing: {set(UPDATES) - {n['name'] for n in wf['nodes']}}")
        return
    result = push_wf(WF_ID, wf)
    print(f"Uploaded: {len(result.get('nodes', []))} nodes")

if __name__ == "__main__":
    main()
