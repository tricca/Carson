import { isConnected } from './authClient'

/** Ha senso provare a caricare un documento: Dropbox collegato e connessione presente.
 * Va letta al momento del render/uso, non memorizzata (lo stato cambia da solo). */
export function puoCaricareDocumenti(): boolean {
  return isConnected() && navigator.onLine
}

/** Messaggio per l'utente per un'operazione fallita sui documenti Dropbox (upload o link
 * temporaneo). Il dettaglio tecnico va in console: l'errore del SDK Dropbox è un JSON illeggibile. */
export function messaggioErroreDocumenti(err: unknown): string {
  console.error('Operazione sui documenti Dropbox fallita:', err)
  if (!isConnected()) return 'Dropbox non è collegato: collegalo da Altro per usare i documenti.'
  if (!navigator.onLine) return 'Nessuna connessione a Internet: riprova quando sei di nuovo online.'
  return 'Operazione su Dropbox non riuscita: riprova fra poco.'
}
