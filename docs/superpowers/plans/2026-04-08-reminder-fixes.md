# Reminder System Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two confirmed bugs in the Reminder System (EuoJznKBMjQouVzs): TG reminders sending via WhatsApp GREEN-API instead of Telegram Bot API, and no error protection on HTTP send nodes.

**Architecture:** Two Python scripts patch the workflow via n8n REST API. Script 1 replaces 4 `[TG] Отправить с кнопками` HTTP nodes with native `n8n-nodes-base.telegram` sendMessage nodes using inline keyboard. Script 2 sets `continueOnFail: true` on all 16 HTTP send nodes.

**Tech Stack:** n8n REST API (PUT /api/v1/workflows/{id}), Python 3 urllib, n8n Telegram credential id `56b5PgNwe1YoXmQn`

**Context:**
- Reminder workflow ID: `EuoJznKBMjQouVzs`
- Telegram credential: `{"id": "56b5PgNwe1YoXmQn", "name": "test"}`
- confirm/cancel/reschedule flow already works in AiAdmin TG/WA/Max — no changes needed there
- Supabase status updates after TG send use `filterString: "record_id=eq.{record_id}"` — correct as-is

---

## Task 1: Fix TG Send Nodes — Replace GREEN-API with Telegram Bot API

**Files:**
- Create: `/tmp/fix_tg_reminder_send.py`

- [ ] **Step 1: Write the script**

```python
#!/usr/bin/env python3
"""
Fix [TG] Отправить с кнопками (x4) in Reminder System (EuoJznKBMjQouVzs).
Replace GREEN-API HTTP nodes with native n8n-nodes-base.telegram sendMessage
nodes that use inline keyboard (callback_data) instead of reply buttons.
"""
import json, uuid, urllib.request, urllib.error

N8N_BASE    = "https://n8n.srv1090249.hstgr.cloud"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjhkYWM1Yi01ZmEyLTRiNWUtYTcyOS03NmE4MzI1YWNiNzciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNjkxMjE4ZDEtY2JmZC00YmFlLWE2ZjQtZWI5OGNhYjNjYTI3IiwiaWF0IjoxNzc1NDc2NDAzfQ.aCtDzJ0bnIIrlRZgixs_4yH_iNpB1FKAV7uOU9OxYeg"
WF_ID       = "EuoJznKBMjQouVzs"
TG_CRED     = {"id": "56b5PgNwe1YoXmQn", "name": "test"}

# 4 nodes to replace, paired with their Code node names for the record_id expression
TG_SEND_NODES = [
    ("[TG] Отправить с кнопками",  "Подготовить сообщение + выбрать канал"),
    ("[TG] Отправить с кнопками1", "Подготовить сообщение + выбрать канал1"),
    ("[TG] Отправить с кнопками2", "Подготовить сообщение + выбрать канал2"),
    ("[TG] Отправить с кнопками3", "Подготовить сообщение + выбрать канал3"),
]


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


def make_tg_send_node(old_node, code_node_name):
    """
    Return a native Telegram sendMessage node that replaces the GREEN-API HTTP node.
    Uses inline_keyboard so the AiAdmin TG callback handler (Switch1 → Разобрать callback1)
    can receive and process the button click via callback_query.
    """
    return {
        "id": old_node["id"],          # keep same ID so connections are preserved
        "name": old_node["name"],
        "type": "n8n-nodes-base.telegram",
        "typeVersion": 1.2,
        "position": old_node["position"],
        "credentials": {"telegramApi": TG_CRED},
        "parameters": {
            "chatId": f"={{{{ $json.recipient }}}}",
            "text": f"={{{{ $json.rich_text }}}}",
            "additionalFields": {
                "parse_mode": "Markdown",
                "reply_markup": (
                    f"={{{{ JSON.stringify({{ inline_keyboard: [["
                    f"  {{ text: 'Приду', callback_data: 'confirm|' + $json.record_id + '|' + $json.reminder_key }},"
                    f"  {{ text: 'Перенести', callback_data: 'reschedule|' + $json.record_id + '|' + $json.reminder_key }},"
                    f"  {{ text: 'Не приду', callback_data: 'cancel|' + $json.record_id + '|' + $json.reminder_key }}"
                    f"]] }}) }}}}"
                ),
            },
        },
        "onError": "continueRegularOutput",
    }


def main():
    print(f"Fetching workflow {WF_ID}…")
    wf = fetch(WF_ID)
    nodes_by_name = {n["name"]: n for n in wf["nodes"]}

    patched = 0
    for node_name, code_node_name in TG_SEND_NODES:
        old = nodes_by_name.get(node_name)
        if not old:
            print(f"  ⚠ Node '{node_name}' not found — skipping")
            continue

        # Verify it's still the wrong type (idempotency check)
        if old["type"] == "n8n-nodes-base.telegram":
            print(f"  ✓ '{node_name}' already Telegram node — skip")
            continue

        new_node = make_tg_send_node(old, code_node_name)
        # Replace in the nodes list
        for i, n in enumerate(wf["nodes"]):
            if n["name"] == node_name:
                wf["nodes"][i] = new_node
                break

        print(f"  ✓ Replaced '{node_name}': GREEN-API → Telegram (inline_keyboard)")
        patched += 1

    if patched == 0:
        print("Nothing to patch.")
        return

    result = push(WF_ID, wf)
    tg_nodes = [n for n in result.get("nodes", []) if n.get("name", "").startswith("[TG] Отправить")]
    types = [n["type"] for n in tg_nodes]
    print(f"\n✅ Uploaded '{result['name']}': {len(result.get('nodes', []))} nodes")
    print(f"   TG send node types: {types}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it and verify output**

```bash
python3 /tmp/fix_tg_reminder_send.py
```

Expected output:
```
Fetching workflow EuoJznKBMjQouVzs…
  ✓ Replaced '[TG] Отправить с кнопками': GREEN-API → Telegram (inline_keyboard)
  ✓ Replaced '[TG] Отправить с кнопками1': GREEN-API → Telegram (inline_keyboard)
  ✓ Replaced '[TG] Отправить с кнопками2': GREEN-API → Telegram (inline_keyboard)
  ✓ Replaced '[TG] Отправить с кнопками3': GREEN-API → Telegram (inline_keyboard)
✅ Uploaded 'Reminder System': 52 nodes
   TG send node types: ['n8n-nodes-base.telegram', 'n8n-nodes-base.telegram', ...]
```

- [ ] **Step 3: Commit**

```bash
git add /tmp/fix_tg_reminder_send.py
git commit -m "fix: replace TG reminder GREEN-API send with native Telegram inline keyboard"
```

---

## Task 2: Add continueOnFail to All 16 HTTP Send Nodes

**Files:**
- Create: `/tmp/fix_reminder_continuefail.py`

- [ ] **Step 1: Write the script**

```python
#!/usr/bin/env python3
"""
Add continueOnFail: true to all 16 HTTP send nodes in Reminder System.
Nodes: [TG]/[WA]/[MAX]/[SMS] Отправить* (but TG nodes are now Telegram type after Task 1).
We set continueOnFail on ALL httpRequest nodes AND Telegram nodes whose names
start with [TG]/[WA]/[MAX]/[SMS] and contain 'Отправить'.
"""
import json, urllib.request, urllib.error

N8N_BASE    = "https://n8n.srv1090249.hstgr.cloud"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjhkYWM1Yi01ZmEyLTRiNWUtYTcyOS03NmE4MzI1YWNiNzciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNjkxMjE4ZDEtY2JmZC00YmFlLWE2ZjQtZWI5OGNhYjNjYTI3IiwiaWF0IjoxNzc1NDc2NDAzfQ.aCtDzJ0bnIIrlRZgixs_4yH_iNpB1FKAV7uOU9OxYeg"
WF_ID       = "EuoJznKBMjQouVzs"

SEND_PREFIXES = ("[TG]", "[WA]", "[MAX]", "[SMS]")
SEND_KEYWORD  = "Отправить"


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


def is_send_node(n):
    name = n.get("name", "")
    return (
        any(name.startswith(p) for p in SEND_PREFIXES)
        and SEND_KEYWORD in name
    )


def main():
    print(f"Fetching workflow {WF_ID}…")
    wf = fetch(WF_ID)

    patched = 0
    for n in wf["nodes"]:
        if is_send_node(n) and not n.get("continueOnFail"):
            n["continueOnFail"] = True
            print(f"  ✓ continueOnFail=true → '{n['name']}'")
            patched += 1

    print(f"\nPatched {patched} nodes")
    result = push(WF_ID, wf)
    print(f"✅ Uploaded '{result['name']}': {len(result.get('nodes', []))} nodes")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it and verify output**

```bash
python3 /tmp/fix_reminder_continuefail.py
```

Expected output:
```
Fetching workflow EuoJznKBMjQouVzs…
  ✓ continueOnFail=true → '[TG] Отправить с кнопками'
  ... (16 lines total)
Patched 16 nodes
✅ Uploaded 'Reminder System': 52 nodes
```

- [ ] **Step 3: Commit**

```bash
git add /tmp/fix_reminder_continuefail.py
git commit -m "fix: continueOnFail on all 16 Reminder System HTTP/TG send nodes"
```

---

## Task 3: Update Design Spec and PROGRESS.md

- [ ] **Step 1: Update PROGRESS.md**

Add entry:
```
| 20 | Reminder System: fix TG send (GREEN-API→Telegram inline keyboard) + continueOnFail on 16 send nodes | ✅ | 6 |
```

- [ ] **Step 2: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: update progress — reminder system fixes"
```

---

## Verification Checklist

After running both scripts, verify in n8n UI (https://n8n.srv1090249.hstgr.cloud):

1. Open Reminder System workflow
2. `[TG] Отправить с кнопками` (all 4): type should be `telegram`, not `httpRequest`
3. The TG nodes should show Telegram credential, `chatId = $json.recipient`, inline_keyboard in additionalFields
4. `[WA] Отправить напоминание*` (4 nodes): `continueOnFail` checkbox enabled
5. `[MAX] Отправить напоминание*` (4 nodes): `continueOnFail` checkbox enabled
6. `[SMS] Отправить напоминание*` (4 nodes): `continueOnFail` checkbox enabled
7. `[TG] Отправить с кнопками*` (4 nodes): `continueOnFail` checkbox enabled
