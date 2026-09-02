import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Sheet } from '../components/Sheet'
import { Stamp } from '../components/Stamp'
import { WeeklyRecap } from '../components/WeeklyRecap'
import { getRateTableAt } from '../domain/calculations/contributi'
import { formatDataEstesa, formatEuro, formatOre, toLocalIsoDate } from '../domain/format'
import type { QuarterlyContribution } from '../domain/types'

const REGIME_LABEL: Record<QuarterlyContribution['regime'], string> = {
  fino_24h: '≤24h/sett. · 3 fasce',
  oltre_24h: '>24h/sett. · aliquota unica',
}

function todayIso(): string {
  return toLocalIsoDate(new Date())
}

export function Contributi() {
  const contributions = useAppStore((s) => s.data.quarterlyContributions)
  const timeEntries = useAppStore((s) => s.data.timeEntries)
  const rateTables = useAppStore((s) => s.data.settings.contributionRateTables)
  const markContributionPaid = useAppStore((s) => s.markContributionPaid)
  const [target, setTarget] = useState<QuarterlyContribution | null>(null)
  const [paidAt, setPaidAt] = useState(todayIso())

  const ordinati = [...contributions].sort((a, b) =>
    a.year !== b.year ? b.year - a.year : b.quarter - a.quarter,
  )

  function apriConferma(c: QuarterlyContribution) {
    setPaidAt(todayIso())
    setTarget(c)
  }

  function confermaVersamento() {
    if (!target) return
    markContributionPaid(target.id, paidAt)
    setTarget(null)
  }

  return (
    <>
      <div className="eyebrow-standalone">Scadenze trimestrali</div>

      {ordinati.map((c) => {
        const table = getRateTableAt(rateTables, c.dueDate)
        return (
          <div className="ledger-card" key={c.id} style={{ marginTop: 16 }}>
            {c.status === 'pagato' && c.paidAt && <Stamp label="VERSATO" date={c.paidAt.split('-').reverse().join('/')} />}
            <div className="pay-top">
              <p className="card-title">
                {c.quarter}&deg; trimestre {c.year}
              </p>
              {c.status === 'da_pagare' && <span className="chip due">Da versare</span>}
            </div>
            <p className="card-sub">Scadenza {formatDataEstesa(c.dueDate)}</p>

            {c.status === 'da_pagare' && (
              <div className="stat-grid" style={{ marginTop: 14 }}>
                <div>
                  <div className="stat-label">Ore periodo</div>
                  <div className="stat-value mono" style={{ fontSize: 18 }}>
                    {formatOre(c.periodHours)}
                  </div>
                </div>
                <div>
                  <div className="stat-label">Regime</div>
                  <div style={{ fontSize: 13, fontWeight: 600, paddingTop: 4 }}>{REGIME_LABEL[c.regime]}</div>
                </div>
              </div>
            )}

            <p className="pay-amount mono" style={{ marginTop: 16 }}>
              {formatEuro(c.amountTotal)}
            </p>
            <p className="card-sub">Importo trimestrale totale</p>

            {c.status === 'da_pagare' && (
              <div className="split-row">
                <div className="split-box">
                  <div className="l">Quota datore</div>
                  <div className="v mono">{formatEuro(c.amountEmployer)}</div>
                </div>
                <div className="split-box">
                  <div className="l">Quota lavoratrice</div>
                  <div className="v mono">{formatEuro(c.amountWorker)}</div>
                </div>
              </div>
            )}

            {c.status === 'da_pagare' && (
              <details className="disclosure">
                <summary>Dettaglio calcolo</summary>
                <div className="dbody">
                  {table.sourceNote}. CUAF {c.cuafExcluded ? 'escluso' : 'non escluso'}.
                  <br />
                  <a href={table.inpsLink} target="_blank" rel="noreferrer">
                    Verifica su INPS.it &rarr;
                  </a>
                </div>
              </details>
            )}

            <WeeklyRecap timeEntries={timeEntries} year={c.year} quarter={c.quarter} />

            {c.status === 'da_pagare' && (
              <div className="pay-actions">
                <button type="button" className="btn primary" onClick={() => apriConferma(c)}>
                  Registra versamento
                </button>
              </div>
            )}
          </div>
        )
      })}

      <Sheet open={target !== null} onClose={() => setTarget(null)} title={target ? `Registra versamento — ${target.quarter}° trimestre` : ''}>
        {target && (
          <>
            <p className="card-sub" style={{ marginBottom: 14 }}>
              Importo {formatEuro(target.amountTotal)}
            </p>
            <div className="field-label">Data versamento</div>
            <input className="text-input" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            <div className="sheet-actions">
              <button type="button" className="btn ghost auto" onClick={() => setTarget(null)}>
                Annulla
              </button>
              <button type="button" className="btn primary" onClick={confermaVersamento}>
                Conferma versamento
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  )
}
