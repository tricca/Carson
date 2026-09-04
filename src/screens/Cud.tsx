import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { calcolaCud } from '../domain/calculations/cud'
import { formatEuro } from '../domain/format'

export function Cud() {
  const worker = useAppStore((s) => s.data.worker)
  const employer = useAppStore((s) => s.data.settings.employer)
  const payments = useAppStore((s) => s.data.payments)
  const thirteenthMonth = useAppStore((s) => s.data.thirteenthMonth)
  const quarterlyContributions = useAppStore((s) => s.data.quarterlyContributions)
  const [copiato, setCopiato] = useState(false)

  const anno = new Date().getFullYear() - 1
  const cud = calcolaCud(payments, thirteenthMonth, quarterlyContributions, anno)

  const datiIncompleti =
    !employer.firstName.trim() ||
    !employer.lastName.trim() ||
    !employer.address.trim() ||
    !employer.fiscalCode.trim() ||
    !worker.address?.trim() ||
    !worker.fiscalCode?.trim()

  const testo = `DICHIARAZIONE SOSTITUTIVA DEL C.U.D.

DATORE DI LAVORO
Cognome: ${employer.lastName}
Nome: ${employer.firstName}
Residenza: ${employer.address}
Codice Fiscale: ${employer.fiscalCode}
dichiara di aver corrisposto nel periodo:
dal 01/01/${anno} al 31/12/${anno}

al:

DIPENDENTE
Cognome: ${worker.lastName}
Nome: ${worker.firstName}
Residenza: ${worker.address ?? ''}
Codice Fiscale: ${worker.fiscalCode ?? ''}

per prestazioni di lavoro domestico
la retribuzione lorda (comprensiva di tredicesima e contributi) di: ${formatEuro(cud.retribuzioneLorda)}
al netto dei contributi previdenziali di: ${formatEuro(cud.contributiTrattenuti)}
per una retribuzione netta corrisposta di: ${formatEuro(cud.retribuzioneNetta)}
Imponibile assoggettabile all'IRPEF ridotto (lavoro straordinario e premi) di:
TFR corrisposto (anche tramite anticipi) di: `

  async function copia() {
    await navigator.clipboard.writeText(testo)
    setCopiato(true)
    setTimeout(() => setCopiato(false), 2000)
  }

  return (
    <>
      <div className="eyebrow-standalone">CUD {anno}</div>

      {datiIncompleti && (
        <div className="ledger-card" style={{ marginTop: 16 }}>
          <p className="card-sub">
            Mancano alcuni dati anagrafici (datore di lavoro e/o codice fiscale/residenza della
            lavoratrice): <Link to="/altro">completali in Altro</Link> perché il testo sia corretto.
          </p>
        </div>
      )}

      <div className="ledger-card" style={{ marginTop: 16 }}>
        <p className="card-sub" style={{ marginBottom: 10 }}>
          Retribuzione lorda {formatEuro(cud.retribuzioneLorda)} · contributi trattenuti{' '}
          {formatEuro(cud.contributiTrattenuti)} · netto {formatEuro(cud.retribuzioneNetta)}
        </p>
        <textarea
          readOnly
          value={testo}
          rows={22}
          className="text-input"
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.5, resize: 'vertical' }}
          onFocus={(e) => e.currentTarget.select()}
        />
        <div className="pay-actions">
          <button type="button" className="btn primary" onClick={() => void copia()}>
            {copiato ? 'Copiato!' : 'Copia testo'}
          </button>
        </div>
      </div>
    </>
  )
}
