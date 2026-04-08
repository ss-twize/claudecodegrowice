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
if (!clientIds.length) return [];

// Batch fetch: client_channels, channel_connections, client phones
const [ccRaw, connRaw, clientsRaw] = await Promise.all([
  fetch(`${SUPABASE_URL}/rest/v1/client_channels?client_id=in.(${idsParam})&is_active=eq.true&can_notify=eq.true&order=priority.asc`, { headers }).then(r => r.json()),
  fetch(`${SUPABASE_URL}/rest/v1/channel_connections?channel_code=in.("whatsapp","max")`, { headers }).then(r => r.json()),
  fetch(`${SUPABASE_URL}/rest/v1/clients?id=in.(${idsParam})&select=id,phone`, { headers }).then(r => r.json()),
]);
if (connRaw.error) throw new Error(`channel_connections fetch failed: ${connRaw.error.message || JSON.stringify(connRaw.error)}`);
if (ccRaw.error) throw new Error(`client_channels fetch failed: ${ccRaw.error.message || JSON.stringify(ccRaw.error)}`);
if (clientsRaw.error) throw new Error(`clients fetch failed: ${clientsRaw.error.message || JSON.stringify(clientsRaw.error)}`);

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

    REQUIRED = ["Resolve Targets", "Split Recipient IDs1", "Normalize Request"]
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
