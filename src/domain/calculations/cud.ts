import type { Payment, QuarterlyContribution, ThirteenthMonth } from '../types'

export interface CudDati {
  anno: number
  retribuzioneLorda: number
  contributiTrattenuti: number
  retribuzioneNetta: number
}

/**
 * Dati per la dichiarazione sostitutiva del CUD di un anno: retribuzione lorda (pagamenti
 * mensili/ferie + tredicesima dell'anno), contributi previdenziali trattenuti (quota
 * lavoratrice dei 4 trimestri, l'unica che riduce la retribuzione ai fini di questo
 * documento — la quota datore è un costo aggiuntivo, non una trattenuta) e la netta di
 * conseguenza.
 */
export function calcolaCud(
  payments: Payment[],
  thirteenthMonth: ThirteenthMonth[],
  quarterlyContributions: QuarterlyContribution[],
  anno: number,
): CudDati {
  const totalePagamenti = payments
    .filter((p) => p.periodYear === anno)
    .reduce((sum, p) => sum + p.amountDue, 0)
  const tredicesima = thirteenthMonth
    .filter((t) => t.year === anno)
    .reduce((sum, t) => sum + t.amountAccrued, 0)
  const retribuzioneLorda = totalePagamenti + tredicesima

  const contributiTrattenuti = quarterlyContributions
    .filter((c) => c.year === anno)
    .reduce((sum, c) => sum + c.amountWorker, 0)

  return {
    anno,
    retribuzioneLorda,
    contributiTrattenuti,
    retribuzioneNetta: retribuzioneLorda - contributiTrattenuti,
  }
}
