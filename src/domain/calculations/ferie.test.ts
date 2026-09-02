import { describe, expect, it } from 'vitest'
import type { RateHistoryEntry, TimeEntry, VacationSettings } from '../types'
import { calcolaFerieAnno, calcolaFerieResiduoCumulato } from './ferie'

const rateHistory: RateHistoryEntry[] = [
  { id: 'r1', hourlyRate: 10, weeklyContractHours: 40, contractDaysPerWeek: 5, validFrom: '2026-01-01', validTo: null },
]
const settings: VacationSettings = { annualDays: 26, minDaysToAccrueMonth: 15 }

function workdaysInMonth(year: number, month: number, count: number): TimeEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${year}-${month}-${i}`,
    date: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
    type: 'pulizia' as const,
    hours: 8,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }))
}

describe('calcolaFerieAnno', () => {
  it('matura il rateo mensile in ogni mese sopra soglia: 12 mesi -> 26 giorni/anno', () => {
    const entries = Array.from({ length: 12 }, (_, m) => workdaysInMonth(2026, m + 1, 18)).flat()
    const risultato = calcolaFerieAnno(entries, rateHistory, settings, 2026)
    expect(risultato.daysAccrued).toBeCloseTo(26, 6)
    expect(risultato.valueAccrued).toBeCloseTo(26 * 8 * 10, 6)
  })

  it('non matura il rateo in un mese sotto soglia', () => {
    const entries = [
      ...Array.from({ length: 11 }, (_, m) => workdaysInMonth(2026, m + 1, 18)).flat(),
      ...workdaysInMonth(2026, 12, 10),
    ]
    const risultato = calcolaFerieAnno(entries, rateHistory, settings, 2026)
    expect(risultato.daysAccrued).toBeCloseTo((11 * 26) / 12, 6)
  })

  it('calcola giorni e valore goduti dalle voci di tipo ferie', () => {
    const entries: TimeEntry[] = [
      { id: 'f1', date: '2026-03-10', type: 'ferie', hours: 8, updatedAt: '2026-01-01T00:00:00.000Z' },
    ]
    const risultato = calcolaFerieAnno(entries, rateHistory, settings, 2026)
    expect(risultato.daysTaken).toBeCloseTo(1, 6)
    expect(risultato.valueTaken).toBeCloseTo(80, 6)
  })
})

describe('calcolaFerieResiduoCumulato', () => {
  it('somma il residuo (maturate - godute) su più anni', () => {
    const residuo = calcolaFerieResiduoCumulato([
      { year: 2025, daysAccrued: 26, daysTaken: 20, valueAccrued: 0, valueTaken: 0 },
      { year: 2026, daysAccrued: 13, daysTaken: 0, valueAccrued: 0, valueTaken: 0 },
    ])
    expect(residuo).toBeCloseTo(19, 6)
  })
})
