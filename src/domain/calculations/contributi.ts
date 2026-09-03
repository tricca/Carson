import type { TimeEntry, RateHistoryEntry, ContributionRateEntry, ContributionRegime, QuarterlyContribution } from '../types'
import { getRateAt } from './rates'
import { getContributionRateAt } from './contributionRates'
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

export interface ContributoTrimestrale {
  periodHours: number
  regime: ContributionRegime
  fixedAmountPerHour: number
  amountTotal: number
  amountEmployer: number
  amountWorker: number
}

/**
 * Applica l'importo contributivo orario impostato manualmente dall'utente (quota datore +
 * quota lavoratrice per ora, in ContributionRateEntry) al numero di ore date. Isolata da
 * calcolaContributoTrimestrale così la UI può richiamarla con un monte ore corretto a mano
 * (es. in fase di registrazione versamento) senza dover ripassare da timeEntries/date.
 */
export function calcolaContributoDaOre(
  periodHours: number,
  contributionRate: ContributionRateEntry,
  weeklyContractHours: number,
): ContributoTrimestrale {
  const amountEmployer = periodHours * contributionRate.employerAmountPerHour
  const amountWorker = periodHours * contributionRate.workerAmountPerHour
  return {
    periodHours,
    regime: determinaRegime(weeklyContractHours),
    fixedAmountPerHour: contributionRate.employerAmountPerHour + contributionRate.workerAmountPerHour,
    amountTotal: amountEmployer + amountWorker,
    amountEmployer,
    amountWorker,
  }
}

export function calcolaContributoTrimestrale(
  timeEntries: TimeEntry[],
  rateHistory: RateHistoryEntry[],
  contributionRateHistory: ContributionRateEntry[],
  year: number,
  quarter: 1 | 2 | 3 | 4,
): ContributoTrimestrale {
  const range = quarterRange(year, quarter)
  const periodHours = oreTrimestre(timeEntries, range)
  const rate = getRateAt(rateHistory, range.end)
  const contributionRate = getContributionRateAt(contributionRateHistory, range.end)
  return calcolaContributoDaOre(periodHours, contributionRate, rate.weeklyContractHours)
}

export interface ContributoProposta extends ContributoTrimestrale {
  year: number
  quarter: 1 | 2 | 3 | 4
  dueDate: string
}

/**
 * Propone un trimestre per ogni (anno, trimestre) con ore registrate che non ha ancora un
 * QuarterlyContribution salvato — analogo a proposteRetribuzione per i pagamenti mensili:
 * guidato dai dati reali, non da un intervallo di date generato a priori, così un trimestre
 * compare da solo appena ci sono ore, incluso il primo dell'anno.
 */
export function proposteContributiTrimestrali(
  timeEntries: TimeEntry[],
  rateHistory: RateHistoryEntry[],
  contributionRateHistory: ContributionRateEntry[],
  contributions: QuarterlyContribution[],
): ContributoProposta[] {
  const esistenti = new Set(contributions.map((c) => `${c.year}-${c.quarter}`))

  const trimestriConOre = new Set<string>()
  for (const e of timeEntries) {
    if (!PAID_TYPES.has(e.type)) continue
    const year = Number(e.date.slice(0, 4))
    const quarter = Math.floor((Number(e.date.slice(5, 7)) - 1) / 3) + 1
    const key = `${year}-${quarter}`
    if (!esistenti.has(key)) trimestriConOre.add(key)
  }

  return [...trimestriConOre]
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => {
      const [yearStr, quarterStr] = key.split('-')
      const year = Number(yearStr)
      const quarter = Number(quarterStr) as 1 | 2 | 3 | 4
      const calcolato = calcolaContributoTrimestrale(timeEntries, rateHistory, contributionRateHistory, year, quarter)
      return { year, quarter, dueDate: quarterRange(year, quarter).dueDate, ...calcolato }
    })
}

/**
 * Un trimestre "da_pagare" ricalcola sempre ore e importi dalle timeEntries correnti:
 * i valori salvati sono solo l'ultimo snapshot noto e vanno considerati stale finché
 * non risulta pagato. Un trimestre "pagato" resta invece congelato al valore versato.
 */
export function contributoTrimestraleAggiornato(
  contribution: QuarterlyContribution,
  timeEntries: TimeEntry[],
  rateHistory: RateHistoryEntry[],
  contributionRateHistory: ContributionRateEntry[],
): QuarterlyContribution {
  if (contribution.status !== 'da_pagare') return contribution

  const calcolato = calcolaContributoTrimestrale(
    timeEntries,
    rateHistory,
    contributionRateHistory,
    contribution.year,
    contribution.quarter,
  )

  return {
    ...contribution,
    periodHours: calcolato.periodHours,
    regime: calcolato.regime,
    amountTotal: calcolato.amountTotal,
    amountEmployer: calcolato.amountEmployer,
    amountWorker: calcolato.amountWorker,
  }
}
