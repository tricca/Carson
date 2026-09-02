import type { TimeEntry, RateHistoryEntry, VacationSettings } from '../types'
import { getRateAt, dailyHoursAt } from './rates'
import { PAID_TYPES as PRESENCE_TYPES } from './common'

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0).getDate()
  return `${monthKey(year, month)}-${String(d).padStart(2, '0')}`
}

export interface FerieAnno {
  year: number
  daysAccrued: number
  daysTaken: number
  valueAccrued: number
  valueTaken: number
}

export function calcolaFerieAnno(
  timeEntries: TimeEntry[],
  rateHistory: RateHistoryEntry[],
  settings: VacationSettings,
  year: number,
): FerieAnno {
  const rateoMensileGiorni = settings.annualDays / 12
  let daysAccrued = 0
  let valueAccrued = 0

  for (let month = 1; month <= 12; month++) {
    const key = monthKey(year, month)
    const giorniPresenza = new Set(
      timeEntries
        .filter((e) => PRESENCE_TYPES.has(e.type) && e.date.startsWith(key))
        .map((e) => e.date),
    ).size

    if (giorniPresenza >= settings.minDaysToAccrueMonth) {
      daysAccrued += rateoMensileGiorni
      const refDate = lastDayOfMonth(year, month)
      const rate = getRateAt(rateHistory, refDate)
      const dailyHours = dailyHoursAt(rateHistory, refDate)
      valueAccrued += rateoMensileGiorni * dailyHours * rate.hourlyRate
    }
  }

  const entriesFerieAnno = timeEntries.filter((e) => e.type === 'ferie' && e.date.startsWith(String(year)))
  let daysTaken = 0
  let valueTaken = 0
  for (const e of entriesFerieAnno) {
    const rate = getRateAt(rateHistory, e.date)
    const dailyHours = dailyHoursAt(rateHistory, e.date)
    daysTaken += e.hours / dailyHours
    valueTaken += e.hours * rate.hourlyRate
  }

  return { year, daysAccrued, daysTaken, valueAccrued, valueTaken }
}

export function calcolaFerieResiduoCumulato(ferieAnni: FerieAnno[]): number {
  return ferieAnni.reduce((sum, f) => sum + (f.daysAccrued - f.daysTaken), 0)
}
