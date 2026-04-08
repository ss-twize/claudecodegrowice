# Конфигурационная модель организации

**Дата:** 2026-04-08
**Статус:** Утверждён, готов к реализации

---

## Контекст

Сейчас бизнес-логика платформы содержит хардкоды трёх видов:
- **Операционные пороги** — VIP от 80 000 ₽, «потерян» через 120 дней, категории услуг
- **Интеграционные credentials** — YClients company_id и api_key только в env, GREEN-API partner_token только в env
- **Флаги доступности** — `IN_DEVELOPMENT_SYSTEM_CODES` захардкожен в `.tsx`

Цель: перенести всё в БД, предоставить UI для управления без деплоя, сохранить совместимость с текущей single-tenant архитектурой и заложить задел на multi-tenant.

---

## Секция 1: Схема данных

### Новая таблица `integration_settings`

```sql
CREATE TABLE integration_settings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid          uuid NOT NULL,
  integration_code text NOT NULL,  -- 'yclients' | 'green_api' | 'telegram'
  enabled          boolean DEFAULT true,
  status           text DEFAULT 'not_configured'
                   CHECK (status IN ('connected','error','not_configured')),
  credentials      jsonb DEFAULT '{}',  -- { company_id, api_key } / { partner_token }
  meta             jsonb DEFAULT '{}',  -- { last_sync_at, error_message, verified_at }
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(org_uid, integration_code)
);
```

**Структура credentials по интеграции:**

| `integration_code` | `credentials` keys |
|---|---|
| `yclients` | `company_id` (string), `api_key` (string) |
| `green_api` | `partner_token` (string) |
| `telegram` | `bot_token` (string), `bot_name` (string) |

Credentials хранятся в JSONB, а не в отдельных колонках — чтобы новые интеграции не требовали ALTER TABLE. В UI маскируются (`••••••••`), открываются на 5 секунд по кнопке.

---

### Новая таблица `client_config`

```sql
CREATE TABLE client_config (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid              uuid UNIQUE NOT NULL,
  -- Статусы клиентов
  vip_revenue_min      integer DEFAULT 80000,
  vip_visits_min       integer DEFAULT 12,
  lost_days            integer DEFAULT 120,
  sleeping_days        integer DEFAULT 60,
  active_days          integer DEFAULT 30,
  at_risk_days         integer DEFAULT 90,
  -- Ценность клиента
  high_value_revenue   integer DEFAULT 50000,
  medium_value_revenue integer DEFAULT 15000,
  -- Реактивация
  reactivation_days    integer DEFAULT 45,
  -- Категории услуг
  service_category_map jsonb DEFAULT '{}',
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);
```

**Дефолтные значения `service_category_map`:**
```json
{
  "Маникюр": "Ногтевой сервис",
  "Педикюр": "Ногтевой сервис",
  "Окрашивание": "Волосы",
  "Стрижка": "Волосы",
  "Брови": "Брови и ресницы",
  "Косметология": "Косметология",
  "Массаж": "SPA"
}
```

---

### ALTER TABLE `system_states`

```sql
ALTER TABLE system_states
  ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;

-- Пометить системы в разработке:
UPDATE system_states SET is_available = false
WHERE system_code IN ('avto_sdvig', 'analitika_otmeny', 'obrabotchik_otzyvov');
```

`IN_DEVELOPMENT_SYSTEM_CODES` из `app/system/page.tsx` удаляется полностью.

---

### ALTER TABLE `org_settings`

```sql
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS support_url text,
  ADD COLUMN IF NOT EXISTS timezone    text DEFAULT 'Europe/Moscow',
  ADD COLUMN IF NOT EXISTS currency    text DEFAULT 'RUB';
```

`salon_name` уже есть в схеме.

---

### Seed данные

```sql
-- Создать строку client_config для дефолтной организации
INSERT INTO client_config (org_uid) VALUES ('11111111-1111-1111-1111-111111111111')
ON CONFLICT (org_uid) DO NOTHING;

-- Создать заготовки интеграций
INSERT INTO integration_settings (org_uid, integration_code) VALUES
  ('11111111-1111-1111-1111-111111111111', 'yclients'),
  ('11111111-1111-1111-1111-111111111111', 'green_api'),
  ('11111111-1111-1111-1111-111111111111', 'telegram')
ON CONFLICT (org_uid, integration_code) DO NOTHING;
```

---

## Секция 2: Слой доступа к данным

### `lib/hooks/useOrgConfig.ts` — новый хук

Единая точка получения всей конфигурации. Загружает три таблицы параллельно.

```typescript
interface OrgSettings {
  salon_name: string
  greeting_message: string
  work_start: string         // '09:00'
  work_end: string           // '21:00'
  timezone: string           // 'Europe/Moscow'
  currency: string           // 'RUB'
  support_url: string | null
  contacts_import_source: 'yclients' | 'google_sheets'
  active_threshold_days: number
  at_risk_threshold_days: number
  inactive_threshold_days: number
}

interface ClientConfig {
  vip_revenue_min: number
  vip_visits_min: number
  lost_days: number
  sleeping_days: number
  active_days: number
  at_risk_days: number
  high_value_revenue: number
  medium_value_revenue: number
  reactivation_days: number
  service_category_map: Record<string, string>
}

interface IntegrationStatus {
  integration_code: string
  enabled: boolean
  status: 'connected' | 'error' | 'not_configured'
  meta: Record<string, unknown>
  // credentials намеренно НЕ включены — читаются только на странице настроек
}

interface OrgConfig {
  settings: OrgSettings
  clientConfig: ClientConfig
  integrations: IntegrationStatus[]
  loading: boolean
}
```

**Реализация:**
```typescript
// Три запроса параллельно
const [settingsRes, clientCfgRes, integrationsRes] = await Promise.all([
  supabase.from('org_settings').select('*').eq('org_uid', ORG_UID).single(),
  supabase.from('client_config').select('*').eq('org_uid', ORG_UID).single(),
  supabase.from('integration_settings')
    .select('integration_code, enabled, status, meta')  // credentials не включаем
    .eq('org_uid', ORG_UID),
])
```

**Fallback:** если `client_config` не найдена — возвращаются дефолтные значения из констант (не крашится при первом запуске). Seed в миграции создаёт строку автоматически.

### `lib/contexts/OrgConfigContext.tsx` — новый контекст

Оборачивает `app/layout.tsx`. Данные доступны во всём приложении через `useOrgConfig()`.

### Изменения в `useClients.ts`

Все хардкоды заменяются на значения из контекста:

```typescript
// Было:
if (revenue >= 80000 || visits >= 12) return 'vip'
if (daysAbsent > 120) return 'lost'

// Станет (clientConfig передаётся параметром в compute-функции):
if (revenue >= cfg.vip_revenue_min || visits >= cfg.vip_visits_min) return 'vip'
if (daysAbsent > cfg.lost_days) return 'lost'
```

`SERVICE_CATEGORY_MAP` — заменяется на `clientConfig.service_category_map`.

### Изменения в `useSystemStates.ts`

`IN_DEVELOPMENT_SYSTEM_CODES` — удаляется. Компонент `app/system/page.tsx` читает `system.is_available` напрямую из строки БД.

---

## Секция 3: UI настроек

Страница `/settings` расширяется четырьмя секциями. Существующие секции (приветствие, база знаний, источник импорта) остаются без изменений.

### Порядок секций на странице

1. Параметры салона ← новая
2. Сегментация клиентов ← новая
3. Интеграции ← новая
4. Источник импорта (существующая)
5. Приветственное сообщение (существующая)
6. База знаний (существующая)

---

### Секция «Параметры салона» (`org_settings`)

| Поле | Тип | Источник |
|---|---|---|
| Название салона | text input | `salon_name` |
| Часовой пояс | select | `timezone` |
| Валюта | select (RUB / USD / EUR) | `currency` |
| Ссылка поддержки | text input | `support_url` |

Кнопка «Сохранить» → `UPDATE org_settings`. Убирает хардкод `t.me/ss_bizness` из кода.

---

### Секция «Сегментация клиентов» (`client_config`)

Два блока: **Статусы клиентов** и **Ценность клиента**.

```
Статусы клиентов
  VIP           — от [ 80 000 ] ₽  или  [ 12 ] визитов
  Потерян       — через [ 120 ] дней без визита
  Спящий        — через [  60 ] дней без визита
  Активный      — последние [ 30 ] дней
  В зоне риска  — [  90 ] дней

Ценность клиента
  Высокая  — от [ 50 000 ] ₽ выручки
  Средняя  — от [ 15 000 ] ₽ выручки

Реактивация
  Кандидат — через [ 45 ] дней без визита
```

Все поля — `<input type="number">`. Одна кнопка «Сохранить» на секцию → `UPSERT client_config`.

---

### Секция «Интеграции» (`integration_settings`)

Карточка на каждую интеграцию. Данные credentials читаются отдельным запросом только при открытии карточки (не при загрузке страницы).

**YClients:**
```
[YC]  YClients   ● Подключено / ○ Не настроено
  Company ID  [ 1647948     ]
  API Key     [ ••••••••••• ]  [Показать 5с]
                               [Сохранить  ]
```

**GREEN-API:**
```
[GA]  GREEN-API  ● Подключено
  Partner Token [ ••••••••• ]  [Показать 5с]
                               [Сохранить  ]
```

**Telegram:**
```
[TG]  Telegram   ○ Не настроено
  Bot Token   [ ••••••••• ]  [Показать 5с]
  Имя бота    [ @your_bot ]
                               [Сохранить  ]
```

Сохранение → `UPDATE integration_settings SET credentials = $1, status = 'connected'`.
«Показать 5с» — локальный state, автоматически скрывается через `setTimeout(5000)`.

---

### Изменения в `/system` (`system_states.is_available`)

Без изменений в логике отображения — только источник данных меняется с хардкода на поле из БД:

```typescript
// Было:
const isInDevelopment = IN_DEVELOPMENT_SYSTEM_CODES.has(system.system_code)

// Станет:
const isInDevelopment = !system.is_available
```

---

## Файлы для создания/изменения

| Файл | Действие |
|---|---|
| `supabase/config_migration.sql` | CREATE — все новые таблицы + ALTER + seed |
| `lib/hooks/useOrgConfig.ts` | CREATE — единый хук конфигурации |
| `lib/contexts/OrgConfigContext.tsx` | CREATE — провайдер контекста |
| `app/layout.tsx` | EDIT — обернуть OrgConfigContext |
| `lib/hooks/useClients.ts` | EDIT — заменить хардкоды на clientConfig |
| `lib/hooks/useSystemStates.ts` | EDIT — убрать дефолты (теперь в БД) |
| `app/system/page.tsx` | EDIT — убрать IN_DEVELOPMENT_SYSTEM_CODES |
| `app/settings/page.tsx` | EDIT — добавить 3 новые секции |

---

## Что не входит в эту итерацию

- RLS-политики на `integration_settings` (credentials пока доступны через anon key; закроется в волне auth)
- Шифрование credentials на уровне БД (pgcrypto)
- Валидация credentials через API (проверка YClients company_id на живом API)
- Управление `service_category_map` через UI (сохраняется в JSONB, редактируется в Supabase Dashboard)
- `branch_settings` — откладывается до multi-tenant волны
