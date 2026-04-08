'use client'
import { useEffect, useState } from 'react'
import { supabase, ORG_UID } from '../supabase'

export interface CampaignLog {
  id: string
  createdAt: string | null
  campaignName: string
  campaignType: string
  segment: string
  transport: string
  text: string
  recipientsCount: number
  status: string
  errorMessage: string | null
  role: string | null
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapRow(row: any): CampaignLog {
  const params = row.params && typeof row.params === 'object' ? row.params : {}
  return {
    id: String(row.id ?? row.created_at ?? Math.random()),
    createdAt: toIsoDate(row.created_at ?? row.inserted_at ?? row.client_time ?? params.client_time),
    campaignName: String(params.campaign_name || 'Без названия'),
    campaignType: String(params.campaign_type || 'предложение'),
    segment: String(params.segment || '—'),
    transport: String(params.transport || 'telegram'),
    text: String(params.text || ''),
    recipientsCount: toNumber(params.recipients_count),
    status: String(row.status || '—'),
    errorMessage: row.error_message ? String(row.error_message) : null,
    role: row.role ? String(row.role) : null,
  }
}

export function useCampaignLogs(limit = 100) {
  const [logs, setLogs] = useState<CampaignLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    const { data, error: err } = await supabase
      .from('action_log')
      .select('id, created_at, inserted_at, client_time, params, status, error_message, role')
      .eq('org_uid', ORG_UID)
      .eq('action_code', 'rassylka_zapustit')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (err) {
      console.error('useCampaignLogs error:', err.message)
      setError(err.message)
    } else {
      setLogs((data || []).map(mapRow))
      setError(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
    const ch = supabase
      .channel('campaign_logs_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'action_log', filter: `org_uid=eq.${ORG_UID}` }, fetchLogs)
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { logs, loading, error, refetch: fetchLogs }
}
