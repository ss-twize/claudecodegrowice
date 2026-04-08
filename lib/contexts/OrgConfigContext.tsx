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
