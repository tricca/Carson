import type { AppData } from './types'

const now = '2026-09-01T08:00:00.000Z'

export function createSampleData(): AppData {
  return {
    schemaVersion: 1,
    worker: {
      firstName: 'Maria',
      lastName: 'T.',
      address: 'via Esempio 1, 20100 Milano (MI)',
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
    // Nessun trimestre pre-caricato: compaiono da soli come proposta appena ci sono ore
    // registrate (proposteContributiTrimestrali), niente più cifre segnaposto da correggere.
    quarterlyContributions: [],
    thirteenthMonth: [],
    settings: {
      // Importo contributivo orario impostato a mano dall'utente (quota datore + quota
      // lavoratrice separate) — vedi RateSettingsCard-equivalente in Altro per modificarlo.
      // Valori di partenza indicativi (circa la fascia più bassa INPS 2026, circolare n.
      // 9/2026): da correggere con l'importo realmente in vigore.
      contributionRateHistory: [
        {
          id: 'cr-2026',
          employerAmountPerHour: 1.27,
          workerAmountPerHour: 0.43,
          validFrom: '2026-01-01',
          validTo: null,
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
      // Dati anagrafici di esempio per il CUD sostitutivo — da sostituire con i propri in Altro.
      employer: {
        firstName: 'Mario',
        lastName: 'Rossi',
        address: 'via Esempio 10, 20100 Milano (MI)',
        fiscalCode: 'RSSMRA80A01F205X',
      },
    },
    attachments: [],
  }
}
