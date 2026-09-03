import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Sheet } from './Sheet'
import { formatEuro, toLocalIsoDate } from '../domain/format'
import type { ContributionRateEntry } from '../domain/types'

function formatNumeroIt(n: number | undefined): string {
  return n === undefined ? '' : String(n).replace('.', ',')
}

function formatPeriodo(r: ContributionRateEntry): string {
  const inizio = r.validFrom.split('-').reverse().join('/')
  const fine = r.validTo ? r.validTo.split('-').reverse().join('/') : 'oggi'
  return `${inizio} – ${fine}`
}

export function ContributionRateSettingsCard() {
  const contributionRateHistory = useAppStore((s) => s.data.settings.contributionRateHistory)
  const updateContributionRate = useAppStore((s) => s.updateContributionRate)
  const attuale = contributionRateHistory.find((r) => r.validTo === null) ?? contributionRateHistory[0]

  const [open, setOpen] = useState(false)
  const [employerAmount, setEmployerAmount] = useState(formatNumeroIt(attuale?.employerAmountPerHour))
  const [workerAmount, setWorkerAmount] = useState(formatNumeroIt(attuale?.workerAmountPerHour))
  const [validFrom, setValidFrom] = useState(toLocalIsoDate(new Date()))
  const [error, setError] = useState<string | null>(null)

  const storico = [...contributionRateHistory].sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))

  function apriModifica() {
    setEmployerAmount(formatNumeroIt(attuale?.employerAmountPerHour))
    setWorkerAmount(formatNumeroIt(attuale?.workerAmountPerHour))
    setValidFrom(toLocalIsoDate(new Date()))
    setError(null)
    setOpen(true)
  }

  function salva() {
    const parsedEmployer = Number(employerAmount.replace(',', '.'))
    const parsedWorker = Number(workerAmount.replace(',', '.'))

    if (!(parsedEmployer >= 0)) return setError('Inserisci un importo valido per la quota datore')
    if (!(parsedWorker >= 0)) return setError('Inserisci un importo valido per la quota lavoratrice')

    try {
      updateContributionRate({ employerAmountPerHour: parsedEmployer, workerAmountPerHour: parsedWorker, validFrom })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    }
  }

  return (
    <>
      <div className="ledger-card">
        <div className="pay-top">
          <p className="card-title">Importo contributivo INPS</p>
          <button type="button" className="link" onClick={apriModifica}>
            Modifica
          </button>
        </div>
        {attuale ? (
          <div className="stat-grid" style={{ marginTop: 14 }}>
            <div>
              <div className="stat-label">Quota datore</div>
              <div className="stat-value mono" style={{ fontSize: 18 }}>
                {formatEuro(attuale.employerAmountPerHour)}
                <span className="unit">/h</span>
              </div>
            </div>
            <div>
              <div className="stat-label">Quota lavoratrice</div>
              <div className="stat-value mono" style={{ fontSize: 18 }}>
                {formatEuro(attuale.workerAmountPerHour)}
                <span className="unit">/h</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="card-sub" style={{ marginTop: 10 }}>
            Non ancora impostato: i trimestri in Contributi non si calcolano finché non lo imposti.
          </p>
        )}

        {storico.length > 1 && (
          <details className="disclosure">
            <summary>Storico importi ({storico.length})</summary>
            <div className="dbody">
              {storico.map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>{formatPeriodo(r)}</span>
                  <span className="mono">
                    {formatEuro(r.employerAmountPerHour)} + {formatEuro(r.workerAmountPerHour)}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Modifica importo contributivo">
        <p className="card-sub" style={{ marginBottom: 14 }}>
          L&apos;importo attuale resta valido per i trimestri già passati: la modifica si applica solo da "Valida
          da" in poi.
        </p>

        <div className="field-label">Quota datore (€/h)</div>
        <input className="text-input" inputMode="decimal" value={employerAmount} onChange={(e) => setEmployerAmount(e.target.value)} />

        <div className="field-label">Quota lavoratrice (€/h)</div>
        <input className="text-input" inputMode="decimal" value={workerAmount} onChange={(e) => setWorkerAmount(e.target.value)} />

        <div className="field-label">Valida da</div>
        <input className="text-input" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />

        {error && (
          <p className="card-sub" style={{ color: 'var(--stamp)', marginTop: 10 }}>
            {error}
          </p>
        )}

        <div className="sheet-actions">
          <button type="button" className="btn ghost auto" onClick={() => setOpen(false)}>
            Annulla
          </button>
          <button type="button" className="btn primary" onClick={salva}>
            Salva importo
          </button>
        </div>
      </Sheet>
    </>
  )
}
