'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export interface Appointment {
  id: string
  client: string
  service: string
  master: string
  date: string
  time: string
  duration: string
  price: number
  status: string
  phone: string
  rawDate: string | null
}

// Map yclients / raw statuses → display
const STATUS_MAP: Record<string, string> = {
  visit_timed:   'Ожидание',
  wait:          'Ожидание',
  confirmed:     'Подтверждено',
  arrived:       'Завершено',
  not_appeared:  'Не пришёл',
  canceled:      'Отменено',
  Подтверждено:  'Подтверждено',
  Ожидание:      'Ожидание',
  Отменено:      'Отменено',
  Завершено:     'Завершено',
}

function parseDateTime(dateStr: string | null): { date: string; time: string } {
  if (!dateStr) return { date: '—', time: '' }
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return {
        date: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      }
    }
    // fallback: Russian format "DD.MM.YYYY HH:mm"
    const parts = dateStr.split(' ')
    return { date: parts[0] || dateStr, time: parts[1] || '' }
  } catch {
    return { date: dateStr, time: '' }
  }
}

function mapRow(row: any): Appointment {
  const { date, time } = parseDateTime(row.date)
  const rawStatus = (row.status || '').trim()
  return {
    id: String(row.record_id),
    client: row.clientName || '—',
    service: row.service_name || '—',
    master: row.master_name || '—',
    date,
    time,
    duration: row.duration_min ? `${row.duration_min} мин` : '—',
    price: Number(row.price) || 0,
    status: STATUS_MAP[rawStatus] || rawStatus || 'Ожидание',
    phone: row.phone || '',
    rawDate: row.date,
  }
}

export function useAppointments(limit = 300) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAppointments = async () => {
    const { data, error: err } = await supabase
      .from('appointments')
      .select('record_id, status, service_name, master_name, date, duration_min, price, clientName, phone')
      .order('date', { ascending: false })
      .limit(limit)

    if (err) {
      console.error('useAppointments error:', err.message)
      setError(err.message)
    } else {
      setAppointments((data || []).map(mapRow))
      setError(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAppointments()
    const ch = supabase
      .channel('appointments_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAppointments)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { appointments, loading, error }
}
