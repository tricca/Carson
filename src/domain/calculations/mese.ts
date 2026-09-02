import type { RateHistoryEntry, TimeEntry } from '../types'
import { getRateAt } from './rates'
import { PAID_TYPES } from './common'

function entriesDelMese(entries: TimeEntry[], year: number, month: number): TimeEntry[] {
  const key = `${year}-${String(month).padStart(2, '0')}`
  return entries.filter((e) => PAID_TYPES.has(e.type) && e.date.startsWith(key))
}

export function oreMeseRetribuite(entries: TimeEntry[], year: number, month: number): number {
  return entriesDelMese(entries, year, month).reduce((sum, e) => sum + e.hours, 0)
}

export function maturatoMese(entries: TimeEntry[], rateHistory: RateHistoryEntry[], year: number, month: number): number {
  return entriesDelMese(entries, year, month).reduce((sum, e) => sum + e.hours * getRateAt(rateHistory, e.date).hourlyRate, 0)
}
