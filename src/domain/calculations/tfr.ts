import type { RateHistoryEntry, TfrRevaluationRate, TimeEntry } from '../types'
import { calcolaTredicesima } from './tredicesima'

const TFR_DIVISOR = 13.5

/**
 * TFR annuo = (retribuzione annua lorda + rateo tredicesima) / 13,5 (art. 2120 c.c.).
 * Riusa calcolaTredicesima per la retribuzione annua (tredicesima × 12) così le due cifre
 * restano coerenti sotto cambio tariffa a metà anno. Quota "lorda", prima della rivalutazione
 * ISTAT applicata da calcolaTfrRivalutato al fondo degli anni precedenti.
 */
export function calcolaTfrAnno(
  timeEntries: TimeEntry[],
  rateHistory: RateHistoryEntry[],
  year: number,
): number {
  const tredicesima = calcolaTredicesima(timeEntries, rateHistory, year)
  const retribuzioneAnnuaLorda = tredicesima * 12
  return (retribuzioneAnnuaLorda + tredicesima) / TFR_DIVISOR
}

export interface TfrRigaAnno {
  year: number
  /** Quota maturata in quell'anno, prima di qualunque rivalutazione. */
  quota: number
  /** Fondo accantonato all'inizio dell'anno (= fine dell'anno precedente), prima di
   * rivalutazione e quota di quest'anno. */
  fondoIniziale: number
  /** Coefficiente ISTAT applicato al fondo iniziale; null se l'anno è ancora in corso
   * (mai rivalutato) o se per un anno chiuso manca il coefficiente in tfrRevaluationRates. */
  coefficiente: number | null
  /** Fondo a fine anno: fondoIniziale rivalutato (se chiuso e coefficiente noto) + quota. */
  fondoFinale: number
}

export interface TfrRivalutato {
  /** Fondo maturato fino al 31/12 dell'ultimo anno chiuso, rivalutato anno su anno. */
  fondoRivalutato: number
  /** Quota dell'anno in corso, non ancora rivalutabile (il coefficiente ISTAT si conosce solo a fine anno). */
  quotaAnnoCorrente: number
  /** Quanto la rivalutazione ha aggiunto rispetto alla semplice somma delle quote annue. */
  effettoRivalutazione: number
  totale: number
  /** Valori anno per anno usati per arrivare al totale, dal primo anno al corrente incluso. */
  dettaglioAnni: TfrRigaAnno[]
}

/**
 * Applica la rivalutazione ISTAT (art. 2120 c.c.) al fondo TFR: ogni anno chiuso rivaluta il
 * fondo accantonato fino all'anno precedente con il coefficiente ufficiale di quell'anno
 * (1,5% fisso + 75% inflazione FOI), poi vi somma la propria quota (mai rivalutata nell'anno
 * in cui matura). La quota dell'anno in corso resta sempre non rivalutata: il coefficiente
 * definitivo si conosce solo a fine anno, quando pubblicato in `settings.tfrRevaluationRates`.
 */
export function calcolaTfrRivalutato(
  timeEntries: TimeEntry[],
  rateHistory: RateHistoryEntry[],
  revaluationRates: TfrRevaluationRate[] | undefined,
  primoAnno: number,
  annoCorrente: number,
): TfrRivalutato {
  const rates = revaluationRates ?? []
  let fondoRivalutato = 0
  let fondoSenzaRivalutazione = 0
  const dettaglioAnni: TfrRigaAnno[] = []

  for (let year = primoAnno; year < annoCorrente; year++) {
    const quota = calcolaTfrAnno(timeEntries, rateHistory, year)
    const rateEntry = rates.find((r) => r.year === year)
    const fondoIniziale = fondoRivalutato
    fondoRivalutato = fondoRivalutato * (1 + (rateEntry?.rate ?? 0)) + quota
    fondoSenzaRivalutazione += quota
    dettaglioAnni.push({
      year,
      quota,
      fondoIniziale,
      coefficiente: rateEntry?.rate ?? null,
      fondoFinale: fondoRivalutato,
    })
  }

  const quotaAnnoCorrente = calcolaTfrAnno(timeEntries, rateHistory, annoCorrente)
  const totale = fondoRivalutato + quotaAnnoCorrente
  dettaglioAnni.push({
    year: annoCorrente,
    quota: quotaAnnoCorrente,
    fondoIniziale: fondoRivalutato,
    coefficiente: null,
    fondoFinale: totale,
  })

  return {
    fondoRivalutato,
    quotaAnnoCorrente,
    effettoRivalutazione: fondoRivalutato - fondoSenzaRivalutazione,
    totale,
    dettaglioAnni,
  }
}
