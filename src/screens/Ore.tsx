import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addDays, addWeeks, getISOWeek, startOfWeek } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { TimeEntryForm } from '../components/TimeEntryForm'
import { TimeEntryList } from '../components/TimeEntryList'
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons'
import { formatDataBreve, toLocalIsoDate, MONTH_ABBR_IT } from '../domain/format'

function toIso(d: Date): string {
  return toLocalIsoDate(d)
}

export function Ore() {
  const timeEntries = useAppStore((s) => s.data.timeEntries)
  const addTimeEntry = useAppStore((s) => s.addTimeEntry)

  const todayIso = toIso(new Date())
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset)
  // Solo lun-ven: la lavoratrice non lavora nel weekend.
  const days = [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i))
  const dateConOre = new Set(timeEntries.map((e) => e.date))

  const [year, month] = selectedDate.split('-').map(Number)
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const entriesMese = timeEntries
    .filter((e) => e.date.startsWith(monthKey))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <>
      <div className="ledger-card">
        <p className="card-title">Registra ore &middot; {formatDataBreve(selectedDate)}</p>

        <div className="week-nav" style={{ marginTop: 10 }}>
          <button type="button" className="week-nav-btn" aria-label="Settimana precedente" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeftIcon />
          </button>
          <div className="day-strip centered">
            {days.map((d) => {
              const iso = toIso(d)
              return (
                <button
                  key={iso}
                  type="button"
                  className={`day-chip${iso === selectedDate ? ' selected' : ''}${dateConOre.has(iso) ? ' has-entries' : ''}`}
                  onClick={() => setSelectedDate(iso)}
                >
                  <span className="dname">{d.toLocaleDateString('it-IT', { weekday: 'short' })}</span>
                  <span className="dnum mono">{String(d.getDate()).padStart(2, '0')}</span>
                  <span className="dmonth">{MONTH_ABBR_IT[d.getMonth()]}</span>
                </button>
              )
            })}
          </div>
          <button type="button" className="week-nav-btn" aria-label="Settimana successiva" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRightIcon />
          </button>
        </div>
        <div className="week-label-row">
          <span className="label">Settimana {getISOWeek(weekStart)}</span>
          {weekOffset !== 0 && (
            <button type="button" className="link" onClick={() => setWeekOffset(0)}>
              Torna a oggi
            </button>
          )}
        </div>

        <TimeEntryForm
          date={selectedDate}
          onDateChange={setSelectedDate}
          submitLabel="Registra ore"
          showDate={false}
          onSubmit={(entry) => addTimeEntry(entry)}
        />
      </div>

      <div className="section-head">
        <div>
          <div className="eyebrow">
            {new Date(year, month - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
          </div>
          <h2>Riepilogo mensile</h2>
        </div>
      </div>
      <TimeEntryList entries={entriesMese} emptyLabel="Nessuna ora registrata questo mese" showTotal />
      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <Link to="/ore/storico" className="link">Vedi storico completo</Link>
      </div>
    </>
  )
}
