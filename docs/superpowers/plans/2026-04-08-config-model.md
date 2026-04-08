# Config Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded business thresholds, integration credentials, and feature flags with DB-backed configuration, and expose a settings UI for managing them.

**Architecture:** Three new tables (`integration_settings`, `client_config`, `system_states.is_available`) + `org_settings` extensions feed a single `OrgConfigContext` that wraps the app layout. `useClients.ts` compute functions receive `ClientConfig` as a parameter. Settings page gains three new sections.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase JS v2, Tailwind CSS, Lucide React

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/config_migration.sql` | CREATE | DDL: new tables, ALTER, seed data |
| `lib/contexts/OrgConfigContext.tsx` | CREATE | Types, defaults, Provider, useOrgConfig() |
| `app/layout.tsx` | EDIT | Wrap app with OrgConfigProvider |
| `lib/hooks/useClients.ts` | EDIT | Replace SERVICE_CATEGORY_MAP + all threshold hardcodes |
| `lib/hooks/useSystemStates.ts` | EDIT | Remove DEFAULT_SYSTEMS fallback (now always from DB) |
| `app/system/page.tsx` | EDIT | Remove IN_DEVELOPMENT_SYSTEM_CODES, use system.is_available |
| `app/settings/page.tsx` | EDIT | Add 3 new sections: Параметры салона, Сегментация, Интеграции |

---

## Task 1: SQL Migration

**Files:**
- Create: `supabase/config_migration.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/config_migration.sql
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/ugocvtuomyopullvilim/sql

-- ── 1. integration_settings ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_settings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid          uuid NOT NULL,
  integration_code text NOT NULL
                   CHECK (integration_code IN ('yclients', 'green_api', 'telegram')),
  enabled          boolean DEFAULT true,
  status           text DEFAULT 'not_configured'
                   CHECK (status IN ('connected', 'error', 'not_configured')),
  credentials      jsonb DEFAULT '{}',
  meta             jsonb DEFAULT '{}',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(org_uid, integration_code)
);

ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_integration_settings" ON integration_settings;
CREATE POLICY "anon_all_integration_settings"
  ON integration_settings FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ── 2. client_config ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_config (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_uid              uuid UNIQUE NOT NULL,
  vip_revenue_min      integer DEFAULT 80000,
  vip_visits_min       integer DEFAULT 12,
  lost_days            integer DEFAULT 120,
  sleeping_days        integer DEFAULT 60,
  active_days          integer DEFAULT 30,
  at_risk_days         integer DEFAULT 90,
  high_value_revenue   integer DEFAULT 50000,
  medium_value_revenue integer DEFAULT 15000,
  reactivation_days    integer DEFAULT 45,
  service_category_map jsonb DEFAULT '{"Маникюр":"Ногтевой сервис","Педикюр":"Ногтевой сервис","Окрашивание":"Волосы","Стрижка":"Волосы","Брови":"Брови и ресницы","Косметология":"Косметология","Массаж":"SPA"}',
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE client_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_client_config" ON client_config;
CREATE POLICY "anon_all_client_config"
  ON client_config FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ── 3. Extend org_settings ────────────────────────────────────────────────────

ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS support_url text,
  ADD COLUMN IF NOT EXISTS timezone    text DEFAULT 'Europe/Moscow',
  ADD COLUMN IF NOT EXISTS currency    text DEFAULT 'RUB';

-- ── 4. Extend system_states ───────────────────────────────────────────────────

ALTER TABLE system_states
  ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;

UPDATE system_states
  SET is_available = false
  WHERE system_code IN ('avto_sdvig', 'analitika_otmeny', 'obrabotchik_otzyvov');

-- ── 5. Seed data ──────────────────────────────────────────────────────────────

INSERT INTO client_config (org_uid)
  VALUES ('11111111-1111-1111-1111-111111111111')
  ON CONFLICT (org_uid) DO NOTHING;

INSERT INTO integration_settings (org_uid, integration_code) VALUES
  ('11111111-1111-1111-1111-111111111111', 'yclients'),
  ('11111111-1111-1111-1111-111111111111', 'green_api'),
  ('11111111-1111-1111-1111-111111111111', 'telegram')
  ON CONFLICT (org_uid, integration_code) DO NOTHING;

UPDATE org_settings
  SET timezone = 'Europe/Moscow', currency = 'RUB'
  WHERE org_uid = '11111111-1111-1111-1111-111111111111'
    AND timezone IS NULL;
```

- [ ] **Step 2: Run migration in Supabase SQL editor**

Open: https://supabase.com/dashboard/project/ugocvtuomyopullvilim/sql
Paste the full file content and click Run.

Expected: "Success. No rows returned" or similar.

- [ ] **Step 3: Verify tables exist**

Run in SQL editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('integration_settings', 'client_config');
```
Expected: 2 rows.

- [ ] **Step 4: Verify system_states rows marked unavailable**

```sql
SELECT system_code, is_available FROM system_states
WHERE org_uid = '11111111-1111-1111-1111-111111111111'
ORDER BY system_code;
```
Expected: `avto_sdvig`, `analitika_otmeny`, `obrabotchik_otzyvov` have `is_available = false`.

- [ ] **Step 5: Commit the migration file**

```bash
git add supabase/config_migration.sql
git commit -m "feat: add config_migration.sql — integration_settings, client_config, system_states.is_available"
```

---

## Task 2: OrgConfigContext

**Files:**
- Create: `lib/contexts/OrgConfigContext.tsx`

- [ ] **Step 1: Create the file**

```typescript
// lib/contexts/OrgConfigContext.tsx
'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, ORG_UID } from '../supabase'

// ── Types ────────────────────────────────────────────────────────────────────

export interface OrgSettings {
  salon_name: string
  greeting_message: string
  work_start: string
  work_end: string
  timezone: string
  currency: string
  support_url: string | null
  contacts_import_source: 'yclients' | 'google_sheets'
  active_threshold_days: number
  at_risk_threshold_days: number
  inactive_threshold_days: number
}

export interface ClientConfig {
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

export interface IntegrationStatus {
  integration_code: string
  enabled: boolean
  status: 'connected' | 'error' | 'not_configured'
  meta: Record<string, unknown>
}

export interface OrgConfig {
  settings: OrgSettings
  clientConfig: ClientConfig
  integrations: IntegrationStatus[]
  loading: boolean
}

// ── Defaults (used as fallback until DB responds) ────────────────────────────

export const ORG_SETTINGS_DEFAULTS: OrgSettings = {
  salon_name: 'Салон красоты',
  greeting_message: 'Привет! Я ваш помощник салона красоты. Как могу помочь?',
  work_start: '09:00',
  work_end: '21:00',
  timezone: 'Europe/Moscow',
  currency: 'RUB',
  support_url: null,
  contacts_import_source: 'yclients',
  active_threshold_days: 30,
  at_risk_threshold_days: 50,
  inactive_threshold_days: 90,
}

export const CLIENT_CONFIG_DEFAULTS: ClientConfig = {
  vip_revenue_min: 80000,
  vip_visits_min: 12,
  lost_days: 120,
  sleeping_days: 60,
  active_days: 30,
  at_risk_days: 90,
  high_value_revenue: 50000,
  medium_value_revenue: 15000,
  reactivation_days: 45,
  service_category_map: {
    'Маникюр': 'Ногтевой сервис',
    'Педикюр': 'Ногтевой сервис',
    'Окрашивание': 'Волосы',
    'Стрижка': 'Волосы',
    'Брови': 'Брови и ресницы',
    'Косметология': 'Косметология',
    'Массаж': 'SPA',
  },
}

// ── Context ───────────────────────────────────────────────────────────────────

const OrgConfigContext = createContext<OrgConfig>({
  settings: ORG_SETTINGS_DEFAULTS,
  clientConfig: CLIENT_CONFIG_DEFAULTS,
  integrations: [],
  loading: true,
})

export function OrgConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<OrgConfig>({
    settings: ORG_SETTINGS_DEFAULTS,
    clientConfig: CLIENT_CONFIG_DEFAULTS,
    integrations: [],
    loading: true,
  })

  useEffect(() => {
    const load = async () => {
      const [settingsRes, clientCfgRes, integrationsRes] = await Promise.all([
        supabase.from('org_settings').select('*').eq('org_uid', ORG_UID).single(),
        supabase.from('client_config').select('*').eq('org_uid', ORG_UID).single(),
        supabase.from('integration_settings')
          .select('integration_code, enabled, status, meta')  // credentials excluded
          .eq('org_uid', ORG_UID),
      ])

      const rawCfg = clientCfgRes.data ?? {}
      const serviceMap = rawCfg.service_category_map &&
        typeof rawCfg.service_category_map === 'object' &&
        Object.keys(rawCfg.service_category_map).length > 0
          ? rawCfg.service_category_map as Record<string, string>
          : CLIENT_CONFIG_DEFAULTS.service_category_map

      setConfig({
        settings: { ...ORG_SETTINGS_DEFAULTS, ...(settingsRes.data ?? {}) },
        clientConfig: {
          ...CLIENT_CONFIG_DEFAULTS,
          ...rawCfg,
          service_category_map: serviceMap,
        },
        integrations: (integrationsRes.data ?? []) as IntegrationStatus[],
        loading: false,
      })
    }

    void load()
  }, [])

  return (
    <OrgConfigContext.Provider value={config}>
      {children}
    </OrgConfigContext.Provider>
  )
}

export function useOrgConfig(): OrgConfig {
  return useContext(OrgConfigContext)
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1; echo "EXIT:$?"
```
Expected: `EXIT:0`

- [ ] **Step 3: Commit**

```bash
git add lib/contexts/OrgConfigContext.tsx
git commit -m "feat: add OrgConfigContext with OrgSettings, ClientConfig, IntegrationStatus types and defaults"
```

---

## Task 3: Wrap Layout with OrgConfigProvider

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add OrgConfigProvider to layout**

Replace the entire `app/layout.tsx` with:

```typescript
import type { Metadata } from "next";
import { Unbounded, Montserrat } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { OrgConfigProvider } from "@/lib/contexts/OrgConfigContext";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-unbounded",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GROWICE — Главная панель",
  description: "Платформа управления салоном красоты",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${unbounded.variable} ${montserrat.variable} font-montserrat bg-[#0A0D14] text-[#EDF2FA] antialiased`}>
        <OrgConfigProvider>
          <Sidebar />
          <main className="ml-60 min-h-screen">
            {children}
          </main>
        </OrgConfigProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1; echo "EXIT:$?"
```
Expected: `EXIT:0`

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: wrap layout with OrgConfigProvider"
```

---

## Task 4: Replace Hardcodes in useClients.ts

**Files:**
- Modify: `lib/hooks/useClients.ts`

- [ ] **Step 1: Add useCallback import and useOrgConfig import**

Find the top of the file:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { supabase, ORG_UID } from '../supabase'
```

Replace with:
```typescript
'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase, ORG_UID } from '../supabase'
import { useOrgConfig, type ClientConfig, CLIENT_CONFIG_DEFAULTS } from '../contexts/OrgConfigContext'
```

- [ ] **Step 2: Remove SERVICE_CATEGORY_MAP constant**

Delete lines 66–74:
```typescript
const SERVICE_CATEGORY_MAP: Record<string, string> = {
  Маникюр: 'Ногтевой сервис',
  Педикюр: 'Ногтевой сервис',
  Окрашивание: 'Волосы',
  Стрижка: 'Волосы',
  Брови: 'Брови и ресницы',
  Косметология: 'Косметология',
  Массаж: 'SPA',
}
```

- [ ] **Step 3: Update compute functions to accept cfg parameter**

Replace `computeSegment`:
```typescript
function computeSegment(createdAt: string | null, lastVisitAt: string | null, cfg: ClientConfig): string {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  if (createdAt && new Date(createdAt) >= startOfMonth) return 'new'
  const lastContact = lastVisitAt ? new Date(lastVisitAt) : null
  if (!lastContact || isNaN(lastContact.getTime())) return 'inactive'
  const daysSince = (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince <= cfg.active_days) return 'active'
  if (daysSince <= cfg.at_risk_days) return 'atRisk'
  return 'inactive'
}
```

Replace `computeClientStatus`:
```typescript
function computeClientStatus(revenue: number, visits: number, daysAbsent: number, cfg: ClientConfig): ClientStatus {
  if (revenue >= cfg.vip_revenue_min || visits >= cfg.vip_visits_min) return 'vip'
  if (visits <= 1 || daysAbsent <= 21) return 'new'
  if (daysAbsent > cfg.lost_days) return 'lost'
  if (daysAbsent > cfg.sleeping_days) return 'sleeping'
  return 'regular'
}
```

Replace `computeValueCategory`:
```typescript
function computeValueCategory(revenue: number, cfg: ClientConfig): ValueCategory {
  if (revenue >= cfg.high_value_revenue) return 'high'
  if (revenue >= cfg.medium_value_revenue) return 'medium'
  return 'low'
}
```

Replace `computeMarketingSegment`:
```typescript
function computeMarketingSegment(status: ClientStatus, daysAbsent: number, cfg: ClientConfig): string {
  if (status === 'vip') return 'VIP'
  if (daysAbsent >= cfg.at_risk_days) return 'Потерянные'
  if (daysAbsent >= cfg.reactivation_days) return 'На реактивацию'
  if (status === 'new') return 'Новые'
  return 'Постоянные'
}
```

- [ ] **Step 4: Update mapRow signature to accept cfg**

Find:
```typescript
function mapRow(row: any, upcomingClientIds?: Set<string>): Client {
```

Replace with:
```typescript
function mapRow(row: any, upcomingClientIds: Set<string> | undefined, cfg: ClientConfig): Client {
```

Inside `mapRow`, find the `serviceCategory` line:
```typescript
  const serviceCategory = SERVICE_CATEGORY_MAP[favoriteService] || '—'
```

Replace with:
```typescript
  const serviceCategory = cfg.service_category_map[favoriteService] || '—'
```

Find the calls to updated functions inside `mapRow` and add `cfg` as the last argument:

```typescript
  // Replace these lines inside mapRow:
  const segment = computeSegment(createdAt, lastVisitAt)
  // with:
  const segment = computeSegment(createdAt, lastVisitAt, cfg)

  // Replace:
  const clientStatus = computeClientStatus(revenue, visits, daysAbsent)
  // with:
  const clientStatus = computeClientStatus(revenue, visits, daysAbsent, cfg)
```

Find the return statement lines that call the remaining functions:
```typescript
  // Replace in the return object:
  marketingSegment: computeMarketingSegment(clientStatus, daysAbsent),
  // with:
  marketingSegment: computeMarketingSegment(clientStatus, daysAbsent, cfg),

  // Replace:
  valueCategory: computeValueCategory(revenue),
  // with:
  valueCategory: computeValueCategory(revenue, cfg),
```

- [ ] **Step 5: Update useClients hook to use OrgConfig and useCallback**

Find the hook definition:
```typescript
export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = async () => {
```

Replace with:
```typescript
export function useClients() {
  const { clientConfig } = useOrgConfig()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
```

Find the end of `fetchClients` function (the closing `}`):
```typescript
  }

  useEffect(() => {
    fetchClients()
```

Replace the `fetchClients` closing brace + `useEffect` signature:
```typescript
  }, [clientConfig])

  useEffect(() => {
    fetchClients()
```

Find the `setClients` call inside `fetchClients`:
```typescript
    setClients((clientsRes.data || []).map(row => mapRow(row, upcomingClientIds)))
```

Replace with:
```typescript
    setClients((clientsRes.data || []).map(row => mapRow(row, upcomingClientIds, clientConfig)))
```

Find the realtime subscription useEffect deps:
```typescript
  }, [])
```
(the one wrapping `fetchClients()` call and channel setup)

Replace with:
```typescript
  }, [fetchClients])
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit 2>&1; echo "EXIT:$?"
```
Expected: `EXIT:0`

- [ ] **Step 7: Commit**

```bash
git add lib/hooks/useClients.ts
git commit -m "feat: replace hardcoded client thresholds with ClientConfig from OrgConfigContext"
```

---

## Task 5: Clean Up system_states and System Page

**Files:**
- Modify: `lib/hooks/useSystemStates.ts`
- Modify: `app/system/page.tsx`

- [ ] **Step 1: Update useSystemStates to include is_available in select**

In `lib/hooks/useSystemStates.ts`, the `SystemState` interface is missing `is_available`. Update it:

Find:
```typescript
export interface SystemState {
  id: string
  system_code: string
  name: string
  description: string
  enabled: boolean
  updated_at: string
}
```

Replace with:
```typescript
export interface SystemState {
  id: string
  system_code: string
  name: string
  description: string
  enabled: boolean
  is_available: boolean
  updated_at: string
}
```

Update `DEFAULT_SYSTEMS` to include `is_available: true` on each entry and `is_available: false` for the three in-development ones. Find `DEFAULT_SYSTEMS`:

```typescript
export const DEFAULT_SYSTEMS: SystemState[] = [
  { id: '1', system_code: 'main_agent',          name: 'Основной агент',        description: 'Обработка входящих обращений и запись клиентов',      enabled: true,  is_available: true,  updated_at: '' },
  { id: '2', system_code: 'vozvrat_klienta',     name: 'Возврат клиента',       description: 'Авторассылка клиентам, не посещавшим более 50 дней',  enabled: false, is_available: true,  updated_at: '' },
  { id: '3', system_code: 'blagodarnost',        name: 'Благодарность',         description: 'Запрос отзыва и чаевых после визита',                 enabled: true,  is_available: true,  updated_at: '' },
  { id: '4', system_code: 'napominaniya',        name: 'Напоминания',           description: 'Поэтапное подтверждение записи (24ч, 2ч, 1ч)',        enabled: true,  is_available: true,  updated_at: '' },
  { id: '5', system_code: 'otchetnost',          name: 'Отчётность',            description: 'Еженедельный отчёт владельцу',                        enabled: true,  is_available: true,  updated_at: '' },
  { id: '6', system_code: 'avto_sdvig',          name: 'Авто-сдвиг',           description: 'Предложить более раннее время при появлении окна',    enabled: false, is_available: false, updated_at: '' },
  { id: '7', system_code: 'doprodazha',          name: 'Допродажа',             description: 'Смежные услуги после записи',                         enabled: false, is_available: true,  updated_at: '' },
  { id: '8', system_code: 'analitika_otmeny',    name: 'Аналитика отмены',      description: 'Уточнение причины отмены или неявки',                 enabled: true,  is_available: false, updated_at: '' },
  { id: '9', system_code: 'obrabotchik_otzyvov', name: 'Обработчик отзывов',    description: 'Автоответы на отзывы + уведомление администратора',   enabled: false, is_available: false, updated_at: '' },
]
```

- [ ] **Step 2: Remove IN_DEVELOPMENT_SYSTEM_CODES from system page**

In `app/system/page.tsx`, find and delete:
```typescript
const IN_DEVELOPMENT_SYSTEM_CODES = new Set(["avto_sdvig", "analitika_otmeny", "obrabotchik_otzyvov"]);
```

Then find every usage of `isInDevelopment` that references this set:
```typescript
const isInDevelopment = IN_DEVELOPMENT_SYSTEM_CODES.has(system.system_code);
```

Replace with:
```typescript
const isInDevelopment = !system.is_available;
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1; echo "EXIT:$?"
```
Expected: `EXIT:0`

- [ ] **Step 4: Commit**

```bash
git add lib/hooks/useSystemStates.ts app/system/page.tsx
git commit -m "feat: replace IN_DEVELOPMENT_SYSTEM_CODES hardcode with system_states.is_available from DB"
```

---

## Task 6: Settings Page — Параметры салона

**Files:**
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Add imports and state for org settings form**

At the top of `app/settings/page.tsx`, add to the existing imports:

```typescript
import { useOrgConfig } from "@/lib/contexts/OrgConfigContext";
import { Settings2, Globe } from "lucide-react";
```

(`Settings2` and `Globe` are already available in lucide-react.)

Inside `SettingsPage()`, after the existing state declarations, add:

```typescript
  const { settings: orgConfigSettings } = useOrgConfig();

  const [salonForm, setSalonForm] = useState({
    salon_name: '',
    timezone: 'Europe/Moscow',
    currency: 'RUB',
    support_url: '',
  });
  const [salonSaving, setSalonSaving] = useState(false);
  const [salonSaved, setSalonSaved] = useState(false);

  // Populate form from context once loaded
  useEffect(() => {
    setSalonForm({
      salon_name: orgConfigSettings.salon_name,
      timezone: orgConfigSettings.timezone,
      currency: orgConfigSettings.currency,
      support_url: orgConfigSettings.support_url ?? '',
    });
  }, [orgConfigSettings]);
```

- [ ] **Step 2: Add saveSalon function**

After `saveImportSource`, add:

```typescript
  const saveSalon = async () => {
    setSalonSaving(true);
    await supabase
      .from('org_settings')
      .upsert(
        { org_uid: ORG_UID, ...salonForm, updated_at: new Date().toISOString() },
        { onConflict: 'org_uid' },
      );
    setSalonSaved(true);
    setTimeout(() => setSalonSaved(false), 2000);
    setSalonSaving(false);
  };
```

- [ ] **Step 3: Add Параметры салона section JSX**

Inside the `<div className="p-6 space-y-6">` wrapper, add this section **before** the existing «Источник переноса контактов» block:

```tsx
        {/* ── Параметры салона ── */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Settings2 size={16} className="text-[#00FF00]" />
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Параметры салона</h3>
          </div>
          <p className="text-[#5E7488] text-sm mb-4">Основные сведения и региональные настройки</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[#5E7488] text-xs mb-1 block">Название салона</label>
              <input
                value={salonForm.salon_name}
                onChange={(e) => setSalonForm(f => ({ ...f, salon_name: e.target.value }))}
                placeholder="Салон красоты"
                className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488]"
              />
            </div>
            <div>
              <label className="text-[#5E7488] text-xs mb-1 block">Ссылка поддержки</label>
              <input
                value={salonForm.support_url}
                onChange={(e) => setSalonForm(f => ({ ...f, support_url: e.target.value }))}
                placeholder="https://t.me/support"
                className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488]"
              />
            </div>
            <div>
              <label className="text-[#5E7488] text-xs mb-1 block">Часовой пояс</label>
              <select
                value={salonForm.timezone}
                onChange={(e) => setSalonForm(f => ({ ...f, timezone: e.target.value }))}
                className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
              >
                <option value="Europe/Moscow">Москва (UTC+3)</option>
                <option value="Europe/Kaliningrad">Калининград (UTC+2)</option>
                <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
                <option value="Asia/Novosibirsk">Новосибирск (UTC+7)</option>
                <option value="Asia/Krasnoyarsk">Красноярск (UTC+7)</option>
                <option value="Asia/Irkutsk">Иркутск (UTC+8)</option>
                <option value="Asia/Vladivostok">Владивосток (UTC+10)</option>
              </select>
            </div>
            <div>
              <label className="text-[#5E7488] text-xs mb-1 block">Валюта</label>
              <select
                value={salonForm.currency}
                onChange={(e) => setSalonForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
              >
                <option value="RUB">₽ Рубль</option>
                <option value="USD">$ Доллар</option>
                <option value="EUR">€ Евро</option>
                <option value="KZT">₸ Тенге</option>
                <option value="BYN">Br Белорусский рубль</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveSalon}
              disabled={salonSaving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                salonSaved
                  ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30"
                  : salonSaving
                    ? "bg-[#00FF00]/50 text-black cursor-not-allowed"
                    : "bg-[#00FF00] text-black hover:bg-[#ccff33]"
              }`}
            >
              {salonSaved && <CheckCircle2 size={14} />}
              {salonSaved ? "Сохранено" : salonSaving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1; echo "EXIT:$?"
```
Expected: `EXIT:0`

- [ ] **Step 5: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat: settings — Параметры салона section (salon_name, timezone, currency, support_url)"
```

---

## Task 7: Settings Page — Сегментация клиентов

**Files:**
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Add state for client config form**

Inside `SettingsPage()`, after the salon form state, add:

```typescript
  const { clientConfig } = useOrgConfig();

  const [segForm, setSegForm] = useState({
    vip_revenue_min: 80000,
    vip_visits_min: 12,
    lost_days: 120,
    sleeping_days: 60,
    active_days: 30,
    at_risk_days: 90,
    high_value_revenue: 50000,
    medium_value_revenue: 15000,
    reactivation_days: 45,
  });
  const [segSaving, setSegSaving] = useState(false);
  const [segSaved, setSegSaved] = useState(false);

  // Populate from context once loaded
  useEffect(() => {
    const { service_category_map: _, ...rest } = clientConfig;
    setSegForm(rest);
  }, [clientConfig]);
```

- [ ] **Step 2: Add saveSegmentation function**

After `saveSalon`, add:

```typescript
  const saveSegmentation = async () => {
    setSegSaving(true);
    await supabase
      .from('client_config')
      .upsert(
        { org_uid: ORG_UID, ...segForm, updated_at: new Date().toISOString() },
        { onConflict: 'org_uid' },
      );
    setSegSaved(true);
    setTimeout(() => setSegSaved(false), 2000);
    setSegSaving(false);
  };
```

- [ ] **Step 3: Add Сегментация клиентов section JSX**

Inside the `<div className="p-6 space-y-6">`, add this section **after** «Параметры салона» and **before** «Источник переноса контактов»:

```tsx
        {/* ── Сегментация клиентов ── */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-[#00FF00]" />
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Сегментация клиентов</h3>
          </div>
          <p className="text-[#5E7488] text-sm mb-4">Пороги для автоматической классификации клиентов</p>

          <div className="space-y-4">
            {/* Статусы */}
            <div>
              <p className="text-[#8299B4] text-xs font-medium mb-2 uppercase tracking-wide">Статусы клиентов</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#5E7488] text-xs w-32 flex-shrink-0">VIP — от, ₽</span>
                  <input type="number" value={segForm.vip_revenue_min}
                    onChange={(e) => setSegForm(f => ({ ...f, vip_revenue_min: Number(e.target.value) }))}
                    className="flex-1 bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2 outline-none focus:border-[#00FF00]/50 transition-colors" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#5E7488] text-xs w-32 flex-shrink-0">VIP — от, визитов</span>
                  <input type="number" value={segForm.vip_visits_min}
                    onChange={(e) => setSegForm(f => ({ ...f, vip_visits_min: Number(e.target.value) }))}
                    className="flex-1 bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2 outline-none focus:border-[#00FF00]/50 transition-colors" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#5E7488] text-xs w-32 flex-shrink-0">Потерян, дней</span>
                  <input type="number" value={segForm.lost_days}
                    onChange={(e) => setSegForm(f => ({ ...f, lost_days: Number(e.target.value) }))}
                    className="flex-1 bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2 outline-none focus:border-[#00FF00]/50 transition-colors" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#5E7488] text-xs w-32 flex-shrink-0">Спящий, дней</span>
                  <input type="number" value={segForm.sleeping_days}
                    onChange={(e) => setSegForm(f => ({ ...f, sleeping_days: Number(e.target.value) }))}
                    className="flex-1 bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2 outline-none focus:border-[#00FF00]/50 transition-colors" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#5E7488] text-xs w-32 flex-shrink-0">Активный, дней</span>
                  <input type="number" value={segForm.active_days}
                    onChange={(e) => setSegForm(f => ({ ...f, active_days: Number(e.target.value) }))}
                    className="flex-1 bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2 outline-none focus:border-[#00FF00]/50 transition-colors" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#5E7488] text-xs w-32 flex-shrink-0">Зона риска, дней</span>
                  <input type="number" value={segForm.at_risk_days}
                    onChange={(e) => setSegForm(f => ({ ...f, at_risk_days: Number(e.target.value) }))}
                    className="flex-1 bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2 outline-none focus:border-[#00FF00]/50 transition-colors" />
                </div>
              </div>
            </div>

            {/* Ценность */}
            <div>
              <p className="text-[#8299B4] text-xs font-medium mb-2 uppercase tracking-wide">Ценность клиента</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#5E7488] text-xs w-32 flex-shrink-0">Высокая, от ₽</span>
                  <input type="number" value={segForm.high_value_revenue}
                    onChange={(e) => setSegForm(f => ({ ...f, high_value_revenue: Number(e.target.value) }))}
                    className="flex-1 bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2 outline-none focus:border-[#00FF00]/50 transition-colors" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#5E7488] text-xs w-32 flex-shrink-0">Средняя, от ₽</span>
                  <input type="number" value={segForm.medium_value_revenue}
                    onChange={(e) => setSegForm(f => ({ ...f, medium_value_revenue: Number(e.target.value) }))}
                    className="flex-1 bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2 outline-none focus:border-[#00FF00]/50 transition-colors" />
                </div>
              </div>
            </div>

            {/* Реактивация */}
            <div>
              <p className="text-[#8299B4] text-xs font-medium mb-2 uppercase tracking-wide">Реактивация</p>
              <div className="flex items-center gap-2 max-w-xs">
                <span className="text-[#5E7488] text-xs w-32 flex-shrink-0">Кандидат, дней</span>
                <input type="number" value={segForm.reactivation_days}
                  onChange={(e) => setSegForm(f => ({ ...f, reactivation_days: Number(e.target.value) }))}
                  className="flex-1 bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2 outline-none focus:border-[#00FF00]/50 transition-colors" />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={saveSegmentation}
              disabled={segSaving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                segSaved
                  ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30"
                  : segSaving
                    ? "bg-[#00FF00]/50 text-black cursor-not-allowed"
                    : "bg-[#00FF00] text-black hover:bg-[#ccff33]"
              }`}
            >
              {segSaved && <CheckCircle2 size={14} />}
              {segSaved ? "Сохранено" : segSaving ? "Сохранение..." : "Сохранить пороги"}
            </button>
          </div>
        </div>
```

Add `Users` to the lucide-react import at the top of the file (it's already imported in other pages, just add it here):

Find:
```typescript
import {
  ExternalLink,
  CheckCircle2,
  Upload,
  FileText,
  X,
  RefreshCw,
  MessageSquare,
  Bot,
} from "lucide-react";
```

Replace with:
```typescript
import {
  ExternalLink,
  CheckCircle2,
  Upload,
  FileText,
  X,
  RefreshCw,
  MessageSquare,
  Bot,
  Settings2,
  Users,
} from "lucide-react";
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1; echo "EXIT:$?"
```
Expected: `EXIT:0`

- [ ] **Step 5: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat: settings — Сегментация клиентов section with configurable thresholds"
```

---

## Task 8: Settings Page — Интеграции

**Files:**
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Add integration state**

Inside `SettingsPage()`, after the segmentation state, add:

```typescript
  const [integrationForms, setIntegrationForms] = useState<Record<string, Record<string, string>>>({
    yclients: { company_id: '', api_key: '' },
    green_api: { partner_token: '' },
    telegram: { bot_token: '', bot_name: '' },
  });
  const [integrationSaving, setIntegrationSaving] = useState<string | null>(null);
  const [integrationSaved, setIntegrationSaved] = useState<string | null>(null);
  const [revealedField, setRevealedField] = useState<string | null>(null);

  // Load credentials from DB (separate query — not in OrgConfigContext)
  useEffect(() => {
    supabase
      .from('integration_settings')
      .select('integration_code, credentials')
      .eq('org_uid', ORG_UID)
      .then(({ data }) => {
        if (!data) return;
        const forms: Record<string, Record<string, string>> = {
          yclients: { company_id: '', api_key: '' },
          green_api: { partner_token: '' },
          telegram: { bot_token: '', bot_name: '' },
        };
        for (const row of data) {
          if (row.integration_code in forms && row.credentials) {
            forms[row.integration_code] = {
              ...forms[row.integration_code],
              ...(row.credentials as Record<string, string>),
            };
          }
        }
        setIntegrationForms(forms);
      });
  }, []);
```

- [ ] **Step 2: Add saveIntegration function**

After `saveSegmentation`, add:

```typescript
  const saveIntegration = async (code: string) => {
    setIntegrationSaving(code);
    await supabase
      .from('integration_settings')
      .upsert(
        {
          org_uid: ORG_UID,
          integration_code: code,
          credentials: integrationForms[code],
          status: 'connected',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_uid,integration_code' },
      );
    setIntegrationSaved(code);
    setTimeout(() => setIntegrationSaved(null), 2000);
    setIntegrationSaving(null);
  };

  const revealFor5s = (fieldKey: string) => {
    setRevealedField(fieldKey);
    setTimeout(() => setRevealedField(null), 5000);
  };
```

- [ ] **Step 3: Add Интеграции section JSX**

Inside `<div className="p-6 space-y-6">`, add this section **after** «Параметры салона» and **before** «Сегментация клиентов»:

```tsx
        {/* ── Интеграции ── */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Bot size={16} className="text-[#00FF00]" />
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Интеграции</h3>
          </div>
          <p className="text-[#5E7488] text-sm mb-4">Credentials внешних сервисов</p>

          <div className="space-y-4">
            {/* YClients */}
            {(() => {
              const code = 'yclients';
              const form = integrationForms[code];
              const isSaving = integrationSaving === code;
              const isSaved = integrationSaved === code;
              return (
                <div className="bg-[#0A0D14] border border-[#223444] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#1A2535] border border-[#223444] flex items-center justify-center">
                      <span className="text-[#8299B4] text-xs font-bold">YC</span>
                    </div>
                    <span className="text-[#EDF2FA] text-sm font-semibold">YClients</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[#5E7488] text-xs mb-1 block">Company ID</label>
                      <input
                        value={form.company_id}
                        onChange={(e) => setIntegrationForms(f => ({ ...f, [code]: { ...f[code], company_id: e.target.value } }))}
                        placeholder="1647948"
                        className="w-full bg-[#0F1622] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488]"
                      />
                    </div>
                    <div>
                      <label className="text-[#5E7488] text-xs mb-1 block">API Key</label>
                      <div className="flex gap-2">
                        <input
                          type={revealedField === `${code}_api_key` ? 'text' : 'password'}
                          value={form.api_key}
                          onChange={(e) => setIntegrationForms(f => ({ ...f, [code]: { ...f[code], api_key: e.target.value } }))}
                          placeholder="••••••••••••"
                          className="flex-1 bg-[#0F1622] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488]"
                        />
                        <button
                          onClick={() => revealFor5s(`${code}_api_key`)}
                          className="px-2 rounded-lg border border-[#223444] text-[#5E7488] hover:text-[#EDF2FA] text-xs transition-colors flex-shrink-0"
                        >
                          {revealedField === `${code}_api_key` ? 'Скрыть' : 'Показать'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => saveIntegration(code)}
                      disabled={isSaving}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isSaved ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30"
                          : isSaving ? "bg-[#00FF00]/50 text-black cursor-not-allowed"
                          : "bg-[#00FF00] text-black hover:bg-[#ccff33]"
                      }`}
                    >
                      {isSaved && <CheckCircle2 size={12} />}
                      {isSaved ? "Сохранено" : isSaving ? "Сохранение..." : "Сохранить"}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* GREEN-API */}
            {(() => {
              const code = 'green_api';
              const form = integrationForms[code];
              const isSaving = integrationSaving === code;
              const isSaved = integrationSaved === code;
              return (
                <div className="bg-[#0A0D14] border border-[#223444] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#1A2535] border border-[#223444] flex items-center justify-center">
                      <span className="text-[#8299B4] text-xs font-bold">GA</span>
                    </div>
                    <span className="text-[#EDF2FA] text-sm font-semibold">GREEN-API</span>
                  </div>
                  <div className="mb-3">
                    <label className="text-[#5E7488] text-xs mb-1 block">Partner Token</label>
                    <div className="flex gap-2">
                      <input
                        type={revealedField === `${code}_partner_token` ? 'text' : 'password'}
                        value={form.partner_token}
                        onChange={(e) => setIntegrationForms(f => ({ ...f, [code]: { ...f[code], partner_token: e.target.value } }))}
                        placeholder="••••••••••••"
                        className="flex-1 bg-[#0F1622] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488]"
                      />
                      <button
                        onClick={() => revealFor5s(`${code}_partner_token`)}
                        className="px-2 rounded-lg border border-[#223444] text-[#5E7488] hover:text-[#EDF2FA] text-xs transition-colors flex-shrink-0"
                      >
                        {revealedField === `${code}_partner_token` ? 'Скрыть' : 'Показать'}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => saveIntegration(code)}
                      disabled={isSaving}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isSaved ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30"
                          : isSaving ? "bg-[#00FF00]/50 text-black cursor-not-allowed"
                          : "bg-[#00FF00] text-black hover:bg-[#ccff33]"
                      }`}
                    >
                      {isSaved && <CheckCircle2 size={12} />}
                      {isSaved ? "Сохранено" : isSaving ? "Сохранение..." : "Сохранить"}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Telegram */}
            {(() => {
              const code = 'telegram';
              const form = integrationForms[code];
              const isSaving = integrationSaving === code;
              const isSaved = integrationSaved === code;
              return (
                <div className="bg-[#0A0D14] border border-[#223444] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#1A2535] border border-[#223444] flex items-center justify-center">
                      <span className="text-[#8299B4] text-xs font-bold">TG</span>
                    </div>
                    <span className="text-[#EDF2FA] text-sm font-semibold">Telegram</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[#5E7488] text-xs mb-1 block">Имя бота</label>
                      <input
                        value={form.bot_name}
                        onChange={(e) => setIntegrationForms(f => ({ ...f, [code]: { ...f[code], bot_name: e.target.value } }))}
                        placeholder="@your_bot"
                        className="w-full bg-[#0F1622] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488]"
                      />
                    </div>
                    <div>
                      <label className="text-[#5E7488] text-xs mb-1 block">Bot Token</label>
                      <div className="flex gap-2">
                        <input
                          type={revealedField === `${code}_bot_token` ? 'text' : 'password'}
                          value={form.bot_token}
                          onChange={(e) => setIntegrationForms(f => ({ ...f, [code]: { ...f[code], bot_token: e.target.value } }))}
                          placeholder="••••••••••••"
                          className="flex-1 bg-[#0F1622] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488]"
                        />
                        <button
                          onClick={() => revealFor5s(`${code}_bot_token`)}
                          className="px-2 rounded-lg border border-[#223444] text-[#5E7488] hover:text-[#EDF2FA] text-xs transition-colors flex-shrink-0"
                        >
                          {revealedField === `${code}_bot_token` ? 'Скрыть' : 'Показать'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => saveIntegration(code)}
                      disabled={isSaving}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isSaved ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30"
                          : isSaving ? "bg-[#00FF00]/50 text-black cursor-not-allowed"
                          : "bg-[#00FF00] text-black hover:bg-[#ccff33]"
                      }`}
                    >
                      {isSaved && <CheckCircle2 size={12} />}
                      {isSaved ? "Сохранено" : isSaving ? "Сохранение..." : "Сохранить"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1; echo "EXIT:$?"
```
Expected: `EXIT:0`

- [ ] **Step 5: Final commit and push**

```bash
git add app/settings/page.tsx
git commit -m "feat: settings — Интеграции section (YClients, GREEN-API, Telegram credentials)"
git push origin main
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ `integration_settings` table — Task 1
- ✅ `client_config` table — Task 1
- ✅ `system_states.is_available` — Tasks 1 + 5
- ✅ `org_settings` extensions — Task 1
- ✅ `OrgConfigContext` with types and defaults — Task 2
- ✅ Layout wrapped with provider — Task 3
- ✅ `useClients.ts` hardcodes replaced — Task 4
- ✅ `IN_DEVELOPMENT_SYSTEM_CODES` removed — Task 5
- ✅ Параметры салона UI — Task 6
- ✅ Сегментация клиентов UI — Task 7
- ✅ Интеграции UI with masked credentials — Task 8

**Type consistency:**
- `ClientConfig` defined in Task 2, imported in Task 4 ✅
- `useOrgConfig()` defined in Task 2, used in Tasks 4, 6, 7 ✅
- `integrationForms` keyed by `integration_code` string, `saveIntegration(code)` receives same string ✅
- `mapRow(row, upcomingClientIds, cfg)` — signature updated in Task 4 Step 4, called with `clientConfig` in Task 4 Step 5 ✅

**Placeholder scan:** No TBD, no "similar to above", all code blocks complete ✅
