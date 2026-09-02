import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Sheet } from './Sheet'
import { TrashIcon } from './icons'
import { formatDataBreve, formatDataEstesa, formatOre, TIME_ENTRY_LABELS } from '../domain/format'
import { PAID_TYPES } from '../domain/calculations/common'
import type { Payment, TimeEntry } from '../domain/types'

interface TimeEntryListProps {
  entries: TimeEntry[]
  emptyLabel: string
  showTotal?: boolean
}

function statoPagamentoPerVoce(payments: Payment[]): Map<string, Payment['status']> {
  const stato = new Map<string, Payment['status']>()
  for (const p of payments) {
    for (const id of p.coveredEntryIds ?? []) {
      if (stato.get(id) !== 'pagato') stato.set(id, p.status)
    }
  }
  return stato
}

export function TimeEntryList({ entries, emptyLabel, showTotal = false }: TimeEntryListProps) {
  const deleteTimeEntry = useAppStore((s) => s.deleteTimeEntry)
  const payments = useAppStore((s) => s.data.payments)
  const [toDelete, setToDelete] = useState<TimeEntry | null>(null)

  const totale = entries.filter((e) => PAID_TYPES.has(e.type)).reduce((sum, e) => sum + e.hours, 0)
  const stato = statoPagamentoPerVoce(payments)

  function conferma() {
    if (!toDelete) return
    deleteTimeEntry(toDelete.id)
    setToDelete(null)
  }

  return (
    <>
      <div className="ledger-list">
        {entries.length === 0 && <div className="empty">{emptyLabel}</div>}
        {entries.map((e) => {
          const statoVoce = stato.get(e.id)
          return (
            <div className="ledger-row" key={e.id}>
              <span className="rdate mono">{formatDataBreve(e.date)}</span>
              <span className="rtype">
                {TIME_ENTRY_LABELS[e.type]}
                {statoVoce === 'pagato' && <span className="chip paid entry-status">Pagato</span>}
                {statoVoce === 'da_pagare' && <span className="chip due entry-status">Da pagare</span>}
              </span>
              <span className="rhours mono">{formatOre(e.hours)}</span>
              <button type="button" className="row-delete" aria-label="Elimina voce" onClick={() => setToDelete(e)}>
                <TrashIcon />
              </button>
            </div>
          )
        })}
        {showTotal && entries.length > 0 && (
          <div className="ledger-row total">
            <span className="rdate" />
            <span className="rtype">Totale ore</span>
            <span className="rhours mono">{formatOre(totale)}</span>
            <span className="row-delete-spacer" />
          </div>
        )}
      </div>

      <Sheet open={toDelete !== null} onClose={() => setToDelete(null)} title="Eliminare questa voce?">
        {toDelete && (
          <>
            <p className="card-sub" style={{ marginBottom: 14 }}>
              {formatDataEstesa(toDelete.date)} &middot; {TIME_ENTRY_LABELS[toDelete.type]} &middot; {formatOre(toDelete.hours)}
              {toDelete.note ? ` · ${toDelete.note}` : ''}
            </p>
            {stato.get(toDelete.id) && (
              <p className="card-sub" style={{ marginBottom: 14, color: 'var(--stamp)' }}>
                Questa voce è già collegata a un pagamento{stato.get(toDelete.id) === 'pagato' ? ' registrato come pagato' : ''}: eliminandola il pagamento non corrisponderà più esattamente a queste ore.
              </p>
            )}
            <div className="sheet-actions">
              <button type="button" className="btn ghost auto" onClick={() => setToDelete(null)}>
                Annulla
              </button>
              <button type="button" className="btn primary" onClick={conferma}>
                Elimina
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  )
}
