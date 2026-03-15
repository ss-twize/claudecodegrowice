'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export type RevenuePoint = { month: string; revenue: number; expenses: number }
export type ServicePoint = { name: string; value: number; color: string }
export type DayPoint = { day: string; appointments: number }
export type HourPoint = { hour: string; count: number }
export type FunnelPoint = { stage: string; count: number }
export type ActivityItem = {
  id: string
  type: 'appointment' | 'client' | 'payment' | 'cancel'
  text: string
  time: string
  amount: number | null
}

const SERVICE_COLORS = ['#00FF00', '#88CC00', '#66AA00', '#448800', '#226600']
const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(date)
}

function formatTimeAgo(date: Date): string {
  const diffMin = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (diffMin < 1) return 'только что'
  if (diffMin < 60) return `${diffMin} мин назад`
  const hours = Math.floor(diffMin / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  return `${days} дн назад`
}

function parseDate(value: any): Date | null {
  if (!value) return null
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

function toNumber(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function computeRevenueSeries(appointments: any[]): RevenuePoint[] {
  const now = new Date()
  const points: RevenuePoint[] = []

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    let revenue = 0

    for (const a of appointments) {
      const ad = parseDate(a.date)
      if (!ad) continue
      if (ad.getFullYear() === y && ad.getMonth() === m) {
        revenue += toNumber(a.price)
      }
    }

    points.push({ month: monthLabel(d), revenue, expenses: 0 })
  }

  return points
}

function computeServices(appointments: any[]): ServicePoint[] {
  const counts = new Map<string, number>()
  let total = 0

  for (const a of appointments) {
    const name = String(a.service_name || 'Без услуги')
    counts.set(name, (counts.get(name) || 0) + 1)
    total += 1
  }

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  if (sorted.length === 0) {
    return [{ name: 'Нет данных', value: 100, color: SERVICE_COLORS[0] }]
  }

  return sorted.map(([name, count], index) => ({
    name,
    value: total > 0 ? Math.round((count / total) * 100) : 0,
    color: SERVICE_COLORS[index % SERVICE_COLORS.length],
  }))
}

function computeByWeekday(appointments: any[]): DayPoint[] {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const a of appointments) {
    const d = parseDate(a.date)
    if (!d) continue
    const jsDay = d.getDay()
    const idx = jsDay === 0 ? 6 : jsDay - 1
    counts[idx] += 1
  }
  return WEEK_DAYS.map((day, i) => ({ day, appointments: counts[i] }))
}

function computeByHour(appointments: any[]): HourPoint[] {
  const counts = new Map<number, number>()
  for (let h = 9; h <= 20; h++) counts.set(h, 0)

  for (const a of appointments) {
    const d = parseDate(a.date)
    if (!d) continue
    const h = d.getHours()
    if (h >= 9 && h <= 20) counts.set(h, (counts.get(h) || 0) + 1)
  }

  return Array.from(counts.entries()).map(([hour, count]) => ({ hour: `${hour}:00`, count }))
}

function computeFunnel(appointments: any[]): FunnelPoint[] {
  const total = appointments.length
  const confirmed = appointments.filter((a) => {
    const s = String(a.status || '').toLowerCase()
    return s.includes('подтверж') || s === 'confirmed'
  }).length
  const completed = appointments.filter((a) => {
    const s = String(a.status || '').toLowerCase()
    return s.includes('заверш') || s.includes('done')
  }).length
  const paid = appointments.filter((a) => toNumber(a.price) > 0).length

  return [
    { stage: 'Запросы', count: total },
    { stage: 'Записаны', count: total },
    { stage: 'Подтверждены', count: confirmed },
    { stage: 'Завершены', count: completed },
    { stage: 'Оплачены', count: paid },
  ]
}

function computeActivity(appointments: any[], clients: any[]): ActivityItem[] {
  const apptItems: ActivityItem[] = appointments
    .slice(0, 8)
    .map((a) => {
      const d = parseDate(a.date) || new Date()
      const status = String(a.status || '').toLowerCase()
      const type: ActivityItem['type'] = status.includes('отмен') ? 'cancel' : (toNumber(a.price) > 0 ? 'payment' : 'appointment')
      return {
        id: `appt-${a.record_id || a.id || Math.random()}`,
        type,
        text: `${a.clientName || 'Клиент'} — ${a.service_name || 'запись'}`,
        time: formatTimeAgo(d),
        amount: toNumber(a.price) > 0 ? toNumber(a.price) : null,
      }
    })

  const clientItems: ActivityItem[] = clients
    .slice(0, 5)
    .map((c) => {
      const d = parseDate(c.created_at) || new Date()
      const name = c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Новый клиент'
      return {
        id: `client-${c.tg_id || c.id || Math.random()}`,
        type: 'client',
        text: `Новый клиент: ${name}`,
        time: formatTimeAgo(d),
        amount: null,
      }
    })

  return [...apptItems, ...clientItems].slice(0, 10)
}

export function useRealtimePlatform() {
  const [loading, setLoading] = useState(true)
  const [revenueSeries, setRevenueSeries] = useState<RevenuePoint[]>([])
  const [servicesSeries, setServicesSeries] = useState<ServicePoint[]>([])
  const [appointmentsByDay, setAppointmentsByDay] = useState<DayPoint[]>([])
  const [appointmentsByHour, setAppointmentsByHour] = useState<HourPoint[]>([])
  const [funnel, setFunnel] = useState<FunnelPoint[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])

  useEffect(() => {
    const load = async () => {
      const [{ data: appointments }, { data: clients }] = await Promise.all([
        supabase.from('appointments').select('record_id,date,status,price,service_name,clientName').order('date', { ascending: false }).limit(4000),
        supabase.from('clients_tg').select('tg_id,name,first_name,last_name,created_at').order('created_at', { ascending: false }).limit(1000),
      ])

      const appts = appointments || []
      const cls = clients || []

      setRevenueSeries(computeRevenueSeries(appts))
      setServicesSeries(computeServices(appts))
      setAppointmentsByDay(computeByWeekday(appts))
      setAppointmentsByHour(computeByHour(appts))
      setFunnel(computeFunnel(appts))
      setActivity(computeActivity(appts, cls))
      setLoading(false)
    }

    load()

    const apptCh = supabase
      .channel('realtime_platform_appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load)
      .subscribe()

    const clientCh = supabase
      .channel('realtime_platform_clients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients_tg' }, load)
      .subscribe()

    return () => {
      supabase.removeChannel(apptCh)
      supabase.removeChannel(clientCh)
    }
  }, [])

  return { loading, revenueSeries, servicesSeries, appointmentsByDay, appointmentsByHour, funnel, activity }
}
