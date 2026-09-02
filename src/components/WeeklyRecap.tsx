import { settimaneMese } from '../domain/calculations/settimane'
import { formatOre, MONTH_LABELS_IT } from '../domain/format'
import type { TimeEntry } from '../domain/types'

interface WeeklyRecapProps {
  timeEntries: TimeEntry[]
  year: number
  quarter: 1 | 2 | 3 | 4
}

function formatRange(startIso: string, endIso: string): string {
  const start = startIso.split('-').reverse().slice(0, 2).join('/')
  const end = endIso.split('-').reverse().slice(0, 2).join('/')
  return `${start} – ${end}`
}

export function WeeklyRecap({ timeEntries, year, quarter }: WeeklyRecapProps) {
  const firstMonth = (quarter - 1) * 3 + 1
  const months = [firstMonth, firstMonth + 1, firstMonth + 2]

  return (
    <details className="disclosure">
      <summary>Riepilogo settimanale</summary>
      <div className="dbody">
        {months.map((month) => {
          const settimane = settimaneMese(timeEntries, year, month)
          return (
            <div key={month} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                {MONTH_LABELS_IT[month - 1]}
              </div>
              {settimane.map((s) => (
                <div key={s.weekStart} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>
                    {s.worked ? '✓' : '–'} {formatRange(s.weekStart, s.weekEnd)}
                  </span>
                  <span className="mono">{s.worked ? formatOre(s.hours) : '—'}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </details>
  )
}
