import { describe, expect, it } from 'vitest'
import type { RateHistoryEntry, TfrRevaluationRate, TimeEntry } from '../types'
import { calcolaTfrAnno, calcolaTfrRivalutato } from './tfr'

function entry(date: string, hours: number, type: TimeEntry['type'] = 'pulizia'): TimeEntry {
  return { id: date, date, type, hours, updatedAt: '2026-01-01T00:00:00.000Z' }
}

describe('calcolaTfrAnno', () => {
  it('TFR annuo = (retribuzione annua lorda + rateo tredicesima) / 13,5', () => {
    const rateHistory: RateHistoryEntry[] = [
      { id: 'r1', hourlyRate: 10, weeklyContractHours: 24, contractDaysPerWeek: 5, validFrom: '2026-01-01', validTo: null },
    ]
    const entries: TimeEntry[] = Array.from({ length: 12 }, (_, i) =>
      entry(`2026-${String(i + 1).padStart(2, '0')}-15`, 80),
    )
    const retribuzioneAnnua = 80 * 10 * 12
    const tredicesima = retribuzioneAnnua / 12
    const atteso = (retribuzioneAnnua + tredicesima) / 13.5
    expect(calcolaTfrAnno(entries, rateHistory, 2026)).toBeCloseTo(atteso, 6)
  })

  it('colf a ore livello B, 25h/sett a 7,01€/h: coerente con l\'esempio INPS (731,28 €, a meno di arrotondamenti intermedi)', () => {
    const rateHistory: RateHistoryEntry[] = [
      { id: 'r1', hourlyRate: 7.01, weeklyContractHours: 25, contractDaysPerWeek: 5, validFrom: '2026-01-01', validTo: null },
    ]
    // 25h/settimana x 52 settimane = 1300 ore annue
    const entries: TimeEntry[] = [entry('2026-06-15', 1300)]
    expect(calcolaTfrAnno(entries, rateHistory, 2026)).toBeCloseTo(731.29, 2)
  })

  it('con cambio tariffa a metà anno usa la retribuzione effettivamente maturata', () => {
    const rateHistory: RateHistoryEntry[] = [
      { id: 'r1', hourlyRate: 10, weeklyContractHours: 24, contractDaysPerWeek: 5, validFrom: '2026-01-01', validTo: '2026-06-30' },
      { id: 'r2', hourlyRate: 12, weeklyContractHours: 24, contractDaysPerWeek: 5, validFrom: '2026-07-01', validTo: null },
    ]
    const entries: TimeEntry[] = [entry('2026-03-15', 480), entry('2026-09-15', 480)]
    const retribuzioneAnnua = 480 * 10 + 480 * 12
    const tredicesima = retribuzioneAnnua / 12
    const atteso = (retribuzioneAnnua + tredicesima) / 13.5
    expect(calcolaTfrAnno(entries, rateHistory, 2026)).toBeCloseTo(atteso, 6)
  })
})

describe('calcolaTfrRivalutato', () => {
  const rateHistory: RateHistoryEntry[] = [
    { id: 'r1', hourlyRate: 10, weeklyContractHours: 24, contractDaysPerWeek: 5, validFrom: '2023-01-01', validTo: null },
  ]
  const entriesAnno = (year: number): TimeEntry => entry(`${year}-06-15`, 960)

  it('senza coefficienti disponibili, il fondo si somma senza rivalutazione', () => {
    const entries = [entriesAnno(2023), entriesAnno(2024), entriesAnno(2025)]
    const risultato = calcolaTfrRivalutato(entries, rateHistory, [], 2023, 2025)
    const quotaAnno = calcolaTfrAnno(entries, rateHistory, 2023)
    expect(risultato.fondoRivalutato).toBeCloseTo(quotaAnno * 2, 6)
    expect(risultato.effettoRivalutazione).toBeCloseTo(0, 6)
  })

  it('rivaluta il fondo degli anni chiusi con i coefficienti ufficiali, non la quota dell\'anno in corso', () => {
    const rates: TfrRevaluationRate[] = [
      { year: 2023, rate: 0.01944162 },
      { year: 2024, rate: 0.0232 },
    ]
    const entries = [entriesAnno(2023), entriesAnno(2024), entriesAnno(2025)]
    const risultato = calcolaTfrRivalutato(entries, rateHistory, rates, 2023, 2025)

    const quota = calcolaTfrAnno(entries, rateHistory, 2023)
    // 2023: fondo parte da 0 (nessun fondo pregresso da rivalutare) + quota 2023
    // 2024: (0 + quota2023) rivalutato al tasso 2024 + quota 2024
    const fondoAtteso = quota * 1.0232 + quota
    expect(risultato.fondoRivalutato).toBeCloseTo(fondoAtteso, 6)
    expect(risultato.quotaAnnoCorrente).toBeCloseTo(calcolaTfrAnno(entries, rateHistory, 2025), 6)
    expect(risultato.effettoRivalutazione).toBeGreaterThan(0)
    expect(risultato.totale).toBeCloseTo(risultato.fondoRivalutato + risultato.quotaAnnoCorrente, 6)
  })

  it('un solo anno (in corso, non ancora chiuso): nessun fondo pregresso da rivalutare', () => {
    const entries = [entriesAnno(2023)]
    const risultato = calcolaTfrRivalutato(entries, rateHistory, [], 2023, 2023)
    expect(risultato.fondoRivalutato).toBe(0)
    expect(risultato.quotaAnnoCorrente).toBeCloseTo(calcolaTfrAnno(entries, rateHistory, 2023), 6)
    expect(risultato.totale).toBeCloseTo(risultato.quotaAnnoCorrente, 6)
  })
})
