'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export interface YclientsMaster {
  id: string
  name: string
  specialization: string
}

export function useYclientsMasters() {
  const [masters, setMasters] = useState<YclientsMaster[]>([])

  const fetchMasters = async () => {
    const { data, error } = await supabase
      .from('masters')
      .select('id, name, specialization')
      .order('id', { ascending: true })

    if (error) {
      console.error('useYclientsMasters error:', error.message)
      return
    }

    setMasters(
      (data || []).map((row: any) => ({
        id: String(row.id),
        name: String(row.name || '').trim() || 'Без имени',
        specialization: String(row.specialization || '').trim() || 'Без должности',
      })),
    )
  }

  useEffect(() => {
    fetchMasters()

    const ch = supabase
      .channel('masters_yclients_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'masters' }, fetchMasters)
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [])

  return { masters }
}
