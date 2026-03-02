'use client'
import { useEffect, useState } from 'react'
import { supabase, ORG_UID } from '../supabase'

export interface MapRating {
  id: string
  source: 'яндекс' | '2гис'
  rating: number
  reviews_count: number
  updated_at: string
}

const FALLBACK: MapRating[] = [
  { id: '1', source: 'яндекс', rating: 4.8, reviews_count: 127, updated_at: '' },
  { id: '2', source: '2гис',   rating: 4.9, reviews_count: 89,  updated_at: '' },
]

export function useMapRatings() {
  const [ratings, setRatings] = useState<MapRating[]>(FALLBACK)

  useEffect(() => {
    supabase.from('map_ratings').select('*').eq('org_uid', ORG_UID)
      .then(({ data }) => { if (data?.length) setRatings(data) })

    const ch = supabase.channel('map_ratings_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_ratings' },
        (p) => {
          if (p.eventType === 'INSERT') setRatings(prev => [...prev, p.new as MapRating])
          if (p.eventType === 'UPDATE') setRatings(prev => prev.map(r => r.id === (p.new as any).id ? p.new as MapRating : r))
          if (p.eventType === 'DELETE') setRatings(prev => prev.filter(r => r.id !== (p.old as any).id))
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  return ratings
}
