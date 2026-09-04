# Carson

Webapp (PWA) per tracciare ore, pagamenti, contributi INPS trimestrali, TFR e tredicesima
di una collaboratrice domestica. Un'unica famiglia, un unico rapporto di lavoro — non un
gestionale multi-utente. I dati vivono in un file JSON sul Dropbox dell'utente: nessun
backend proprio, nessun account da amministrare oltre a Dropbox stesso.

## Cosa fa

**Oggi** — riepilogo del mese corrente (ore lavorate, maturato, tredicesima dell'anno),
promemoria per il prossimo pagamento mensile e per la prossima scadenza trimestrale INPS,
ultimi movimenti e calendario ore del mese.

**Ore** — registrazione rapida per settimana (form + strip dei giorni), riepilogo mensile,
e uno storico completo (`/ore/storico`) con vista a elenco o a calendario, filtrabile per
anno con dei chip sotto l'header.

**Paghe** — ore registrate e non ancora fatturate vengono proposte automaticamente
(raggruppate per mese e categoria lavoro/ferie, calcolate dalle voci ore non ancora
coperte da un pagamento); da lì si genera il pagamento con un click, poi lo si segna come
pagato con data e nota. Elenco filtrabile per anno.

**Contributi INPS** — due sezioni (chip in cima):
- *Contributi*: i trimestri con ore registrate ma non ancora versati compaiono come
  proposta previsionale (calcolo ipotetico + riepilogo settimanale); registrando il
  versamento si può correggere a mano il monte ore prima di salvare. I trimestri già
  versati restano storicamente congelati, ma sono modificabili o eliminabili in qualsiasi
  momento (tornano a essere una proposta). Elenco filtrabile per anno.
- *Altro*: TFR maturato (rivalutato anno su anno coi coefficienti ISTAT ufficiali) e il
  testo della dichiarazione sostitutiva del CUD dell'anno precedente, già compilato e
  pronto da copiare — con un confronto automatico fra gli importi realmente registrati e
  il calcolo a formula, per far emergere eventuali incongruenze prima di usarlo.

**Altro** — anagrafica e tariffa della lavoratrice, importo contributivo INPS orario
(quota datore/lavoratrice, con storico), dati del datore di lavoro (per il CUD), stato
sincronizzazione Dropbox con ripristino manuale, e un pulsante per forzare l'aggiornamento
della PWA quando la cache del codice resta indietro (frequente su iOS).

## Come funziona

- **Frontend**: React 19 + TypeScript + Vite, mobile-first. Routing con `HashRouter`
  (necessario perché GitHub Pages non fa rewrite lato server per le SPA).
- **Stato**: uno store Zustand unico (`useAppStore`) su un singolo oggetto `AppData`
  validato con uno schema Zod (`domain/types.ts`).
- **Storage**: nessun database — un file `/data/housekeeping-data.json` nell'App Folder
  Dropbox dell'utente (`Apps/<nome app>/`), letto/scritto via Dropbox JS SDK con
  autenticazione **OAuth 2.0 PKCE lato browser** (nessun client secret, nessuna chiamata
  server-side).
- **Cache locale**: IndexedDB (via `idb`) come copia del documento, con un flag `dirty` per
  le modifiche non ancora sincronizzate. Ogni scrittura locale passa da una coda che
  serializza le richieste, per evitare che salvataggi ravvicinati si sovrascrivano a
  vicenda fuori ordine.
- **Sincronizzazione**: avviene **solo all'avvio dell'app** — se il file cambia altrove
  (un altro dispositivo, o una modifica manuale su Dropbox) mentre l'app è già aperta, non
  se ne accorge da sola; in Altro c'è un pulsante "Ripristina da Dropbox" per forzare un
  ri-sync. Il conflict detection usa il `rev` di Dropbox: su mismatch si scarica la
  versione remota e si fa merge per `id` di record (unione delle liste, l'`updatedAt` più
  recente vince sui campi in conflitto). Se il file remoto non valida più contro lo schema
  corrente (versione dell'app diversa tra dispositivi), la sincronizzazione si **ferma in
  stato di errore** invece di sovrascrivere: non c'è modo automatico di perdere dati per un
  disallineamento di schema.
- **PWA**: `vite-plugin-pwa` con aggiornamento automatico del service worker; su iOS il
  controllo automatico non è sempre affidabile, da cui il pulsante di forzatura manuale in
  Altro (svuota cache e service worker, non tocca mai i dati).
- **Hosting**: build statica su GitHub Pages, deploy automatico via GitHub Actions a ogni
  push su `main`.

## Regole di calcolo

- **Tredicesima**: `(Σ ore retribuite nell'anno × paga oraria vigente in ciascun mese) / 12`.
  Usa uno storico delle tariffe (`worker.rateHistory`, con `validFrom`/`validTo`) così un
  aumento a metà anno non altera il calcolo dei mesi precedenti.
- **TFR** (art. 2120 c.c.): `(retribuzione annua lorda + rateo tredicesima) / 13,5` per
  ogni anno. Il fondo degli anni chiusi si rivaluta col coefficiente ufficiale pubblicato
  ogni dicembre (1,5% fisso + 75% inflazione ISTAT FOI), impostato in
  `settings.tfrRevaluationRates`; la quota dell'anno in corso non è mai rivalutata.
- **Contributi INPS**: niente fasce automatiche a tabella — l'importo orario (quota datore
  + quota lavoratrice, separate) si imposta a mano in Altro, con uno storico per data di
  validità, esattamente come la tariffa oraria. Il totale trimestrale è
  `ore del trimestre × importo orario in vigore alla fine del trimestre`.
- **CUD sostitutivo**: retribuzione lorda = pagamenti dell'anno + tredicesima dell'anno;
  contributi trattenuti = quota lavoratrice dei 4 trimestri (la quota datore è un costo
  aggiuntivo, non una trattenuta); netto = lorda − contributi. Calcolato sempre per l'anno
  precedente a quello corrente.

Nessuna di queste percentuali/soglie è hardcoded nel codice come "verità assoluta": sono
tutte impostazioni modificabili dall'utente in Altro, perché INPS le aggiorna nel tempo.

## Data model

Un unico documento JSON (`AppData`, schema in `domain/types.ts`):

- `worker` — anagrafica lavoratrice + `rateHistory[]` (tariffa oraria storicizzata).
- `timeEntries[]` — data, tipo (pulizia/stiro/ferie/malattia), ore.
- `payments[]` — pagamenti mensili, con `coveredEntryIds` per sapere quali ore copre e non
  proporle due volte.
- `quarterlyContributions[]` — trimestri INPS effettivamente registrati (i non ancora
  registrati sono derivati al volo dalle ore, non persistiti finché non si conferma).
- `thirteenthMonth[]` — tredicesime effettivamente pagate.
- `settings` — importo contributivo orario storicizzato, coefficienti di rivalutazione TFR,
  dati del datore di lavoro.

## Sviluppo

```bash
npm install
cp .env.example .env   # inserire VITE_DROPBOX_APP_KEY
npm run dev
```

```bash
npm run test    # test unitari sui calcoli
npm run build   # type-check + build di produzione
npm run lint
```

## Setup Dropbox e deploy

1. **App Dropbox** ([dropbox.com/developers/apps](https://www.dropbox.com/developers/apps)):
   crea un'app "Scoped access → App folder" (isola i dati dal resto del Dropbox
   dell'utente), abilita gli scope `files.content.write`/`files.content.read`, annota
   l'App Key. Aggiungi come redirect URI sia quello di sviluppo (`http://localhost:6001/Carson/`
   — la porta va allineata a quella in `vite.config.ts`) sia quello di produzione
   (`https://<utente>.github.io/Carson/`): un redirect URI che non combacia esattamente fa
   fallire lo scambio del token senza un errore visibile in pagina.
2. **GitHub Pages**: Settings → Pages → Source: "GitHub Actions". Il workflow
   `.github/workflows/deploy.yml` builda ed esegue il deploy a ogni push su `main`.
3. **Secret CI**: Settings → Secrets and variables → Actions → aggiungi
   `VITE_DROPBOX_APP_KEY` con lo stesso valore del `.env` locale (serve in CI per la build,
   `.env` non è versionato).
4. **Primo uso su iPhone**: apri l'URL in Safari, fai login Dropbox **da Safari normale**
   (non da un'eventuale PWA già installata — iOS ha limiti sui redirect OAuth in modalità
   standalone), poi "Condividi → Aggiungi alla schermata Home".
