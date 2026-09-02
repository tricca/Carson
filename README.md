# Carson

Webapp (PWA) per tracciare ore, pagamenti, contributi INPS trimestrali, tredicesima e ferie di una collaboratrice domestica. Dati salvati su Dropbox (file JSON + allegati), nessun backend proprio.

Il piano completo — architettura, regole di calcolo, data model, procedura di setup — è in [PIANO.md](./PIANO.md).

## Sviluppo

```bash
npm install
cp .env.example .env   # inserire VITE_DROPBOX_APP_KEY quando si crea l'app su Dropbox
npm run dev
```

```bash
npm run test    # test unitari sui calcoli (tredicesima, ferie, contributi)
npm run build   # build di produzione
npm run lint
```

## Stato

- [x] Scaffold Vite + React + TypeScript
- [x] Dominio: tipi/schema Zod, calcoli tredicesima/ferie/contributi con test unitari
- [x] Client Dropbox (PKCE, get/put con conflict detection su `rev`)
- [x] Cache locale IndexedDB + sync engine con merge per id/`updatedAt`
- [x] UI mobile-first (5 schermate, PWA, GitHub Pages ready)
- [x] Proposta e generazione pagamenti da ore non fatturate, tracciate per singola voce
- [ ] Upload allegati (ricevute/MAV) da fotocamera/file picker
- [ ] Schermata Impostazioni (modifica tariffe, parametri ferie, tabelle contributi)
- [ ] Generazione automatica tredicesima di fine anno
