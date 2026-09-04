import type { ContributionRateEntry, Payment, QuarterlyContribution, ThirteenthMonth } from '../types'
import { tryGetContributionRateAt } from './contributionRates'
import { quarterRange } from './contributi'

/** Sotto questa soglia una differenza si considera arrotondamento, non un'incongruenza reale. */
const TOLLERANZA_EURO = 0.01

export interface CudDati {
  anno: number
  retribuzioneLorda: number
  retribuzioneLordaPrevisionale: number
  contributiTrattenuti: number
  contributiTrattenutiPrevisionale: number
  retribuzioneNetta: number
}

/**
 * Dati per la dichiarazione sostitutiva del CUD di un anno: retribuzione lorda (pagamenti
 * mensili/ferie + tredicesima dell'anno), contributi previdenziali trattenuti (quota
 * lavoratrice dei 4 trimestri, l'unica che riduce la retribuzione ai fini di questo
 * documento — la quota datore è un costo aggiuntivo, non una trattenuta) e la netta di
 * conseguenza.
 *
 * Accanto ai valori realmente registrati (che possono includere conguagli, arrotondamenti
 * o correzioni manuali — es. "5€ dimenticati il mese scorso") calcola anche il valore
 * previsionale a formula (ore × tariffa/importo contributivo in vigore), per far emergere
 * eventuali incongruenze prima di usare il testo.
 */
export function calcolaCud(
  payments: Payment[],
  thirteenthMonth: ThirteenthMonth[],
  quarterlyContributions: QuarterlyContribution[],
  contributionRateHistory: ContributionRateEntry[],
  anno: number,
): CudDati {
  const pagamentiAnno = payments.filter((p) => p.periodYear === anno)
  const totalePagamenti = pagamentiAnno.reduce((sum, p) => sum + p.amountDue, 0)
  const totalePagamentiPrevisionale = pagamentiAnno.reduce((sum, p) => sum + p.hoursWorked * p.hourlyRate, 0)

  const tredicesima = thirteenthMonth
    .filter((t) => t.year === anno)
    .reduce((sum, t) => sum + t.amountAccrued, 0)

  const retribuzioneLorda = totalePagamenti + tredicesima
  const retribuzioneLordaPrevisionale = totalePagamentiPrevisionale + tredicesima

  const contributiAnno = quarterlyContributions.filter((c) => c.year === anno)
  const contributiTrattenuti = contributiAnno.reduce((sum, c) => sum + c.amountWorker, 0)
  const contributiTrattenutiPrevisionale = contributiAnno.reduce((sum, c) => {
    // Stessa data usata da calcolaContributoTrimestrale (fine trimestre, non scadenza):
    // per il 4° trimestre la scadenza cade a gennaio dell'anno successivo e prenderebbe
    // l'importo contributivo sbagliato se già cambiato a capodanno.
    const rate = tryGetContributionRateAt(contributionRateHistory, quarterRange(c.year, c.quarter).end)
    return sum + (rate ? c.periodHours * rate.workerAmountPerHour : c.amountWorker)
  }, 0)

  return {
    anno,
    retribuzioneLorda,
    retribuzioneLordaPrevisionale,
    contributiTrattenuti,
    contributiTrattenutiPrevisionale,
    retribuzioneNetta: retribuzioneLorda - contributiTrattenuti,
  }
}

export function incongruenza(registrato: number, previsionale: number): boolean {
  return Math.abs(registrato - previsionale) > TOLLERANZA_EURO
}
