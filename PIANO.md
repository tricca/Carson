# Piano: WebApp gestione colf (ore, pagamenti, contributi, tredicesima, ferie)

## Contesto

L'utente vuole tracciare il lavoro della propria collaboratrice domestica: ore lavorate, pagamenti mensili, contributi INPS trimestrali, tredicesima, ferie maturate, ricevute/bollettini allegati. Serve accesso da iPhone (uso quotidiano) e idealmente da Mac, con dati sincronizzati/accessibili esternamente per backup.

Durante la discussione sono state scartate due strade più pesanti:
- **App nativa iOS/macOS (SwiftUI)**: scartata perché richiederebbe un account Apple Developer (99€/anno) per un'installazione stabile, o ricompilazioni ogni 7 giorni via Xcode con l'account gratuito — attrito non giustificato per un uso personale.
- **Backend gestito (Supabase/Firebase)**: scartato a favore di una soluzione più semplice, senza un servizio terzo da amministrare.

**Soluzione scelta**: una **webapp (PWA)** — funziona identica su iPhone (Safari, installabile in Home) e su Mac (qualsiasi browser) senza alcun account Apple. Come "database" si usa direttamente **un file JSON + allegati salvati nel Dropbox dell'utente** (già usato/preferito), letto e scritto dal browser via OAuth — zero backend custom da mantenere, e il backup è automatico perché i dati vivono già dentro Dropbox.

## Architettura

- **Frontend**: React + TypeScript + Vite, mobile-first, responsive.
- **PWA**: `vite-plugin-pwa` (manifest + service worker) → installabile su iPhone ("Aggiungi a Home") e Mac (installazione da Chrome/Edge o preferiti/Dock su Safari).
- **Storage/sync**: Dropbox JavaScript SDK, **OAuth 2.0 PKCE lato browser** (nessun client secret, nessun server). App Dropbox di tipo "Scoped access → App folder": crea automaticamente `/Apps/<NomeApp>/` nel Dropbox dell'utente, isolata dal resto dei suoi file.
  - `token_access_type=offline` per ottenere un refresh token persistente (l'access token scade in poche ore).
  - Un file `/data/housekeeping-data.json` contiene tutti i dati strutturati; le ricevute/bollettini (foto/PDF) sono file separati in `/allegati/`, referenziati per path nel JSON (niente base64 dentro il JSON).
- **Cache locale/offline**: IndexedDB (via `idb`) come copia locale del documento, con coda di modifiche pendenti quando offline; sync verso Dropbox con debounce.
- **Conflict detection**: Dropbox assegna un `rev` ad ogni versione del file. Il salvataggio usa `mode: update` con l'ultimo `rev` noto; se c'è mismatch (scrittura concorrente da un altro dispositivo), l'app scarica la versione remota e fa un merge per `id` di record (union delle liste, "ultimo `updatedAt` vince" sui campi in conflitto) — accettabile per un uso single-user su 2 dispositivi non usati simultaneamente.
- **Hosting**: GitHub Pages (gratuito), deploy via GitHub Actions (`actions/deploy-pages`) allo push su `main`. Nessun backend: solo file statici della build Vite.
  - Il sito vive su `https://<utente>.github.io/<repo>/`, non alla radice del dominio → `vite.config.ts` richiede `base: '/<repo>/'`, e il manifest PWA (`vite-plugin-pwa`) deve avere `base`/`scope`/`start_url` allineati allo stesso path.
  - GitHub Pages non fa rewrite lato server per le SPA (niente equivalente del `vercel.json` rewrites): un refresh su una rotta diversa dalla home darebbe 404. Si usa **`HashRouter`** invece di `BrowserRouter` in `react-router-dom` per evitare il problema senza hack (file `404.html` di redirect).
  - `VITE_DROPBOX_APP_KEY` non è un secret (PKCE non ne richiede uno): può essere hardcoded nel repo o passato come variabile nella action, non serve gestione runtime.

Librerie: `dropbox`, `vite-plugin-pwa`, `idb`, `zod` (validazione/migrazione schema), `zustand` (stato globale), `date-fns`, `react-router-dom` (con `HashRouter`).

## Regole di calcolo (Italia — CCNL Lavoro Domestico / INPS)

Punto fermo: **le aliquote/importi INPS non vanno hardcodati** (INPS li aggiorna ~2 volte l'anno). Vanno in una sezione **Impostazioni** editabile dall'utente, versionata per data di validità, con link a inps.it e data di ultimo aggiornamento visibile. Sotto, la logica di calcolo che l'app deve implementare (verificata su più fonti di settore, ma comunque da controllare dall'utente su fonti ufficiali prima dell'uso):

- **Tredicesima**: `tredicesima = (Σ ore retribuite nell'anno × paga oraria vigente in ciascun mese) / 12`. Matura 1/12 per mese lavorato (o frazione ≥15 giorni). Richiede conservare uno **storico delle tariffe** (`rateHistory`), non solo quella corrente, perché un aumento a metà anno non deve alterare il calcolo dei mesi precedenti.
- **Ferie**: base 26 giorni/anno, rateo 26/12 ≈ 2,17 giorni/mese (soglia dei 15 giorni/mese per maturare il rateo, resa **configurabile** perché alcune fonti la applicano diversamente). Per part-time il valore economico della giornata è proporzionale a ore/settimana e giorni contrattuali (formula parametrica in impostazioni, non fissa). L'app traccia maturate / godute / residue, sia in giorni che in valore €.
- **Contributi INPS trimestrali**: importo orario fisso a fasce di retribuzione oraria effettiva (paga + rateo 13ª + eventuale vitto/alloggio), regime differenziato **≤24 ore/settimana** (3 fasce) vs **>24 ore/settimana** (aliquota unica su tutte le ore). Split quota datore/quota lavoratore. CUAF escludibile per rapporti tra coniugi/parenti conviventi entro 3° grado (flag). Scadenze: 10 apr / 10 lug / 10 ott / 10 gen (trimestre precedente). Dal 2026 niente bollettino cartaceo: si registra l'importo dovuto/pagato e si allega la ricevuta/MAV scaricata da INPS — l'app non genera il pagamento, solo lo traccia.

Fonti consultate (da riverificare su INPS.it/CCNL ufficiale prima dell'uso): Domestique, WebColf (tabella contributi), Gallas Group, Colf On-Line, La Legge per Tutti, CentroFiscale, Workledger.

## Data model (file JSON unico su Dropbox)

Sezioni principali del documento:
- `worker`: anagrafica + `rateHistory[]` (tariffa oraria, ore contrattuali, con `validFrom/validTo`) + flag (convivente, CUAF, tipo contratto).
- `timeEntries[]`: data, ore, tipo (lavoro/ferie/malattia/straordinario/assenza), note.
- `payments[]`: periodo, importo dovuto/pagato, data, metodo, stato, allegati.
- `quarterlyContributions[]`: anno/trimestre, scadenza, ore del trimestre, regime, importo dovuto/quota datore/quota lavoratore/CUAF, stato, allegati.
- `thirteenthMonth[]`: anno, importo maturato, stato, allegati.
- `vacations`: parametri (giorni annui, soglia) + record per anno (maturate/godute/residue/valore).
- `settings.contributionRateTables[]`: fasce orarie versionate per data, con nota fonte e link INPS.
- `attachments[]`: riferimento a file Dropbox (path, tipo, entità collegata).

Tutti i valori monetari calcolati vengono **persistiti** (non solo derivati a runtime), così lo storico resta coerente anche se cambiano formule/aliquote future.

## Schermate

1. Onboarding/Login Dropbox (PKCE, setup iniziale dati lavoratrice)
2. Dashboard (riepilogo mese, prossima scadenza contributi, ferie residue, tredicesima maturata, alert scadenze)
3. Inserimento Ore (vista calendario + form rapido + riepilogo mensile)
4. Pagamenti (lista, calcolo automatico, registrazione pagamento + allegato)
5. Contributi Trimestrali (lista trimestri, dettaglio calcolo trasparente, segna pagato + allegato)
6. Tredicesima e Ferie (storico annuale, stato, allegati)
7. Impostazioni (dati lavoratrice, tabella aliquote versionata, parametri ferie, connessione Dropbox, export manuale backup)
8. Gestione Allegati (vista unificata, upload da fotocamera/file picker)

## Procedura di setup (per l'utente)

1. **Dropbox App Console** (dropbox.com/developers/apps): creare app "Scoped access → App folder", abilitare scope `files.content.write`/`files.content.read`, annotare l'App Key, registrare redirect URI. **Importante**: il redirect URI deve includere il `base` path configurato in `vite.config.ts` (`/Carson/`), quindi in sviluppo è `http://localhost:6001/Carson/` (non solo `http://localhost:6001`; nota: la porta 6000 è bloccata dai browser Chromium con `ERR_UNSAFE_PORT`, quindi non è utilizzabile) + `https://tricca.github.io/Carson/` dopo il deploy — un redirect URI che non combacia esattamente fa fallire lo scambio del token senza un messaggio d'errore visibile in pagina (controllare la console del browser).
2. **Scaffold progetto**: `npm create vite@latest housekeeping-app -- --template react-ts`, installare le librerie sopra elencate, configurare `.env` con `VITE_DROPBOX_APP_KEY`.
3. **Ordine di implementazione consigliato**: `domain/types.ts` (+ schema zod) → `domain/calculations/*` (tredicesima, ferie, contributi) → `dropbox/authClient.ts` (PKCE) → `dropbox/dataStore.ts` (get/put con `rev`) → `storage/localCache.ts` (IndexedDB) + `storage/syncEngine.ts` → schermate UI.
4. **Deploy su GitHub Pages**: repo `tricca/Carson`, workflow già presente in `.github/workflows/deploy.yml` (builda con Vite, pubblica con `actions/deploy-pages` a ogni push su `main`). Da fare una tantum su GitHub: (a) Settings → Pages → Source: "GitHub Actions"; (b) Settings → Secrets and variables → Actions → New repository secret `VITE_DROPBOX_APP_KEY` con lo stesso valore del `.env` locale (serve in CI per la build, dato che `.env` non è versionato); (c) dopo il primo deploy, aggiungere `https://tricca.github.io/Carson/` ai redirect URI su Dropbox.
5. **Primo uso su iPhone**: aprire l'URL in Safari, fare login Dropbox **da Safari normale** (non da PWA già installata — iOS ha limiti noti su redirect OAuth in modalità standalone), poi "Condividi → Aggiungi alla schermata Home".
6. **Primo uso su Mac**: aprire l'URL, login Dropbox, installare come app (Chrome/Edge) o aggiungere al Dock (Safari su macOS recenti).

## Verifica

- **Calcoli**: casi di test manuali/unitari con numeri semplici (es. tariffa fissa, ore costanti) confrontati con calcolo a mano; caso con cambio tariffa a metà anno per verificare l'uso dello storico corretto; verifica dei contributi confrontando con simulatori di settore (Domestique, WebColf) usando gli stessi input di prova.
- **Sync/conflitti**: modificare dati da due dispositivi/browser diversi sullo stesso account Dropbox, verificare merge automatico su record diversi e rilevazione di conflitto su modifiche allo stesso record; test offline (disattivare rete, inserire dati, riattivare, verificare svuotamento coda pendente); controllo diretto su dropbox.com che file e allegati compaiano in `/Apps/<NomeApp>/`.
- **PWA**: su iPhone, verificare icona, apertura standalone, funzionamento offline, persistenza sessione Dropbox nel tempo, upload da fotocamera; su Mac, verificare installazione/bookmark, layout responsive, upload da Finder; controllo requisiti minimi PWA con Lighthouse.
