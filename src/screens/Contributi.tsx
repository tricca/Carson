import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { Sheet } from '../components/Sheet'
import { Stamp } from '../components/Stamp'
import { WeeklyRecap } from '../components/WeeklyRecap'
import {
  calcolaContributoDaOre,
  contributoTrimestraleAggiornato,
  oreTrimestre,
  proposteContributiTrimestrali,
  quarterRange,
  type ContributoProposta,
  type ContributoTrimestrale,
} from '../domain/calculations/contributi'
import { getContributionRateAt } from '../domain/calculations/contributionRates'
import { getRateAt } from '../domain/calculations/rates'
import { calcolaTfrRivalutato } from '../domain/calculations/tfr'
import { calcolaCud } from '../domain/calculations/cud'
import { formatDataEstesa, formatEuro, formatOre, toLocalIsoDate } from '../domain/format'
import type { ContributionRateEntry, QuarterlyContribution } from '../domain/types'

const REGIME_LABEL: Record<QuarterlyContribution['regime'], string> = {
  fino_24h: '≤24h/sett. · 3 fasce',
  oltre_24h: '>24h/sett. · aliquota unica',
}

const INPS_INFO_URL =
  'https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.02.lavoratori-domestici-i-contributi-dovuti-per-il-2026.html'

type Sezione = 'contributi' | 'altro'

type VersamentoTarget =
  | { kind: 'existing'; contribution: QuarterlyContribution }
  | { kind: 'proposal'; proposta: ContributoProposta }

function todayIso(): string {
  return toLocalIsoDate(new Date())
}

function formatNumeroIt(n: number): string {
  return String(n).replace('.', ',')
}

function tryGetContributionRateAt(history: ContributionRateEntry[], date: string): ContributionRateEntry | null {
  try {
    return getContributionRateAt(history, date)
  } catch {
    return null
  }
}

export function Contributi() {
  const contributions = useAppStore((s) => s.data.quarterlyContributions)
  const timeEntries = useAppStore((s) => s.data.timeEntries)
  const worker = useAppStore((s) => s.data.worker)
  const rateHistory = worker.rateHistory
  const cuafExempt = worker.cuafExempt
  const employer = useAppStore((s) => s.data.settings.employer)
  const payments = useAppStore((s) => s.data.payments)
  const thirteenthMonth = useAppStore((s) => s.data.thirteenthMonth)
  const contributionRateHistory = useAppStore((s) => s.data.settings.contributionRateHistory)
  const tfrRevaluationRates = useAppStore((s) => s.data.settings.tfrRevaluationRates)
  const salvaVersamentoContributo = useAppStore((s) => s.salvaVersamentoContributo)
  const deleteContribution = useAppStore((s) => s.deleteContribution)
  const [target, setTarget] = useState<VersamentoTarget | null>(null)
  const [oreCorrette, setOreCorrette] = useState('0')
  const [paidAt, setPaidAt] = useState(todayIso())
  const [nota, setNota] = useState('')
  const [toDelete, setToDelete] = useState<QuarterlyContribution | null>(null)
  const [sezione, setSezione] = useState<Sezione>('contributi')
  const [cudCopiato, setCudCopiato] = useState(false)

  const contributionRateSet = contributionRateHistory.length > 0

  const annoCorrente = new Date().getFullYear()
  const anniConContributi = [...new Set(contributions.map((c) => c.year))]
  const anni = [...new Set([annoCorrente, ...anniConContributi])].sort((a, b) => b - a)
  const [annoSelezionato, setAnnoSelezionato] = useState(annoCorrente)

  // Le proposte riguardano sempre trimestri recenti non ancora versati: hanno senso solo
  // guardando l'anno corrente, non sfogliando un anno passato.
  const proposte =
    contributionRateSet && annoSelezionato === annoCorrente
      ? proposteContributiTrimestrali(timeEntries, rateHistory, contributionRateHistory, contributions)
      : []

  const ordinati = contributions
    .filter((c) => c.year === annoSelezionato)
    .map((c) => (contributionRateSet ? contributoTrimestraleAggiornato(c, timeEntries, rateHistory, contributionRateHistory) : c))
    .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.quarter - a.quarter))

  const primoAnno = Math.min(...rateHistory.map((r) => Number(r.validFrom.slice(0, 4))), annoCorrente)
  const tfr = calcolaTfrRivalutato(timeEntries, rateHistory, tfrRevaluationRates, primoAnno, annoCorrente)
  const anniChiusiSenzaCoefficiente: number[] = []
  for (let y = primoAnno; y < annoCorrente; y++) {
    if (!(tfrRevaluationRates ?? []).some((r) => r.year === y)) anniChiusiSenzaCoefficiente.push(y)
  }

  const annoCud = annoCorrente - 1
  const cud = calcolaCud(payments, thirteenthMonth, contributions, annoCud)
  const cudDatiIncompleti =
    !employer.firstName.trim() ||
    !employer.lastName.trim() ||
    !employer.address.trim() ||
    !employer.fiscalCode.trim() ||
    !worker.address?.trim() ||
    !worker.fiscalCode?.trim()
  const testoCud = `DICHIARAZIONE SOSTITUTIVA DEL C.U.D.

DATORE DI LAVORO
Cognome: ${employer.lastName}
Nome: ${employer.firstName}
Residenza: ${employer.address}
Codice Fiscale: ${employer.fiscalCode}
dichiara di aver corrisposto nel periodo:
dal 01/01/${annoCud} al 31/12/${annoCud}

al:

DIPENDENTE
Cognome: ${worker.lastName}
Nome: ${worker.firstName}
Residenza: ${worker.address ?? ''}
Codice Fiscale: ${worker.fiscalCode ?? ''}

per prestazioni di lavoro domestico
la retribuzione lorda (comprensiva di tredicesima e contributi) di: ${formatEuro(cud.retribuzioneLorda)}
al netto dei contributi previdenziali di: ${formatEuro(cud.contributiTrattenuti)}
per una retribuzione netta corrisposta di: ${formatEuro(cud.retribuzioneNetta)}
Imponibile assoggettabile all'IRPEF ridotto (lavoro straordinario e premi) di:
TFR corrisposto (anche tramite anticipi) di: `

  async function copiaCud() {
    await navigator.clipboard.writeText(testoCud)
    setCudCopiato(true)
    setTimeout(() => setCudCopiato(false), 2000)
  }

  function apriConfermaEsistente(c: QuarterlyContribution) {
    const oreReali = oreTrimestre(timeEntries, quarterRange(c.year, c.quarter))
    setOreCorrette(formatNumeroIt(oreReali))
    setPaidAt(c.paidAt ?? todayIso())
    setNota(c.note ?? '')
    setTarget({ kind: 'existing', contribution: c })
  }

  function apriConfermaProposta(p: ContributoProposta) {
    setOreCorrette(formatNumeroIt(p.periodHours))
    setPaidAt(todayIso())
    setNota('')
    setTarget({ kind: 'proposal', proposta: p })
  }

  const targetInfo = target
    ? target.kind === 'existing'
      ? {
          year: target.contribution.year,
          quarter: target.contribution.quarter,
          dueDate: target.contribution.dueDate,
          cuafExcluded: target.contribution.cuafExcluded,
        }
      : {
          year: target.proposta.year,
          quarter: target.proposta.quarter,
          dueDate: target.proposta.dueDate,
          cuafExcluded: cuafExempt,
        }
    : null

  let anteprima: ContributoTrimestrale | null = null
  if (targetInfo) {
    const ore = Number(oreCorrette.replace(',', '.'))
    const contributionRate = tryGetContributionRateAt(contributionRateHistory, targetInfo.dueDate)
    if (!Number.isNaN(ore) && ore >= 0 && contributionRate) {
      const weeklyContractHours = getRateAt(rateHistory, targetInfo.dueDate).weeklyContractHours
      anteprima = calcolaContributoDaOre(ore, contributionRate, weeklyContractHours)
    }
  }

  function confermaVersamento() {
    if (!target || !targetInfo || !anteprima) return
    salvaVersamentoContributo({
      id: target.kind === 'existing' ? target.contribution.id : undefined,
      year: targetInfo.year,
      quarter: targetInfo.quarter,
      dueDate: targetInfo.dueDate,
      periodHours: anteprima.periodHours,
      regime: anteprima.regime,
      amountTotal: anteprima.amountTotal,
      amountEmployer: anteprima.amountEmployer,
      amountWorker: anteprima.amountWorker,
      cuafExcluded: targetInfo.cuafExcluded,
      paidAt,
      note: nota.trim() || undefined,
    })
    setTarget(null)
  }

  function confermaEliminazione() {
    if (!toDelete) return
    deleteContribution(toDelete.id)
    setToDelete(null)
  }

  return (
    <>
      <div className="seg-row">
        <button type="button" className={`seg-btn${sezione === 'contributi' ? ' active' : ''}`} onClick={() => setSezione('contributi')}>
          Contributi
        </button>
        <button type="button" className={`seg-btn${sezione === 'altro' ? ' active' : ''}`} onClick={() => setSezione('altro')}>
          Altro
        </button>
      </div>

      {sezione === 'contributi' && (
        <>
      {anni.length > 1 && (
        <div className="seg-row" style={{ marginTop: 10 }}>
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

      {!contributionRateSet && (
        <div className="ledger-card">
          <p className="card-title">Imposta l&apos;importo contributivo</p>
          <p className="card-sub" style={{ marginTop: 6 }}>
            Prima di vedere qui i trimestri, vai in Altro e imposta quanto versi all&apos;INPS per ogni ora
            lavorata (quota datore e quota lavoratrice).
          </p>
        </div>
      )}

      {proposte.length > 0 && (
        <>
          <div className="eyebrow-standalone">Ore registrate, non ancora versate</div>
          {proposte.map((p) => (
            <div className="ledger-card" key={`proposta-${p.year}-${p.quarter}`} style={{ marginTop: 16 }}>
              <div className="pay-top">
                <p className="card-title">
                  {p.quarter}&deg; trimestre {p.year}
                </p>
                <span className="chip info">Da registrare</span>
              </div>
              <p className="card-sub">Scadenza {formatDataEstesa(p.dueDate)}</p>

              <div className="stat-grid" style={{ marginTop: 14 }}>
                <div>
                  <div className="stat-label">Ore periodo</div>
                  <div className="stat-value mono" style={{ fontSize: 18 }}>
                    {formatOre(p.periodHours)}
                  </div>
                </div>
                <div>
                  <div className="stat-label">Regime</div>
                  <div style={{ fontSize: 13, fontWeight: 600, paddingTop: 4 }}>{REGIME_LABEL[p.regime]}</div>
                </div>
              </div>

              <p className="pay-amount mono" style={{ marginTop: 16 }}>
                {formatEuro(p.amountTotal)}
              </p>
              <p className="card-sub">Importo trimestrale totale (ipotetico) · versi tu entrambe le quote</p>

              <div className="split-row">
                <div className="split-box">
                  <div className="l">Quota datore</div>
                  <div className="v mono">{formatEuro(p.amountEmployer)}</div>
                </div>
                <div className="split-box">
                  <div className="l">Quota lavoratrice (a tuo carico)</div>
                  <div className="v mono">{formatEuro(p.amountWorker)}</div>
                </div>
              </div>

              <WeeklyRecap timeEntries={timeEntries} year={p.year} quarter={p.quarter} />

              <div className="pay-actions">
                <button type="button" className="btn primary" onClick={() => apriConfermaProposta(p)}>
                  Registra versamento
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="eyebrow-standalone" style={{ marginTop: proposte.length > 0 ? 26 : 6 }}>
        Scadenze trimestrali
      </div>

      {ordinati.length === 0 && <p className="card-sub">Nessun trimestre registrato nel {annoSelezionato}</p>}

      {ordinati.map((c) => {
        const rateInfo = tryGetContributionRateAt(contributionRateHistory, c.dueDate)
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

            <p className="pay-amount mono" style={{ marginTop: 16 }}>
              {formatEuro(c.amountTotal)}
            </p>
            <p className="card-sub">Importo trimestrale totale · versi tu entrambe le quote</p>

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

            {c.note && <p className="card-sub" style={{ marginTop: 8 }}>{c.note}</p>}

            <details className="disclosure">
              <summary>Dettaglio calcolo</summary>
              <div className="dbody">
                {rateInfo ? (
                  <>
                    Importo orario in vigore al {formatDataEstesa(c.dueDate)}: quota datore{' '}
                    {formatEuro(rateInfo.employerAmountPerHour)}/h, quota lavoratrice {formatEuro(rateInfo.workerAmountPerHour)}/h.{' '}
                  </>
                ) : (
                  'Nessun importo contributivo impostato per questa data. '
                )}
                CUAF {c.cuafExcluded ? 'escluso' : 'non escluso'}.
                <br />
                <a href={INPS_INFO_URL} target="_blank" rel="noreferrer">
                  Verifica su INPS.it &rarr;
                </a>
              </div>
            </details>

            <WeeklyRecap timeEntries={timeEntries} year={c.year} quarter={c.quarter} />

            <div className="pay-actions">
              <button type="button" className={c.status === 'da_pagare' ? 'btn primary' : 'btn ghost auto'} onClick={() => apriConfermaEsistente(c)}>
                {c.status === 'da_pagare' ? 'Registra versamento' : 'Modifica versamento'}
              </button>
              <button type="button" className="btn danger-ghost" onClick={() => setToDelete(c)}>
                Elimina versamento
              </button>
            </div>
          </div>
        )
      })}
        </>
      )}

      {sezione === 'altro' && (
        <>
          <div className="eyebrow-standalone">TFR</div>
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
                TFR annuo = (retribuzione annua lorda + rateo tredicesima) / 13,5 (art. 2120 c.c.). Il fondo degli
                anni chiusi è rivalutato col coefficiente ufficiale di ciascun anno (1,5% fisso + 75% inflazione
                ISTAT FOI, applicato al fondo al 31/12 dell&apos;anno precedente) — effetto rivalutazione finora:{' '}
                {formatEuro(tfr.effettoRivalutazione)}. La quota dell&apos;anno in corso non è mai rivalutabile
                prima che il coefficiente di dicembre venga pubblicato.
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

          <div className="eyebrow-standalone" style={{ marginTop: 24 }}>Documenti</div>
          <div className="ledger-card" style={{ marginTop: 16 }}>
            <p className="card-title">CUD {annoCud}</p>
            <p className="card-sub" style={{ marginTop: 6 }}>
              Retribuzione lorda {formatEuro(cud.retribuzioneLorda)} · contributi trattenuti{' '}
              {formatEuro(cud.contributiTrattenuti)} · netto {formatEuro(cud.retribuzioneNetta)}
            </p>

            {cudDatiIncompleti && (
              <p className="card-sub" style={{ marginTop: 10, color: 'var(--stamp)' }}>
                Mancano alcuni dati anagrafici (datore di lavoro e/o codice fiscale/residenza della lavoratrice):{' '}
                <Link to="/altro">completali in Altro</Link> perché il testo sia corretto.
              </p>
            )}

            <textarea
              readOnly
              value={testoCud}
              rows={22}
              className="text-input"
              style={{ width: '100%', marginTop: 12, fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.5, resize: 'vertical' }}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="pay-actions">
              <button type="button" className="btn primary" onClick={() => void copiaCud()}>
                {cudCopiato ? 'Copiato!' : 'Copia testo'}
              </button>
            </div>
          </div>
        </>
      )}

      <Sheet
        open={target !== null}
        onClose={() => setTarget(null)}
        title={targetInfo ? `Registra versamento — ${targetInfo.quarter}° trimestre ${targetInfo.year}` : ''}
      >
        {target && targetInfo && (
          <>
            <p className="card-sub" style={{ marginBottom: 14 }}>
              Ore registrate nel trimestre: correggile se necessario, l&apos;importo si ricalcola in automatico.
            </p>

            <div className="field-label">Ore periodo</div>
            <input className="text-input" inputMode="decimal" value={oreCorrette} onChange={(e) => setOreCorrette(e.target.value)} />

            {anteprima ? (
              <p className="card-sub" style={{ marginTop: 10 }}>
                <strong className="mono">{formatEuro(anteprima.amountTotal)}</strong> totale · datore{' '}
                {formatEuro(anteprima.amountEmployer)} · lavoratrice {formatEuro(anteprima.amountWorker)}
              </p>
            ) : (
              <p className="card-sub" style={{ marginTop: 10, color: 'var(--stamp)' }}>
                Nessun importo contributivo impostato per il {formatDataEstesa(targetInfo.dueDate)}: impostalo in Altro.
              </p>
            )}

            <div className="field-label">Data versamento</div>
            <input className="text-input" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />

            <div className="field-label">Nota</div>
            <input
              className="text-input"
              type="text"
              placeholder="Opzionale (es. bonifico, F24...)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />

            <div className="sheet-actions">
              <button type="button" className="btn ghost auto" onClick={() => setTarget(null)}>
                Annulla
              </button>
              <button type="button" className="btn primary" onClick={confermaVersamento} disabled={!anteprima}>
                Conferma versamento
              </button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={toDelete !== null} onClose={() => setToDelete(null)} title="Eliminare questo versamento?">
        {toDelete && (
          <>
            <p className="card-sub" style={{ marginBottom: 14 }}>
              {toDelete.quarter}&deg; trimestre {toDelete.year} &middot; {formatEuro(toDelete.amountTotal)}
              {toDelete.status === 'pagato' ? ' · già segnato come versato' : ''}. Il trimestre torna a comparire
              come proposta previsionale calcolata dalle ore reali.
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
