import { Dropbox, DropboxResponseError } from 'dropbox'
import { AppDataSchema, type AppData } from '../domain/types'
import { getValidAccessToken } from './authClient'

const DATA_FILE_PATH = '/data/housekeeping-data.json'
const ATTACHMENTS_DIR = '/allegati'

export class DropboxConflictError extends Error {
  constructor() {
    super('Conflitto di versione: il file su Dropbox è stato modificato da un altro dispositivo')
    this.name = 'DropboxConflictError'
  }
}

/** Il file esiste ma non è nella forma attesa dallo schema corrente (es. app aggiornata
 * dopo che il file era stato creato con una struttura dati precedente). Porta con sé il
 * `rev` corrente così chi la intercetta può decidere di sovrascriverlo. */
export class DropboxSchemaMismatchError extends Error {
  rev: string
  constructor(rev: string) {
    super('Il file su Dropbox non è compatibile con lo schema dati corrente di questa versione dell\'app')
    this.name = 'DropboxSchemaMismatchError'
    this.rev = rev
  }
}

async function getClient(): Promise<Dropbox> {
  const accessToken = await getValidAccessToken()
  return new Dropbox({ accessToken })
}

export interface RemoteData {
  data: AppData
  rev: string
}

/**
 * Scarica il documento dati. Ritorna null se non esiste ancora (primo avvio).
 * Lancia `DropboxSchemaMismatchError` se il file esiste ma non valida più contro lo
 * schema corrente — capita quando l'app viene aggiornata dopo che il file era già stato
 * scritto con una struttura dati precedente.
 */
export async function downloadData(): Promise<RemoteData | null> {
  const dbx = await getClient()
  let res
  try {
    res = await dbx.filesDownload({ path: DATA_FILE_PATH })
  } catch (err) {
    if (err instanceof DropboxResponseError && err.status === 409) {
      return null
    }
    throw err
  }

  const fileBlob = (res.result as unknown as { fileBlob: Blob }).fileBlob
  const text = await fileBlob.text()
  const parsedJson: unknown = JSON.parse(text)
  const result = AppDataSchema.safeParse(parsedJson)
  if (!result.success) {
    throw new DropboxSchemaMismatchError(res.result.rev)
  }
  return { data: result.data, rev: res.result.rev }
}

/**
 * Scrive il documento dati. Se `rev` è null crea il file (fallisce se già esiste),
 * altrimenti aggiorna solo se `rev` combacia con la versione remota corrente —
 * questo è il meccanismo di rilevazione conflitti tra dispositivi diversi.
 */
export async function uploadData(data: AppData, rev: string | null): Promise<string> {
  const dbx = await getClient()
  const contents = JSON.stringify(data, null, 2)
  try {
    const res = await dbx.filesUpload({
      path: DATA_FILE_PATH,
      contents,
      mode: rev ? { '.tag': 'update', update: rev } : { '.tag': 'add' },
      mute: true,
    })
    return res.result.rev
  } catch (err) {
    if (err instanceof DropboxResponseError && err.status === 409) {
      throw new DropboxConflictError()
    }
    throw err
  }
}

export async function uploadAttachment(fileName: string, file: Blob): Promise<string> {
  const dbx = await getClient()
  const path = `${ATTACHMENTS_DIR}/${crypto.randomUUID()}-${fileName}`
  await dbx.filesUpload({ path, contents: file, mode: { '.tag': 'add' }, autorename: true })
  return path
}

export async function getAttachmentTemporaryLink(path: string): Promise<string> {
  const dbx = await getClient()
  const res = await dbx.filesGetTemporaryLink({ path })
  return res.result.link
}
