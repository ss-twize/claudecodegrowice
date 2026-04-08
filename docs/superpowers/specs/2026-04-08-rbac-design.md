# RBAC — Ролевая модель платформы

**Дата:** 2026-04-08
**Статус:** Утверждён, готов к реализации

---

## Контекст

Платформа переходит с localStorage-ролей (2 роли, без auth) на Supabase Auth с четырьмя ролями. Аккаунты создаются вручную через Supabase Dashboard. Контроль доступа — на уровне UI; RLS-волна идёт отдельно при переходе на multi-tenant.

---

## Роли

| Роль | Описание |
|---|---|
| `владелец` | Полный доступ. Единственный, кто видит Финансы и может назначить роль владельца. |
| `управляющий` | Операционный + стратегический доступ. Не видит Финансы. Может управлять пользователями кроме смены на владельца. |
| `администратор` | Ежедневные операции: записи, клиенты, главная без выручки. |
| `мастер` | Минимальный доступ: только Записи и Клиенты. |

---

## Матрица доступа

| Страница / данные | Владелец | Управляющий | Администратор | Мастер |
|---|:---:|:---:|:---:|:---:|
| Главная | ✅ | ✅ | ✅ | ❌ |
| Выручка и KPI на главной | ✅ | ✅ | ❌ скрыто | ❌ |
| Аналитика | ✅ | ✅ | ❌ | ❌ |
| Записи | ✅ | ✅ | ✅ | ✅ |
| Клиенты + Рассылки | ✅ | ✅ | ✅ | ✅ |
| Финансы | ✅ | ❌ | ❌ | ❌ |
| Персонал (с зарплатами) | ✅ | ✅ | ❌ | ❌ |
| Настройки | ✅ | ✅ | ❌ | ❌ |
| Система + автосистемы | ✅ | ✅ | ❌ | ❌ |
| Пользователи | ✅ | ✅ | ❌ | ❌ |

### Права на действия

| Действие | Владелец | Управляющий | Администратор | Мастер |
|---|:---:|:---:|:---:|:---:|
| Назначить роль владельца | ✅ | ❌ | ❌ | ❌ |
| Назначить управляющего/админа/мастера | ✅ | ✅ | ❌ | ❌ |
| Управлять автосистемами | ✅ | ✅ | ❌ | ❌ |
| Настроить каналы | ✅ | ✅ | ❌ | ❌ |
| Загрузить базу знаний | ✅ | ✅ | ❌ | ❌ |
| Сохранить приветствие | ✅ | ✅ | ❌ | ❌ |

---

## Секция 1: Данные

### Изменения в `user_profiles`

```sql
-- Добавить управляющий и мастер в CHECK
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check,
  ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN ('владелец', 'управляющий', 'администратор', 'мастер'));

-- Добавить email для отображения в UI
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS email text;
```

### Схема `user_profiles`

```
id           uuid PK
user_uid     uuid  → auth.users.id
org_uid      uuid  → будущий organizations.id (сейчас '11111111-...')
role         text  CHECK (владелец|управляющий|администратор|мастер)
display_name text
email        text
created_at   timestamptz
```

### Процесс добавления сотрудника

1. Владелец/управляющий создаёт пользователя в Supabase Dashboard (Authentication → Users)
2. Копирует UUID нового пользователя
3. Вставляет строку в `user_profiles` (через Dashboard или через UI-страницу /users)
4. Назначает роль через страницу /users

---

## Секция 2: Аутентификация

### Страница `/login`

- Форма: email + password
- Вызов: `supabase.auth.signInWithPassword({ email, password })`
- При успехе: редирект на `/`
- При ошибке: inline-сообщение (нет регистрации, нет сброса пароля в UI)

### Middleware (`middleware.ts`)

```typescript
// Проверяет наличие Supabase-сессии через cookies
// Нет сессии + не /login → redirect /login
// Есть сессия + /login → redirect /
// Роль НЕ проверяется в middleware — только факт авторизации
```

### `lib/auth.tsx` — новый API

```typescript
type UserRole = 'владелец' | 'управляющий' | 'администратор' | 'мастер';

interface AuthContextType {
  role: UserRole
  orgUid: string          // сейчас = ORG_UID, потом из user_profiles
  displayName: string
  email: string
  isOwner: boolean
  isManager: boolean      // управляющий
  loading: boolean
  signOut: () => Promise<void>
}
```

**Поток при загрузке:**
1. `supabase.auth.getSession()` → получаем session
2. `SELECT * FROM user_profiles WHERE user_uid = session.user.id LIMIT 1`
3. Результат кладём в контекст
4. `onAuthStateChange` обновляет сессию при логауте/истечении токена

**Multi-tenant задел:**
- `orgUid` уже в контексте — при переходе на multi-tenant страницы переключатся с константы `ORG_UID` на `orgUid` из контекста
- В `lib/supabase.ts` добавляется комментарий: `// TODO(multi-tenant): replace ORG_UID with orgUid from auth context`
- Будущий `branchIds: string[]` добавляется в `user_profiles` без изменения API контекста

---

## Секция 3: Система прав

### `lib/permissions.ts`

```typescript
export type UserRole = 'владелец' | 'управляющий' | 'администратор' | 'мастер';

export const PERMISSIONS = {
  pages: {
    dashboard:   ['владелец', 'управляющий', 'администратор'],
    analytics:   ['владелец', 'управляющий'],
    appointments:['владелец', 'управляющий', 'администратор', 'мастер'],
    clients:     ['владелец', 'управляющий', 'администратор', 'мастер'],
    finances:    ['владелец'],
    staff:       ['владелец', 'управляющий'],
    settings:    ['владелец', 'управляющий'],
    system:      ['владелец', 'управляющий'],
    users:       ['владелец', 'управляющий'],
  },
  data: {
    revenue:     ['владелец', 'управляющий'],
    salaries:    ['владелец', 'управляющий'],
  },
  actions: {
    assignOwnerRole:    ['владелец'],
    assignAnyRole:      ['владелец', 'управляющий'],
    toggleSystems:      ['владелец', 'управляющий'],
    configChannels:     ['владелец', 'управляющий'],
    uploadKnowledge:    ['владелец', 'управляющий'],
    saveGreeting:       ['владелец', 'управляющий'],
  },
} as const;

export function can(role: UserRole, permission: string): boolean
export function canAccessPage(role: UserRole, page: string): boolean
```

Компоненты используют только `can()` и `canAccessPage()` — не проверяют роль напрямую.

---

## Секция 4: UI-охрана

### Сайдбар

Каждый пункт меню рендерится только если `canAccessPage(role, page)` возвращает true. Пункт «Пользователи» добавляется в раздел «Управление».

### Страницы

При прямом заходе по URL недоступной страницы — показывается компонент `<AccessDenied />` (не редирект). Это сохраняет URL и позволяет легко диагностировать проблемы доступа.

```typescript
// Шаблон охраны на каждой странице:
const { role } = useAuth();
if (!canAccessPage(role, 'finances')) return <AccessDenied />;
```

### Данные внутри страниц

- **Главная:** карточки выручки (`Выручка за месяц`, `Средний чек`) скрыты для `администратор` и `мастер`
- **Система:** секция «Автосистемы» теперь видна управляющему (сейчас `isOwner`-only → меняется на `can(role, 'actions.toggleSystems')`)
- Все существующие `{isOwner && ...}` заменяются на `{can(role, '...') && ...}`

---

## Секция 5: Страница `/users`

### Доступ

Владелец + управляющий. Управляющий не может назначить роль `владелец` и не может редактировать строку владельца.

### UI

Таблица из `user_profiles`:

| Имя | Email | Роль | |
|---|---|---|---|
| Иванов Иван | ivan@salon.ru | владелец | [дропдаун — только для владельца] |
| Петрова Мария | maria@salon.ru | управляющий | [дропдаун] |
| Сидоров Алексей | alexey@salon.ru | администратор | [дропдаун] |

**Дропдаун ролей:**
- Владелец: видит все 4 роли. Не может изменить свою собственную роль.
- Управляющий: видит `управляющий / администратор / мастер`. Строка владельца — только для чтения (нет дропдауна).

**Кнопка «Добавить сотрудника»:** открывает инструкцию-попап с шагами создания через Supabase Dashboard. Кода для создания auth-пользователей нет — только инструкция.

**Смена роли:** `UPDATE user_profiles SET role = $role WHERE id = $id` — прямой запрос из фронта.

---

## Файлы для создания/изменения

| Файл | Действие |
|---|---|
| `supabase/rbac_migration.sql` | CREATE — ALTER user_profiles |
| `lib/permissions.ts` | CREATE — PERMISSIONS + can() + canAccessPage() |
| `lib/auth.tsx` | REWRITE — Supabase Auth вместо localStorage |
| `middleware.ts` | CREATE — защита маршрутов |
| `app/login/page.tsx` | CREATE — страница логина |
| `app/users/page.tsx` | CREATE — управление пользователями |
| `components/layout/Sidebar.tsx` | EDIT — скрытие пунктов по роли |
| `app/page.tsx` | EDIT — скрыть revenue для администратор/мастер |
| `app/system/page.tsx` | EDIT — автосистемы для управляющего |
| `app/finances/page.tsx` | EDIT — охрана через canAccessPage |
| `app/analytics/page.tsx` | EDIT — охрана через canAccessPage |
| `app/staff/page.tsx` | EDIT — охрана через canAccessPage |
| `app/settings/page.tsx` | EDIT — охрана через canAccessPage |

---

## Что не входит в эту итерацию

- Supabase RLS по ролям (волна multi-tenant)
- Приглашения по email (invite flow)
- Сброс пароля в UI
- Аудит-лог смены ролей
- Ограничение записей мастера только на себя
