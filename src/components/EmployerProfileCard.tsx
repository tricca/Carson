import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Sheet } from './Sheet'

function Riga({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="menu-row" style={{ padding: '10px 0', border: 'none' }}>
      <span className="sub">{label}</span>
      <span className="mono" style={{ fontSize: 13 }}>{value}</span>
    </div>
  )
}

export function EmployerProfileCard() {
  const employer = useAppStore((s) => s.data.settings.employer)
  const updateEmployer = useAppStore((s) => s.updateEmployer)

  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState(employer.firstName)
  const [lastName, setLastName] = useState(employer.lastName)
  const [address, setAddress] = useState(employer.address)
  const [fiscalCode, setFiscalCode] = useState(employer.fiscalCode)
  const [error, setError] = useState<string | null>(null)

  function apriModifica() {
    setFirstName(employer.firstName)
    setLastName(employer.lastName)
    setAddress(employer.address)
    setFiscalCode(employer.fiscalCode)
    setError(null)
    setOpen(true)
  }

  function salva() {
    if (!firstName.trim()) return setError('Inserisci il nome')
    if (!lastName.trim()) return setError('Inserisci il cognome')

    updateEmployer({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      address: address.trim(),
      fiscalCode: fiscalCode.trim().toUpperCase(),
    })
    setOpen(false)
  }

  const haDati = employer.firstName || employer.lastName || employer.address || employer.fiscalCode

  return (
    <>
      <div className="ledger-card">
        <div className="pay-top">
          <p className="card-title">
            {haDati ? `${employer.firstName} ${employer.lastName}`.trim() : 'Datore di lavoro'}
          </p>
          <button type="button" className="link" onClick={apriModifica}>
            Modifica
          </button>
        </div>
        <p className="card-sub">Usati per generare il CUD sostitutivo</p>

        <div style={{ marginTop: 10 }}>
          <Riga label="Codice fiscale" value={employer.fiscalCode} />
          <Riga label="Residenza" value={employer.address} />
          {!haDati && <p className="card-sub">Nessun dato ancora inserito</p>}
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Modifica dati datore di lavoro">
        <div className="field-label">Nome</div>
        <input className="text-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />

        <div className="field-label">Cognome</div>
        <input className="text-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />

        <div className="field-label">Residenza</div>
        <input
          className="text-input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Via, civico, CAP Città (Provincia)"
        />

        <div className="field-label">Codice fiscale</div>
        <input className="text-input" value={fiscalCode} onChange={(e) => setFiscalCode(e.target.value)} />

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
