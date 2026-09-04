import { describe, expect, it } from 'vitest'
import type { ContributionRateEntry, Payment, QuarterlyContribution, ThirteenthMonth } from '../types'
import { calcolaCud, incongruenza } from './cud'

function payment(month: number, hours: number, amount: number, year = 2025): Payment {
  return {
    id: `p-${month}`,
    periodYear: year,
    periodMonth: month,
    hoursWorked: hours,
    hourlyRate: 10,
    amountDue: amount,
    status: 'pagato',
    paidAt: `${year}-${String(month).padStart(2, '0')}-01`,
    attachmentIds: [],
    updatedAt: '2025-01-01T00:00:00.000Z',
  }
}

function contribution(quarter: 1 | 2 | 3 | 4, periodHours: number, amountWorker: number, year = 2025): QuarterlyContribution {
  return {
    id: `c-${quarter}`,
    year,
    quarter,
    dueDate: `${year}-01-10`,
    periodHours,
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

const contributionRateHistory: ContributionRateEntry[] = [
  { id: 'r1', employerAmountPerHour: 1, workerAmountPerHour: 0.5, validFrom: '2025-01-01', validTo: null },
]

describe('calcolaCud', () => {
  it('somma pagamenti + tredicesima come lorda, sottrae solo la quota lavoratrice dei contributi', () => {
    const payments = [payment(1, 10, 100), payment(2, 10, 100)]
    const thirteenthMonth: ThirteenthMonth[] = [
      { id: 't1', year: 2025, amountAccrued: 50, status: 'pagato', paidAt: '2025-12-13', attachmentIds: [], updatedAt: '2025-01-01T00:00:00.000Z' },
    ]
    const quarterlyContributions = [contribution(1, 20, 10), contribution(2, 30, 15)]

    const risultato = calcolaCud(payments, thirteenthMonth, quarterlyContributions, contributionRateHistory, 2025)
    expect(risultato.retribuzioneLorda).toBeCloseTo(250, 6)
    expect(risultato.contributiTrattenuti).toBeCloseTo(25, 6)
    expect(risultato.retribuzioneNetta).toBeCloseTo(225, 6)
  })

  it('ignora dati di anni diversi', () => {
    const payments = [payment(1, 10, 100, 2025), payment(1, 99, 999, 2024)]
    const risultato = calcolaCud(payments, [], [], contributionRateHistory, 2025)
    expect(risultato.retribuzioneLorda).toBe(100)
  })

  it('il previsionale dei pagamenti usa ore × tariffa, non l\'importo eventualmente corretto a mano', () => {
    // 17h × 10€ = 170€, ma pagati 175€ (5€ di conguaglio da un mese precedente)
    const payments = [payment(1, 17, 175)]
    const risultato = calcolaCud(payments, [], [], contributionRateHistory, 2025)
    expect(risultato.retribuzioneLorda).toBe(175)
    expect(risultato.retribuzioneLordaPrevisionale).toBeCloseTo(170, 6)
    expect(incongruenza(risultato.retribuzioneLorda, risultato.retribuzioneLordaPrevisionale)) .toBe(true)
  })

  it('il previsionale dei contributi usa ore × importo orario in vigore alla scadenza', () => {
    // 54h × 0,5€/h = 27€ di quota lavoratrice attesa, ma ne risultano trattenuti 25,51€
    const quarterlyContributions = [contribution(3, 54, 25.51)]
    const risultato = calcolaCud([], [], quarterlyContributions, contributionRateHistory, 2025)
    expect(risultato.contributiTrattenuti).toBeCloseTo(25.51, 6)
    expect(risultato.contributiTrattenutiPrevisionale).toBeCloseTo(27, 6)
    expect(incongruenza(risultato.contributiTrattenuti, risultato.contributiTrattenutiPrevisionale)).toBe(true)
  })

  it('nessuna incongruenza quando registrato e previsionale combaciano (a meno di arrotondamenti)', () => {
    expect(incongruenza(100, 100.005)).toBe(false)
    expect(incongruenza(100, 100.02)).toBe(true)
  })
})
