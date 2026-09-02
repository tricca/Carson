import type { TimeEntry } from '../types'

/** Tipi di ora che concorrono a tredicesima, contributi e "ore lavorate": tutti quelli retribuiti. */
export const PAID_TYPES = new Set<TimeEntry['type']>(['pulizia', 'stiro', 'ferie', 'malattia'])
