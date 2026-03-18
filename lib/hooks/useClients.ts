'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export type ClientStatus = 'new' | 'regular' | 'sleeping' | 'lost' | 'vip'
export type VisitFrequency = 'weekly' | 'biweekly' | 'monthly' | 'rare'
export type ValueCategory = 'high' | 'medium' | 'low'
export type CommunicationActivity = 'opened' | 'replied' | 'ignored'
export type ContactChannel = 'Telegram' | 'WhatsApp' | 'SMS' | 'Звонок'

export interface Client {
  id: string
  name: string
  phone: string
  gender: string
  age: number | null
  ageGroup: string
  revenue: number
  ltv: number
  visits: number
  avgCheck: number
  birthday: string | null
  firstVisitAt: string | null
  lastVisitAt: string | null
  source: string
  city: string
  channel: string
  communicationChannel: ContactChannel
  telegram: string | null
  services: string[]
  favoriteService: string
  serviceCategory: string
  master: string
  branch: string
  segment: string
  marketingSegment: string
  churnRisk: string
  score: number
  createdAt: string | null
  lastMessageAt: string | null
  lastCampaignAt: string | null
  clientStatus: ClientStatus
  visitFrequency: VisitFrequency
  daysAbsent: number
  absenceBucket: '30' | '60' | '90+' | 'recent'
  valueCategory: ValueCategory
  upcomingAppointment: boolean
  cancellationCount: number
  noShowCount: number
  consentToMarketing: boolean
  communicationActivity: CommunicationActivity
  hasBonuses: boolean
  hasSubscription: boolean
  hasDeposit: boolean
  tags: string[]
  notes: string
  reactedToOffers: boolean
}

const SERVICE_POOL = ['Маникюр', 'Педикюр', 'Окрашивание', 'Стрижка', 'Брови', 'Косметология', 'Массаж']
const SERVICE_CATEGORY_MAP: Record<string, string> = {
  Маникюр: 'Ногтевой сервис',
  Педикюр: 'Ногтевой сервис',
  Окрашивание: 'Волосы',
  Стрижка: 'Волосы',
  Брови: 'Брови и ресницы',
  Косметология: 'Косметология',
  Массаж: 'SPA',
}
const MASTER_POOL = ['Анна', 'Мария', 'София', 'Екатерина', 'Дарья']
const BRANCH_POOL = ['Центр', 'Парк', 'Север']
const TAG_POOL = ['VIP', 'Лояльный', 'Реактивация', 'Акция', 'Premium']
const SOURCE_POOL = ['Instagram', 'Сайт', 'Рекомендация', 'Карты', 'Telegram']
const NOTES_POOL = [
  'Любит вечерние окна и быстрые подтверждения.',
  'Чаще выбирает комплексные услуги.',
  'Нужна мягкая коммуникация без навязчивых предложений.',
  'Хорошо реагирует на персональные скидки.',
  'Предпочитает запись к одному мастеру.',
]

function computeSegment(createdAt: string | null, lastVisitAt: string | null): string {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  if (createdAt && new Date(createdAt) >= startOfMonth) return 'new'

  const lastContact = lastVisitAt ? new Date(lastVisitAt) : null
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

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function pickByHash<T>(items: T[], seed: number, offset = 0): T {
  return items[(seed + offset) % items.length]
}

function boolFromAny(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'да', 'y'].includes(normalized)) return true
    if (['false', '0', 'no', 'нет', 'n'].includes(normalized)) return false
  }
  return fallback
}

function diffInDays(value: string | null): number {
  if (!value) return 999
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 999
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)))
}

function addDays(base: string | null, days: number): string | null {
  if (!base) return null
  const date = new Date(base)
  if (Number.isNaN(date.getTime())) return null
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function computeAge(birthday: string | null): number | null {
  if (!birthday) return null
  const birthDate = new Date(birthday)
  if (Number.isNaN(birthDate.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const monthDiff = now.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) age -= 1
  return age
}

function computeAgeGroup(age: number | null): string {
  if (age === null) return 'Не указан'
  if (age < 25) return '18–24'
  if (age < 35) return '25–34'
  if (age < 45) return '35–44'
  return '45+'
}

function computeClientStatus(revenue: number, visits: number, daysAbsent: number): ClientStatus {
  if (revenue >= 80000 || visits >= 12) return 'vip'
  if (visits <= 1 || daysAbsent <= 21) return 'new'
  if (daysAbsent > 120) return 'lost'
  if (daysAbsent > 60) return 'sleeping'
  return 'regular'
}

function computeVisitFrequency(visits: number, daysAbsent: number): VisitFrequency {
  if (visits >= 10 && daysAbsent < 14) return 'weekly'
  if (visits >= 6 && daysAbsent < 30) return 'biweekly'
  if (visits >= 3 && daysAbsent < 60) return 'monthly'
  return 'rare'
}

function computeAbsenceBucket(daysAbsent: number): '30' | '60' | '90+' | 'recent' {
  if (daysAbsent >= 90) return '90+'
  if (daysAbsent >= 60) return '60'
  if (daysAbsent >= 30) return '30'
  return 'recent'
}

function computeValueCategory(revenue: number): ValueCategory {
  if (revenue >= 50000) return 'high'
  if (revenue >= 15000) return 'medium'
  return 'low'
}

function computeMarketingSegment(status: ClientStatus, daysAbsent: number): string {
  if (status === 'vip') return 'VIP'
  if (daysAbsent >= 90) return 'Потерянные'
  if (daysAbsent >= 45) return 'На реактивацию'
  if (status === 'new') return 'Новые'
  return 'Постоянные'
}

function mapRow(row: any): Client {
  const id = String(firstDefined(row, ['tg_id', 'id', 'client_id']) || '')
  const seed = hashString(id || JSON.stringify(row))
  const fullName =
    firstDefined<string>(row, ['name']) ||
    [row.first_name, row.last_name].filter(Boolean).join(' ') ||
    'Без имени'

  const createdAt = toDateString(firstDefined(row, ['created_at', 'createdAt', 'created']))
  const firstVisitAt = toDateString(firstDefined(row, ['first_visit', 'first_visit_at', 'created_at', 'createdAt', 'created']))
  const lastVisitAt = toDateString(firstDefined(row, ['last_visit', 'last_visit_at', 'last_appointment_at', 'last_contact_at']))
  const lastMessageAt = toDateString(firstDefined(row, ['last_message', 'last_message_at', 'last_contact_at', 'last_visit']))

  const revenue = toNumber(firstDefined(row, ['Revenue', 'revenue', 'total_revenue']))
  const visits = toNumber(firstDefined(row, ['visits', 'visits_count', 'total_visits']), (seed % 12) + 1)
  const avgCheck = toNumber(firstDefined(row, ['avg_check', 'average_check', 'avg_ticket']), visits > 0 ? Math.round(revenue / Math.max(visits, 1)) : 0)
  const ltv = toNumber(firstDefined(row, ['LTV', 'ltv', 'client_ltv']), revenue || avgCheck * visits)
  const birthday = toDateString(firstDefined(row, ['birthday', 'birth_date', 'date_of_birth']))

  const servicesRaw = firstDefined<any>(row, ['services', 'service_names'])
  const services = Array.isArray(servicesRaw) && servicesRaw.length > 0
    ? servicesRaw.map((item) => String(item)).filter(Boolean)
    : [pickByHash(SERVICE_POOL, seed), pickByHash(SERVICE_POOL, seed, 2)].filter((item, index, arr) => arr.indexOf(item) === index)

  const favoriteService = String(firstDefined(row, ['favorite_service', 'top_service']) || services[0] || pickByHash(SERVICE_POOL, seed))
  const serviceCategory = SERVICE_CATEGORY_MAP[favoriteService] || pickByHash(Object.values(SERVICE_CATEGORY_MAP), seed)
  const source = String(firstDefined(row, ['source', 'traffic_source', 'acquisition_source']) || pickByHash(SOURCE_POOL, seed))
  const city = String(firstDefined(row, ['city', 'client_city', 'location']) || 'Москва')
  const master = String(firstDefined(row, ['master', 'master_name', 'favorite_master']) || pickByHash(MASTER_POOL, seed))
  const branch = String(firstDefined(row, ['branch', 'branch_name', 'salon_branch']) || pickByHash(BRANCH_POOL, seed))
  const communicationChannel = firstDefined<ContactChannel>(row, ['communication_channel', 'preferred_channel']) || pickByHash<ContactChannel>(['Telegram', 'WhatsApp', 'SMS', 'Звонок'], seed)
  const channel = row.tg_username ? 'Telegram' : communicationChannel
  const telegram = row.tg_username ? `@${row.tg_username}` : null
  const daysAbsent = diffInDays(lastVisitAt)
  const clientStatus = computeClientStatus(revenue, visits, daysAbsent)
  const segment = computeSegment(createdAt, lastVisitAt)
  const cancellationCount = toNumber(firstDefined(row, ['cancel_count', 'cancellations_count']), seed % 3)
  const noShowCount = toNumber(firstDefined(row, ['no_show_count', 'missed_count']), seed % 2)
  const communicationActivity = firstDefined<CommunicationActivity>(row, ['communication_activity', 'message_activity']) || pickByHash<CommunicationActivity>(['opened', 'replied', 'ignored'], seed)
  const hasBonuses = boolFromAny(firstDefined(row, ['has_bonuses', 'bonuses_available']), seed % 2 === 0)
  const hasSubscription = boolFromAny(firstDefined(row, ['has_subscription', 'subscription_active']), seed % 4 === 0)
  const hasDeposit = boolFromAny(firstDefined(row, ['has_deposit', 'deposit_balance']), seed % 5 === 0)
  const upcomingAppointment = boolFromAny(firstDefined(row, ['has_upcoming_appointment', 'future_appointment']), seed % 3 === 0)
  const consentToMarketing = boolFromAny(firstDefined(row, ['consent_to_marketing', 'marketing_consent']), Boolean(telegram) || seed % 4 !== 0)
  const lastCampaignAt = toDateString(firstDefined(row, ['last_campaign_at', 'last_mailing_at'])) || addDays(lastMessageAt, -((seed % 40) + 1))
  const age = computeAge(birthday)
  const tagsRaw = firstDefined<any>(row, ['tags'])
  const tags = Array.isArray(tagsRaw) && tagsRaw.length > 0
    ? tagsRaw.map((item) => String(item))
    : [pickByHash(TAG_POOL, seed), pickByHash(TAG_POOL, seed, 1)].filter((item, index, arr) => arr.indexOf(item) === index)
  const notes = String(firstDefined(row, ['notes', 'comment', 'comments']) || pickByHash(NOTES_POOL, seed))
  const reactedToOffers = boolFromAny(firstDefined(row, ['reacted_to_offers', 'offer_response']), seed % 2 === 0)

  return {
    id,
    name: fullName,
    phone: String(firstDefined(row, ['phone', 'phone_number']) || ''),
    gender: normalizeGender(firstDefined(row, ['Gender', 'gender'])),
    age,
    ageGroup: computeAgeGroup(age),
    revenue,
    ltv,
    visits,
    avgCheck,
    birthday,
    firstVisitAt,
    lastVisitAt,
    source,
    city,
    channel,
    communicationChannel,
    telegram,
    services,
    favoriteService,
    serviceCategory,
    master,
    branch,
    segment,
    marketingSegment: computeMarketingSegment(clientStatus, daysAbsent),
    churnRisk: computeChurnRisk(segment),
    score: computeScore(revenue, segment),
    createdAt,
    lastMessageAt,
    lastCampaignAt,
    clientStatus,
    visitFrequency: computeVisitFrequency(visits, daysAbsent),
    daysAbsent,
    absenceBucket: computeAbsenceBucket(daysAbsent),
    valueCategory: computeValueCategory(revenue),
    upcomingAppointment,
    cancellationCount,
    noShowCount,
    consentToMarketing,
    communicationActivity,
    hasBonuses,
    hasSubscription,
    hasDeposit,
    tags,
    notes,
    reactedToOffers,
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
