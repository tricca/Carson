import { eachWeekOfInterval, endOfMonth, endOfWeek, startOfMonth } from 'date-fns'
import type { TimeEntry } from '../types'
import { PAID_TYPES } from './common'
import { toLocalIsoDate } from '../format'

export interface SettimanaLavorata {
  weekStart: string
  weekEnd: string
  worked: boolean
  hours: number
}

/** Elenca le settimane (lun-dom) che intersecano il mese, con ore lavorate in ciascuna. */
export function settimaneMese(timeEntries: TimeEntry[], year: number, month: number): SettimanaLavorata[] {
  const monthStart = startOfMonth(new Date(year, month - 1, 1))
  const monthEnd = endOfMonth(monthStart)
  const weekStarts = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 })

  return weekStarts.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    const startIso = toLocalIsoDate(weekStart)
    const endIso = toLocalIsoDate(weekEnd)
    const hours = timeEntries
      .filter((e) => PAID_TYPES.has(e.type) && e.date >= startIso && e.date <= endIso)
      .reduce((sum, e) => sum + e.hours, 0)
    return { weekStart: startIso, weekEnd: endIso, worked: hours > 0, hours }
  })
}
