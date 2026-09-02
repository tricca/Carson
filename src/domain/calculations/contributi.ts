import type { TimeEntry, RateHistoryEntry, ContributionRateTable, ContributionRegime } from '../types'
import { getRateAt } from './rates'
import { PAID_TYPES } from './common'

export interface QuarterRange {
  start: string
  end: string
  dueDate: string
}

export function quarterRange(year: number, quarter: 1 | 2 | 3 | 4): QuarterRange {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = startMonth + 2
  const start = `${year}-${String(startMonth).padStart(2, '0')}-01`
  const endDay = new Date(year, endMonth, 0).getDate()
  const end = `${year}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
  const dueDate =
    quarter === 4 ? `${year + 1}-01-10` : `${year}-${String(endMonth + 1).padStart(2, '0')}-10`
  return { start, end, dueDate }
}

export function oreTrimestre(timeEntries: TimeEntry[], range: QuarterRange): number {
  return timeEntries
    .filter((e) => PAID_TYPES.has(e.type) && e.date >= range.start && e.date <= range.end)
    .reduce((sum, e) => sum + e.hours, 0)
}

export function determinaRegime(weeklyContractHours: number): ContributionRegime {
  return weeklyContractHours <= 24 ? 'fino_24h' : 'oltre_24h'
}

export function getRateTableAt(tables: ContributionRateTable[], date: string): ContributionRateTable {
  const match = tables
    .filter((t) => t.validFrom <= date && (t.validTo === null || date <= t.validTo))
    .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))[0]
  if (!match) {
    throw new Error(`Nessuna tabella contributi valida per la data ${date}`)
  }
  return match
}

export interface ContributoTrimestrale {
  periodHours: number
  regime: ContributionRegime
  fixedAmountPerHour: number
  amountTotal: number
  amountEmployer: number
  amountWorker: number
}

/**
 * Retribuzione oraria effettiva ai fini della fascia contributiva: paga oraria + rateo
 * 13esima (1/12) + eventuale vitto/alloggio (non modellato). Il regime >24h/settimana
 * applica un'aliquota unica a tutte le ore, indipendente dalla fascia di paga.
 */
export function calcolaContributoTrimestrale(
  timeEntries: TimeEntry[],
  rateHistory: RateHistoryEntry[],
  rateTables: ContributionRateTable[],
  year: number,
  quarter: 1 | 2 | 3 | 4,
): ContributoTrimestrale {
  const range = quarterRange(year, quarter)
  const periodHours = oreTrimestre(timeEntries, range)
  const rate = getRateAt(rateHistory, range.end)
  const table = getRateTableAt(rateTables, range.end)
  const regime = determinaRegime(rate.weeklyContractHours)

  let fixedAmountPerHour: number
  if (regime === 'oltre_24h') {
    fixedAmountPerHour = table.regimeOltre24h.fixedAmountPerHour
  } else {
    const effectiveHourlyPay = rate.hourlyRate + rate.hourlyRate / 12
    const band = table.regimeFino24h.find(
      (b) => effectiveHourlyPay >= b.minHourlyPay && (b.maxHourlyPay === null || effectiveHourlyPay < b.maxHourlyPay),
    )
    if (!band) {
      throw new Error(`Nessuna fascia contributiva applicabile per paga oraria effettiva ${effectiveHourlyPay}`)
    }
    fixedAmountPerHour = band.fixedAmountPerHour
  }

  const amountTotal = periodHours * fixedAmountPerHour
  const amountEmployer = amountTotal * table.employerShareRatio
  const amountWorker = amountTotal - amountEmployer

  return { periodHours, regime, fixedAmountPerHour, amountTotal, amountEmployer, amountWorker }
}
