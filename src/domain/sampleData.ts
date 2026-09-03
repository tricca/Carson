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
            { minHourlyPay: 0, maxHourlyPay: 9.62, fixedAmountPerHour: 1.7 },
            { minHourlyPay: 9.62, maxHourlyPay: 11.71, fixedAmountPerHour: 1.92 },
            { minHourlyPay: 11.71, maxHourlyPay: null, fixedAmountPerHour: 2.34 },
          ],
          regimeOltre24h: { fixedAmountPerHour: 1.24 },
          employerShareRatio: 0.75,
          sourceNote:
            'Importi 2026 (circolare INPS n. 9/2026, con CUAF). Le fasce fino/oltre 9,61€ e 11,70€ sono confermate dalla comunicazione ufficiale INPS; la fascia intermedia, il regime oltre 24h e il riparto datore/lavoratrice sono ricostruiti da fonti terze: verificare su inps.it prima dell\'uso reale. Caso cuafExempt non distinto.',
          inpsLink:
            'https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.02.lavoratori-domestici-i-contributi-dovuti-per-il-2026.html',
        },
      ],
      // Coefficiente ufficiale pubblicato ogni dicembre (1,5% fisso + 75% inflazione ISTAT FOI),
      // applicato al fondo TFR accantonato al 31/12 dell'anno precedente. Aggiungere l'anno
      // corrente qui non appena INPS/ISTAT pubblica il coefficiente definitivo di dicembre.
      tfrRevaluationRates: [
        { year: 2023, rate: 0.01944162 },
        { year: 2024, rate: 0.02320017 },
        { year: 2025, rate: 0.02311148 },
      ],
    },
    attachments: [],
  }
}
