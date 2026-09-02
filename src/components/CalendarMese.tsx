import { eachDayOfInterval, endOfMonth, endOfWeek, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns'
import { TIME_ENTRY_LABELS, toLocalIsoDate } from '../domain/format'
import type { TimeEntry, TimeEntryType } from '../domain/types'

interface CalendarMeseProps {
  year: number
  month: number
  timeEntries: TimeEntry[]
}

const TIPI_CALENDARIO: TimeEntryType[] = ['pulizia', 'stiro', 'ferie', 'malattia']
const WEEKDAY_LABELS = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']

function coloreTipo(tipo: TimeEntryType): string {
  return `var(--cal-${tipo})`
}

export function CalendarMese({ year, month, timeEntries }: CalendarMeseProps) {
  const monthStart = startOfMonth(new Date(year, month - 1, 1))
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const giorni = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const tipiPerData = new Map<string, Set<TimeEntryType>>()
  for (const e of timeEntries) {
    if (e.date < toLocalIsoDate(gridStart) || e.date > toLocalIsoDate(gridEnd)) continue
    const set = tipiPerData.get(e.date) ?? new Set<TimeEntryType>()
    set.add(e.type)
    tipiPerData.set(e.date, set)
  }

  return (
    <div>
      <div className="cal-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="cal-days">
        {giorni.map((d) => {
          const iso = toLocalIsoDate(d)
          const tipi = TIPI_CALENDARIO.filter((t) => tipiPerData.get(iso)?.has(t))
          return (
            <div
              key={iso}
              className={`cal-day${isSameMonth(d, monthStart) ? '' : ' outside'}${isToday(d) ? ' today' : ''}`}
            >
              <span className="cal-daynum mono">{d.getDate()}</span>
              {tipi.length > 0 && (
                <span className="cal-dots">
                  {tipi.map((t) => (
                    <span key={t} className="cal-dot" style={{ background: coloreTipo(t) }} />
                  ))}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="cal-legend">
        {TIPI_CALENDARIO.map((t) => (
          <span className="cal-legend-item" key={t}>
            <span className="cal-dot" style={{ background: coloreTipo(t) }} />
            {TIME_ENTRY_LABELS[t]}
          </span>
        ))}
      </div>
    </div>
  )
}
