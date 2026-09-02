import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { Sheet } from './Sheet'
import { TimeEntryForm } from './TimeEntryForm'
import { useAppStore } from '../store/useAppStore'
import { startLogin } from '../dropbox/authClient'
import { fullName, toLocalIsoDate } from '../domain/format'
import type { SyncStatus } from '../storage/syncEngine'

const TITLES: Record<string, string> = {
  '/': 'Oggi',
  '/ore': 'Ore lavorate',
  '/ore/storico': 'Storico ore',
  '/pagamenti': 'Pagamenti',
  '/contributi': 'Contributi INPS',
  '/altro': 'Altro',
}

const STATUS_LABEL: Record<SyncStatus, string> = {
  not_connected: 'Connetti Dropbox',
  offline: 'Offline',
  syncing: 'Sincronizzazione…',
  synced: 'Sincronizzato',
  error: 'Errore di sync',
}

export function AppShell() {
  const location = useLocation()
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddDate, setQuickAddDate] = useState(toLocalIsoDate(new Date()))
  const syncStatus = useAppStore((s) => s.syncStatus)
  const workerName = useAppStore((s) => fullName(s.data.worker))
  const addTimeEntry = useAppStore((s) => s.addTimeEntry)
  const brandingImageUrl = useAppStore((s) => s.brandingImageUrl)

  const title = TITLES[location.pathname] ?? 'Carson'

  useEffect(() => {
    if (!brandingImageUrl) return
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (link) link.href = brandingImageUrl
  }, [brandingImageUrl])

  function handleSyncBadgeClick() {
    if (syncStatus === 'not_connected') void startLogin()
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Registro &middot; {workerName}</span>
          <h1>{title}</h1>
        </div>
        <button className="sync-badge" onClick={handleSyncBadgeClick} type="button">
          <span className={`sync-dot ${syncStatus === 'syncing' ? 'syncing' : ''} ${syncStatus === 'error' ? 'error' : ''} ${syncStatus === 'offline' || syncStatus === 'not_connected' ? 'offline' : ''}`} />
          {STATUS_LABEL[syncStatus]}
        </button>
      </header>

      <main className="screen-area" key={location.pathname}>
        <Outlet />
      </main>

      <button
        className="fab"
        aria-label="Registra ore rapide"
        onClick={() => {
          setQuickAddDate(toLocalIsoDate(new Date()))
          setQuickAddOpen(true)
        }}
      >
        +
      </button>

      <BottomNav />

      <Sheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title="Registra ore rapide">
        <TimeEntryForm
          date={quickAddDate}
          onDateChange={setQuickAddDate}
          submitLabel="Registra"
          showNote={false}
          onSubmit={(entry) => {
            addTimeEntry(entry)
            setQuickAddOpen(false)
          }}
        />
      </Sheet>
    </div>
  )
}
