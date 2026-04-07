# PROGRESS.md — Журнал задач проекта СЕРВЕКС

> Каждая завершённая задача фиксируется здесь.
> Формат: дата → что сделано → решения → риски → что осталось.
> Рабочая ветка: **main**

---

## ИТОГОВЫЙ САММАРИ ВЫПОЛНЕННЫХ ЗАДАЧ

| # | Задача | Статус | Сессия |
|---|---|---|---|
| 1 | Полный аудит схемы БД (16 таблиц, колонки/индексы/триггеры/RLS) | ✅ | 1 |
| 2 | Аудит кода: org_uid (32 вхождения, 15 файлов), n8n workflows (19 шт) | ✅ | 1 |
| 3 | Проектирование целевой архитектуры (organizations → branches → сущности) | ✅ | 1 |
| 4 | Классификация таблиц: TARGET/KEEP/EXTEND/CLEAN/RETIRE/NEW | ✅ | 1 |
| 5 | Порядок волн миграции (0–6) с правилами совместимости | ✅ | 1 |
| 6 | Создание CLAUDE.md + PROGRESS.md | ✅ | 1 |
| 7 | Полный аудит системы (37 таблиц live, 40 active workflows, row counts) | ✅ | 2 |
| 8 | Зачистка секретов: 97 замен в 16 workflow JSON, webhooks.ts, TECH Data.md | ✅ | 2 |
| 9 | Error handling для 7 booking workflows + фикс company_id 1700961→1647948 | ✅ | 2 |
| 10 | Реструктуризация модели клиентов: lifecycle_status, source_channel, lead→client | ✅ | 3 |

### Ожидает действий от владельца

- [ ] Настроить env vars на VPS n8n: `SUPABASE_SERVICE_ROLE_KEY`, `YCLIENTS_PARTNER_TOKEN`, `YCLIENTS_USER_TOKEN`, `GREENAPI_WA_INSTANCE`, `GREENAPI_WA_INSTANCE_2`, `GREENAPI_MAX_INSTANCE`, `N8N_BASE_URL`
- [ ] Добавить `NEXT_PUBLIC_N8N_WEBHOOK_BASE` в Vercel Dashboard
- [ ] Ротировать Supabase `service_role` key (был в git-истории коммита `0db4ebe`)

### Следующие приоритеты (технические)

1. 🔴 Синхронизация `appointments` из YClients — таблица пустая, дашборд мёртвый
2. 🔴 Подключить метрики дашборда к `clients` вместо `clients_tg`
3. 🟡 Заполнить таблицу `webhooks` URL-ами n8n
4. 🟡 Начать Волну 0 миграции (organizations, branches)
5. 🟡 **Выполнить миграцию `add_client_lifecycle.sql`** вручную в Supabase SQL editor

---

## [2026-04-07] Сессия 1 — Анализ и проектирование архитектуры

### Статус: ЗАВЕРШЕНО

### Что сделано

**1. Полный аудит текущей схемы БД**
- Прочитаны все файлы в `supabase/` (migration.sql, channels_migration.sql, add_*.sql, seed файлы)
- Зафиксированы все 16 таблиц с полным списком колонок, типов, индексов, триггеров и RLS-политик
- Выявлены отсутствующие таблицы: organizations, branches, user_profiles, integration_settings, masters, campaign_logs

**2. Аудит кода**
- Проверено использование `ORG_UID` во всех .ts/.tsx файлах (32 вхождения, 15 файлов)
- Подтверждено: `ORG_UID = '11111111-1111-1111-1111-111111111111'` — хардкод в `lib/supabase.ts`
- Зафиксированы 19 n8n workflow файлов в `n8n_workflows/`

**3. Целевая архитектура данных**
- Спроектирована иерархия: organizations → branches → все сущности
- Определён порядок волн миграции (0–6)
- Зафиксированы 5 критических правил совместимости

**4. Создание файлов контекста**
- Создан `CLAUDE.md` + `PROGRESS.md`, закоммичены в main

### Принятые решения

| Решение | Обоснование |
|---|---|
| `org_uid` остаётся во всех таблицах | 19 n8n workflows жёстко зависят от него |
| `branch_id` добавляется nullable в Волне 1 | Нельзя сломать данные одним ALTER |
| `masters` — отдельная таблица кэша | Нужна для аналитики без live API calls |
| `integration_settings` — новая таблица | YClients creds должны быть в БД, не в n8n env |

### Риски на момент сессии

| Риск | Уровень | Статус |
|---|---|---|
| `TECH Data.md` содержал реальные токены в git | КРИТИЧЕСКИЙ | ✅ Закрыт в сессии 2 |
| `channel_connections.api_token` в открытом поле + anon RLS | ВЫСОКИЙ | Открыт |
| RLS политики `anon_all_*` — нет реальной авторизации | ВЫСОКИЙ | Открыт |
| n8n workflows завязаны на org_uid | СРЕДНИЙ | Учтён в плане миграции |

---

## [2026-04-07] Сессия 2 — Аудит системы + Зачистка секретов + Booking fixes

### Статус: ЗАВЕРШЕНО

### Задачи сессии

1. Полный аудит проекта (фронт, Supabase live schema, n8n workflows)
2. Найти и вынести все захардкоженные секреты
3. Проверить все сценарии записи, добавить error handling

---

### 2а. Полный аудит системы

**Что сделано:**
- Live-схема Supabase через REST introspection: 37 таблиц + 7 RPC-функций
- Все 100 n8n workflows через API (40 active, 60 inactive)
- Подсчёт строк в каждой таблице
- Полная карта зависимостей фронта на таблицы

**Ключевые находки:**
- `appointments` — 0 строк (YClients не синхронизируется)
- `webhooks` — 0 строк (callWebhook работает только через env vars)
- Dashboard читает `clients_tg` (legacy) → метрики нулевые
- `find YCLIENTS client` — **company_id 1700961 (неправильный!)**
- `create_client` — пишет в `clients_tg` вместо `clients`
- ~60 чужих шаблонных workflows на n8n инстансе

---

### 2б. Зачистка секретов

**Изменения в коде:**
- `TECH Data.md` — все секреты заменены на заглушки, добавлен в `.gitignore`
- `lib/webhooks.ts` — hardcoded n8n URL → `NEXT_PUBLIC_N8N_WEBHOOK_BASE` env var
- `n8n_workflows/*.json` (16 файлов) — **97 замен**: Supabase JWT, YClients токены, GREEN-API instances, n8n URL → `{{$env.VARIABLE_NAME}}`
- `.env.example` — создан шаблон всех переменных
- `.env.local` — добавлена `NEXT_PUBLIC_N8N_WEBHOOK_BASE`

**Коммит:** `49e28cf`

**Решения:**
- Формат `{{$env.NAME}}` — n8n native expression, не ломает импорт workflows
- Git history не чистили (репо приватный, риск потери данных > риск утечки)

**Остаток:**
- Git история коммита `0db4ebe` всё ещё содержит старые токены
- Нужна ротация `service_role` Supabase key
- n8n env vars на VPS **ещё не настроены** — workflows с `$env.*` будут падать

---

### 2в. Booking workflows — error handling

**Найденные баги:**

| Баг | Workflow | Описание |
|---|---|---|
| Неправильный company_id | find YCLIENTS client | `1700961` вместо `1647948` — поиск в ЧУЖОЙ компании |
| Hardcoded токены (второй слой) | find YCLIENTS client, ycl get bookings | `9w3368m7z9g4t727ajmj`, `sdf64d8bdazumg2b49a9` |
| Zombie rows | create YCLIENTS record | При ошибке YClients запись всё равно шла в Supabase |
| Безусловный Cancel | delete_book | Supabase обновлялся даже при 404/500 от YClients |
| Неверный статус | update_book | После переноса статус сбрасывался в `waiting` |
| Legacy таблица | create_client | Писало в `clients_tg` вместо `clients` |

**Изменения в live n8n (через API):**

| Workflow (ID) | Что изменено | Nodes |
|---|---|---|
| find YCLIENTS client (q79k1BWcbQwCw67M) | company_id 1700961→1647948, creds→env | 2 |
| ycl get bookings (o9la7KcB4iO5K8yS) | hardcoded creds→env | 2 |
| booking_dates (BAZyYLjb1XYEBaS2) | onError: continueRegularOutput | 2 |
| create_client (itTbB4I1zLVJUnxx) | table clients_tg→clients, поля YC_ID→yc_id | 3 |
| delete_book (pbWtCriTuU1ozq91) | IF success→Canceled / fail→cancel_failed | 3→5 |
| create YCLIENTS record (3ZcJYOVdftZjNa3r) | Code: check success+record_id, IF gate | 6→9 |
| update_book (cQeKCsKJlH58YKov) | IF success, статус waiting→rescheduled | 3→4 |

**Коммит:** `85a1aac`

**Риски:**
- Validation Code node в `create YCLIENTS record` добавлен но **не подключён** — намеренно, нужно протестировать edge cases с нормализацией телефона перед включением
- 2 archived копии `find_client` (ID: 1DmZjbQ4Rkonc6PL, 3hHM27ca2O6lWEt4) — неправильный company_id. Если разархивировать — снова баг
- `get_clients_list` HTTP tool в AiAdmin — company_id в body запроса не проверен

**Что осталось:**
- [ ] Подключить validation node после тестирования
- [ ] Удалить/пометить archived копии find_client
- [ ] Проверить `get_clients_list` в AiAdmin на правильный company_id
- [ ] Проверить `gs_get_bookinfo` tool — читает `YC_bookings_wtags`, таблица существует?

---

## [2026-04-07] Сессия 3 — Реструктуризация модели клиентов и контактов

### Статус: ЗАВЕРШЕНО

### Что сделано

**Цель:** Привести модель данных к правильной структуре:
- `clients` = бизнес-клиенты (могут быть лидами до первой записи)
- `telegram_users` / `whatsapp_users` / `max_users` = контакты в каналах
- `client_channels` = канонические связи клиента с каналами
- Главный идентификатор — `clients.id` (UUID), не `yc_id`

**SQL миграция `supabase/add_client_lifecycle.sql`:**

| Изменение | Суть |
|---|---|
| `clients.lifecycle_status` TEXT | `'lead'` / `'client'` / `'inactive'`, DEFAULT 'lead' |
| `clients.source_channel` TEXT | Первый канал входа: telegram/whatsapp/max/yclients/manual |
| `clients.last_visit` nullable | Убрана некорректная NOT NULL constraint |
| `clients.raw_payload` nullable | Убрана некорректная NOT NULL constraint |
| `clients.updated_at` nullable | Убрана некорректная NOT NULL constraint |
| `telegram_users.blocked` BOOLEAN | Исправлен тип с TEXT → BOOLEAN с миграцией данных |
| Trigger `sync_user_to_clients_by_yc_id()` | Создаёт лидов даже без yc_id (если есть имя/телефон) |
| Trigger `promote_lead_to_client()` | Автоматически меняет lifecycle='client' при появлении yc_id |
| Backfill lifecycle_status | clients с yc_id → 'client', остальные → 'lead' |
| Backfill source_channel | По наличию *_user_id |

**Frontend `lib/hooks/useClients.ts`:**
- Добавлен тип `LifecycleStatus = 'lead' | 'client' | 'inactive'`
- Добавлены поля в интерфейс `Client`: `lifecycleStatus`, `sourceChannel`
- Маппинг из DB в `mapRow()` с fallback на `'lead'`

### Принятые решения

| Решение | Обоснование |
|---|---|
| `lifecycle_status` — отдельное поле от вычисляемого `clientStatus` | clientStatus (new/regular/vip/sleeping/lost) — бизнес-сегмент из revenue/visits, lifecycle — онбординговое состояние |
| Лид создаётся только при наличии имени или телефона | Без идентифицирующих данных запись в clients бессмысленна |
| Поиск дубликатов лидов по channel user_id + org_uid | Предотвращает дублирование при повторных сообщениях без yc_id |
| promote_lead_to_client как BEFORE UPDATE триггер | Автоматически без изменений n8n workflows |

### Изменённые файлы
- `supabase/add_client_lifecycle.sql` — новый файл миграции
- `lib/hooks/useClients.ts` — LifecycleStatus тип + поля в Client + mapRow

### ⚠️ Требует ручного действия
- [ ] Выполнить `supabase/add_client_lifecycle.sql` в Supabase SQL editor:
  https://supabase.com/dashboard/project/ugocvtuomyopullvilim/sql

### Новые риски

| Риск | Уровень |
|---|---|
| `telegram_users.blocked` TYPE migration — если есть неожиданные значения, конверсия вернёт FALSE | НИЗКИЙ |
| Лиды, созданные через trigger без yc_id, могут дублироваться при race conditions | НИЗКИЙ (unique по channel_user_id + org_uid защищает) |

---

## Шаблон записи для следующих сессий

```markdown
## [YYYY-MM-DD] Сессия N — Название задачи

### Статус: В РАБОТЕ / ЗАВЕРШЕНО / ЗАБЛОКИРОВАНО

### Что сделано
- ...

### Принятые решения
| Решение | Обоснование |

### Изменённые файлы
- `path/to/file` — что изменено

### Новые риски
| Риск | Уровень |

### Что осталось
- [ ] ...
```
