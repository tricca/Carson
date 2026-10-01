import { describe, expect, it } from 'vitest'
import type { Attachment } from './types'
import {
  collegaDocumentiContributo,
  contributionDocumentFileName,
  contributionDocumentPath,
  documentiContributo,
  idsDocumentiContributo,
  isPdf,
  scollegaDocumentiContributo,
} from './attachments'

function attachment(over: Partial<Attachment> & Pick<Attachment, 'id'>): Attachment {
  return {
    dropboxPath: '/allegati/contributi-inps/x.pdf',
    fileName: 'x.pdf',
    kind: 'bollettino',
    linkedEntityType: 'quarterlyContribution',
    linkedEntityId: 'c1',
    uploadedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('nomi e percorsi dei documenti', () => {
  it('nome leggibile con anno, trimestre e tipo', () => {
    expect(contributionDocumentFileName(2026, 2, 'bollettino')).toBe('2026-T2 Contributi INPS - Bollettino.pdf')
    expect(contributionDocumentFileName(2026, 2, 'ricevuta')).toBe('2026-T2 Contributi INPS - Ricevuta di pagamento.pdf')
  })

  it('percorso Dropbox deterministico dentro /allegati/contributi-inps', () => {
    expect(contributionDocumentPath(2025, 4, 'ricevuta')).toBe(
      '/allegati/contributi-inps/2025-T4 Contributi INPS - Ricevuta di pagamento.pdf',
    )
  })
})

describe('isPdf', () => {
  it('riconosce il PDF dal tipo MIME o dall\'estensione', () => {
    expect(isPdf({ name: 'a', type: 'application/pdf' })).toBe(true)
    expect(isPdf({ name: 'bollettino.PDF', type: '' })).toBe(true)
    expect(isPdf({ name: 'foto.jpg', type: 'image/jpeg' })).toBe(false)
  })
})

describe('documentiContributo', () => {
  it('ritorna un documento per tipo, solo quelli del versamento richiesto', () => {
    const list = [
      attachment({ id: 'a1', kind: 'bollettino' }),
      attachment({ id: 'a2', kind: 'ricevuta' }),
      attachment({ id: 'a3', kind: 'bollettino', linkedEntityId: 'altro' }),
      attachment({ id: 'a4', kind: 'bollettino', linkedEntityType: 'payment' }),
      attachment({ id: 'a5', kind: 'altro' }),
    ]
    const docs = documentiContributo(list, 'c1')
    expect(docs.bollettino?.id).toBe('a1')
    expect(docs.ricevuta?.id).toBe('a2')
  })

  it('se ce n\'è più d\'uno per lo stesso tipo vince il più recente', () => {
    const list = [
      attachment({ id: 'vecchio', uploadedAt: '2026-01-01T00:00:00.000Z' }),
      attachment({ id: 'nuovo', uploadedAt: '2026-03-01T00:00:00.000Z' }),
    ]
    expect(documentiContributo(list, 'c1').bollettino?.id).toBe('nuovo')
  })
})

describe('collegaDocumentiContributo', () => {
  const uploaded = [
    { kind: 'bollettino' as const, dropboxPath: '/p/b.pdf', fileName: 'b.pdf' },
  ]

  it('aggiunge l\'allegato collegato al versamento', () => {
    const result = collegaDocumentiContributo([], 'c1', uploaded, '2026-05-01T00:00:00.000Z')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      kind: 'bollettino',
      dropboxPath: '/p/b.pdf',
      fileName: 'b.pdf',
      linkedEntityType: 'quarterlyContribution',
      linkedEntityId: 'c1',
      uploadedAt: '2026-05-01T00:00:00.000Z',
    })
  })

  it('sostituisce solo il tipo ricaricato, lasciando l\'altro tipo e gli altri versamenti', () => {
    const list = [
      attachment({ id: 'b-vecchio', kind: 'bollettino' }),
      attachment({ id: 'r', kind: 'ricevuta' }),
      attachment({ id: 'b-altro-trimestre', kind: 'bollettino', linkedEntityId: 'c2' }),
    ]
    const result = collegaDocumentiContributo(list, 'c1', uploaded, '2026-05-01T00:00:00.000Z')
    const ids = result.map((a) => a.id)
    expect(ids).not.toContain('b-vecchio')
    expect(ids).toContain('r')
    expect(ids).toContain('b-altro-trimestre')
    expect(result).toHaveLength(3)
  })
})

describe('scollegaDocumentiContributo / idsDocumentiContributo', () => {
  const list = [
    attachment({ id: 'a1' }),
    attachment({ id: 'a2', kind: 'ricevuta' }),
    attachment({ id: 'a3', linkedEntityId: 'c2' }),
  ]

  it('toglie solo gli allegati del versamento eliminato', () => {
    expect(scollegaDocumentiContributo(list, 'c1').map((a) => a.id)).toEqual(['a3'])
  })

  it('elenca gli id degli allegati di un versamento', () => {
    expect(idsDocumentiContributo(list, 'c1')).toEqual(['a1', 'a2'])
  })
})
