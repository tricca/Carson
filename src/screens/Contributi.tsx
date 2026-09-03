import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Sheet } from '../components/Sheet'
import { Stamp } from '../components/Stamp'
import { WeeklyRecap } from '../components/WeeklyRecap'
import { calcolaContributoTrimestrale, contributoTrimestraleAggiornato, getRateTableAt } from '../domain/calculations/contributi'
import { calcolaTfrRivalutato } from '../domain/calculations/tfr'
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
  const rateHistory = useAppStore((s) => s.data.worker.rateHistory)
  const rateTables = useAppStore((s) => s.data.settings.contributionRateTables)
  const tfrRevaluationRates = useAppStore((s) => s.data.settings.tfrRevaluationRates)
  const markContributionPaid = useAppStore((s) => s.markContributionPaid)
  const correggiContributoStorico = useAppStore((s) => s.correggiContributoStorico)
  const [target, setTarget] = useState<QuarterlyContribution | null>(null)
  const [paidAt, setPaidAt] = useState(todayIso())
  const [correctionTarget, setCorrectionTarget] = useState<QuarterlyContribution | null>(null)

  const ordinati = contributions
    .map((c) => contributoTrimestraleAggiornato(c, timeEntries, rateHistory, rateTables))
    .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.quarter - a.quarter))

  const annoCorrente = new Date().getFullYear()
  const primoAnno = Math.min(...rateHistory.map((r) => Number(r.validFrom.slice(0, 4))), annoCorrente)
  const tfr = calcolaTfrRivalutato(timeEntries, rateHistory, tfrRevaluationRates, primoAnno, annoCorrente)
  const anniChiusiSenzaCoefficiente: number[] = []
  for (let y = primoAnno; y < annoCorrente; y++) {
    if (!(tfrRevaluationRates ?? []).some((r) => r.year === y)) anniChiusiSenzaCoefficiente.push(y)
  }

  function apriConferma(c: QuarterlyContribution) {
    setPaidAt(todayIso())
    setTarget(c)
  }

  function confermaVersamento() {
    if (!target) return
    markContributionPaid(target.id, paidAt)
    setTarget(null)
  }

  function confermaCorrezione() {
    if (!correctionTarget) return
    correggiContributoStorico(correctionTarget.id)
    setCorrectionTarget(null)
  }

  const ricalcoloCorrezione = correctionTarget
    ? calcolaContributoTrimestrale(
        timeEntries,
        rateHistory,
        rateTables,
        correctionTarget.year,
        correctionTarget.quarter,
      )
    : null

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
            <p className="card-sub">
              Importo trimestrale totale{c.status === 'da_pagare' ? ' · versi tu entrambe le quote' : ''}
            </p>

            {c.status === 'da_pagare' && (
              <div className="split-row">
                <div className="split-box">
                  <div className="l">Quota datore</div>
                  <div className="v mono">{formatEuro(c.amountEmployer)}</div>
                </div>
                <div className="split-box">
                  <div className="l">Quota lavoratrice (a tuo carico)</div>
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

            {c.status === 'pagato' && (
              <div className="pay-actions">
                <button type="button" className="btn ghost auto" onClick={() => setCorrectionTarget(c)}>
                  Correggi con ore reali
                </button>
              </div>
            )}
          </div>
        )
      })}

      <div className="eyebrow-standalone" style={{ marginTop: 24 }}>TFR</div>
      <div className="ledger-card" style={{ marginTop: 16 }}>
        <p className="card-title">Trattamento di fine rapporto</p>
        <p className="card-sub">Maturato al {formatDataEstesa(todayIso())}</p>
        <div className="stat-grid" style={{ marginTop: 14 }}>
          <div>
            <div className="stat-label">TFR rivalutato dal {primoAnno}</div>
            <div className="stat-value mono" style={{ fontSize: 18 }}>{formatEuro(tfr.totale)}</div>
          </div>
          <div>
            <div className="stat-label">Quota {annoCorrente} (non ancora rivalutata)</div>
            <div className="stat-value mono" style={{ fontSize: 18 }}>{formatEuro(tfr.quotaAnnoCorrente)}</div>
          </div>
        </div>
        <details className="disclosure">
          <summary>Dettaglio calcolo</summary>
          <div className="dbody">
            TFR annuo = (retribuzione annua lorda + rateo tredicesima) / 13,5 (art. 2120 c.c.). Il fondo degli anni
            chiusi è rivalutato col coefficiente ufficiale di ciascun anno (1,5% fisso + 75% inflazione ISTAT FOI,
            applicato al fondo al 31/12 dell&apos;anno precedente) — effetto rivalutazione finora:{' '}
            {formatEuro(tfr.effettoRivalutazione)}. La quota dell&apos;anno in corso non è mai rivalutabile prima
            che il coefficiente di dicembre venga pubblicato.
            {anniChiusiSenzaCoefficiente.length > 0 && (
              <>
                {' '}
                Coefficiente mancante per {anniChiusiSenzaCoefficiente.join(', ')}: quegli anni non sono stati
                rivalutati, aggiorna <code>tfrRevaluationRates</code> non appena disponibile.
              </>
            )}
          </div>
        </details>
      </div>

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

      <Sheet
        open={correctionTarget !== null}
        onClose={() => setCorrectionTarget(null)}
        title={correctionTarget ? `Correggi ${correctionTarget.quarter}° trimestre ${correctionTarget.year}` : ''}
      >
        {correctionTarget && ricalcoloCorrezione && (
          <>
            <p className="card-sub" style={{ marginBottom: 14 }}>
              Ricalcola ore e importo dalle ore effettivamente registrate nel trimestre, lasciando invariati stato
              e data di versamento già salvati.
            </p>
            <div className="split-row">
              <div className="split-box">
                <div className="l">Salvato ora</div>
                <div className="v mono">
                  {formatOre(correctionTarget.periodHours)} · {formatEuro(correctionTarget.amountTotal)}
                </div>
              </div>
              <div className="split-box">
                <div className="l">Dopo la correzione</div>
                <div className="v mono">
                  {formatOre(ricalcoloCorrezione.periodHours)} · {formatEuro(ricalcoloCorrezione.amountTotal)}
                </div>
              </div>
            </div>
            <div className="sheet-actions">
              <button type="button" className="btn ghost auto" onClick={() => setCorrectionTarget(null)}>
                Annulla
              </button>
              <button type="button" className="btn primary" onClick={confermaCorrezione}>
                Conferma correzione
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  )
}
