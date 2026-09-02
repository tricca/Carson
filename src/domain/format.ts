import type { TimeEntryType, Worker } from './types'

export function fullName(worker: Pick<Worker, 'firstName' | 'lastName'>): string {
  return `${worker.firstName} ${worker.lastName}`.trim()
}

/**
 * Data locale in formato YYYY-MM-DD usando i componenti locali del Date (anno/mese/giorno),
 * non `toISOString()`: quest'ultima converte in UTC e sfasa di un giorno vicino alla
 * mezzanotte per chi è in un fuso orario positivo (es. Europe/Rome, UTC+1/+2).
 */
export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatOre(hours: number): string {
  return `${hours.toFixed(1).replace('.', ',')}h`
}

export function formatEuro(amount: number): string {
  return `€${amount.toFixed(2).replace('.', ',')}`
}

export function formatGiorni(days: number): string {
  return days.toFixed(1).replace('.', ',')
}

export function formatDataBreve(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

export function formatDataEstesa(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const TIME_ENTRY_LABELS: Record<TimeEntryType, string> = {
  pulizia: 'Pulizia',
  stiro: 'Stiro',
  ferie: 'Ferie',
  malattia: 'Malattia',
}

export const MONTH_LABELS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

export const MONTH_ABBR_IT = [
  'gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic',
]
