'use client'
import { useEffect, useState } from 'react'
import { supabase, ORG_UID } from '../supabase'

export interface SystemState {
  id: string
  system_code: string
  name: string
  description: string
  enabled: boolean
  updated_at: string
}

export const DEFAULT_SYSTEMS: SystemState[] = [
  { id: '1', system_code: 'main_agent',         name: 'Основной агент',       description: 'Обработка входящих обращений и запись клиентов',      enabled: true,  updated_at: '' },
  { id: '2', system_code: 'vozvrat_klienta',    name: 'Возврат клиента',      description: 'Авторассылка клиентам, не посещавшим более 50 дней',  enabled: false, updated_at: '' },
  { id: '3', system_code: 'blagodarnost',       name: 'Благодарность',        description: 'Запрос отзыва и чаевых после визита',                 enabled: true,  updated_at: '' },
  { id: '4', system_code: 'napominaniya',       name: 'Напоминания',          description: 'Поэтапное подтверждение записи (24ч, 2ч, 1ч)',        enabled: true,  updated_at: '' },
  { id: '5', system_code: 'otchetnost',         name: 'Отчётность',           description: 'Еженедельный отчёт владельцу',                        enabled: true,  updated_at: '' },
  { id: '6', system_code: 'avto_sdvig',         name: 'Авто-сдвиг',          description: 'Предложить более раннее время при появлении окна',    enabled: false, updated_at: '' },
  { id: '7', system_code: 'doprodazha',         name: 'Допродажа',            description: 'Смежные услуги после записи',                         enabled: false, updated_at: '' },
  { id: '8', system_code: 'analitika_otmeny',   name: 'Аналитика отмены',     description: 'Уточнение причины отмены или неявки',                 enabled: true,  updated_at: '' },
  { id: '9', system_code: 'obrabotchik_otzyvov',name: 'Обработчик отзывов',   description: 'Автоответы на отзывы + уведомление администратора',   enabled: false, updated_at: '' },
]

export function useSystemStates() {
  const [systems, setSystems] = useState<SystemState[]>(DEFAULT_SYSTEMS)

  useEffect(() => {
    supabase.from('system_states').select('*').eq('org_uid', ORG_UID).order('name')
      .then(({ data }) => { if (data?.length) setSystems(data) })

    const ch = supabase.channel('system_states_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_states' },
        (p) => {
          if (p.eventType === 'UPDATE') setSystems(prev => prev.map(s => s.id === (p.new as any).id ? p.new as SystemState : s))
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  return { systems, setSystems }
}
