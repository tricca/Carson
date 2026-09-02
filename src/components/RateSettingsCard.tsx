import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Sheet } from './Sheet'
import { formatEuro, toLocalIsoDate } from '../domain/format'
import type { RateHistoryEntry } from '../domain/types'

function formatNumeroIt(n: number | undefined): string {
  return n === undefined ? '' : String(n).replace('.', ',')
}

function formatPeriodo(r: RateHistoryEntry): string {
  const inizio = r.validFrom.split('-').reverse().join('/')
  const fine = r.validTo ? r.validTo.split('-').reverse().join('/') : 'oggi'
  return `${inizio} – ${fine}`
}

export function RateSettingsCard() {
  const rateHistory = useAppStore((s) => s.data.worker.rateHistory)
  const updateRate = useAppStore((s) => s.updateRate)
  const rateAttuale = rateHistory.find((r) => r.validTo === null) ?? rateHistory[0]

  const [open, setOpen] = useState(false)
  const [hourlyRate, setHourlyRate] = useState(formatNumeroIt(rateAttuale?.hourlyRate))
  const [weeklyHours, setWeeklyHours] = useState(formatNumeroIt(rateAttuale?.weeklyContractHours))
  const [contractDays, setContractDays] = useState(String(rateAttuale?.contractDaysPerWeek ?? 5))
  const [validFrom, setValidFrom] = useState(toLocalIsoDate(new Date()))
  const [error, setError] = useState<string | null>(null)

  const storico = [...rateHistory].sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))

  function apriModifica() {
    setHourlyRate(formatNumeroIt(rateAttuale?.hourlyRate))
    setWeeklyHours(formatNumeroIt(rateAttuale?.weeklyContractHours))
    setContractDays(String(rateAttuale?.contractDaysPerWeek ?? 5))
    setValidFrom(toLocalIsoDate(new Date()))
    setError(null)
    setOpen(true)
  }

  function salva() {
    const parsedRate = Number(hourlyRate.replace(',', '.'))
    const parsedHours = Number(weeklyHours.replace(',', '.'))
    const parsedDays = Number(contractDays)

    if (!(parsedRate > 0)) return setError('Inserisci una paga oraria valida')
    if (!(parsedHours > 0)) return setError('Inserisci le ore settimanali contrattuali')
    if (!(parsedDays >= 1 && parsedDays <= 7)) return setError('I giorni a settimana devono essere tra 1 e 7')

    try {
      updateRate({
        hourlyRate: parsedRate,
        weeklyContractHours: parsedHours,
        contractDaysPerWeek: parsedDays,
        validFrom,
      })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    }
  }

  return (
    <>
      <div className="ledger-card">
        <div className="pay-top">
          <p className="card-title">Tariffa</p>
          <button type="button" className="link" onClick={apriModifica}>
            Modifica
          </button>
        </div>
        {rateAttuale && (
          <div className="stat-grid" style={{ marginTop: 14 }}>
            <div>
              <div className="stat-label">Paga oraria</div>
              <div className="stat-value mono" style={{ fontSize: 18 }}>{formatEuro(rateAttuale.hourlyRate)}</div>
            </div>
            <div>
              <div className="stat-label">Ore contrattuali</div>
              <div className="stat-value mono" style={{ fontSize: 18 }}>
                {rateAttuale.weeklyContractHours}
                <span className="unit">h/sett.</span>
              </div>
            </div>
          </div>
        )}

        {storico.length > 1 && (
          <details className="disclosure">
            <summary>Storico tariffe ({storico.length})</summary>
            <div className="dbody">
              {storico.map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>{formatPeriodo(r)}</span>
                  <span className="mono">{formatEuro(r.hourlyRate)}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Modifica tariffa">
        <p className="card-sub" style={{ marginBottom: 14 }}>
          La tariffa attuale resta valida per le ore già registrate: la modifica si applica solo da "Valida da" in poi.
        </p>

        <div className="field-label">Paga oraria (€)</div>
        <input className="text-input" inputMode="decimal" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />

        <div className="field-label">Ore contrattuali settimanali</div>
        <input className="text-input" inputMode="decimal" value={weeklyHours} onChange={(e) => setWeeklyHours(e.target.value)} />

        <div className="field-label">Giorni contrattuali a settimana</div>
        <input className="text-input" inputMode="numeric" value={contractDays} onChange={(e) => setContractDays(e.target.value)} />

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
            Salva tariffa
          </button>
        </div>
      </Sheet>
    </>
  )
}
