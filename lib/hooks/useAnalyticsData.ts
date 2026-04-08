import { useEffect, useState } from 'react'
import { supabase, ORG_UID } from '@/lib/supabase'

export interface AnalyticsKPIs {
  totalClients: number
  newClientsThisMonth: number
  totalRevenue: number
  avgCheck: number
  totalVisits: number
  totalMessages: number
  campaignsSent: number
  campaignRecipients: number
  monthlyRevenue: { month: string; revenue: number }[]
}

export function useAnalyticsData() {
  const [data, setData] = useState<AnalyticsKPIs | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [clientsRes, messagesRes, campaignsRes, metricsRes] = await Promise.all([
          supabase.from('clients').select('id, visits, spent, created_at, marketing_consent').eq('org_uid', ORG_UID),
          supabase.from('messages').select('id, created_at').limit(10000),
          supabase.from('campaign_runs').select('id, sent').eq('status', 'done'),
          supabase.from('metrics_month').select('month, revenue').order('month', { ascending: false }).limit(24),
        ])

        const clients = clientsRes.data ?? []
        const messages = messagesRes.data ?? []
        const campaigns = campaignsRes.data ?? []
        const metrics = metricsRes.data ?? []

        const now = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const newClients = clients.filter(c => c.created_at >= thisMonthStart).length

        const totalRevenue = clients.reduce((sum, c) => sum + Number(c.spent ?? 0), 0)
        const totalVisits = clients.reduce((sum, c) => sum + Number(c.visits ?? 0), 0)
        const avgCheck = totalVisits > 0 ? totalRevenue / totalVisits : 0

        const campaignRecipients = campaigns.reduce((sum, r) => sum + Number(r.sent ?? 0), 0)

        setData({
          totalClients: clients.length,
          newClientsThisMonth: newClients,
          totalRevenue,
          avgCheck: Math.round(avgCheck),
          totalVisits,
          totalMessages: messages.length,
          campaignsSent: campaigns.length,
          campaignRecipients,
          monthlyRevenue: metrics.map(m => ({ month: m.month, revenue: Number(m.revenue ?? 0) })),
        })
      } catch (e) {
        console.error('useAnalyticsData:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { data, loading }
}
