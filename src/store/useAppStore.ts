import { create } from 'zustand'
import type { AppData, Payment, PaymentCategory, TimeEntry, TimeEntryType, Worker } from '../domain/types'
import { createSampleData } from '../domain/sampleData'
import { addRateChange, type NewRateInput } from '../domain/calculations/rates'
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
  markContributionPaid: (contributionId: string, paidAt: string) => void
  /** Lancia un errore (da mostrare all'utente) se `validFrom` non è successivo alla tariffa in vigore. */
  updateRate: (input: NewRateInput) => void
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

  markContributionPaid: (contributionId, paidAt) => {
    const data: AppData = {
      ...get().data,
      quarterlyContributions: get().data.quarterlyContributions.map((c) =>
        c.id === contributionId ? { ...c, status: 'pagato' as const, paidAt, updatedAt: touch() } : c,
      ),
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

  updateWorkerProfile: (patch) => {
    const data: AppData = { ...get().data, worker: { ...get().data.worker, ...patch } }
    set({ data })
    saveData(data)
  },
}))
