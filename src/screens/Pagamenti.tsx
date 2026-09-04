import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Sheet } from '../components/Sheet'
import { Stamp } from '../components/Stamp'
import { proposteRetribuzione, type PaymentProposal } from '../domain/calculations/paymentProposals'
import { formatDataBreve, formatEuro, formatOre, toLocalIsoDate, MONTH_LABELS_IT, TIME_ENTRY_LABELS } from '../domain/format'
import type { Payment } from '../domain/types'

function todayIso(): string {
  return toLocalIsoDate(new Date())
}

export function Pagamenti() {
  const payments = useAppStore((s) => s.data.payments)
  const timeEntries = useAppStore((s) => s.data.timeEntries)
  const rateHistory = useAppStore((s) => s.data.worker.rateHistory)
  const markPaymentPaid = useAppStore((s) => s.markPaymentPaid)
  const deletePayment = useAppStore((s) => s.deletePayment)
  const generatePayment = useAppStore((s) => s.generatePayment)
  const [target, setTarget] = useState<Payment | null>(null)
  const [paidAt, setPaidAt] = useState(todayIso())
  const [nota, setNota] = useState('')
  const [toDelete, setToDelete] = useState<Payment | null>(null)

  const oggiAnno = new Date().getFullYear()
  const anniConPagamenti = [...new Set(payments.map((p) => p.periodYear))]
  const anni = [...new Set([oggiAnno, ...anniConPagamenti])].sort((a, b) => b - a)
  const [annoSelezionato, setAnnoSelezionato] = useState(oggiAnno)

  const ordinati = [...payments]
    .filter((p) => p.periodYear === annoSelezionato)
    .sort((a, b) => {
      const dataA = a.paidAt ?? a.updatedAt
      const dataB = b.paidAt ?? b.updatedAt
      return dataA < dataB ? 1 : dataA > dataB ? -1 : 0
    })

  // Le proposte riguardano sempre ore recenti non ancora fatturate: hanno senso solo
  // guardando l'anno corrente, non sfogliando un anno passato.
  const proposte = annoSelezionato === oggiAnno ? proposteRetribuzione(timeEntries, rateHistory, payments) : []

  function apriConferma(p: Payment) {
    setPaidAt(todayIso())
    setNota('')
    setTarget(p)
  }

  function confermaPagamento() {
    if (!target) return
    markPaymentPaid(target.id, paidAt, nota.trim() || undefined)
    setTarget(null)
  }

  function confermaEliminazione() {
    if (!toDelete) return
    deletePayment(toDelete.id)
    setToDelete(null)
  }

  function generaPagamento(p: PaymentProposal) {
    generatePayment({
      periodYear: p.year,
      periodMonth: p.month,
      hoursWorked: p.hours,
      hourlyRate: p.rate,
      amountDue: p.amount,
      coveredEntryIds: p.entries.map((e) => e.id),
      category: p.category,
    })
  }

  return (
    <>
      {anni.length > 1 && (
        <div className="seg-row">
          {anni.map((y) => (
            <button
              key={y}
              type="button"
              className={`seg-btn${y === annoSelezionato ? ' active' : ''}`}
              onClick={() => setAnnoSelezionato(y)}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {proposte.length > 0 && (
        <>
          <div className="eyebrow-standalone">Ore registrate, non ancora fatturate</div>
          {proposte.map((p) => (
            <div className="ledger-card pay-card" key={`proposta-${p.year}-${p.month}-${p.category}`} style={{ marginTop: 16 }}>
              <div className="pay-top">
                <p className="card-title">
                  {MONTH_LABELS_IT[p.month - 1]} {p.year}
                  {p.category === 'ferie' && <span className="chip info entry-status">Ferie</span>}
                </p>
                <span className="chip info">Da registrare</span>
              </div>
              <div className="pay-amount mono">{formatEuro(p.amount)}</div>
              <div className="pay-calc mono">
                {formatOre(p.hours)} &times; {formatEuro(p.rate)}
              </div>
              {p.existingPaymentsInMonth > 0 && (
                <p className="card-sub" style={{ marginTop: 10 }}>
                  Questo mese ha gi&agrave; {p.existingPaymentsInMonth === 1 ? 'un pagamento registrato' : `${p.existingPaymentsInMonth} pagamenti registrati`}: verifica che queste ore non siano già incluse prima di generarne un altro.
                </p>
              )}
              {p.entries.length > 1 && (
                <div className="ledger-list" style={{ marginTop: 12 }}>
                  {p.entries.map((e) => (
                    <div className="ledger-row" key={e.id}>
                      <span className="rdate mono">{formatDataBreve(e.date)}</span>
                      <span className="rtype">{TIME_ENTRY_LABELS[e.type]}</span>
                      <span className="rhours mono">{formatOre(e.hours)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pay-actions">
                <button type="button" className="btn primary" onClick={() => generaPagamento(p)}>
                  Genera pagamento
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="eyebrow-standalone" style={{ marginTop: proposte.length > 0 ? 26 : 6 }}>
        Mensilit&agrave;
      </div>

      {ordinati.length === 0 && <p className="card-sub">Nessun pagamento registrato nel {annoSelezionato}</p>}
      {ordinati.map((p) => (
        <div className="ledger-card pay-card" key={p.id} style={{ marginTop: 16 }}>
          {p.status === 'pagato' && p.paidAt && <Stamp label="PAGATO" date={p.paidAt.split('-').reverse().join('/')} />}
          <div className="pay-top">
            <p className="card-title">
              {MONTH_LABELS_IT[p.periodMonth - 1]} {p.periodYear}
              {p.category === 'ferie' && <span className="chip info entry-status">Ferie</span>}
            </p>
            {p.status === 'da_pagare' && <span className="chip due">Da pagare</span>}
          </div>
          <div className="pay-amount mono">{formatEuro(p.amountDue)}</div>
          <div className="pay-calc mono">
            {formatOre(p.hoursWorked)} &times; {formatEuro(p.hourlyRate)}
          </div>
          {p.note && <p className="card-sub" style={{ marginTop: 8 }}>{p.note}</p>}
          <div className="pay-actions">
            {p.status === 'da_pagare' && (
              <button type="button" className="btn primary" onClick={() => apriConferma(p)}>
                Registra pagamento
              </button>
            )}
            <button type="button" className="btn danger-ghost" onClick={() => setToDelete(p)}>
              Elimina pagamento
            </button>
          </div>
        </div>
      ))}

      <Sheet open={target !== null} onClose={() => setTarget(null)} title={target ? `Registra pagamento — ${MONTH_LABELS_IT[target.periodMonth - 1]}` : ''}>
        {target && (
          <>
            <p className="card-sub" style={{ marginBottom: 14 }}>
              Importo {formatEuro(target.amountDue)} &middot; {formatOre(target.hoursWorked)} &times; {formatEuro(target.hourlyRate)}
            </p>
            <div className="field-label">Data pagamento</div>
            <input
              className="text-input"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
            <div className="field-label">Nota</div>
            <input
              className="text-input"
              type="text"
              placeholder="Opzionale (es. bonifico, contanti...)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
            <div className="sheet-actions">
              <button type="button" className="btn ghost auto" onClick={() => setTarget(null)}>
                Annulla
              </button>
              <button type="button" className="btn primary" onClick={confermaPagamento}>
                Conferma pagamento
              </button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={toDelete !== null} onClose={() => setToDelete(null)} title="Eliminare questo pagamento?">
        {toDelete && (
          <>
            <p className="card-sub" style={{ marginBottom: 14 }}>
              {MONTH_LABELS_IT[toDelete.periodMonth - 1]} {toDelete.periodYear} &middot; {formatEuro(toDelete.amountDue)}
              {toDelete.status === 'pagato' ? ' · già segnato come pagato' : ''}
            </p>
            <div className="sheet-actions">
              <button type="button" className="btn ghost auto" onClick={() => setToDelete(null)}>
                Annulla
              </button>
              <button type="button" className="btn primary" onClick={confermaEliminazione}>
                Elimina
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  )
}
