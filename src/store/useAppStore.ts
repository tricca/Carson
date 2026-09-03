import { create } from 'zustand'
import type {
  AppData,
  ContributionRegime,
  Payment,
  PaymentCategory,
  QuarterlyContribution,
  TimeEntry,
  TimeEntryType,
  Worker,
} from '../domain/types'
import { createSampleData } from '../domain/sampleData'
import { addRateChange, type NewRateInput } from '../domain/calculations/rates'
import { addContributionRateChange, type NewContributionRateInput } from '../domain/calculations/contributionRates'
import { loadInitialData, saveData, onSyncStatusChange, type SyncStatus } from '../storage/syncEngine'
import { isConnected } from '../dropbox/authClient'
import { downloadBrandingImage } from '../dropbox/dataStore'

interface AppState {
  data: AppData
  ready: boolean
  syncStatus: SyncStatus
  /** Immagine personale opzionale da /branding/carson-icon.png nel Dropbox dell'utente;
   * null se non connesso o se il file non esiste. Mai nel repository o nel deploy pubblico. */
  brandingImageUrl: string | null
  init: () => Promise<void>
  addTimeEntry: (entry: { date: string; type: TimeEntryType; hours: number; note?: string }) => void
  deleteTimeEntry: (id: string) => void
  generatePayment: (input: {
    periodYear: number
    periodMonth: number
    hoursWorked: number
    hourlyRate: number
    amountDue: number
    coveredEntryIds: string[]
    category: PaymentCategory
  }) => void
  markPaymentPaid: (paymentId: string, paidAt: string, note?: string) => void
  deletePayment: (paymentId: string) => void
  /** Registra il versamento di un trimestre INPS: se `id` corrisponde a un trimestre già
   * salvato lo aggiorna (correzione o passaggio da "da_pagare" a "pagato"), altrimenti ne
   * crea uno nuovo già pagato. Il monte ore e gli importi arrivano già decisi dalla UI
   * (eventualmente corretti a mano rispetto alla proposta calcolata) — lo store non
   * ricalcola nulla, si limita a salvare quello che l'utente ha confermato. */
  salvaVersamentoContributo: (input: {
    id?: string
    year: number
    quarter: 1 | 2 | 3 | 4
    dueDate: string
    periodHours: number
    regime: ContributionRegime
    amountTotal: number
    amountEmployer: number
    amountWorker: number
    cuafExcluded: boolean
    paidAt: string
    note?: string
  }) => void
  /** Rimuove il versamento salvato: il trimestre torna a comparire come proposta
   * previsionale calcolata dalle ore reali, finché non lo si registra di nuovo. */
  deleteContribution: (contributionId: string) => void
  /** Lancia un errore (da mostrare all'utente) se `validFrom` non è successivo alla tariffa in vigore. */
  updateRate: (input: NewRateInput) => void
  /** Come updateRate, ma per l'importo contributivo orario (quota datore + lavoratrice)
   * impostato manualmente in Altro. */
  updateContributionRate: (input: NewContributionRateInput) => void
  updateWorkerProfile: (
    patch: Pick<Worker, 'firstName' | 'lastName' | 'fiscalCode' | 'iban' | 'inpsRelationshipNumber' | 'hiringDate'>,
  ) => void
}

function touch(): string {
  return new Date().toISOString()
}

export const useAppStore = create<AppState>((set, get) => ({
  data: createSampleData(),
  ready: false,
  syncStatus: 'not_connected',
  brandingImageUrl: null,

  init: async () => {
    onSyncStatusChange((status) => set({ syncStatus: status }))
    const data = await loadInitialData(get().data)
    set({ data, ready: true })

    if (isConnected()) {
      void downloadBrandingImage().then((url) => {
        if (url) set({ brandingImageUrl: url })
      })
    }
  },

  addTimeEntry: (entry) => {
    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      date: entry.date,
      type: entry.type,
      hours: entry.hours,
      note: entry.note,
      updatedAt: touch(),
    }
    const data: AppData = { ...get().data, timeEntries: [newEntry, ...get().data.timeEntries] }
    set({ data })
    saveData(data)
  },

  deleteTimeEntry: (id) => {
    const data: AppData = { ...get().data, timeEntries: get().data.timeEntries.filter((e) => e.id !== id) }
    set({ data })
    saveData(data)
  },

  generatePayment: (input) => {
    const newPayment: Payment = {
      id: crypto.randomUUID(),
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      hoursWorked: input.hoursWorked,
      hourlyRate: input.hourlyRate,
      amountDue: input.amountDue,
      status: 'da_pagare',
      paidAt: null,
      attachmentIds: [],
      coveredEntryIds: input.coveredEntryIds,
      category: input.category,
      updatedAt: touch(),
    }
    const data: AppData = { ...get().data, payments: [newPayment, ...get().data.payments] }
    set({ data })
    saveData(data)
  },

  markPaymentPaid: (paymentId, paidAt, note) => {
    const data: AppData = {
      ...get().data,
      payments: get().data.payments.map((p) =>
        p.id === paymentId ? { ...p, status: 'pagato' as const, paidAt, note: note || p.note, updatedAt: touch() } : p,
      ),
    }
    set({ data })
    saveData(data)
  },

  deletePayment: (paymentId) => {
    const data: AppData = { ...get().data, payments: get().data.payments.filter((p) => p.id !== paymentId) }
    set({ data })
    saveData(data)
  },

  salvaVersamentoContributo: (input) => {
    const state = get().data
    const esistente = input.id ? state.quarterlyContributions.find((c) => c.id === input.id) : undefined

    const quarterlyContributions = esistente
      ? state.quarterlyContributions.map((c) =>
          c.id === esistente.id
            ? {
                ...c,
                periodHours: input.periodHours,
                regime: input.regime,
                amountTotal: input.amountTotal,
                amountEmployer: input.amountEmployer,
                amountWorker: input.amountWorker,
                cuafExcluded: input.cuafExcluded,
                status: 'pagato' as const,
                paidAt: input.paidAt,
                note: input.note || c.note,
                updatedAt: touch(),
              }
            : c,
        )
      : [
          {
            id: crypto.randomUUID(),
            year: input.year,
            quarter: input.quarter,
            dueDate: input.dueDate,
            periodHours: input.periodHours,
            regime: input.regime,
            amountTotal: input.amountTotal,
            amountEmployer: input.amountEmployer,
            amountWorker: input.amountWorker,
            cuafExcluded: input.cuafExcluded,
            status: 'pagato' as const,
            paidAt: input.paidAt,
            note: input.note,
            attachmentIds: [],
            updatedAt: touch(),
          } satisfies QuarterlyContribution,
          ...state.quarterlyContributions,
        ]

    const data: AppData = { ...state, quarterlyContributions }
    set({ data })
    saveData(data)
  },

  deleteContribution: (contributionId) => {
    const data: AppData = {
      ...get().data,
      quarterlyContributions: get().data.quarterlyContributions.filter((c) => c.id !== contributionId),
    }
    set({ data })
    saveData(data)
  },

  updateRate: (input) => {
    const worker = get().data.worker
    const rateHistory = addRateChange(worker.rateHistory, input)
    const data: AppData = { ...get().data, worker: { ...worker, rateHistory } }
    set({ data })
    saveData(data)
  },

  updateContributionRate: (input) => {
    const settings = get().data.settings
    const contributionRateHistory = addContributionRateChange(settings.contributionRateHistory, input)
    const data: AppData = { ...get().data, settings: { ...settings, contributionRateHistory } }
    set({ data })
    saveData(data)
  },

  updateWorkerProfile: (patch) => {
    const data: AppData = { ...get().data, worker: { ...get().data.worker, ...patch } }
    set({ data })
    saveData(data)
  },
}))
