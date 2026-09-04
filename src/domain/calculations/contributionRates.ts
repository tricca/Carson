import type { ContributionRateEntry } from '../types'
import { dayBefore } from './rates'

export function getContributionRateAt(history: ContributionRateEntry[], date: string): ContributionRateEntry {
  const match = history
    .filter((r) => r.validFrom <= date && (r.validTo === null || date <= r.validTo))
    .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))[0]
  if (!match) {
    throw new Error(`Nessun importo contributivo impostato per la data ${date}`)
  }
  return match
}

/** Come getContributionRateAt, ma null invece di lanciare se la data non è coperta —
 * per i punti UI/di calcolo che devono restare in piedi anche senza un importo impostato. */
export function tryGetContributionRateAt(history: ContributionRateEntry[], date: string): ContributionRateEntry | null {
  try {
    return getContributionRateAt(history, date)
  } catch {
    return null
  }
}

export interface NewContributionRateInput {
  employerAmountPerHour: number
  workerAmountPerHour: number
  validFrom: string
}

/**
 * Chiude l'importo contributivo correntemente in vigore (validTo = giorno prima del nuovo)
 * e ne aggiunge uno nuovo aperto (validTo null) — stesso meccanismo di addRateChange per la
 * paga oraria, non tocca mai gli importi passati già chiusi.
 */
export function addContributionRateChange(
  history: ContributionRateEntry[],
  input: NewContributionRateInput,
): ContributionRateEntry[] {
  const currentOpen = history.find((r) => r.validTo === null)
  if (currentOpen && input.validFrom <= currentOpen.validFrom) {
    throw new Error('Il nuovo importo deve avere una data di inizio successiva a quello in vigore')
  }

  const closedHistory = history.map((r) =>
    r.validTo === null ? { ...r, validTo: dayBefore(input.validFrom) } : r,
  )

  const newEntry: ContributionRateEntry = {
    id: crypto.randomUUID(),
    employerAmountPerHour: input.employerAmountPerHour,
    workerAmountPerHour: input.workerAmountPerHour,
    validFrom: input.validFrom,
    validTo: null,
  }

  return [...closedHistory, newEntry]
}
