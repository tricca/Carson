import { describe, expect, it } from 'vitest'
import type { ContributionRateTable, RateHistoryEntry, TimeEntry } from '../types'
import { calcolaContributoTrimestrale, determinaRegime, quarterRange } from './contributi'

const rateHistory: RateHistoryEntry[] = [
  { id: 'r1', hourlyRate: 8, weeklyContractHours: 20, contractDaysPerWeek: 5, validFrom: '2026-01-01', validTo: null },
]

const rateTables: ContributionRateTable[] = [
  {
    id: 't1',
    validFrom: '2026-01-01',
    validTo: null,
    regimeFino24h: [
      { minHourlyPay: 0, maxHourlyPay: 8, fixedAmountPerHour: 1.0 },
      { minHourlyPay: 8, maxHourlyPay: 9.53, fixedAmountPerHour: 1.5 },
      { minHourlyPay: 9.53, maxHourlyPay: null, fixedAmountPerHour: 2.0 },
    ],
    regimeOltre24h: { fixedAmountPerHour: 1.2 },
    employerShareRatio: 0.75,
    sourceNote: 'Valori di test',
    inpsLink: 'https://www.inps.it',
  },
]

describe('determinaRegime', () => {
  it('fino a 24h/settimana -> fino_24h', () => {
    expect(determinaRegime(24)).toBe('fino_24h')
  })
  it('oltre 24h/settimana -> oltre_24h', () => {
    expect(determinaRegime(30)).toBe('oltre_24h')
  })
})

describe('quarterRange', () => {
  it('calcola le scadenze fisse del trimestre', () => {
    expect(quarterRange(2026, 3).dueDate).toBe('2026-10-10')
    expect(quarterRange(2026, 4).dueDate).toBe('2027-01-10')
  })
})

describe('calcolaContributoTrimestrale', () => {
  it('applica la fascia corretta su paga oraria effettiva (paga + rateo 13esima)', () => {
    const entries: TimeEntry[] = [
      { id: 'e1', date: '2026-01-10', type: 'pulizia', hours: 8, updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'e2', date: '2026-02-10', type: 'pulizia', hours: 8, updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'e3', date: '2026-03-10', type: 'pulizia', hours: 8, updatedAt: '2026-01-01T00:00:00.000Z' },
    ]
    // paga oraria effettiva = 8 + 8/12 = 8.667 -> fascia [8, 9.53) -> 1.5 €/h
    const risultato = calcolaContributoTrimestrale(entries, rateHistory, rateTables, 2026, 1)
    expect(risultato.periodHours).toBe(24)
    expect(risultato.regime).toBe('fino_24h')
    expect(risultato.fixedAmountPerHour).toBeCloseTo(1.5, 6)
    expect(risultato.amountTotal).toBeCloseTo(36, 6)
    expect(risultato.amountEmployer).toBeCloseTo(27, 6)
    expect(risultato.amountWorker).toBeCloseTo(9, 6)
  })

  it('nel regime oltre 24h/settimana applica un\'aliquota unica indipendente dalla fascia', () => {
    const rateHistoryOltre24: RateHistoryEntry[] = [
      { id: 'r2', hourlyRate: 8, weeklyContractHours: 30, contractDaysPerWeek: 5, validFrom: '2026-01-01', validTo: null },
    ]
    const entries: TimeEntry[] = [
      { id: 'e1', date: '2026-01-10', type: 'pulizia', hours: 10, updatedAt: '2026-01-01T00:00:00.000Z' },
    ]
    const risultato = calcolaContributoTrimestrale(entries, rateHistoryOltre24, rateTables, 2026, 1)
    expect(risultato.regime).toBe('oltre_24h')
    expect(risultato.fixedAmountPerHour).toBeCloseTo(1.2, 6)
    expect(risultato.amountTotal).toBeCloseTo(12, 6)
  })
})
