/**
 * Disinstalla il service worker e svuota le cache che gestisce, poi ricarica la pagina:
 * forza il download dei file più recenti anche quando il controllo automatico di
 * vite-plugin-pwa (registerType: 'autoUpdate') non si attiva da solo — capita spesso
 * sulle PWA installate sulla home di iOS, che tengono la cache più a lungo del previsto.
 * Non tocca i dati dell'app (IndexedDB/localStorage): solo la cache dei file statici.
 */
export async function forzaAggiornamentoApp(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((r) => r.unregister()))
  }
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  }
  window.location.reload()
}
