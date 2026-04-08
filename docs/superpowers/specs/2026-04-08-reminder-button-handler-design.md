# Reminder System — Button Handler & Error Handling

**Date:** 2026-04-08  
**Status:** Approved  
**Scope:** Reminder System (EuoJznKBMjQouVzs) + AiAdmin TG/WA/Max (YRc6sHkXYOsM4bDH / B5zdaJNh5OwFk5Bh / wOu3Xv9IhRY2rgNy)

---

## Problem

Reminder messages are sent with three interactive buttons ("Приду", "Перенести", "Не приду") but button responses are never handled — they fall into the AI Agent as unstructured text. Additionally, HTTP send nodes in Reminder System have zero error protection: a single timeout kills the entire workflow run.

---

## Solution Overview

Two independent changes:

**A. Reminder System** — add `continueOnFail: true` to all 16 HTTP send nodes (TG/WA/Max/SMS). If a send fails, the workflow continues, the status field is NOT updated, and the next minute's run retries automatically. Built-in retry with zero added nodes.

**B. AiAdmin TG + WA + Max** — insert a button-response detection layer before the existing Switch. Intercepts `confirm|cancel|reschedule` messages and routes them directly, without touching the current agent flow.

---

## Button ID Format

```
{action}|{record_id}|{reminder_key}
```

Examples:
- `confirm|12345|1h`
- `cancel|99887|24h`
- `reschedule|55432|2h`

`record_id` = `appointments.record_id` (YClients ID, used by `delete_book` sub-workflow).

---

## Detection Logic per Channel

### Telegram
- Source field: `$json.callback_query.data`
- Condition: field exists AND matches `/^(confirm|cancel|reschedule)\|\d+\|/`
- Inserted: IF node immediately after `Telegram Trigger`, before `Анти-игнор: сброс на входе`

### WhatsApp (GREEN-API)
- Source field: `$json.body.messageData.typeMessage`
- Condition: equals `'buttonsResponseMessage'`
- ButtonId from: `$json.body.messageData.buttonsResponseMessage.selectedButtonId`
- Inserted: IF node at the top of the existing flow

### Max (GREEN-API Max)
- Source field: same structure as WA via MAX webhook body
- ButtonId from: equivalent `selectedButtonId` field
- Inserted: IF node at the top of the existing flow

If condition is false → existing flow continues unchanged.

---

## New Nodes per AiAdmin Workflow (6 nodes added to each)

```
IF: кнопка-ответ?
  YES →
    Code: разобрать buttonId        (extract action, record_id, chat_id)
      → Switch: действие            (3 outputs: confirm / cancel / reschedule)
          confirm  → Supabase PATCH status=confirmed
                   → Отправить подтверждение
                   → [TG only] answerCallbackQuery
          cancel   → executeWorkflow(delete_book, {record_id})
                   → Supabase PATCH status=cancelled
                   → Отправить подтверждение
                   → [TG only] answerCallbackQuery
          reschedule → Set: инжектировать сообщение для агента
                     → [existing AI Agent node]
  NO → [existing flow unchanged]
```

---

## Node Details

### Code: разобрать buttonId
```js
const raw = // $json.callback_query?.data  (TG)
            // $json.body.messageData.buttonsResponseMessage?.selectedButtonId  (WA/Max)
const [action, record_id, reminder_key] = raw.split('|');
const chat_id = // TG: $json.callback_query.message.chat.id
                // WA: $json.body.senderData.chatId
                // Max: equivalent field
return [{ json: { action, record_id: Number(record_id), reminder_key, chat_id } }];
```

### Supabase PATCH (confirm)
- Table: `appointments`
- Operation: update
- Filter: `record_id = eq.{record_id}`
- Body: `{ status: "confirmed" }`

### executeWorkflow (cancel)
- Workflow: `delete_book` (pbWtCriTuU1ozq91)
- Input: `{ record_id }`

### Supabase PATCH (cancel)
- Table: `appointments`
- Filter: `record_id = eq.{record_id}`
- Body: `{ status: "cancelled" }`

### Set: инжектировать сообщение (reschedule)
- Sets a synthetic user message:
  `"Хочу перенести запись. Номер записи: {record_id}. Помоги подобрать новое время."`
- Routes into existing AI Agent node

### answerCallbackQuery (TG only — confirm + cancel branches)
- HTTP POST to Telegram Bot API: `answerCallbackQuery`
- `callback_query_id`: `$json.callback_query.id`
- Removes spinner from button

### Отправить подтверждение
- confirm: *"Отлично, ждём вас! 😊"*
- cancel: *"Запись отменена. Будем рады видеть вас снова 🙂"*
- Sent via channel-native node (TG node / GREEN-API HTTP)

---

## Reminder System Changes

All 16 HTTP send nodes get `continueOnFail: true`:
- `[TG] Отправить с кнопками` × 4
- `[MAX] Отправить напоминание` × 4
- `[WA] Отправить напоминание` × 4
- `[SMS] Отправить напоминание` × 4

Effect: send failure → workflow continues → Supabase status not updated → next-minute run retries.

---

## What Is Not Changed

- Existing Switch routing in AiAdmin workflows
- Anti-ignore chain
- All booking sub-workflows
- Reminder interval logic (correct as-is)
- Channel selection logic in Reminder System code nodes (correct as-is)
- Reminder status field values and duplicate guard

---

## Risks

| Risk | Mitigation |
|---|---|
| `delete_book` fails silently | `executeWorkflow` result checked via IF; Supabase update only runs on success |
| WA/Max buttonId field name differs from expected | Parse Code node has fallback chain to check multiple field paths |
| Reschedule: agent doesn't have appointment context | Agent calls `get_bookings` tool with record_id to fetch details |
| Double cancel (user clicks twice) | `delete_book` is idempotent in YClients; Supabase PATCH is also idempotent |
