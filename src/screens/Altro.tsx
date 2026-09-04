import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Sheet } from '../components/Sheet'
import { calcolaTredicesima } from '../domain/calculations/tredicesima'
import { formatEuro } from '../domain/format'
import { disconnect, isConnected, startLogin } from '../dropbox/authClient'
import { forzaAggiornamentoApp } from '../pwaUpdate'
import { RateSettingsCard } from '../components/RateSettingsCard'
import { ContributionRateSettingsCard } from '../components/ContributionRateSettingsCard'
import { WorkerProfileCard } from '../components/WorkerProfileCard'
import { EmployerProfileCard } from '../components/EmployerProfileCard'

export function Altro() {
  const data = useAppStore((s) => s.data)
  const { worker } = data
  const restoreFromDropbox = useAppStore((s) => s.restoreFromDropbox)
  const [confermaRipristino, setConfermaRipristino] = useState(false)
  const [ripristinoInCorso, setRipristinoInCorso] = useState(false)
  const [ripristinoErrore, setRipristinoErrore] = useState<string | null>(null)
  const [aggiornamentoInCorso, setAggiornamentoInCorso] = useState(false)

  const year = new Date().getFullYear()
  const earliestYear = Math.min(...worker.rateHistory.map((r) => Number(r.validFrom.slice(0, 4))), year)
  const anni: number[] = []
  for (let y = year; y >= earliestYear; y--) anni.push(y)

  const connected = isConnected()
  const syncStatus = useAppStore((s) => s.syncStatus)

  async function confermaRipristina() {
    setRipristinoInCorso(true)
    setRipristinoErrore(null)
    const risultato = await restoreFromDropbox()
    setRipristinoInCorso(false)
    if (risultato.ok) {
      setConfermaRipristino(false)
    } else {
      setRipristinoErrore(risultato.message)
    }
  }

  async function aggiornaApp() {
    setAggiornamentoInCorso(true)
    await forzaAggiornamentoApp()
  }

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

      <div className="eyebrow-standalone" style={{ marginTop: 24 }}>Datore di lavoro</div>
      <EmployerProfileCard />

      <div className="section-head">
        <div>
          <div className="eyebrow">Storico annuale</div>
          <h2>Tredicesima</h2>
        </div>
      </div>
      <div className="ledger-list">
        {anni.map((y) => {
          const tredicesima = calcolaTredicesima(data.timeEntries, worker.rateHistory, y)
          return (
            <div className="ledger-row" key={y}>
              <span className="rdate mono">{y}</span>
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
        {connected && (
          <p className="card-sub" style={{ marginTop: 6 }}>
            La sincronizzazione avviene solo all&apos;avvio dell&apos;app: se il file su Dropbox cambia mentre
            l&apos;app è già aperta (un altro dispositivo, o una modifica fatta a mano), non se ne accorge da sola.
          </p>
        )}
        <div className="pay-actions">
          {connected ? (
            <>
              <button type="button" className="btn ghost auto" onClick={() => setConfermaRipristino(true)}>
                Ripristina da Dropbox
              </button>
              <button type="button" className="btn ghost" onClick={() => disconnect()}>
                Disconnetti
              </button>
            </>
          ) : (
            <button type="button" className="btn primary" onClick={() => void startLogin()}>
              Connetti Dropbox
            </button>
          )}
        </div>
      </div>

      <div className="section-head">
        <div>
          <div className="eyebrow">App</div>
          <h2>Versione</h2>
        </div>
      </div>
      <div className="ledger-card">
        <p className="card-sub">
          Se dopo un aggiornamento non vedi le novità (capita spesso sulle app salvate sulla home di iOS), forza
          il download dei file più recenti. Non tocca i tuoi dati: quelli restano su Dropbox e nella cache locale
          separata, questo pulisce solo la cache del codice.
        </p>
        <div className="pay-actions">
          <button type="button" className="btn ghost auto" onClick={() => void aggiornaApp()} disabled={aggiornamentoInCorso}>
            {aggiornamentoInCorso ? 'Aggiornamento…' : 'Forza aggiornamento app'}
          </button>
        </div>
      </div>

      <Sheet open={confermaRipristino} onClose={() => setConfermaRipristino(false)} title="Ripristinare da Dropbox?">
        <p className="card-sub" style={{ marginBottom: 14 }}>
          Scarica il file da Dropbox e sovrascrive i dati su questo dispositivo con quello. Eventuali modifiche
          fatte qui e non ancora sincronizzate andranno perse.
        </p>
        {ripristinoErrore && (
          <p className="card-sub" style={{ color: 'var(--stamp)', marginBottom: 10 }}>
            {ripristinoErrore}
          </p>
        )}
        <div className="sheet-actions">
          <button type="button" className="btn ghost auto" onClick={() => setConfermaRipristino(false)}>
            Annulla
          </button>
          <button type="button" className="btn primary" onClick={() => void confermaRipristina()} disabled={ripristinoInCorso}>
            {ripristinoInCorso ? 'Ripristino…' : 'Ripristina'}
          </button>
        </div>
      </Sheet>
    </>
  )
}
