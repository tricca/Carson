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
      // Non sovrascrivere MAI il file remoto in automatico: su un dispositivo appena
      // connesso (cache locale vuota) i "dati locali" sono il seed di esempio, e un
      // upload automatico qui cancellerebbe silenziosamente i dati reali degli altri
      // dispositivi dietro un semplice console.warn che nessuno vede (successo reale:
      // così sono stati persi temporaneamente i dati sincronizzati da un altro device,
      // recuperati poi dalla cronologia versioni di Dropbox). In caso di mismatch,
      // restare bloccati in stato di errore è sempre più sicuro di un upload silenzioso:
      // mostra localData senza toccare il remoto, l'utente lo vede dal pallino di sync.
      console.error(
        'File Dropbox con schema non compatibile con questa versione dell\'app: sincronizzazione sospesa per non rischiare di sovrascrivere dati reali. Aggiorna l\'app su tutti i dispositivi alla stessa versione.',
        err,
      )
      setStatus('error')
      return localData
    }
    console.error('Sincronizzazione iniziale con Dropbox fallita:', err)
    setStatus('error')
    return localData
  }
}

/**
 * Scarica il file remoto e sovrascrive SEMPRE la cache locale con quello, scartando
 * qualunque modifica locale non ancora sincronizzata (`dirty`). Il sync automatico
 * gira solo all'avvio dell'app: se il file viene modificato altrove (un altro
 * dispositivo, o a mano su Dropbox) mentre l'app è già aperta, non se ne accorge da
 * sola — questo è il modo esplicito per allinearsi a quello che c'è ora su Dropbox.
 */
export async function restoreFromRemote(): Promise<{ data: AppData } | { error: string }> {
  if (!isConnected()) return { error: 'Dropbox non connesso' }
  if (!navigator.onLine) return { error: 'Nessuna connessione a Internet' }

  setStatus('syncing')
  try {
    const remote = await downloadData()
    if (!remote) {
      setStatus('error')
      return { error: 'Nessun file trovato su Dropbox' }
    }
    await writeCache(remote.data, remote.rev, false)
    setStatus('synced')
    return { data: remote.data }
  } catch (err) {
    if (err instanceof DropboxSchemaMismatchError) {
      setStatus('error')
      return { error: 'Il file su Dropbox non è compatibile con questa versione dell\'app' }
    }
    console.error('Ripristino da Dropbox fallito:', err)
    setStatus('error')
    return { error: err instanceof Error ? err.message : 'Ripristino fallito' }
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
          // Vedi la nota in loadInitialData: mai sovrascrivere il remoto in automatico su un
          // mismatch di schema, nemmeno qui durante la risoluzione di un conflitto — rischia
          // di cancellare dati reali scritti da un altro dispositivo con schema diverso.
          console.error(
            'File Dropbox con schema non compatibile durante un conflitto: salvataggio sospeso per non rischiare di sovrascrivere dati reali. Aggiorna l\'app su tutti i dispositivi alla stessa versione.',
            downloadErr,
          )
          setStatus('error')
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
