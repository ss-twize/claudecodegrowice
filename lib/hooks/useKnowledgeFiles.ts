'use client'
import { useEffect, useState } from 'react'
import { supabase, ORG_UID } from '../supabase'

export interface KnowledgeFile {
  id: string
  name: string
  file_type: string
  storage_url: string
  drive_url?: string
  status: string
  created_at: string
}

export function useKnowledgeFiles() {
  const [files, setFiles] = useState<KnowledgeFile[]>([])

  useEffect(() => {
    supabase.from('knowledge_files').select('*').eq('org_uid', ORG_UID).order('created_at', { ascending: false })
      .then(({ data }) => { if (data?.length) setFiles(data) })

    const ch = supabase.channel('knowledge_files_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_files' },
        (p) => {
          if (p.eventType === 'INSERT') setFiles(prev => [p.new as KnowledgeFile, ...prev])
          if (p.eventType === 'UPDATE') setFiles(prev => prev.map(f => f.id === (p.new as any).id ? p.new as KnowledgeFile : f))
          if (p.eventType === 'DELETE') setFiles(prev => prev.filter(f => f.id !== (p.old as any).id))
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  return { files, setFiles }
}
