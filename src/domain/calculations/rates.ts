import type { RateHistoryEntry } from '../types'
import { toLocalIsoDate } from '../format'

export function getRateAt(rateHistory: RateHistoryEntry[], date: string): RateHistoryEntry {
  const match = rateHistory
    .filter((r) => r.validFrom <= date && (r.validTo === null || date <= r.validTo))
    .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))[0]
  if (!match) {
    throw new Error(`Nessuna tariffa valida per la data ${date}`)
  }
  return match
}

export function dailyHoursAt(rateHistory: RateHistoryEntry[], date: string): number {
  const rate = getRateAt(rateHistory, date)
  return rate.weeklyContractHours / rate.contractDaysPerWeek
}

function parseIsoDateLocal(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function dayBefore(iso: string): string {
  const date = parseIsoDateLocal(iso)
  date.setDate(date.getDate() - 1)
  return toLocalIsoDate(date)
}

export interface NewRateInput {
  hourlyRate: number
  weeklyContractHours: number
  contractDaysPerWeek: number
  validFrom: string
}

/**
 * Chiude la tariffa correntemente in vigore (validTo = giorno prima della nuova) e ne
 * aggiunge una nuova aperta (validTo null). Non modifica mai le tariffe passate già
 * chiuse: i calcoli sui mesi precedenti restano invariati anche dopo un aumento.
 */
export function addRateChange(rateHistory: RateHistoryEntry[], input: NewRateInput): RateHistoryEntry[] {
  const currentOpen = rateHistory.find((r) => r.validTo === null)
  if (currentOpen && input.validFrom <= currentOpen.validFrom) {
    throw new Error('La nuova tariffa deve avere una data di inizio successiva a quella in vigore')
  }

  const closedHistory = rateHistory.map((r) =>
    r.validTo === null ? { ...r, validTo: dayBefore(input.validFrom) } : r,
  )

  const newEntry: RateHistoryEntry = {
    id: crypto.randomUUID(),
    hourlyRate: input.hourlyRate,
    weeklyContractHours: input.weeklyContractHours,
    contractDaysPerWeek: input.contractDaysPerWeek,
    validFrom: input.validFrom,
    validTo: null,
  }

  return [...closedHistory, newEntry]
}
