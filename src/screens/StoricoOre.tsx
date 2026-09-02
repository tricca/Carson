import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { TimeEntryList } from '../components/TimeEntryList'
import { CalendarMese } from '../components/CalendarMese'
import { MONTH_LABELS_IT } from '../domain/format'

type Vista = 'report' | 'calendario'

function enumeraMesiDiscendente(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = []
  let y = endYear
  let m = endMonth
  while (y > startYear || (y === startYear && m >= startMonth)) {
    result.push({ year: y, month: m })
    m -= 1
    if (m === 0) {
      m = 12
      y -= 1
    }
  }
  return result
}

export function StoricoOre() {
  const timeEntries = useAppStore((s) => s.data.timeEntries)
  const [searchParams] = useSearchParams()
  const [vista, setVista] = useState<Vista>(searchParams.get('vista') === 'calendario' ? 'calendario' : 'report')

  const byMonth = new Map<string, typeof timeEntries>()
  for (const e of timeEntries) {
    const key = e.date.slice(0, 7)
    const list = byMonth.get(key)
    if (list) list.push(e)
    else byMonth.set(key, [e])
  }
  const mesiConVoci = [...byMonth.keys()].sort((a, b) => (a < b ? 1 : -1))

  const today = new Date()
  const oggiAnno = today.getFullYear()
  const oggiMese = today.getMonth() + 1

  let primoAnno = oggiAnno
  let primoMese = oggiMese
  if (timeEntries.length > 0) {
    const dataMinima = timeEntries.reduce((min, e) => (e.date < min ? e.date : min), timeEntries[0].date)
    ;[primoAnno, primoMese] = dataMinima.split('-').map(Number)
  }
  const mesiCalendario = enumeraMesiDiscendente(primoAnno, primoMese, oggiAnno, oggiMese)

  return (
    <>
      <div className="seg-row">
        <button type="button" className={`seg-btn${vista === 'report' ? ' active' : ''}`} onClick={() => setVista('report')}>
          Report ore
        </button>
        <button type="button" className={`seg-btn${vista === 'calendario' ? ' active' : ''}`} onClick={() => setVista('calendario')}>
          Calendario
        </button>
      </div>

      {vista === 'report' && (
        <>
          <div className="eyebrow-standalone" style={{ marginTop: 18 }}>Tutte le voci, mese per mese</div>
          {mesiConVoci.length === 0 && <p className="card-sub">Nessuna ora registrata</p>}
          {mesiConVoci.map((key) => {
            const [year, month] = key.split('-').map(Number)
            const entries = [...(byMonth.get(key) ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1))
            return (
              <div key={key} style={{ marginTop: 22 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  {MONTH_LABELS_IT[month - 1]} {year}
                </div>
                <TimeEntryList entries={entries} emptyLabel="" showTotal />
              </div>
            )
          })}
        </>
      )}

      {vista === 'calendario' && (
        <>
          {mesiCalendario.map(({ year, month }) => {
            const key = `${year}-${String(month).padStart(2, '0')}`
            const haVoci = byMonth.has(key)
            return (
              <div key={key} style={{ marginTop: 22 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  {MONTH_LABELS_IT[month - 1]} {year}
                </div>
                {haVoci ? (
                  <div className="ledger-card">
                    <CalendarMese year={year} month={month} timeEntries={timeEntries} />
                  </div>
                ) : (
                  <p className="card-sub">Nessuna attivit&agrave;</p>
                )}
              </div>
            )
          })}
        </>
      )}
    </>
  )
}
