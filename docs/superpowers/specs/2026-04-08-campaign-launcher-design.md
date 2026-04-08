# Campaign Launcher — Multi-Channel Redesign

**Date:** 2026-04-08  
**Status:** Approved  
**Scope:** Workflow UiPsFwkEoofL29mY (Growice Campaign Launcher)

---

## Problem

The campaign launcher has three production issues:

1. **Legacy dead branch** — `Load Telegram Recipient` reads from `clients_tg` (legacy table), output goes nowhere
2. **Hardcoded credentials** — `legacyWhatsAppConfig` in `Resolve Targets` has plaintext `instance_id` and `api_token` as fallback when `channel_connections` is empty
3. **Zero logging** — no record of campaign launches, results, or errors; impossible to debug or audit

---

## Solution Overview

Patch the existing workflow in-place. Three targeted changes:

1. Remove `Load Telegram Recipient` (dead branch, legacy table)
2. Rewrite `Resolve Targets` — clean code without async IIFE, remove hardcoded fallback, implement proper channel priority + SMS fallback
3. Add campaign logging via `campaign_runs` table — INSERT at start (status=running), UPDATE at end (totals + done)

---

## Node Changes

**Delete:**
- `Load Telegram Recipient` — reads `clients_tg`, no downstream consumers

**Rewrite:**
- `Resolve Targets` — see section below

**Add (3 new nodes):**
- `Создать campaign_run` — Supabase INSERT after `Normalize Request`
- `Collect Results` — Code node after all send branches merge
- `Завершить campaign_run` — Supabase PATCH after `Collect Results`

**Final node order:**
```
Webhook
  → Normalize Request
  → Создать campaign_run
  → Split Recipient IDs
  → Resolve Targets
  → Route By Channel
  → [TG / WA / Max / SMS send nodes]
  → Collect Results
  → Завершить campaign_run
```

Total: +3 nodes, -1 node, 1 rewritten. Node count: 10 → 12.

---

## campaign_runs Table Schema

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
```

`status` values: `running` | `done`. Records stuck in `running` after timeout indicate crashed runs — no automated resolution needed.

`failed_ids` format: `[{"client_id": "uuid", "reason": "no_channel|send_failed|no_phone"}]`

---

## Resolve Targets Rewrite

**Input per item:** `{ client_id, channels, campaign_run_id, text }`

**Algorithm:**

1. Fetch `client_channels` where `client_id = X AND is_active = true AND can_notify = true`, ordered by `priority`
2. Build priority list: requested `channels` param first, then remaining available channels
3. Iterate by priority — first channel with a matching record in `telegram_users` / `whatsapp_users` / `max_users` wins
4. For WA and Max: fetch credentials from `channel_connections` (no hardcoded fallback). If `channel_connections` has no entry for that channel type → skip it in priority iteration
5. If no channel found → SMS (use `clients.phone`)
6. If no phone either → mark as failed with `reason: "no_channel"`

**Output per item:**
```json
{
  "client_id": "uuid",
  "campaign_run_id": "uuid",
  "channel": "telegram|whatsapp|max|sms",
  "recipient": "chat_id or phone",
  "provider_url": "https://... or null for TG/SMS",
  "text": "message text",
  "failed": false,
  "fail_reason": null
}
```

Failed items (no channel): `{ "client_id": "...", "failed": true, "fail_reason": "no_channel", "campaign_run_id": "..." }`

All items (including failed) flow through `Route By Channel` — failed items are routed to a no-op branch so they reach `Collect Results`.

**Implementation:** plain synchronous Code node using `$input.all()` to iterate items (no async IIFE). Internal `fetch()` calls to Supabase PostgREST — all client data loaded in batch (single query with `in` filter on client_id list), not per-client.

---

## Logging Flow

### При запуске — `Создать campaign_run`

Supabase INSERT (after `Normalize Request`, before `Split Recipient IDs`):

```json
{
  "org_uid": "11111111-1111-1111-1111-111111111111",
  "campaign_name": "{{ $json.campaign_name }}",
  "channels": "{{ $json.channels }}",
  "recipient_ids": "{{ $json.recipient_ids }}",
  "status": "running"
}
```

Returns `id` → stored as `campaign_run_id`, passed through all subsequent nodes via `$json`.

### `Collect Results` Code node

After all send branches merge:
- `total_sent` = count of items where `failed = false`
- `total_failed` = count of items where `failed = true`
- `failed_ids` = array of `{client_id, reason}` from failed items

### При завершении — `Завершить campaign_run`

Supabase PATCH:

```
PATCH /campaign_runs?id=eq.{{ $json.campaign_run_id }}
{
  "total_sent": {{ $json.total_sent }},
  "total_failed": {{ $json.total_failed }},
  "failed_ids": {{ $json.failed_ids }},
  "status": "done",
  "finished_at": "{{ $now }}"
}
```

---

## Send Nodes

Unchanged from current workflow:
- `[TG]` — native `n8n-nodes-base.telegram`
- `[WA]` — HTTP Request to `{{ $json.provider_url }}`
- `[Max]` — HTTP Request to `{{ $json.provider_url }}`
- `[SMS]` — GET to SMSAero
- All have `continueOnFail: true` ✓

Failed sends (caught by continueOnFail) must set `failed: true` on the item before reaching `Collect Results`. A Code node after each send node checks `$execution.lastNodeExecutionData` error state and annotates the item accordingly.

---

## Route By Channel — Failed Items

`Route By Channel` (Switch) must have a 5th output for `failed: true` items (no channel found). These items skip all send nodes and connect directly to the `Merge` node before `Collect Results`, carrying `{failed: true, fail_reason: "no_channel"}`.

## Merge Before Collect Results

All five branches (TG / WA / Max / SMS / failed) connect to a `Merge` node (mode: `append`) before `Collect Results`. This ensures all items are counted regardless of channel.

---

## What Is Not Changed

- Webhook path: `/growice/rassylka_zapustit`
- `Normalize Request` logic
- `Split Recipient IDs` logic
- `Route By Channel` switch structure
- Send node credentials and URL patterns
- `continueOnFail: true` on all send nodes

---

## Risks

| Risk | Mitigation |
|---|---|
| `campaign_runs` table does not exist | Migration script created before patching workflow |
| `Resolve Targets` fetches all clients in one call — large campaigns may hit URL length limits | Use POST with body for Supabase queries (PostgREST supports it) |
| `campaign_run_id` lost through send branches | Set as top-level `$json` field, preserved through all node types |
| Merge node timing — SMS branch may complete faster than TG | `Merge` in append mode collects all items regardless of order |
