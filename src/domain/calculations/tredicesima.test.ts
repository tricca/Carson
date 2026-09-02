import { describe, expect, it } from 'vitest'
import type { RateHistoryEntry, TimeEntry } from '../types'
import { calcolaTredicesima } from './tredicesima'

function entry(date: string, hours: number, type: TimeEntry['type'] = 'pulizia'): TimeEntry {
  return { id: date, date, type, hours, updatedAt: '2026-01-01T00:00:00.000Z' }
}

describe('calcolaTredicesima', () => {
  it('con tariffa fissa per tutto l\'anno: (ore totali × tariffa) / 12', () => {
    const rateHistory: RateHistoryEntry[] = [
      { id: 'r1', hourlyRate: 10, weeklyContractHours: 24, contractDaysPerWeek: 5, validFrom: '2026-01-01', validTo: null },
    ]
    const entries: TimeEntry[] = Array.from({ length: 12 }, (_, i) =>
      entry(`2026-${String(i + 1).padStart(2, '0')}-15`, 80),
    )
    expect(calcolaTredicesima(entries, rateHistory, 2026)).toBeCloseTo((80 * 10 * 12) / 12, 6)
  })

  it('con cambio tariffa a metà anno usa la tariffa vigente al momento di ciascuna ora', () => {
    const rateHistory: RateHistoryEntry[] = [
      { id: 'r1', hourlyRate: 10, weeklyContractHours: 24, contractDaysPerWeek: 5, validFrom: '2026-01-01', validTo: '2026-06-30' },
      { id: 'r2', hourlyRate: 12, weeklyContractHours: 24, contractDaysPerWeek: 5, validFrom: '2026-07-01', validTo: null },
    ]
    const entries: TimeEntry[] = Array.from({ length: 12 }, (_, i) =>
      entry(`2026-${String(i + 1).padStart(2, '0')}-15`, 80),
    )
    const attesa = (6 * 80 * 10 + 6 * 80 * 12) / 12
    expect(calcolaTredicesima(entries, rateHistory, 2026)).toBeCloseTo(attesa, 6)
  })

  it('somma ore di tipo diverso (pulizia, stiro, ferie, malattia) allo stesso modo', () => {
    const rateHistory: RateHistoryEntry[] = [
      { id: 'r1', hourlyRate: 10, weeklyContractHours: 24, contractDaysPerWeek: 5, validFrom: '2026-01-01', validTo: null },
    ]
    const entries: TimeEntry[] = [
      entry('2026-01-10', 40, 'pulizia'),
      entry('2026-01-20', 40, 'stiro'),
    ]
    expect(calcolaTredicesima(entries, rateHistory, 2026)).toBeCloseTo((80 * 10) / 12, 6)
  })

  it('ignora ore di anni diversi da quello richiesto', () => {
    const rateHistory: RateHistoryEntry[] = [
      { id: 'r1', hourlyRate: 10, weeklyContractHours: 24, contractDaysPerWeek: 5, validFrom: '2025-01-01', validTo: null },
    ]
    const entries: TimeEntry[] = [entry('2025-12-31', 80), entry('2026-01-01', 80)]
    expect(calcolaTredicesima(entries, rateHistory, 2026)).toBeCloseTo((80 * 10) / 12, 6)
  })
})
