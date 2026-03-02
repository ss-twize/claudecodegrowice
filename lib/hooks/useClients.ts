'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export interface Client {
  id: string
  name: string
  phone: string
  gender: string
  revenue: number
  channel: string
  telegram: string | null
  services: string[]
  segment: string
  churnRisk: string
  score: number
}

function computeSegment(created_at: string | null, last_message: string | null): string {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  if (created_at && new Date(created_at) >= startOfMonth) return 'new'

  const lastContact = last_message ? new Date(last_message) : null
  if (!lastContact || isNaN(lastContact.getTime())) return 'inactive'

  const daysSince = (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince <= 30) return 'active'
  if (daysSince <= 90) return 'atRisk'
  return 'inactive'
}

function computeChurnRisk(segment: string): string {
  if (segment === 'new' || segment === 'active') return 'low'
  if (segment === 'atRisk') return 'medium'
  return 'high'
}

function computeScore(revenue: number, segment: string): number {
  const base = Math.min(Math.round(revenue / 1000), 60)
  const bonus: Record<string, number> = { new: 30, active: 40, atRisk: 20, inactive: 5 }
  return Math.min(base + (bonus[segment] || 0), 100)
}

function normalizeGender(g: string | null): string {
  if (!g) return 'М'
  const v = g.trim().toLowerCase()
  if (v === 'ж' || v === 'f' || v === 'female' || v === 'женский' || v === 'женщина') return 'Ж'
  return 'М'
}

function mapRow(row: any): Client {
  const fullName =
    row.name ||
    [row.first_name, row.last_name].filter(Boolean).join(' ') ||
    'Без имени'
  const revenue = Number(row.Revenue) || 0
  const segment = computeSegment(row.created_at, row.last_message)
  return {
    id: String(row.tg_id),
    name: fullName,
    phone: row.phone || '',
    gender: normalizeGender(row.Gender),
    revenue,
    channel: row.tg_username ? 'Telegram' : 'Телефон',
    telegram: row.tg_username ? `@${row.tg_username}` : null,
    services: [],
    segment,
    churnRisk: computeChurnRisk(segment),
    score: computeScore(revenue, segment),
  }
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = async () => {
    const { data, error: err } = await supabase
      .from('clients_tg')
      .select('tg_id, name, first_name, last_name, phone, Gender, Revenue, tg_username, created_at, last_message')
      .order('created_at', { ascending: false })
      .limit(2000)

    if (err) {
      console.error('useClients error:', err.message)
      setError(err.message)
    } else {
      setClients((data || []).map(mapRow))
      setError(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
    const ch = supabase
      .channel('clients_tg_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients_tg' }, fetchClients)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  return { clients, loading, error }
}
