import { useEffect, useState } from 'react'
import { supabase, ORG_UID } from '@/lib/supabase'

export interface DayMetric {
  date: string  // YYYY-MM-DD
  unique_contacts: number
  incoming_messages: number
  outgoing_messages: number
  appointments: number
  revenue: number
  no_shows: number
  new_clients: number
}

export interface MonthMetric {
  month: string  // YYYY-MM-DD (first of month)
  unique_contacts: number
  incoming_messages: number
  outgoing_messages: number
  appointments: number
  revenue: number
  no_shows: number
  new_clients: number
  avg_check: number
}

export interface AnalyticsData {
  totalClients: number
  newClientsThisMonth: number
  totalRevenue: number
  totalVisits: number
  avgCheck: number
  retention: number    // % clients with >1 visit
  timeSaved: number    // estimated hours saved by AI
  campaignsSent: number
  campaignRecipients: number
  dailyMetrics: DayMetric[]    // last 365 days, ascending
  monthlyMetrics: MonthMetric[] // last 24 months, ascending
}

export function useAnalyticsData() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [clientsRes, campaignsRes, dailyRes, monthlyRes] = await Promise.all([
          supabase
            .from('clients')
            .select('id, visits, spent, created_at')
            .eq('org_uid', ORG_UID),
          supabase
            .from('campaign_runs')
            .select('*')
            .neq('status', 'running'),
          supabase
            .from('metrics_day')
            .select('date, unique_contacts, incoming_messages, outgoing_messages, appointments, revenue, no_shows, new_clients')
            .eq('org_uid', ORG_UID)
            .order('date', { ascending: true })
            .limit(365),
          supabase
            .from('metrics_month')
            .select('month, unique_contacts, incoming_messages, outgoing_messages, appointments, revenue, no_shows, new_clients, avg_check')
            .eq('org_uid', ORG_UID)
            .order('month', { ascending: true })
            .limit(24),
        ])

        const clients = clientsRes.data ?? []
        const campaigns = campaignsRes.data ?? []

        const daily: DayMetric[] = (dailyRes.data ?? []).map((d: any) => ({
          date: String(d.date),
          unique_contacts: Number(d.unique_contacts ?? 0),
          incoming_messages: Number(d.incoming_messages ?? 0),
          outgoing_messages: Number(d.outgoing_messages ?? 0),
          appointments: Number(d.appointments ?? 0),
          revenue: Number(d.revenue ?? 0),
          no_shows: Number(d.no_shows ?? 0),
          new_clients: Number(d.new_clients ?? 0),
        }))

        const monthly: MonthMetric[] = (monthlyRes.data ?? []).map((m: any) => ({
          month: String(m.month),
          unique_contacts: Number(m.unique_contacts ?? 0),
          incoming_messages: Number(m.incoming_messages ?? 0),
          outgoing_messages: Number(m.outgoing_messages ?? 0),
          appointments: Number(m.appointments ?? 0),
          revenue: Number(m.revenue ?? 0),
          no_shows: Number(m.no_shows ?? 0),
          new_clients: Number(m.new_clients ?? 0),
          avg_check: Number(m.avg_check ?? 0),
        }))

        const now = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const newClients = clients.filter((c: any) => c.created_at >= thisMonthStart).length

        const totalRevenue = clients.reduce((s: number, c: any) => s + Number(c.spent ?? 0), 0)
        const totalVisits = clients.reduce((s: number, c: any) => s + Number(c.visits ?? 0), 0)
        const avgCheck = totalVisits > 0 ? Math.round(totalRevenue / totalVisits) : 0

        const withRepeat = clients.filter((c: any) => Number(c.visits ?? 0) > 1).length
        const retention = clients.length > 0 ? Math.round((withRepeat / clients.length) * 100) : 0

        // 4 min per unique contact interaction saved by AI admin, in hours
        const totalContacts = monthly.reduce((s: number, m: MonthMetric) => s + m.unique_contacts, 0) || clients.length
        const timeSaved = Math.round(totalContacts * 4 / 60)

        // Handle both old schema (total_sent) and new schema (sent)
        const campaignRecipients = campaigns.reduce((s: number, r: any) =>
          s + Number(r.sent ?? r.total_sent ?? 0), 0)

        setData({
          totalClients: clients.length,
          newClientsThisMonth: newClients,
          totalRevenue,
          totalVisits,
          avgCheck,
          retention,
          timeSaved,
          campaignsSent: campaigns.length,
          campaignRecipients,
          dailyMetrics: daily,
          monthlyMetrics: monthly,
        })
      } catch (e) {
        console.error('useAnalyticsData:', e)
        setData({
          totalClients: 0, newClientsThisMonth: 0, totalRevenue: 0,
          totalVisits: 0, avgCheck: 0, retention: 0, timeSaved: 0,
          campaignsSent: 0, campaignRecipients: 0,
          dailyMetrics: [], monthlyMetrics: [],
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { data, loading }
}
