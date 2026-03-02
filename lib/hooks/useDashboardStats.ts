'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export interface DashboardStats {
  monthlyRevenue: number
  monthlyRevenueGrowth: number
  newClients: number
  newClientsGrowth: number
  totalAppointments: number
  appointmentsGrowth: number
  avgCheck: number
}

const FALLBACK: DashboardStats = {
  monthlyRevenue: 0,
  monthlyRevenueGrowth: 0,
  newClients: 0,
  newClientsGrowth: 0,
  totalAppointments: 0,
  appointmentsGrowth: 0,
  avgCheck: 0,
}

function monthBounds(offset = 0): { start: string; end: string } {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const start = d.toISOString().slice(0, 10)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { start, end }
}

function pct(curr: number, prev: number): number {
  return prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>(FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const curr = monthBounds(0)
      const prev = monthBounds(-1)

      const [
        { data: currAppts },
        { data: prevAppts },
        { count: currNew },
        { count: prevNew },
      ] = await Promise.all([
        supabase.from('appointments').select('price')
          .gte('date', curr.start).lte('date', curr.end + 'T23:59:59'),
        supabase.from('appointments').select('price')
          .gte('date', prev.start).lte('date', prev.end + 'T23:59:59'),
        supabase.from('clients_tg').select('tg_id', { count: 'exact', head: true })
          .gte('created_at', curr.start),
        supabase.from('clients_tg').select('tg_id', { count: 'exact', head: true })
          .gte('created_at', prev.start).lt('created_at', curr.start),
      ])

      const currRev = (currAppts || []).reduce((s, r) => s + (Number(r.price) || 0), 0)
      const prevRev = (prevAppts || []).reduce((s, r) => s + (Number(r.price) || 0), 0)
      const currCnt = currAppts?.length || 0
      const prevCnt = prevAppts?.length || 0

      setStats({
        monthlyRevenue: currRev,
        monthlyRevenueGrowth: pct(currRev, prevRev),
        newClients: currNew || 0,
        newClientsGrowth: pct(currNew || 0, prevNew || 0),
        totalAppointments: currCnt,
        appointmentsGrowth: pct(currCnt, prevCnt),
        avgCheck: currCnt > 0 ? Math.round(currRev / currCnt) : 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  return { stats, loading }
}
