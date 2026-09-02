import { describe, expect, it } from 'vitest'
import type { RateHistoryEntry } from '../types'
import { addRateChange, dailyHoursAt, getRateAt } from './rates'

const storicoBase: RateHistoryEntry[] = [
  { id: 'r1', hourlyRate: 8.5, weeklyContractHours: 20, contractDaysPerWeek: 5, validFrom: '2026-01-01', validTo: null },
]

describe('getRateAt', () => {
  it('trova la tariffa valida per una data', () => {
    expect(getRateAt(storicoBase, '2026-06-15').hourlyRate).toBe(8.5)
  })

  it('lancia un errore se nessuna tariffa copre la data', () => {
    expect(() => getRateAt(storicoBase, '2025-12-31')).toThrow()
  })
})

describe('dailyHoursAt', () => {
  it('calcola le ore giornaliere da ore settimanali / giorni contrattuali', () => {
    expect(dailyHoursAt(storicoBase, '2026-06-15')).toBeCloseTo(4, 6)
  })
})

describe('addRateChange', () => {
  it('chiude la tariffa corrente e ne apre una nuova', () => {
    const risultato = addRateChange(storicoBase, {
      hourlyRate: 9,
      weeklyContractHours: 20,
      contractDaysPerWeek: 5,
      validFrom: '2026-07-01',
    })
    expect(risultato).toHaveLength(2)
    expect(risultato[0].validTo).toBe('2026-06-30')
    expect(risultato[1]).toMatchObject({ hourlyRate: 9, validFrom: '2026-07-01', validTo: null })
  })

  it('non altera il calcolo sui mesi precedenti alla modifica', () => {
    const risultato = addRateChange(storicoBase, {
      hourlyRate: 9,
      weeklyContractHours: 20,
      contractDaysPerWeek: 5,
      validFrom: '2026-07-01',
    })
    expect(getRateAt(risultato, '2026-06-15').hourlyRate).toBe(8.5)
    expect(getRateAt(risultato, '2026-07-15').hourlyRate).toBe(9)
  })

  it('rifiuta una nuova tariffa che non inizia dopo quella in vigore', () => {
    expect(() =>
      addRateChange(storicoBase, {
        hourlyRate: 9,
        weeklyContractHours: 20,
        contractDaysPerWeek: 5,
        validFrom: '2026-01-01',
      }),
    ).toThrow()
  })

  it('funziona anche a partire da uno storico vuoto', () => {
    const risultato = addRateChange([], {
      hourlyRate: 8,
      weeklyContractHours: 20,
      contractDaysPerWeek: 5,
      validFrom: '2026-01-01',
    })
    expect(risultato).toHaveLength(1)
    expect(risultato[0].validTo).toBeNull()
  })
})
