import type { AppData } from '../domain/types'
import { mergeAppData } from '../domain/merge'
import { downloadData, uploadData, DropboxConflictError, DropboxSchemaMismatchError } from '../dropbox/dataStore'
import { isConnected } from '../dropbox/authClient'
import { readCache, writeCache, markSynced } from './localCache'

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error' | 'not_connected'

type Listener = (status: SyncStatus) => void
const listeners = new Set<Listener>()
let status: SyncStatus = 'not_connected'

function setStatus(next: SyncStatus): void {
  status = next
  for (const listener of listeners) listener(status)
}

export function onSyncStatusChange(listener: Listener): () => void {
  listeners.add(listener)
  listener(status)
  return () => listeners.delete(listener)
}

export function getSyncStatus(): SyncStatus {
  return status
}

/** Da chiamare all'avvio: ritorna i dati da mostrare subito (cache locale se presente),
 * e in background prova a sincronizzare con Dropbox se connesso e online. */
export async function loadInitialData(seed: AppData): Promise<AppData> {
  const cached = await readCache()
  const localData = cached?.data ?? seed
  if (!cached) {
    await writeCache(localData, null, false)
  }

  if (!isConnected()) {
    setStatus('not_connected')
    return localData
  }
  if (!navigator.onLine) {
    setStatus('offline')
    return localData
  }

  setStatus('syncing')
  try {
    const remote = await downloadData()
    if (!remote) {
      // Primo avvio: nessun file remoto ancora, il locale diventa la fonte di verità.
      const rev = await uploadData(localData, null)
      await writeCache(localData, rev, false)
      setStatus('synced')
      return localData
    }
    const merged = cached?.dirty ? mergeAppData(localData, remote.data) : remote.data
    await writeCache(merged, remote.rev, cached?.dirty ?? false)
    if (cached?.dirty) {
      await pushToRemote(merged, remote.rev)
    } else {
      setStatus('synced')
    }
    return merged
  } catch (err) {
    if (err instanceof DropboxSchemaMismatchError) {
      // In sviluppo attivo lo schema dati cambia più spesso del previsto: un file remoto
      // scritto con una forma precedente non è recuperabile campo per campo, quindi lo
      // sovrascriviamo con i dati locali (già nella forma corrente) invece di restare
      // bloccati in errore ad ogni modifica di schema.
      console.warn('File Dropbox con schema obsoleto: verrà sovrascritto con i dati locali correnti.', err)
      try {
        const rev = await uploadData(localData, err.rev)
        await writeCache(localData, rev, false)
        setStatus('synced')
        return localData
      } catch (uploadErr) {
        console.error('Impossibile sovrascrivere il file Dropbox con schema obsoleto:', uploadErr)
        setStatus('error')
        return localData
      }
    }
    console.error('Sincronizzazione iniziale con Dropbox fallita:', err)
    setStatus('error')
    return localData
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null
const PUSH_DEBOUNCE_MS = 1500

/** Salva subito in locale (mai perde dati) e propaga a Dropbox con un debounce. */
export function saveData(data: AppData): void {
  void (async (): Promise<void> => {
    const cached = await readCache()
    await writeCache(data, cached?.rev ?? null, true)
  })()

  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    void flushPendingChanges()
  }, PUSH_DEBOUNCE_MS)
}

async function flushPendingChanges(): Promise<void> {
  if (!isConnected() || !navigator.onLine) {
    setStatus(isConnected() ? 'offline' : 'not_connected')
    return
  }
  const cached = await readCache()
  if (!cached || !cached.dirty) return
  setStatus('syncing')
  await pushToRemote(cached.data, cached.rev)
}

async function pushToRemote(data: AppData, rev: string | null): Promise<void> {
  try {
    const newRev = await uploadData(data, rev)
    await markSynced(newRev)
    setStatus('synced')
  } catch (err) {
    if (err instanceof DropboxConflictError) {
      try {
        const remote = await downloadData()
        if (remote) {
          const merged = mergeAppData(data, remote.data)
          await writeCache(merged, remote.rev, true)
          await pushToRemote(merged, remote.rev)
          return
        }
      } catch (downloadErr) {
        if (downloadErr instanceof DropboxSchemaMismatchError) {
          console.warn('File Dropbox con schema obsoleto in fase di conflitto: verrà sovrascritto.', downloadErr)
          await pushToRemote(data, downloadErr.rev)
          return
        }
        console.error('Salvataggio su Dropbox fallito:', downloadErr)
        setStatus('error')
        return
      }
    }
    console.error('Salvataggio su Dropbox fallito:', err)
    setStatus('error')
  }
}
