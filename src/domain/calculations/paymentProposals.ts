import type { Payment, RateHistoryEntry, TimeEntry } from '../types'
import { PAID_TYPES } from './common'
import { getRateAt } from './rates'

export type ProposalCategory = 'lavoro' | 'ferie'

export interface PaymentProposal {
  year: number
  month: number
  category: ProposalCategory
  hours: number
  amount: number
  rate: number
  entries: TimeEntry[]
  /** Numero di pagamenti già registrati per questo stesso mese (0 se nessuno). */
  existingPaymentsInMonth: number
}

function lastDayOfMonthIso(year: number, month: number): string {
  const day = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function categoriaOf(type: TimeEntry['type']): ProposalCategory {
  return type === 'ferie' ? 'ferie' : 'lavoro'
}

/**
 * Propone un pagamento per ogni combinazione mese+categoria (lavoro / ferie) che ha ore
 * non ancora coperte da nessun pagamento.
 *
 * Copertura tracciata per singola voce (`coveredEntryIds`): un pagamento generato da
 * qui elenca esattamente le voci che copre, quindi più pagamenti nello stesso mese sono
 * possibili e ore aggiunte dopo restano segnalate. Un pagamento creato prima di questo
 * tracciamento (`coveredEntryIds` assente) non ha quell'elenco: si assume copra tutte le
 * voci di quel mese già esistenti al momento in cui è stato creato (updatedAt del
 * pagamento), lasciando comunque segnalate quelle aggiunte dopo.
 */
export function proposteRetribuzione(
  timeEntries: TimeEntry[],
  rateHistory: RateHistoryEntry[],
  payments: Payment[],
): PaymentProposal[] {
  const coperteEsplicite = new Set<string>()
  const legacyCutoffByMonth = new Map<string, string>()
  const pagamentiPerMese = new Map<string, number>()

  for (const p of payments) {
    const meseKey = `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`
    pagamentiPerMese.set(meseKey, (pagamentiPerMese.get(meseKey) ?? 0) + 1)

    if (p.coveredEntryIds && p.coveredEntryIds.length > 0) {
      for (const id of p.coveredEntryIds) coperteEsplicite.add(id)
    } else {
      const cutoffAttuale = legacyCutoffByMonth.get(meseKey)
      if (!cutoffAttuale || p.updatedAt > cutoffAttuale) legacyCutoffByMonth.set(meseKey, p.updatedAt)
    }
  }

  const nonCoperte = timeEntries.filter((e) => {
    if (!PAID_TYPES.has(e.type)) return false
    if (coperteEsplicite.has(e.id)) return false
    const meseKey = e.date.slice(0, 7)
    const cutoff = legacyCutoffByMonth.get(meseKey)
    if (cutoff && e.updatedAt <= cutoff) return false
    return true
  })

  const gruppi = new Map<string, TimeEntry[]>()
  for (const e of nonCoperte) {
    const key = `${e.date.slice(0, 7)}-${categoriaOf(e.type)}`
    const list = gruppi.get(key)
    if (list) list.push(e)
    else gruppi.set(key, [e])
  }

  return [...gruppi.keys()]
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => {
      const entries = gruppi.get(key) ?? []
      const [year, month] = key.split('-').map(Number)
      const category = categoriaOf(entries[0].type)
      const meseKey = `${year}-${String(month).padStart(2, '0')}`
      const hours = entries.reduce((sum, e) => sum + e.hours, 0)
      const amount = entries.reduce((sum, e) => sum + e.hours * getRateAt(rateHistory, e.date).hourlyRate, 0)
      const rate = getRateAt(rateHistory, lastDayOfMonthIso(year, month)).hourlyRate
      return {
        year,
        month,
        category,
        hours,
        amount,
        rate,
        entries: [...entries].sort((a, b) => (a.date < b.date ? 1 : -1)),
        existingPaymentsInMonth: pagamentiPerMese.get(meseKey) ?? 0,
      }
    })
}
