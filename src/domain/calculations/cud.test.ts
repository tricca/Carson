import { describe, expect, it } from 'vitest'
import type { Payment, QuarterlyContribution, ThirteenthMonth } from '../types'
import { calcolaCud } from './cud'

function payment(month: number, amount: number, year = 2025): Payment {
  return {
    id: `p-${month}`,
    periodYear: year,
    periodMonth: month,
    hoursWorked: amount / 10,
    hourlyRate: 10,
    amountDue: amount,
    status: 'pagato',
    paidAt: `${year}-${String(month).padStart(2, '0')}-01`,
    attachmentIds: [],
    updatedAt: '2025-01-01T00:00:00.000Z',
  }
}

function contribution(quarter: 1 | 2 | 3 | 4, amountWorker: number, year = 2025): QuarterlyContribution {
  return {
    id: `c-${quarter}`,
    year,
    quarter,
    dueDate: `${year}-01-10`,
    periodHours: 10,
    regime: 'fino_24h',
    amountTotal: amountWorker * 4,
    amountEmployer: amountWorker * 3,
    amountWorker,
    cuafExcluded: false,
    status: 'pagato',
    paidAt: `${year}-01-10`,
    attachmentIds: [],
    updatedAt: '2025-01-01T00:00:00.000Z',
  }
}

describe('calcolaCud', () => {
  it('somma pagamenti + tredicesima come lorda, sottrae solo la quota lavoratrice dei contributi', () => {
    const payments = [payment(1, 100), payment(2, 100)]
    const thirteenthMonth: ThirteenthMonth[] = [
      { id: 't1', year: 2025, amountAccrued: 50, status: 'pagato', paidAt: '2025-12-13', attachmentIds: [], updatedAt: '2025-01-01T00:00:00.000Z' },
    ]
    const quarterlyContributions = [contribution(1, 10), contribution(2, 15)]

    const risultato = calcolaCud(payments, thirteenthMonth, quarterlyContributions, 2025)
    expect(risultato.retribuzioneLorda).toBeCloseTo(250, 6)
    expect(risultato.contributiTrattenuti).toBeCloseTo(25, 6)
    expect(risultato.retribuzioneNetta).toBeCloseTo(225, 6)
  })

  it('ignora dati di anni diversi', () => {
    const payments = [payment(1, 100, 2025), payment(1, 999, 2024)]
    const risultato = calcolaCud(payments, [], [], 2025)
    expect(risultato.retribuzioneLorda).toBe(100)
  })
})
