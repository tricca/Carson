import { useState, type ReactNode } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getAttachmentTemporaryLink } from '../dropbox/dataStore'
import { messaggioErroreDocumenti, puoCaricareDocumenti } from '../dropbox/attachmentErrors'
import {
  CONTRIBUTION_DOCUMENT_KINDS,
  CONTRIBUTION_DOCUMENT_LABEL,
  contributionDocumentFileName,
  documentiContributo,
  isPdf,
  type ContributionDocumentKind,
  type ContributionDocuments as PickedDocuments,
} from '../domain/attachments'
import type { Attachment } from '../domain/types'
import { DocumentIcon } from './icons'

const MISSING_LABEL: Record<ContributionDocumentKind, string> = {
  bollettino: 'Bollettino non allegato',
  ricevuta: 'Ricevuta non allegata',
  altro: 'Documento di pagamento non allegato',
}

interface PdfChooserProps {
  children: ReactNode
  disabled?: boolean
  onFile: (file: File) => void
  onInvalid: (message: string) => void
}

/** Pulsante-etichetta che apre il selettore file. L'input resta nell'albero (visualmente
 * nascosto, non `display:none`) così è raggiungibile da tastiera. `accept` è solo un
 * suggerimento del browser: il controllo vero sul PDF lo facciamo noi. */
function PdfChooser({ children, disabled, onFile, onInvalid }: PdfChooserProps) {
  return (
    <label className={`doc-action${disabled ? ' disabled' : ''}`}>
      {children}
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="visually-hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0]
          // Svuota il valore così scegliere di nuovo lo stesso file fa scattare ancora onChange.
          e.target.value = ''
          if (!file) return
          if (!isPdf(file)) {
            onInvalid('Il documento deve essere un file PDF.')
            return
          }
          onFile(file)
        }}
      />
    </label>
  )
}

/**
 * Documenti di un versamento già registrato (bollettino e ricevuta): si aprono da qui e si
 * possono allegare o sostituire in qualsiasi momento. Il caricamento è immediato e non tocca
 * gli importi del versamento — per questo non passa dal modulo "Modifica versamento", che
 * ricalcolerebbe le ore.
 */
export function ContributionDocuments({ contributionId }: { contributionId: string }) {
  const attachments = useAppStore((s) => s.data.attachments)
  const allegaDocumentoContributo = useAppStore((s) => s.allegaDocumentoContributo)
  const [inCaricamento, setInCaricamento] = useState<ContributionDocumentKind | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const docs = documentiContributo(attachments, contributionId)

  async function carica(kind: ContributionDocumentKind, file: File) {
    setErrore(null)
    setInCaricamento(kind)
    try {
      await allegaDocumentoContributo(contributionId, kind, file)
    } catch (err) {
      setErrore(messaggioErroreDocumenti(err))
    } finally {
      setInCaricamento(null)
    }
  }

  async function apri(doc: Attachment) {
    setErrore(null)
    // La scheda va aperta subito, dentro il gesto dell'utente: dopo l'await del link
    // temporaneo i browser (iOS in testa) la bloccherebbero come popup.
    const tab = window.open('', '_blank')
    try {
      const link = await getAttachmentTemporaryLink(doc.dropboxPath)
      if (!tab) {
        setErrore('Il browser ha bloccato l\'apertura del documento: consenti i popup per questo sito.')
        return
      }
      tab.opener = null
      tab.location.href = link
    } catch (err) {
      tab?.close()
      setErrore(messaggioErroreDocumenti(err))
    }
  }

  return (
    <div className="doc-list">
      {CONTRIBUTION_DOCUMENT_KINDS.map((kind) => {
        const doc = docs[kind]
        return (
          <div className="doc-row" key={kind}>
            {doc ? (
              <button type="button" className="doc-open" title={doc.fileName} onClick={() => void apri(doc)}>
                <DocumentIcon />
                {CONTRIBUTION_DOCUMENT_LABEL[kind]}
              </button>
            ) : (
              <span className="doc-missing">{MISSING_LABEL[kind]}</span>
            )}
            <PdfChooser disabled={inCaricamento !== null} onFile={(file) => void carica(kind, file)} onInvalid={setErrore}>
              {inCaricamento === kind ? 'Caricamento…' : doc ? 'Sostituisci' : 'Allega'}
            </PdfChooser>
          </div>
        )
      })}
      {errore && <p className="doc-error">{errore}</p>}
    </div>
  )
}

interface PickerProps {
  year: number
  quarter: number
  documenti: PickedDocuments
  onChange: (kind: ContributionDocumentKind, file: File | null) => void
  onInvalid: (message: string) => void
  /** Durante il salvataggio i file sono già in viaggio verso Dropbox. */
  disabled?: boolean
}

/** Selettori per bollettino e ricevuta nella schermata "Registra versamento": i file
 * restano in memoria e vengono caricati alla conferma, insieme al salvataggio. */
export function ContributionDocumentPicker({ year, quarter, documenti, onChange, onInvalid, disabled }: PickerProps) {
  const dropboxPronto = puoCaricareDocumenti()
  return (
    <>
      {!dropboxPronto && (
        <p className="card-sub" style={{ marginBottom: 6 }}>
          Per allegare i documenti serve Dropbox collegato e una connessione attiva. Puoi registrare il
          versamento adesso e allegarli dopo, dalla scheda del trimestre.
        </p>
      )}
      <div className="doc-list" style={{ marginTop: 0 }}>
        {CONTRIBUTION_DOCUMENT_KINDS.map((kind) => {
          const file = documenti[kind]
          return (
            <div className="doc-row" key={kind}>
              <div className="doc-pick-info">
                <div className="doc-pick-label">{CONTRIBUTION_DOCUMENT_LABEL[kind]}</div>
                {file ? (
                  <>
                    <div className="doc-pick-file">{file.name}</div>
                    <div className="doc-pick-file">Su Dropbox come {contributionDocumentFileName(year, quarter, kind)}</div>
                  </>
                ) : (
                  <div className="doc-pick-file">Nessun file scelto</div>
                )}
              </div>
              {file && (
                <button type="button" className="doc-action" disabled={disabled} onClick={() => onChange(kind, null)}>
                  Rimuovi
                </button>
              )}
              <PdfChooser disabled={disabled || !dropboxPronto} onFile={(f) => onChange(kind, f)} onInvalid={onInvalid}>
                {file ? 'Cambia' : 'Scegli PDF'}
              </PdfChooser>
            </div>
          )
        })}
      </div>
    </>
  )
}
