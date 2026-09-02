import { describe, expect, it } from 'vitest'
import type { Payment, RateHistoryEntry, TimeEntry } from '../types'
import { proposteRetribuzione } from './paymentProposals'

const rateHistory: RateHistoryEntry[] = [
  { id: 'r1', hourlyRate: 8.5, weeklyContractHours: 20, contractDaysPerWeek: 5, validFrom: '2026-01-01', validTo: null },
]

function entry(id: string, date: string, hours: number, type: TimeEntry['type'] = 'pulizia'): TimeEntry {
  return { id, date, type, hours, updatedAt: '2026-01-01T00:00:00.000Z' }
}

function payment(overrides: Partial<Payment>): Payment {
  return {
    id: 'p',
    periodYear: 2026,
    periodMonth: 8,
    hoursWorked: 0,
    hourlyRate: 8.5,
    amountDue: 0,
    status: 'da_pagare',
    paidAt: null,
    attachmentIds: [],
    coveredEntryIds: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('proposteRetribuzione', () => {
  it('propone un mese con ore registrate e nessun pagamento, con il totale reale', () => {
    const e1 = entry('e1', '2026-09-01', 3)
    const proposte = proposteRetribuzione([e1], rateHistory, [])
    expect(proposte).toEqual([
      { year: 2026, month: 9, category: 'lavoro', hours: 3, amount: 25.5, rate: 8.5, entries: [e1], existingPaymentsInMonth: 0 },
    ])
  })

  it('non ripropone una voce già coperta da un pagamento', () => {
    const entries = [entry('e1', '2026-09-01', 3)]
    const payments = [payment({ id: 'p1', periodMonth: 9, coveredEntryIds: ['e1'] })]
    expect(proposteRetribuzione(entries, rateHistory, payments)).toEqual([])
  })

  it('segnala le ore aggiunte dopo un pagamento già registrato per lo stesso mese (più pagamenti nello stesso mese)', () => {
    const e1 = entry('e1', '2026-08-05', 20)
    const e2 = entry('e2', '2026-08-20', 17, 'ferie')
    const payments = [payment({ id: 'p1', periodMonth: 8, coveredEntryIds: ['e1'] })]
    const proposte = proposteRetribuzione([e1, e2], rateHistory, payments)
    expect(proposte).toHaveLength(1)
    expect(proposte[0]).toMatchObject({ year: 2026, month: 8, category: 'ferie', hours: 17, existingPaymentsInMonth: 1 })
    expect(proposte[0].entries.map((e) => e.id)).toEqual(['e2'])
  })

  it('separa lavoro e ferie dello stesso mese in due proposte distinte', () => {
    const entries = [entry('e1', '2026-08-05', 20, 'pulizia'), entry('e2', '2026-08-20', 17, 'ferie')]
    const proposte = proposteRetribuzione(entries, rateHistory, [])
    expect(proposte).toHaveLength(2)
    expect(proposte.map((p) => p.category).sort()).toEqual(['ferie', 'lavoro'])
  })

  it('tratta un pagamento senza coveredEntryIds (creato prima del tracciamento) come se coprisse tutto ciò che esisteva già a quel momento', () => {
    const vecchia = entry('e1', '2026-08-05', 20)
    vecchia.updatedAt = '2026-08-06T00:00:00.000Z'
    const payments = [payment({ id: 'p1', periodMonth: 8, coveredEntryIds: undefined, updatedAt: '2026-08-10T00:00:00.000Z' })]
    expect(proposteRetribuzione([vecchia], rateHistory, payments)).toEqual([])
  })

  it('segnala comunque le ore aggiunte dopo un pagamento legacy (senza coveredEntryIds)', () => {
    const vecchia = entry('e1', '2026-08-05', 20)
    vecchia.updatedAt = '2026-08-06T00:00:00.000Z'
    const nuova = entry('e2', '2026-08-25', 17, 'ferie')
    nuova.updatedAt = '2026-08-26T00:00:00.000Z'
    const payments = [payment({ id: 'p1', periodMonth: 8, coveredEntryIds: undefined, updatedAt: '2026-08-10T00:00:00.000Z' })]
    const proposte = proposteRetribuzione([vecchia, nuova], rateHistory, payments)
    expect(proposte).toHaveLength(1)
    expect(proposte[0].entries.map((e) => e.id)).toEqual(['e2'])
  })

  it('ordina le proposte dal mese più recente', () => {
    const entries = [entry('e1', '2026-07-01', 2), entry('e2', '2026-09-01', 3), entry('e3', '2026-08-01', 1)]
    const proposte = proposteRetribuzione(entries, rateHistory, [])
    expect(proposte.map((p) => p.month)).toEqual([9, 8, 7])
  })

  it('nessuna proposta se non ci sono ore retribuite', () => {
    expect(proposteRetribuzione([], rateHistory, [])).toEqual([])
  })
})
