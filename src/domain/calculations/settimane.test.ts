import { describe, expect, it } from 'vitest'
import type { TimeEntry } from '../types'
import { settimaneMese } from './settimane'

function entry(date: string, hours: number): TimeEntry {
  return { id: date, date, type: 'pulizia', hours, updatedAt: '2026-01-01T00:00:00.000Z' }
}

describe('settimaneMese', () => {
  it('elenca tutte le settimane lun-dom che intersecano il mese, con le ore corrette', () => {
    const entries: TimeEntry[] = [entry('2026-09-01', 6), entry('2026-09-10', 5)]
    const settimane = settimaneMese(entries, 2026, 9)

    expect(settimane).toHaveLength(5)
    expect(settimane[0]).toMatchObject({ weekStart: '2026-08-31', weekEnd: '2026-09-06', worked: true, hours: 6 })
    expect(settimane[1]).toMatchObject({ weekStart: '2026-09-07', weekEnd: '2026-09-13', worked: true, hours: 5 })
    expect(settimane[2].worked).toBe(false)
    expect(settimane[3].worked).toBe(false)
    expect(settimane[4]).toMatchObject({ weekStart: '2026-09-28', weekEnd: '2026-10-04' })
  })

  it('somma le ore di più voci nella stessa settimana', () => {
    const entries: TimeEntry[] = [entry('2026-09-01', 6), entry('2026-09-02', 6)]
    const settimane = settimaneMese(entries, 2026, 9)
    expect(settimane[0].hours).toBe(12)
  })
})
