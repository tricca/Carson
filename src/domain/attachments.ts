import type { Attachment } from './types'

/** I documenti che accompagnano il versamento di un trimestre INPS.
 *
 * Il "documento di pagamento" è salvato con `kind: 'altro'`, valore che l'enum di
 * `AttachmentSchema` già contiene: aggiungerne uno nuovo renderebbe il file Dropbox non
 * valido per le versioni precedenti dell'app (cache PWA che resta indietro su iOS), che
 * smetterebbero di sincronizzare finché non vengono aggiornate. Se in futuro serve un altro
 * tipo di allegato per i versamenti, quello sarà il momento di introdurre un valore dedicato. */
export type ContributionDocumentKind = Extract<Attachment['kind'], 'bollettino' | 'ricevuta' | 'altro'>

export const CONTRIBUTION_DOCUMENT_KINDS: readonly ContributionDocumentKind[] = ['bollettino', 'ricevuta', 'altro']

export const CONTRIBUTION_DOCUMENT_LABEL: Record<ContributionDocumentKind, string> = {
  bollettino: 'Bollettino',
  ricevuta: 'Ricevuta di pagamento',
  altro: 'Documento di pagamento',
}

/** File ancora da caricare, uno per tipo. */
export type ContributionDocuments = Partial<Record<ContributionDocumentKind, File>>

/** File già caricato su Dropbox, in attesa di essere registrato come `Attachment`. */
export interface UploadedDocument {
  kind: ContributionDocumentKind
  dropboxPath: string
  fileName: string
}

const CONTRIBUTION_DOCUMENTS_DIR = '/allegati/contributi-inps'

/** Es. "2026-T2 Contributi INPS - Bollettino.pdf": inizia con anno e trimestre così in
 * Dropbox l'elenco si ordina da solo cronologicamente. */
export function contributionDocumentFileName(year: number, quarter: number, kind: ContributionDocumentKind): string {
  return `${year}-T${quarter} Contributi INPS - ${CONTRIBUTION_DOCUMENT_LABEL[kind]}.pdf`
}

/** Percorso deterministico (anno + trimestre + tipo): ricaricare lo stesso documento
 * sovrascrive il file invece di accumulare copie, e la cronologia versioni di Dropbox
 * conserva comunque quello precedente. */
export function contributionDocumentPath(year: number, quarter: number, kind: ContributionDocumentKind): string {
  return `${CONTRIBUTION_DOCUMENTS_DIR}/${contributionDocumentFileName(year, quarter, kind)}`
}

function isContributionDocumentKind(kind: Attachment['kind']): kind is ContributionDocumentKind {
  return (CONTRIBUTION_DOCUMENT_KINDS as readonly string[]).includes(kind)
}

export function isPdf(file: { name: string; type: string }): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

function isContributionDocument(a: Attachment, contributionId: string): boolean {
  return a.linkedEntityType === 'quarterlyContribution' && a.linkedEntityId === contributionId
}

/** Il documento più recente per tipo. Se dopo un merge fra dispositivi ne resta più di
 * uno per lo stesso tipo vince l'ultimo caricato (il percorso Dropbox è comunque lo stesso). */
export function documentiContributo(
  attachments: Attachment[],
  contributionId: string,
): Partial<Record<ContributionDocumentKind, Attachment>> {
  const result: Partial<Record<ContributionDocumentKind, Attachment>> = {}
  for (const a of attachments) {
    if (!isContributionDocument(a, contributionId)) continue
    if (!isContributionDocumentKind(a.kind)) continue
    const current = result[a.kind]
    if (!current || a.uploadedAt > current.uploadedAt) result[a.kind] = a
  }
  return result
}

/** Registra i documenti appena caricati: per ogni tipo caricato sostituisce quello già
 * collegato allo stesso versamento (se c'era), gli altri tipi restano intatti. */
export function collegaDocumentiContributo(
  attachments: Attachment[],
  contributionId: string,
  uploaded: UploadedDocument[],
  uploadedAt: string,
): Attachment[] {
  const replacedKinds = new Set<Attachment['kind']>(uploaded.map((u) => u.kind))
  const kept = attachments.filter((a) => !(isContributionDocument(a, contributionId) && replacedKinds.has(a.kind)))
  const added: Attachment[] = uploaded.map((u) => ({
    id: crypto.randomUUID(),
    dropboxPath: u.dropboxPath,
    fileName: u.fileName,
    kind: u.kind,
    linkedEntityType: 'quarterlyContribution',
    linkedEntityId: contributionId,
    uploadedAt,
  }))
  return [...added, ...kept]
}

/** Toglie dall'elenco gli allegati di un versamento eliminato. I file restano su Dropbox:
 * sono documenti fiscali dell'utente, non li cancelliamo mai in automatico. */
export function scollegaDocumentiContributo(attachments: Attachment[], contributionId: string): Attachment[] {
  return attachments.filter((a) => !isContributionDocument(a, contributionId))
}

export function idsDocumentiContributo(attachments: Attachment[], contributionId: string): string[] {
  return attachments.filter((a) => isContributionDocument(a, contributionId)).map((a) => a.id)
}
