import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { TimeEntryList } from '../components/TimeEntryList'
import { CalendarMese } from '../components/CalendarMese'
import { MONTH_LABELS_IT } from '../domain/format'

type Vista = 'report' | 'calendario'

function mesiDellAnno(year: number, primoAnno: number, primoMese: number, oggiAnno: number, oggiMese: number): number[] {
  const startMonth = year === primoAnno ? primoMese : 1
  const endMonth = year === oggiAnno ? oggiMese : 12
  const months: number[] = []
  for (let m = endMonth; m >= startMonth; m--) months.push(m)
  return months
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

  const anniConVoci = [...new Set(timeEntries.map((e) => Number(e.date.slice(0, 4))))]
  const anni = [...new Set([oggiAnno, ...anniConVoci])].sort((a, b) => b - a)
  const [annoSelezionato, setAnnoSelezionato] = useState(oggiAnno)

  const mesiConVociAnno = mesiConVoci.filter((key) => key.startsWith(String(annoSelezionato)))
  const mesiCalendarioAnno = mesiDellAnno(annoSelezionato, primoAnno, primoMese, oggiAnno, oggiMese)

  return (
    <>
      {anni.length > 1 && (
        <div className="seg-row">
          {anni.map((y) => (
            <button
              key={y}
              type="button"
              className={`seg-btn${y === annoSelezionato ? ' active' : ''}`}
              onClick={() => setAnnoSelezionato(y)}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      <div className="seg-row" style={{ marginTop: anni.length > 1 ? 10 : 0 }}>
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
          {mesiConVociAnno.length === 0 && <p className="card-sub">Nessuna ora registrata nel {annoSelezionato}</p>}
          {mesiConVociAnno.map((key) => {
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
          {mesiCalendarioAnno.map((month) => {
            const key = `${annoSelezionato}-${String(month).padStart(2, '0')}`
            const haVoci = byMonth.has(key)
            return (
              <div key={key} style={{ marginTop: 22 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  {MONTH_LABELS_IT[month - 1]} {annoSelezionato}
                </div>
                {haVoci ? (
                  <div className="ledger-card">
                    <CalendarMese year={annoSelezionato} month={month} timeEntries={timeEntries} />
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
