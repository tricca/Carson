import type { RateHistoryEntry, TimeEntry } from '../types'
import { getRateAt } from './rates'
import { PAID_TYPES } from './common'

/**
 * tredicesima = (Σ ore retribuite nell'anno × paga oraria vigente al momento di ciascuna ora) / 12.
 * Calcolo per singola voce (non per mese) così un cambio tariffa a metà mese non altera
 * il calcolo delle ore già registrate a tariffa precedente.
 */
export function calcolaTredicesima(
  timeEntries: TimeEntry[],
  rateHistory: RateHistoryEntry[],
  year: number,
): number {
  const entriesAnno = timeEntries.filter(
    (e) => PAID_TYPES.has(e.type) && e.date.startsWith(String(year)),
  )
  const totale = entriesAnno.reduce((sum, e) => {
    const rate = getRateAt(rateHistory, e.date)
    return sum + e.hours * rate.hourlyRate
  }, 0)
  return totale / 12
}
