import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Sheet } from './Sheet'
import { formatDataEstesa } from '../domain/format'

function Riga({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="menu-row" style={{ padding: '10px 0', border: 'none' }}>
      <span className="sub">{label}</span>
      <span className="mono" style={{ fontSize: 13 }}>{value}</span>
    </div>
  )
}

export function WorkerProfileCard() {
  const worker = useAppStore((s) => s.data.worker)
  const updateWorkerProfile = useAppStore((s) => s.updateWorkerProfile)

  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState(worker.firstName)
  const [lastName, setLastName] = useState(worker.lastName)
  const [fiscalCode, setFiscalCode] = useState(worker.fiscalCode ?? '')
  const [address, setAddress] = useState(worker.address ?? '')
  const [iban, setIban] = useState(worker.iban ?? '')
  const [inpsRelationshipNumber, setInpsRelationshipNumber] = useState(worker.inpsRelationshipNumber ?? '')
  const [hiringDate, setHiringDate] = useState(worker.hiringDate ?? '')
  const [error, setError] = useState<string | null>(null)

  function apriModifica() {
    setFirstName(worker.firstName)
    setLastName(worker.lastName)
    setFiscalCode(worker.fiscalCode ?? '')
    setAddress(worker.address ?? '')
    setIban(worker.iban ?? '')
    setInpsRelationshipNumber(worker.inpsRelationshipNumber ?? '')
    setHiringDate(worker.hiringDate ?? '')
    setError(null)
    setOpen(true)
  }

  function salva() {
    if (!firstName.trim()) return setError('Inserisci il nome')
    if (!lastName.trim()) return setError('Inserisci il cognome')

    updateWorkerProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fiscalCode: fiscalCode.trim() ? fiscalCode.trim().toUpperCase() : undefined,
      address: address.trim() || undefined,
      iban: iban.trim() ? iban.trim().toUpperCase().replace(/\s+/g, '') : undefined,
      inpsRelationshipNumber: inpsRelationshipNumber.trim() || undefined,
      hiringDate: hiringDate || undefined,
    })
    setOpen(false)
  }

  return (
    <>
      <div className="ledger-card">
        <div className="pay-top">
          <p className="card-title">
            {worker.firstName} {worker.lastName}
          </p>
          <button type="button" className="link" onClick={apriModifica}>
            Modifica
          </button>
        </div>
        <p className="card-sub">
          Contratto {worker.contractType === 'tempo_indeterminato' ? 'a tempo indeterminato' : 'a tempo determinato'}
          {worker.livingWithEmployer ? ' · convivente' : ''}
        </p>

        <div style={{ marginTop: 10 }}>
          <Riga label="Codice fiscale" value={worker.fiscalCode} />
          <Riga label="Residenza" value={worker.address} />
          <Riga label="IBAN" value={worker.iban} />
          <Riga label="N. rapporto INPS" value={worker.inpsRelationshipNumber} />
          <Riga label="Assunta il" value={worker.hiringDate ? formatDataEstesa(worker.hiringDate) : undefined} />
          {!worker.fiscalCode && !worker.address && !worker.iban && !worker.inpsRelationshipNumber && !worker.hiringDate && (
            <p className="card-sub">Nessun dato anagrafico ancora inserito</p>
          )}
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Modifica dati lavoratrice">
        <div className="field-label">Nome</div>
        <input className="text-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />

        <div className="field-label">Cognome</div>
        <input className="text-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />

        <div className="field-label">Codice fiscale</div>
        <input className="text-input" value={fiscalCode} onChange={(e) => setFiscalCode(e.target.value)} placeholder="Opzionale" />

        <div className="field-label">Residenza</div>
        <input
          className="text-input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Via, civico, CAP Città (Provincia) — opzionale"
        />

        <div className="field-label">IBAN</div>
        <input className="text-input" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="Opzionale" />

        <div className="field-label">Numero rapporto INPS</div>
        <input
          className="text-input"
          value={inpsRelationshipNumber}
          onChange={(e) => setInpsRelationshipNumber(e.target.value)}
          placeholder="Opzionale"
        />

        <div className="field-label">Data di assunzione</div>
        <input className="text-input" type="date" value={hiringDate} onChange={(e) => setHiringDate(e.target.value)} />

        {error && (
          <p className="card-sub" style={{ color: 'var(--stamp)', marginTop: 10 }}>
            {error}
          </p>
        )}

        <div className="sheet-actions">
          <button type="button" className="btn ghost auto" onClick={() => setOpen(false)}>
            Annulla
          </button>
          <button type="button" className="btn primary" onClick={salva}>
            Salva dati
          </button>
        </div>
      </Sheet>
    </>
  )
}
