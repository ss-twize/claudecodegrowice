'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

export interface YclientsMaster {
  id: string
  name: string
  specialization: string
  revenue: number
  clients: number
  appointments: number
  avgCheck: number
  workload: number
  rating: number
  salary: number
  conversionRate: number
  noShowPercent: number
  noShowCount: number
  avgSession: string
}

export function useYclientsMasters() {
  const [masters, setMasters] = useState<YclientsMaster[]>([])

  const toNumber = (value: any, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const firstDefined = (row: any, keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) return row[key]
    }
    return null
  }

  const normalizeMaster = useCallback((row: any): YclientsMaster => ({
    id: String(row.id),
    name: String(row.name || '').trim() || 'Без имени',
    specialization: String(row.specialization || '').trim() || 'Без должности',
    revenue: toNumber(firstDefined(row, ['revenue', 'revenue_month', 'total_revenue'])),
    clients: toNumber(firstDefined(row, ['clients', 'clients_count', 'unique_clients'])),
    appointments: toNumber(firstDefined(row, ['appointments', 'appointments_count', 'bookings_count'])),
    avgCheck: toNumber(firstDefined(row, ['avg_check', 'average_check', 'avg_ticket'])),
    workload: Math.max(0, Math.min(100, toNumber(firstDefined(row, ['workload', 'workload_percent'])))),
    rating: toNumber(firstDefined(row, ['rating', 'rate']), 0),
    salary: toNumber(firstDefined(row, ['salary', 'month_salary'])),
    conversionRate: Math.max(0, Math.min(100, toNumber(firstDefined(row, ['conversion_rate', 'conversion'])))),
    noShowPercent: Math.max(0, Math.min(100, toNumber(firstDefined(row, ['no_show_percent', 'noshow_percent'])))),
    noShowCount: toNumber(firstDefined(row, ['no_show_count', 'noshow_count'])),
    avgSession: String(firstDefined(row, ['avg_session', 'average_session']) || '—'),
  }), [])

  const sortByName = useCallback((items: YclientsMaster[]) => (
    [...items].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  ), [])

  const fetchMasters = useCallback(async () => {
    const { data, error } = await supabase
      .from('masters')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('useYclientsMasters error:', error.message)
      return
    }

    setMasters(
      sortByName((data || []).map((row: any) => normalizeMaster(row))),
    )
  }, [normalizeMaster, sortByName])

  useEffect(() => {
    fetchMasters()

    const ch = supabase
      .channel('masters_yclients_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'masters' }, (payload) => {
        const incoming = payload.new ? normalizeMaster(payload.new) : null

        setMasters((prev) => {
          if (payload.eventType === 'INSERT' && incoming) {
            const withoutDup = prev.filter((item) => item.id !== incoming.id)
            return sortByName([...withoutDup, incoming])
          }

          if (payload.eventType === 'UPDATE' && incoming) {
            return sortByName(prev.map((item) => (item.id === incoming.id ? incoming : item)))
          }

          if (payload.eventType === 'DELETE') {
            const deletedId = String((payload.old as any)?.id || '')
            return prev.filter((item) => item.id !== deletedId)
          }

          return prev
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [fetchMasters, normalizeMaster, sortByName])

  return { masters }
}
