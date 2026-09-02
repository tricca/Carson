import { useState } from 'react'
import type { TimeEntryType } from '../domain/types'

const TIPI: { value: TimeEntryType; label: string }[] = [
  { value: 'pulizia', label: 'Pulizia' },
  { value: 'stiro', label: 'Stiro' },
  { value: 'ferie', label: 'Ferie' },
  { value: 'malattia', label: 'Malattia' },
]

interface TimeEntryFormProps {
  date: string
  onDateChange: (date: string) => void
  onSubmit: (entry: { date: string; type: TimeEntryType; hours: number; note?: string }) => void
  submitLabel: string
  showNote?: boolean
  showDate?: boolean
}

export function TimeEntryForm({ date, onDateChange, onSubmit, submitLabel, showNote = true, showDate = true }: TimeEntryFormProps) {
  const [type, setType] = useState<TimeEntryType>('pulizia')
  const [hours, setHours] = useState(3)
  const [note, setNote] = useState('')

  function handleSubmit() {
    onSubmit({ date, type, hours, note: note.trim() || undefined })
    setNote('')
  }

  return (
    <div>
      {showDate && (
        <>
          <div className="field-label">Data</div>
          <input className="text-input" type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
        </>
      )}

      <div className="field-label">Tipo</div>
      <div className="seg-row">
        {TIPI.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`seg-btn${type === t.value ? ' active' : ''}`}
            onClick={() => setType(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="field-label">Ore</div>
      <div className="stepper">
        <button type="button" aria-label="Diminuisci ore" onClick={() => setHours((h) => Math.max(0, h - 0.5))}>
          &minus;
        </button>
        <span className="val mono">{hours.toFixed(1).replace('.', ',')}</span>
        <button type="button" aria-label="Aumenta ore" onClick={() => setHours((h) => Math.min(24, h + 0.5))}>
          +
        </button>
      </div>

      {showNote && (
        <>
          <div className="field-label">Note</div>
          <input
            className="text-input"
            type="text"
            placeholder="Note (opzionale)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </>
      )}

      <div style={{ marginTop: 20 }}>
        <button type="button" className="btn primary" disabled={hours <= 0} onClick={handleSubmit}>
          {submitLabel}
        </button>
      </div>
    </div>
  )
}
