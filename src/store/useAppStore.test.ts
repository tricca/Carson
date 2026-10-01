import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../dropbox/dataStore', () => ({
  uploadAttachment: vi.fn(),
  downloadBrandingImage: vi.fn(),
}))
vi.mock('../dropbox/authClient', () => ({ isConnected: vi.fn(() => false) }))
vi.mock('../storage/syncEngine', () => ({
  loadInitialData: vi.fn(),
  saveData: vi.fn(),
  onSyncStatusChange: vi.fn(),
  restoreFromRemote: vi.fn(),
}))

import { uploadAttachment } from '../dropbox/dataStore'
import { saveData } from '../storage/syncEngine'
import { createSampleData } from '../domain/sampleData'
import { documentiContributo } from '../domain/attachments'
import { useAppStore } from './useAppStore'

const versamento = {
  year: 2026,
  quarter: 2 as const,
  dueDate: '2026-07-10',
  periodHours: 100,
  regime: 'fino_24h' as const,
  amountTotal: 200,
  amountEmployer: 150,
  amountWorker: 50,
  cuafExcluded: false,
  paidAt: '2026-07-08',
}

function pdf(name: string): File {
  return new File(['%PDF-1.4'], name, { type: 'application/pdf' })
}

beforeEach(() => {
  vi.mocked(uploadAttachment).mockReset().mockResolvedValue(undefined)
  vi.mocked(saveData).mockReset()
  useAppStore.setState({ data: createSampleData() })
})

describe('salvaVersamentoContributo con documenti', () => {
  it('carica bollettino e ricevuta con nomi leggibili e li collega al versamento', async () => {
    await useAppStore
      .getState()
      .salvaVersamentoContributo(versamento, { bollettino: pdf('scan001.pdf'), ricevuta: pdf('IMG_4410.pdf') })

    expect(vi.mocked(uploadAttachment).mock.calls.map(([path]) => path)).toEqual([
      '/allegati/contributi-inps/2026-T2 Contributi INPS - Bollettino.pdf',
      '/allegati/contributi-inps/2026-T2 Contributi INPS - Ricevuta di pagamento.pdf',
    ])

    const { quarterlyContributions, attachments } = useAppStore.getState().data
    expect(quarterlyContributions).toHaveLength(1)
    const [c] = quarterlyContributions
    expect(attachments).toHaveLength(2)
    expect(attachments.every((a) => a.linkedEntityType === 'quarterlyContribution' && a.linkedEntityId === c.id)).toBe(true)
    expect(c.attachmentIds.toSorted()).toEqual(attachments.map((a) => a.id).toSorted())
    expect(documentiContributo(attachments, c.id).bollettino?.fileName).toBe('2026-T2 Contributi INPS - Bollettino.pdf')
    expect(saveData).toHaveBeenCalledTimes(1)
  })

  it('se l\'upload fallisce lancia e non registra né versamento né allegati', async () => {
    vi.mocked(uploadAttachment).mockRejectedValue(new Error('offline'))

    await expect(
      useAppStore.getState().salvaVersamentoContributo(versamento, { bollettino: pdf('a.pdf') }),
    ).rejects.toThrow('offline')

    const { quarterlyContributions, attachments } = useAppStore.getState().data
    expect(quarterlyContributions).toHaveLength(0)
    expect(attachments).toHaveLength(0)
    expect(saveData).not.toHaveBeenCalled()
  })

  it('senza documenti non carica nulla e salva come prima', async () => {
    await useAppStore.getState().salvaVersamentoContributo(versamento)

    expect(uploadAttachment).not.toHaveBeenCalled()
    expect(useAppStore.getState().data.quarterlyContributions).toHaveLength(1)
    expect(useAppStore.getState().data.attachments).toHaveLength(0)
  })

  it('correggere un versamento esistente senza nuovi documenti non perde quelli già allegati', async () => {
    await useAppStore.getState().salvaVersamentoContributo(versamento, { ricevuta: pdf('r.pdf') })
    const [c] = useAppStore.getState().data.quarterlyContributions

    await useAppStore.getState().salvaVersamentoContributo({ ...versamento, id: c.id, amountTotal: 210 })

    const after = useAppStore.getState().data
    expect(after.quarterlyContributions).toHaveLength(1)
    expect(after.quarterlyContributions[0].amountTotal).toBe(210)
    expect(documentiContributo(after.attachments, c.id).ricevuta).toBeDefined()
    expect(after.quarterlyContributions[0].attachmentIds).toHaveLength(1)
  })
})

describe('allegaDocumentoContributo', () => {
  it('allega la ricevuta a un versamento già registrato senza toccare gli importi', async () => {
    await useAppStore.getState().salvaVersamentoContributo(versamento, { bollettino: pdf('b.pdf') })
    const [c] = useAppStore.getState().data.quarterlyContributions

    await useAppStore.getState().allegaDocumentoContributo(c.id, 'ricevuta', pdf('r.pdf'))

    const after = useAppStore.getState().data
    const docs = documentiContributo(after.attachments, c.id)
    expect(docs.bollettino).toBeDefined()
    expect(docs.ricevuta?.dropboxPath).toBe('/allegati/contributi-inps/2026-T2 Contributi INPS - Ricevuta di pagamento.pdf')
    expect(after.quarterlyContributions[0].amountTotal).toBe(versamento.amountTotal)
    expect(after.quarterlyContributions[0].attachmentIds).toHaveLength(2)
  })

  it('sostituendo un documento resta un solo allegato di quel tipo', async () => {
    await useAppStore.getState().salvaVersamentoContributo(versamento, { ricevuta: pdf('vecchia.pdf') })
    const [c] = useAppStore.getState().data.quarterlyContributions

    await useAppStore.getState().allegaDocumentoContributo(c.id, 'ricevuta', pdf('nuova.pdf'))

    const { attachments } = useAppStore.getState().data
    expect(attachments.filter((a) => a.kind === 'ricevuta')).toHaveLength(1)
  })

  it('se l\'upload fallisce lancia e lascia i dati invariati', async () => {
    await useAppStore.getState().salvaVersamentoContributo(versamento)
    const [c] = useAppStore.getState().data.quarterlyContributions
    vi.mocked(saveData).mockClear()
    vi.mocked(uploadAttachment).mockRejectedValue(new Error('token scaduto'))

    await expect(useAppStore.getState().allegaDocumentoContributo(c.id, 'ricevuta', pdf('r.pdf'))).rejects.toThrow()

    expect(useAppStore.getState().data.attachments).toHaveLength(0)
    expect(saveData).not.toHaveBeenCalled()
  })

  it('lancia se il versamento non esiste', async () => {
    await expect(useAppStore.getState().allegaDocumentoContributo('inesistente', 'ricevuta', pdf('r.pdf'))).rejects.toThrow()
    expect(uploadAttachment).not.toHaveBeenCalled()
  })
})

describe('deleteContribution', () => {
  it('scollega i documenti del versamento eliminato senza toccare quelli degli altri', async () => {
    await useAppStore.getState().salvaVersamentoContributo(versamento, { bollettino: pdf('b.pdf') })
    await useAppStore
      .getState()
      .salvaVersamentoContributo({ ...versamento, quarter: 3, dueDate: '2026-10-10' }, { bollettino: pdf('b3.pdf') })
    const t2 = useAppStore.getState().data.quarterlyContributions.find((c) => c.quarter === 2)!

    useAppStore.getState().deleteContribution(t2.id)

    const { quarterlyContributions, attachments } = useAppStore.getState().data
    expect(quarterlyContributions.map((c) => c.quarter)).toEqual([3])
    expect(attachments).toHaveLength(1)
    expect(attachments[0].dropboxPath).toContain('2026-T3')
  })
})
