'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export interface Client {
  id: string
  name: string
  phone: string
  gender: string
  revenue: number
  ltv: number
  visits: number
  avgCheck: number
  birthday: string | null
  source: string
  city: string
  channel: string
  telegram: string | null
  services: string[]
  segment: string
  churnRisk: string
  score: number
  createdAt: string | null
  lastMessageAt: string | null
}

function computeSegment(createdAt: string | null, lastMessageAt: string | null): string {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  if (createdAt && new Date(createdAt) >= startOfMonth) return 'new'

  const lastContact = lastMessageAt ? new Date(lastMessageAt) : null
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

function firstDefined<T = any>(row: any, keys: string[]): T | null {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key] as T
  }
  return null
}

function toNumber(value: any, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toDateString(value: any): string | null {
  if (!value) return null
  const d = new Date(String(value))
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

function mapRow(row: any): Client {
  const fullName =
    firstDefined<string>(row, ['name']) ||
    [row.first_name, row.last_name].filter(Boolean).join(' ') ||
    'Без имени'

  const createdAt = toDateString(firstDefined(row, ['created_at', 'createdAt', 'created']))
  const lastMessageAt = toDateString(firstDefined(row, ['last_message', 'last_visit', 'last_contact_at']))

  const revenue = toNumber(firstDefined(row, ['Revenue', 'revenue', 'total_revenue']))
  const ltv = toNumber(firstDefined(row, ['LTV', 'ltv', 'client_ltv']), revenue)
  const visits = toNumber(firstDefined(row, ['visits', 'visits_count', 'total_visits']))
  const avgCheck = toNumber(firstDefined(row, ['avg_check', 'average_check', 'avg_ticket']))
  const birthday = toDateString(firstDefined(row, ['birthday', 'birth_date', 'date_of_birth']))

  const source = String(firstDefined(row, ['source', 'traffic_source', 'acquisition_source']) || '—')
  const city = String(firstDefined(row, ['city', 'client_city', 'location']) || '—')

  const servicesRaw = firstDefined<any>(row, ['services', 'service_names'])
  const services = Array.isArray(servicesRaw)
    ? servicesRaw.map((item) => String(item)).filter(Boolean)
    : []

  const segment = computeSegment(createdAt, lastMessageAt)

  return {
    id: String(firstDefined(row, ['tg_id', 'id', 'client_id']) || ''),
    name: fullName,
    phone: String(firstDefined(row, ['phone', 'phone_number']) || ''),
    gender: normalizeGender(firstDefined(row, ['Gender', 'gender'])),
    revenue,
    ltv,
    visits,
    avgCheck,
    birthday,
    source,
    city,
    channel: row.tg_username ? 'Telegram' : 'Телефон',
    telegram: row.tg_username ? `@${row.tg_username}` : null,
    services,
    segment,
    churnRisk: computeChurnRisk(segment),
    score: computeScore(revenue, segment),
    createdAt,
    lastMessageAt,
  }
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = async () => {
    const { data, error: err } = await supabase
      .from('clients_tg')
      .select('*')
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
    return () => {
      supabase.removeChannel(ch)
    }
  }, [])

  return { clients, loading, error }
}
