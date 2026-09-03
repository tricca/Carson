import { describe, expect, it } from 'vitest'
import type { ContributionRateEntry, QuarterlyContribution, RateHistoryEntry, TimeEntry } from '../types'
import { calcolaContributoTrimestrale, determinaRegime, proposteContributiTrimestrali, quarterRange } from './contributi'

const rateHistory: RateHistoryEntry[] = [
  { id: 'r1', hourlyRate: 8, weeklyContractHours: 20, contractDaysPerWeek: 5, validFrom: '2026-01-01', validTo: null },
]

const contributionRateHistory: ContributionRateEntry[] = [
  { id: 'c1', employerAmountPerHour: 0.9, workerAmountPerHour: 0.3, validFrom: '2026-01-01', validTo: null },
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
  it('moltiplica le ore del trimestre per l\'importo contributivo orario impostato', () => {
    const entries: TimeEntry[] = [
      { id: 'e1', date: '2026-01-10', type: 'pulizia', hours: 8, updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'e2', date: '2026-02-10', type: 'pulizia', hours: 8, updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'e3', date: '2026-03-10', type: 'pulizia', hours: 8, updatedAt: '2026-01-01T00:00:00.000Z' },
    ]
    const risultato = calcolaContributoTrimestrale(entries, rateHistory, contributionRateHistory, 2026, 1)
    expect(risultato.periodHours).toBe(24)
    expect(risultato.regime).toBe('fino_24h')
    expect(risultato.fixedAmountPerHour).toBeCloseTo(1.2, 6)
    expect(risultato.amountEmployer).toBeCloseTo(21.6, 6)
    expect(risultato.amountWorker).toBeCloseTo(7.2, 6)
    expect(risultato.amountTotal).toBeCloseTo(28.8, 6)
  })

  it('usa l\'importo in vigore alla data del trimestre, non quello più recente', () => {
    const storico: ContributionRateEntry[] = [
      { id: 'c1', employerAmountPerHour: 0.9, workerAmountPerHour: 0.3, validFrom: '2026-01-01', validTo: '2026-06-30' },
      { id: 'c2', employerAmountPerHour: 1.2, workerAmountPerHour: 0.4, validFrom: '2026-07-01', validTo: null },
    ]
    const entries: TimeEntry[] = [{ id: 'e1', date: '2026-02-10', type: 'pulizia', hours: 10, updatedAt: '2026-01-01T00:00:00.000Z' }]
    const risultato = calcolaContributoTrimestrale(entries, rateHistory, storico, 2026, 1)
    expect(risultato.amountEmployer).toBeCloseTo(9, 6)
    expect(risultato.amountWorker).toBeCloseTo(3, 6)
  })

  it('il regime (≤24h / >24h) resta informativo, calcolato dalle ore contrattuali', () => {
    const rateHistoryOltre24: RateHistoryEntry[] = [
      { id: 'r2', hourlyRate: 8, weeklyContractHours: 30, contractDaysPerWeek: 5, validFrom: '2026-01-01', validTo: null },
    ]
    const entries: TimeEntry[] = [
      { id: 'e1', date: '2026-01-10', type: 'pulizia', hours: 10, updatedAt: '2026-01-01T00:00:00.000Z' },
    ]
    const risultato = calcolaContributoTrimestrale(entries, rateHistoryOltre24, contributionRateHistory, 2026, 1)
    expect(risultato.regime).toBe('oltre_24h')
    expect(risultato.amountTotal).toBeCloseTo(12, 6)
  })
})

describe('proposteContributiTrimestrali', () => {
  it('propone un trimestre per ogni (anno, trimestre) con ore reali, incluso il primo dell\'anno', () => {
    const entries: TimeEntry[] = [
      { id: 'e1', date: '2026-01-10', type: 'pulizia', hours: 8, updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'e2', date: '2026-04-10', type: 'pulizia', hours: 8, updatedAt: '2026-01-01T00:00:00.000Z' },
    ]
    const proposte = proposteContributiTrimestrali(entries, rateHistory, contributionRateHistory, [])
    // Ordine decrescente (trimestre più recente prima), coerente col resto dell'app.
    expect(proposte.map((p) => `${p.year}-${p.quarter}`)).toEqual(['2026-2', '2026-1'])
    expect(proposte[0].periodHours).toBe(8)
  })

  it('salta un trimestre che ha già un record salvato, anche se le ore reali sono diverse', () => {
    const entries: TimeEntry[] = [
      { id: 'e1', date: '2026-01-10', type: 'pulizia', hours: 8, updatedAt: '2026-01-01T00:00:00.000Z' },
    ]
    const esistente: QuarterlyContribution = {
      id: 'q1',
      year: 2026,
      quarter: 1,
      dueDate: '2026-04-10',
      periodHours: 999,
      regime: 'fino_24h',
      amountTotal: 1,
      amountEmployer: 1,
      amountWorker: 0,
      cuafExcluded: false,
      status: 'pagato',
      paidAt: '2026-04-01',
      attachmentIds: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const proposte = proposteContributiTrimestrali(entries, rateHistory, contributionRateHistory, [esistente])
    expect(proposte).toEqual([])
  })

  it('non propone trimestri senza alcuna ora registrata', () => {
    const proposte = proposteContributiTrimestrali([], rateHistory, contributionRateHistory, [])
    expect(proposte).toEqual([])
  })
})
