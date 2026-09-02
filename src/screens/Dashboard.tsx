import { differenceInCalendarDays } from 'date-fns'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { TimeEntryList } from '../components/TimeEntryList'
import { CalendarMese } from '../components/CalendarMese'
import { calcolaTredicesima } from '../domain/calculations/tredicesima'
import { calcolaFerieAnno, calcolaFerieResiduoCumulato } from '../domain/calculations/ferie'
import { maturatoMese, oreMeseRetribuite } from '../domain/calculations/mese'
import { proposteRetribuzione } from '../domain/calculations/paymentProposals'
import { formatDataEstesa, formatEuro, formatGiorni, toLocalIsoDate, MONTH_LABELS_IT } from '../domain/format'

export function Dashboard() {
  const data = useAppStore((s) => s.data)
  const brandingImageUrl = useAppStore((s) => s.brandingImageUrl)
  const { worker, timeEntries, quarterlyContributions, payments } = data

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  const oreMese = oreMeseRetribuite(timeEntries, year, month)
  const maturato = maturatoMese(timeEntries, worker.rateHistory, year, month)
  const tredicesima = calcolaTredicesima(timeEntries, worker.rateHistory, year)

  const earliestYear = Math.min(...worker.rateHistory.map((r) => Number(r.validFrom.slice(0, 4))), year)
  const ferieAnni = []
  for (let y = earliestYear; y <= year; y++) {
    ferieAnni.push(calcolaFerieAnno(timeEntries, worker.rateHistory, data.vacations.settings, y))
  }
  const ferieResidue = calcolaFerieResiduoCumulato(ferieAnni)

  const prossimaScadenza = quarterlyContributions
    .filter((c) => c.status === 'da_pagare')
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0]

  const proposte = proposteRetribuzione(timeEntries, worker.rateHistory, payments)
  const oreDaPagareMeseCorrente =
    proposte.some((p) => p.year === year && p.month === month) ||
    payments.some((p) => p.periodYear === year && p.periodMonth === month && p.status === 'da_pagare')
  const dataProssimoPagamento = toLocalIsoDate(new Date(year, month, 1))
  const giorniAlPagamento = Math.max(0, differenceInCalendarDays(new Date(year, month, 1), today))

  const ultimiMovimenti = [...timeEntries].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4)

  return (
    <>
      <div className="carson-header">
        {brandingImageUrl && (
          <div className="carson-portrait">
            <img src={brandingImageUrl} alt="" />
          </div>
        )}
        <div className="wordmark">Carson</div>
        <div className="rule" />
      </div>

      <div className="ledger-card torn">
        <p className="card-title">Riepilogo del mese</p>
        <p className="card-sub">
          {MONTH_LABELS_IT[month - 1]} {year}
        </p>
        <div className="stat-grid">
          <div>
            <div className="stat-label">Ore lavorate</div>
            <div className="stat-value mono">
              {formatGiorni(oreMese)}
              <span className="unit">h</span>
            </div>
          </div>
          <div>
            <div className="stat-label">Maturato</div>
            <div className="stat-value mono">{formatEuro(maturato)}</div>
          </div>
          <div>
            <div className="stat-label">Ferie residue</div>
            <div className="stat-value mono">
              {formatGiorni(ferieResidue)}
              <span className="unit">gg</span>
            </div>
          </div>
          <div>
            <div className="stat-label">Tredicesima {year}</div>
            <div className="stat-value mono">{formatEuro(tredicesima)}</div>
          </div>
        </div>
      </div>

      {oreDaPagareMeseCorrente && (
        <Link to="/pagamenti" className="due-card">
          <div>
            <div className="days mono">{giorniAlPagamento}</div>
            <div className="days-label">giorni</div>
          </div>
          <div className="due-info">
            <p className="t1">Pagamento &middot; {MONTH_LABELS_IT[month - 1]}</p>
            <p className="t2">Previsto per il {formatDataEstesa(dataProssimoPagamento)}</p>
          </div>
        </Link>
      )}

      {prossimaScadenza && (
        <div className="due-card">
          <div>
            <div className="days mono">{Math.max(0, differenceInCalendarDays(new Date(`${prossimaScadenza.dueDate}T00:00:00`), today))}</div>
            <div className="days-label">giorni</div>
          </div>
          <div className="due-info">
            <p className="t1">
              Contributi INPS &middot; {prossimaScadenza.quarter}&deg; trimestre
            </p>
            <p className="t2">Scadenza {formatDataEstesa(prossimaScadenza.dueDate)}</p>
          </div>
        </div>
      )}

      <div className="section-head">
        <div>
          <div className="eyebrow">Ultimi movimenti</div>
          <h2>Attivit&agrave; recente</h2>
        </div>
        <Link to="/ore/storico">Vedi tutte</Link>
      </div>
      <TimeEntryList entries={ultimiMovimenti} emptyLabel="Nessuna ora registrata" />

      <div className="section-head">
        <div>
          <div className="eyebrow">{MONTH_LABELS_IT[month - 1]}</div>
          <h2>Calendario ore</h2>
        </div>
        <Link to="/ore/storico?vista=calendario">Vedi tutte</Link>
      </div>
      <div className="ledger-card">
        <CalendarMese year={year} month={month} timeEntries={timeEntries} />
      </div>
    </>
  )
}
