import type { AppData } from './types'

const now = '2026-09-01T08:00:00.000Z'

export function createSampleData(): AppData {
  return {
    schemaVersion: 1,
    worker: {
      firstName: 'Maria',
      lastName: 'T.',
      hiringDate: '2024-03-01',
      contractType: 'tempo_indeterminato',
      livingWithEmployer: false,
      cuafExempt: false,
      rateHistory: [
        {
          id: 'rate-2026',
          hourlyRate: 8.5,
          weeklyContractHours: 20,
          contractDaysPerWeek: 5,
          validFrom: '2026-01-01',
          validTo: null,
        },
      ],
    },
    timeEntries: [
      { id: 'te-1', date: '2026-09-01', type: 'pulizia', hours: 6, updatedAt: now },
      { id: 'te-2', date: '2026-08-30', type: 'ferie', hours: 8, updatedAt: now },
      { id: 'te-3', date: '2026-08-29', type: 'stiro', hours: 6, updatedAt: now },
      { id: 'te-4', date: '2026-08-28', type: 'pulizia', hours: 2, updatedAt: now },
      { id: 'te-5', date: '2026-08-27', type: 'pulizia', hours: 6, updatedAt: now },
    ],
    payments: [
      {
        id: 'pay-2026-08',
        periodYear: 2026,
        periodMonth: 8,
        hoursWorked: 22,
        hourlyRate: 8.5,
        amountDue: 187,
        status: 'pagato',
        paidAt: '2026-08-31',
        attachmentIds: [],
        coveredEntryIds: ['te-2', 'te-3', 'te-4', 'te-5'],
        updatedAt: now,
      },
    ],
    quarterlyContributions: [
      {
        id: 'q-2026-3',
        year: 2026,
        quarter: 3,
        dueDate: '2026-10-10',
        periodHours: 247,
        regime: 'fino_24h',
        amountTotal: 214.6,
        amountEmployer: 160.95,
        amountWorker: 53.65,
        cuafExcluded: false,
        status: 'da_pagare',
        paidAt: null,
        attachmentIds: [],
        updatedAt: now,
      },
      {
        id: 'q-2026-2',
        year: 2026,
        quarter: 2,
        dueDate: '2026-07-10',
        periodHours: 230,
        regime: 'fino_24h',
        amountTotal: 198.4,
        amountEmployer: 148.8,
        amountWorker: 49.6,
        cuafExcluded: false,
        status: 'pagato',
        paidAt: '2026-07-08',
        attachmentIds: [],
        updatedAt: now,
      },
    ],
    thirteenthMonth: [],
    vacations: {
      settings: { annualDays: 26, minDaysToAccrueMonth: 15 },
      byYear: [],
    },
    settings: {
      contributionRateTables: [
        {
          id: 'rt-2026',
          validFrom: '2026-01-01',
          validTo: null,
          regimeFino24h: [
            { minHourlyPay: 0, maxHourlyPay: 8, fixedAmountPerHour: 0.65 },
            { minHourlyPay: 8, maxHourlyPay: 9.53, fixedAmountPerHour: 0.87 },
            { minHourlyPay: 9.53, maxHourlyPay: null, fixedAmountPerHour: 1.5 },
          ],
          regimeOltre24h: { fixedAmountPerHour: 1.03 },
          employerShareRatio: 0.75,
          sourceNote: 'Valori indicativi da verificare su inps.it prima dell\'uso reale',
          inpsLink: 'https://www.inps.it',
        },
      ],
    },
    attachments: [],
  }
}
