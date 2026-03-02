'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export type SortDir = 'asc' | 'desc' | null

interface Props {
  label: string
  col: string
  sortCol: string | null
  sortDir: SortDir
  onSort: (col: string) => void
  className?: string
}

export function SortableHeader({ label, col, sortCol, sortDir, onSort, className = '' }: Props) {
  const active = sortCol === col
  return (
    <th
      className={`text-left text-[#7d8590] text-xs font-medium px-5 py-3 whitespace-nowrap cursor-pointer select-none hover:text-[#e6edf3] transition-colors group ${className}`}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {!active && <ChevronsUpDown size={11} className="opacity-30 group-hover:opacity-60 transition-opacity" />}
        {active && sortDir === 'asc' && <ChevronUp size={11} className="text-[#00FF00]" />}
        {active && sortDir === 'desc' && <ChevronDown size={11} className="text-[#00FF00]" />}
      </div>
    </th>
  )
}

export function useSortable<T extends Record<string, any>>(data: T[]) {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  const onSort = (col: string) => {
    if (sortCol !== col) {
      setSortCol(col)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortCol(null)
      setSortDir(null)
    }
  }

  const sorted = useMemo(() => {
    if (!sortCol || !sortDir) return data
    return [...data].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol]
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      const as = String(av), bs = String(bv)
      return sortDir === 'asc' ? as.localeCompare(bs, 'ru') : bs.localeCompare(as, 'ru')
    })
  }, [data, sortCol, sortDir])

  return { sorted, sortCol, sortDir, onSort }
}
