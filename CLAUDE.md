# CLAUDE.md — Постоянный контекст проекта СЕРВЕКС

> Этот файл — источник истины для любой AI-сессии в этом репозитории.
> Читать **до** любых изменений. Обновлять при изменении архитектуры.

---

## Что такое СЕРВЕКС

AI-платформа для сервисного бизнеса в РФ.
- Ядро продукта — AI-администратор для записи клиентов
- Основа текущей версии — интеграция с YClients
- Управляет: клиентами, записями, мессенджерами, напоминаниями, рассылками, возвратом клиентов, аналитикой
- Multi-tenant продукт: organizations → branches → clients/appointments/channels

---

## Стек

| Слой | Технология | Роль |
|---|---|---|
| Frontend | Next.js 14 App Router + React 18 + Tailwind | Control plane |
| Database | Supabase (PostgreSQL + Realtime + pgvector) | Data / state layer |
| Automation | n8n (self-hosted на VPS) | Execution / orchestration |
| Channels | GREEN-API | Delivery layer (WhatsApp, Max) |
| Booking | YClients API | Главный transactional source |
| AI | OpenRouter (Minimax-M2.5 / GPT-4.1), OpenAI embeddings, Cohere reranker | AI layer |
| Memory | Redis | Сессии + дебаунс |
| Deploy | Vercel | Hosting |

---

## Инфраструктура

- **Frontend:** https://claudecodegrowice.vercel.app/ (Vercel, auto-deploy от push в main)
- **n8n:** https://n8n.srv1090249.hstgr.cloud (VPS, self-hosted)
- **Supabase:** https://ugocvtuomyopullvilim.supabase.co
- **GitHub:** https://github.com/ss-twize/claudecodegrowice.git (private)
- **YClients company_id:** `1647948` (только этот, не 1700961 и не другой)

Все секреты — в `.env.local` (не в git) и в n8n env vars на VPS.
Шаблон переменных: `.env.example` в корне репозитория.

---

## Архитектурная модель

```
frontend (Next.js)     = control plane — UI и управление состоянием
n8n                    = execution/orchestration — всё автоматизированное
Supabase               = data/state layer — единственный источник истины
YClients               = главный transactional source текущей версии
мессенджеры (GREEN-API) = delivery layer
```

**Frontend НЕ является источником истины.**
**Секреты, токены и ключи — НИКОГДА в коде или workflow открытым текстом.**

---

## Текущее состояние (апрель 2026)

- `ORG_UID = '11111111-1111-1111-1111-111111111111'` — хардкожен в `lib/supabase.ts`
- Нет таблиц `organizations`, `branches`, `user_profiles` в Supabase
- RLS политики открыты для `anon` — аутентификации нет
- Все таблицы scoped только на `org_uid` (single-tenant режим)
- YClients credentials хранятся в n8n env-переменных, а не в БД
- `campaign_logs` отсутствует — только `action_log`
- `clients_tg` — legacy дубль, читается фронтом (dashboard/analytics), но sync не идёт
- `appointments` — пустая таблица (0 строк), синхронизация из YClients не настроена
- `webhooks` таблица пустая — callWebhook() работает только через env vars
- `clients.lifecycle_status` ('lead'|'client'|'inactive') — добавлено в сессии 3, **требует запуска `add_client_lifecycle.sql`**

---

## Целевая архитектура данных

### Иерархия сущностей

```
organizations
  └── branches
        ├── integration_settings   (YClients creds per branch)
        ├── branch_settings        (конфиг филиала)
        ├── channel_connections    (Telegram/WhatsApp/Max per branch)
        │     └── channel_connection_events
        ├── system_states          (тогглы автоматизаций)
        ├── webhooks               (n8n endpoints)
        ├── knowledge_files        (база знаний)
        ├── masters                (кэш мастеров из YClients)
        ├── metrics_day            (дневная аналитика)
        ├── metrics_month          (месячная аналитика)
        ├── map_ratings            (рейтинги Яндекс/2GIS)
        ├── action_log             (системный audit trail)
        ├── campaign_logs          (журнал кампаний)
        └── clients
              ├── telegram_users   (контакты Telegram)
              ├── whatsapp_users   (контакты WhatsApp)
              ├── max_users        (контакты Max)
              ├── client_channels  (маршрутизация)
              └── appointments     (записи)

org_settings — уровень org (дефолты, не branch)
user_profiles — org_id + branch_access[]
```

### Статус таблиц

| Таблица | Статус | Действие |
|---|---|---|
| `organizations` | MISSING | CREATE |
| `branches` | MISSING | CREATE |
| `user_profiles` | MISSING | CREATE |
| `integration_settings` | MISSING | CREATE |
| `branch_settings` | MISSING | CREATE |
| `masters` | MISSING | CREATE |
| `campaign_logs` | MISSING | CREATE |
| `org_settings` | KEEP | org-level defaults |
| `system_states` | EXTEND | + branch_id |
| `channel_connections` | EXTEND | + branch_id |
| `channel_connection_events` | KEEP | OK |
| `telegram_users` | EXTEND | + branch_id |
| `whatsapp_users` | EXTEND | + branch_id |
| `max_users` | EXTEND | + branch_id |
| `clients` | CLEAN + EXTEND | + branch_id, убрать YC-мусор в yc_raw |
| `client_channels` | KEEP | OK (scope через clients) |
| `appointments` | EXTEND | + branch_id |
| `webhooks` | EXTEND | + branch_id |
| `knowledge_files` | EXTEND | + branch_id |
| `metrics_day` | EXTEND | + branch_id |
| `metrics_month` | EXTEND | + branch_id |
| `map_ratings` | EXTEND | + branch_id |
| `action_log` | EXTEND | + branch_id |
| `clients_tg` | RETIRE | проверить зависимости, удалить |

---

## Правила миграции (порядок волн)

```
ВОЛНА 0 — Основа (без ломки существующего)
  CREATE: organizations, branches, user_profiles,
          integration_settings, branch_settings,
          masters, campaign_logs

ВОЛНА 1 — Расширение (nullable branch_id)
  ADD COLUMN branch_id NULL → backfill → NOT NULL

ВОЛНА 2 — UNIQUE constraints
  DROP старые UNIQUE (org_uid, ...)
  ADD новые UNIQUE (branch_id, ...)

ВОЛНА 3 — Чистка clients
  ADD yc_raw JSONB → migrate мусор → DROP лишних колонок

ВОЛНА 4 — Auth и RLS
  Включить proper auth, переписать RLS

ВОЛНА 5 — n8n обновление
  Обновить workflows на branch_id
  Перенести YClients creds в integration_settings

ВОЛНА 6 — Cleanup
  Удалить clients_tg, финальный audit org_uid
```

### Критические правила совместимости

1. **`org_uid` НИКОГДА не удалять** до полного перехода n8n
2. **`branch_id` добавляется nullable** в первой волне, NOT NULL только после backfill
3. **Существующие данные** → `org_uid='11111111-...'` = default org, default branch
4. **UNIQUE constraints** меняются в два шага — сначала новый partial, потом удаление старого
5. **RLS обновляется последним** — только после рабочей auth + заполненных branch_id

---

## n8n Workflows — ключевые ID

### Production core (не трогать без анализа)

| ID | Имя | Роль |
|---|---|---|
| YRc6sHkXYOsM4bDH | AiAdmin Telegram | AI-агент (telegramTrigger) |
| B5zdaJNh5OwFk5Bh | AiAdmin Whatsapp | AI-агент (GREEN-API webhook) |
| wOu3Xv9IhRY2rgNy | AiAdmin Max | AI-агент (GREEN-API webhook) |
| EuoJznKBMjQouVzs | Reminder System | Напоминания |
| FDFyvtbDWgDakcCA | 22_YClients_Attended_Visit_Followup | Пост-визит follow-up |
| xaxrBlEkUgfMK13e | 21_YClients_Masters_To_Supabase | Синк мастеров |
| GA4gUKr8Oz99Q4dI | sync clientbase from YC to Supabase | Синк клиентов |
| UiPsFwkEoofL29mY | Growice Campaign Launcher | Рассылки |
| wgwN6kJjxnKsoHqr | RAG Memory Uploader | Загрузка знаний |

### Sub-workflows (вызываются из AiAdmin) ⚡ критичны

| ID | Имя | Изменения |
|---|---|---|
| 3ZcJYOVdftZjNa3r | create YCLIENTS record | ✅ добавлен success check (9 nodes) |
| pbWtCriTuU1ozq91 | delete_book | ✅ добавлен IF success (5 nodes) |
| cQeKCsKJlH58YKov | update_book | ✅ добавлен IF success, статус rescheduled |
| BAZyYLjb1XYEBaS2 | booking_dates | ✅ onError: continueRegularOutput |
| **q79k1BWcbQwCw67M** | find YCLIENTS client | ✅ исправлен company_id 1700961→1647948 |
| itTbB4I1zLVJUnxx | create_client | ✅ таблица clients_tg→clients |
| HZBOuIdEf05OU4Es | ycl_bookings | — |
| o9la7KcB4iO5K8yS | ycl get bookings | ✅ исправлены hardcoded creds |
| fPcL4OPX63mgUSJG | get_staff | — |

**Archived (не использовать):** 1DmZjbQ4Rkonc6PL, 3hHM27ca2O6lWEt4 — find_client с неправильным company_id

---

## Источники истины

| Данные | Источник |
|---|---|
| Записи | `appointments` (Supabase) |
| Клиенты | `clients` (Supabase) |
| Контакты мессенджеров | `telegram_users` / `whatsapp_users` / `max_users` |
| Главный ID клиента | `clients.id` (UUID, Supabase) |
| Внешний ID YClients | `clients.yc_id` / `clients.yclients_id` |
| Конфиг автоматизаций | `system_states` (Supabase) |
| Конфиг вебхуков | `webhooks` (Supabase) — сейчас пустая |

---

## Принципы работы с кодом

1. Не ломать рабочее ядро записи
2. Надёжность важнее красоты кода
3. Скорость агента важнее декоративной архитектуры
4. Не плодить лишние таблицы и сущности без причины
5. Сначала сохранять совместимость, потом улучшать
6. Не оставлять временные костыли без явной пометки `// TODO(migration):`
7. Не делать frontend источником истины
8. Не хранить секреты и токены в коде — только `$env.NAME` (n8n) / `process.env.NAME` (Next.js)

---

## Git

- Основная рабочая ветка: **main**
- Репозиторий: `ss-twize/claudecodegrowice`
- Все изменения коммитить и пушить напрямую в `main`

---

## Файлы-ориентиры

| Файл | Назначение |
|---|---|
| `lib/supabase.ts` | ORG_UID константа + Supabase client |
| `lib/auth.tsx` | Auth context (роли через localStorage) |
| `lib/webhooks.ts` | callWebhook() + URL cache |
| `supabase/migration.sql` | Основная схема БД |
| `supabase/channels_migration.sql` | Схема каналов |
| `n8n_workflows/` | Экспорты workflows (sanitized, env placeholders) |
| `.env.example` | Шаблон всех переменных окружения |
| `PROGRESS.md` | Журнал выполненных задач |
| `supabase/add_client_lifecycle.sql` | Миграция lifecycle_status, source_channel, фикс blocked type |
| `TECH Data.md` | ⚠️ Очищен от секретов. Добавлен в .gitignore |
