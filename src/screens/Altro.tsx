import { useAppStore } from '../store/useAppStore'
import { calcolaFerieAnno } from '../domain/calculations/ferie'
import { calcolaTredicesima } from '../domain/calculations/tredicesima'
import { formatEuro, formatGiorni } from '../domain/format'
import { disconnect, isConnected, startLogin } from '../dropbox/authClient'
import { RateSettingsCard } from '../components/RateSettingsCard'
import { ContributionRateSettingsCard } from '../components/ContributionRateSettingsCard'
import { WorkerProfileCard } from '../components/WorkerProfileCard'

export function Altro() {
  const data = useAppStore((s) => s.data)
  const { worker } = data

  const year = new Date().getFullYear()
  const earliestYear = Math.min(...worker.rateHistory.map((r) => Number(r.validFrom.slice(0, 4))), year)
  const anni: number[] = []
  for (let y = year; y >= earliestYear; y--) anni.push(y)

  const connected = isConnected()
  const syncStatus = useAppStore((s) => s.syncStatus)

  const SYNC_DETAIL: Record<string, string> = {
    not_connected: 'Connetti Dropbox per sincronizzare i dati tra i dispositivi',
    offline: 'Nessuna connessione a Internet: i dati sono salvati solo su questo dispositivo per ora',
    syncing: 'Sincronizzazione in corso…',
    synced: 'File salvato in Apps/<nome della tua app Dropbox>/data/housekeeping-data.json',
    error: "Sincronizzazione fallita: apri la console del browser per il dettaglio dell'errore",
  }

  return (
    <>
      <div className="eyebrow-standalone">Lavoratrice</div>
      <WorkerProfileCard />

      <RateSettingsCard />
      <div style={{ marginTop: 16 }}>
        <ContributionRateSettingsCard />
      </div>

      <div className="section-head">
        <div>
          <div className="eyebrow">Storico annuale</div>
          <h2>Tredicesima e ferie</h2>
        </div>
      </div>
      <div className="ledger-list">
        {anni.map((y) => {
          const ferie = calcolaFerieAnno(data.timeEntries, worker.rateHistory, data.vacations.settings, y)
          const tredicesima = calcolaTredicesima(data.timeEntries, worker.rateHistory, y)
          return (
            <div className="ledger-row" key={y}>
              <span className="rdate mono">{y}</span>
              <span className="rtype">
                Ferie {formatGiorni(ferie.daysAccrued - ferie.daysTaken)}gg residue
              </span>
              <span className="rhours mono">{formatEuro(tredicesima)}</span>
            </div>
          )
        })}
      </div>

      <div className="section-head">
        <div>
          <div className="eyebrow">Dati</div>
          <h2>Sincronizzazione</h2>
        </div>
      </div>
      <div className="ledger-card">
        <p className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`sync-dot${syncStatus === 'syncing' ? ' syncing' : ''}${syncStatus === 'error' ? ' error' : ''}${syncStatus === 'offline' || syncStatus === 'not_connected' ? ' offline' : ''}`} />
          {connected ? 'Connesso a Dropbox' : 'Dropbox non connesso'}
        </p>
        <p className="card-sub">{SYNC_DETAIL[syncStatus]}</p>
        <div className="pay-actions">
          {connected ? (
            <button type="button" className="btn ghost" onClick={() => disconnect()}>
              Disconnetti
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={() => void startLogin()}>
              Connetti Dropbox
            </button>
          )}
        </div>
      </div>
    </>
  )
}
