import type { AppData } from './types'

/** Union per id; se lo stesso id esiste in entrambe le liste vince l'updatedAt più recente. */
function mergeById<T extends { id: string; updatedAt: string }>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>()
  for (const item of remote) byId.set(item.id, item)
  for (const item of local) {
    const existing = byId.get(item.id)
    if (!existing || item.updatedAt > existing.updatedAt) {
      byId.set(item.id, item)
    }
  }
  return Array.from(byId.values())
}

/** Gli allegati sono immutabili una volta caricati: basta l'unione per id, senza confronto date. */
function mergeAttachments<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>()
  for (const item of remote) byId.set(item.id, item)
  for (const item of local) if (!byId.has(item.id)) byId.set(item.id, item)
  return Array.from(byId.values())
}

/**
 * Merge "buono per single-user su 2 dispositivi non usati simultaneamente": le liste
 * (voci con id + updatedAt) vengono unite per id; per i blocchi singoli (worker,
 * impostazioni ferie/contributi) si preferisce la versione locale, assumendo che le
 * modifiche concorrenti a questi campi siano rare e comunque revisionabili a mano.
 */
export function mergeAppData(local: AppData, remote: AppData): AppData {
  return {
    ...local,
    timeEntries: mergeById(local.timeEntries, remote.timeEntries),
    payments: mergeById(local.payments, remote.payments),
    quarterlyContributions: mergeById(local.quarterlyContributions, remote.quarterlyContributions),
    thirteenthMonth: mergeById(local.thirteenthMonth, remote.thirteenthMonth),
    attachments: mergeAttachments(local.attachments, remote.attachments),
  }
}
