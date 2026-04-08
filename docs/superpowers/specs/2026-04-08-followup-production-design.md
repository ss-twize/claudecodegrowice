# Follow-up After Visit — Production Hardening

**Date:** 2026-04-08  
**Status:** Approved  
**Scope:** Workflow FDFyvtbDWgDakcCA (22_YClients_Attended_Visit_Followup)

---

## Problem

The post-visit follow-up workflow has several production-blocking issues:

1. **WA/Max send URLs are placeholders** (`https://green-api.example/...`) — WhatsApp and Max messages never actually send
2. **Credentials hardcoded in Code node** — `supabase_service_role_key`, YClients tokens visible in workflow JSON
3. **No error protection** — HTTP send node failure kills the entire workflow run
4. **Race condition on dedup** — two parallel executions in the same minute can both claim the same client
5. **Name uses raw `clients.name` (ФИО)** — clients receive "Иванов Иван Иванович" instead of "Иван"
6. **Map URLs hardcoded as placeholders** — `{{yandex_maps_url}}` and `{{two_gis_url}}` not sourced from org data
7. **No logging** — successful sends are invisible in `action_log`

---

## Solution Overview

Patch the existing workflow in-place. Six targeted fixes — no structural redesign:

1. Load GREEN-API credentials from `channel_connections` (same pattern as AiAdmin WA/Max)
2. Load `yandex_maps_url` / `two_gis_url` from `org_settings`
3. Replace optimistic PATCH dedup with atomic SQL function `claim_followup()`
4. Extract first name from ФИО (`name.split(' ')[0]`)
5. Add `continueOnFail: true` to all three send nodes
6. Write to `action_log` after each successful send

---

## Trigger & Config

- **Schedule:** every 1 minute (unchanged)
- **Lookback window:** 180 minutes (unchanged)
- **Config node** at workflow start loads:
  - `org_settings` → `yandex_maps_url`, `two_gis_url`
  - `channel_connections` → GREEN-API `instanceId` + `instanceToken` for WA and Max
  - Credentials from n8n env vars: `$env.SUPABASE_SERVICE_ROLE_KEY`, `$env.YCLIENTS_TOKEN`

---

## org_settings Schema Addition

Add two columns to `org_settings`:

```sql
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS yandex_maps_url text,
  ADD COLUMN IF NOT EXISTS two_gis_url text;
```

These are filled by the salon owner during platform onboarding (their Yandex Maps / 2GIS organization page URL). For now, filled manually via Supabase dashboard.

---

## Data Fetch

Unchanged from current workflow:
- YClients GET: `attendance=1`, `last_change_date` within last 180 minutes
- Parallel Supabase queries: `clients`, `telegram_users`, `whatsapp_users`, `max_users`

---

## Message Assembly

**Channel priority:** Telegram → WhatsApp → Max (no SMS)

**Name extraction:** `clients.name.split(' ')[0]` — first word of ФИО

**Message template:**
```
{firstName}, спасибо за визит на {service}! Будем благодарны за отзыв:
Яндекс Карты: {yandex_maps_url}
2ГИС: {two_gis_url}

Если захотите записаться снова — просто напишите 🙂
```

Where `{service}` = YClients `staff_service_name` or `service_name`.

---

## Atomic Dedup

Replace current optimistic PATCH with a Supabase SQL function:

```sql
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

**Workflow logic:**
1. For each client in the batch, call `claim_followup(client_id, record_id)` via Supabase RPC
2. IF result is `NULL` → client already claimed this visit → skip (no send, no log)
3. IF result is UUID → proceed to send

**Race condition guarantee:** PostgreSQL row-level locking ensures only one concurrent caller wins the UPDATE. The second caller sees the already-updated value and gets NULL.

---

## Send Nodes

| Channel | Node Type | Credentials Source |
|---|---|---|
| Telegram | `n8n-nodes-base.telegram` | n8n credential (existing) |
| WhatsApp | HTTP Request → GREEN-API `sendMessage` | `channel_connections` at runtime |
| Max | HTTP Request → GREEN-API Max `sendMessage` | `channel_connections` at runtime |

All three send nodes: `continueOnFail: true`

**GREEN-API sendMessage URL pattern (WA):**
```
https://{apiUrl}/waInstance{instanceId}/sendMessage/{instanceToken}
```
Body: `{ "chatId": "{wa_chat_id}", "message": "{text}" }`

**GREEN-API sendMessage URL pattern (Max):**
Same pattern with Max instance credentials.

---

## Logging

After each successful send, write to `action_log`:

```json
{
  "org_uid": "11111111-1111-1111-1111-111111111111",
  "type": "followup_sent",
  "payload": {
    "client_id": "{uuid}",
    "channel": "telegram|whatsapp|max",
    "record_id": 12345,
    "service": "Стрижка мужская"
  }
}
```

Failed sends (caught by `continueOnFail`) are not logged. The claim is already written — the next minute's run will not retry. Follow-up is fire-and-forget; delivery is best-effort.

---

## What Is Not Changed

- Trigger schedule and lookback window
- YClients API call structure and filters
- Supabase query structure for clients/users
- Channel priority order (TG → WA → Max)
- `last_yclients_followup_record_id` field semantics
- No conflict with Reminder System — reminders fire on upcoming appointments, follow-up fires on visited ones (different records, different status fields)

---

## Risks

| Risk | Mitigation |
|---|---|
| `claim_followup` RPC not available | Script creates it via migration before patching workflow |
| `org_settings` missing `yandex_maps_url` / `two_gis_url` | Config node checks for null → skips map URLs gracefully, sends message without links |
| `channel_connections` has no WA/Max entry | Config node IF guard → skips WA/Max send entirely |
| GREEN-API Max field path differs from WA | Code node uses conditional field extraction with fallback |
