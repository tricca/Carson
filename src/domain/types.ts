import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido (YYYY-MM-DD)')
const isoDateTime = z.string().datetime()

export const AttachmentSchema = z.object({
  id: z.string(),
  dropboxPath: z.string(),
  fileName: z.string(),
  kind: z.enum(['ricevuta', 'mav', 'bollettino', 'altro']),
  linkedEntityType: z.enum(['payment', 'quarterlyContribution', 'thirteenthMonth']),
  linkedEntityId: z.string(),
  uploadedAt: isoDateTime,
})
export type Attachment = z.infer<typeof AttachmentSchema>

export const RateHistoryEntrySchema = z.object({
  id: z.string(),
  hourlyRate: z.number().positive(),
  weeklyContractHours: z.number().positive(),
  contractDaysPerWeek: z.number().int().min(1).max(7),
  validFrom: isoDate,
  validTo: isoDate.nullable(),
})
export type RateHistoryEntry = z.infer<typeof RateHistoryEntrySchema>

export const WorkerSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  fiscalCode: z.string().optional(),
  /** Indirizzo di residenza, per documenti come il CUD sostitutivo. */
  address: z.string().optional(),
  iban: z.string().optional(),
  inpsRelationshipNumber: z.string().optional(),
  hiringDate: isoDate.optional(),
  contractType: z.enum(['tempo_indeterminato', 'tempo_determinato']),
  livingWithEmployer: z.boolean(),
  cuafExempt: z.boolean(),
  rateHistory: z.array(RateHistoryEntrySchema),
})
export type Worker = z.infer<typeof WorkerSchema>

export const TimeEntryTypeSchema = z.enum(['pulizia', 'stiro', 'ferie', 'malattia'])
export type TimeEntryType = z.infer<typeof TimeEntryTypeSchema>

export const TimeEntrySchema = z.object({
  id: z.string(),
  date: isoDate,
  type: TimeEntryTypeSchema,
  hours: z.number().min(0).max(24),
  note: z.string().optional(),
  updatedAt: isoDateTime,
})
export type TimeEntry = z.infer<typeof TimeEntrySchema>

export const PaymentStatusSchema = z.enum(['da_pagare', 'pagato'])
export const PaymentCategorySchema = z.enum(['lavoro', 'ferie'])
export type PaymentCategory = z.infer<typeof PaymentCategorySchema>

export const PaymentSchema = z.object({
  id: z.string(),
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12),
  hoursWorked: z.number().min(0),
  hourlyRate: z.number().positive(),
  amountDue: z.number().min(0),
  status: PaymentStatusSchema,
  paidAt: isoDate.nullable(),
  paymentMethod: z.string().optional(),
  note: z.string().optional(),
  attachmentIds: z.array(z.string()),
  /** Id delle voci di ore coperte da questo pagamento — permette più pagamenti nello
   * stesso mese e segnala come "non pagate" le ore aggiunte dopo un pagamento già
   * registrato. Assente/vuoto per i pagamenti creati prima di questo tracciamento. */
  coveredEntryIds: z.array(z.string()).optional(),
  /** 'ferie' se il pagamento copre ore di ferie, altrimenti ore di lavoro ordinario. */
  category: PaymentCategorySchema.optional(),
  updatedAt: isoDateTime,
})
export type Payment = z.infer<typeof PaymentSchema>

export const ContributionRegimeSchema = z.enum(['fino_24h', 'oltre_24h'])
export type ContributionRegime = z.infer<typeof ContributionRegimeSchema>

export const QuarterlyContributionSchema = z.object({
  id: z.string(),
  year: z.number().int(),
  quarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  dueDate: isoDate,
  periodHours: z.number().min(0),
  regime: ContributionRegimeSchema,
  amountTotal: z.number().min(0),
  amountEmployer: z.number().min(0),
  amountWorker: z.number().min(0),
  cuafExcluded: z.boolean(),
  status: PaymentStatusSchema,
  paidAt: isoDate.nullable(),
  note: z.string().optional(),
  attachmentIds: z.array(z.string()),
  updatedAt: isoDateTime,
})
export type QuarterlyContribution = z.infer<typeof QuarterlyContributionSchema>

export const ThirteenthMonthSchema = z.object({
  id: z.string(),
  year: z.number().int(),
  amountAccrued: z.number().min(0),
  status: PaymentStatusSchema,
  paidAt: isoDate.nullable(),
  attachmentIds: z.array(z.string()),
  updatedAt: isoDateTime,
})
export type ThirteenthMonth = z.infer<typeof ThirteenthMonthSchema>

export const VacationYearRecordSchema = z.object({
  year: z.number().int(),
  daysAccrued: z.number().min(0),
  daysTaken: z.number().min(0),
  valueAccrued: z.number().min(0),
  valueTaken: z.number().min(0),
})
export type VacationYearRecord = z.infer<typeof VacationYearRecordSchema>

export const VacationSettingsSchema = z.object({
  annualDays: z.number().positive(),
  minDaysToAccrueMonth: z.number().int().min(0).max(31),
})
export type VacationSettings = z.infer<typeof VacationSettingsSchema>

export const VacationsSchema = z.object({
  settings: VacationSettingsSchema,
  byYear: z.array(VacationYearRecordSchema),
})
export type Vacations = z.infer<typeof VacationsSchema>

/** Importo contributivo orario impostato manualmente dall'utente (non calcolato da fasce
 * INPS): come rateHistory per la paga, ma per i due importi versati a INPS ogni ora. */
export const ContributionRateEntrySchema = z.object({
  id: z.string(),
  employerAmountPerHour: z.number().min(0),
  workerAmountPerHour: z.number().min(0),
  validFrom: isoDate,
  validTo: isoDate.nullable(),
})
export type ContributionRateEntry = z.infer<typeof ContributionRateEntrySchema>

/** Coefficiente ufficiale di rivalutazione TFR (1,5% fisso + 75% inflazione ISTAT FOI) per
 * l'anno `year`, da applicare al fondo TFR accantonato al 31/12 dell'anno precedente. */
export const TfrRevaluationRateSchema = z.object({
  year: z.number().int(),
  rate: z.number(),
})
export type TfrRevaluationRate = z.infer<typeof TfrRevaluationRateSchema>

/** Dati anagrafici del datore di lavoro, per documenti come il CUD sostitutivo. */
export const EmployerSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  fiscalCode: z.string(),
})
export type Employer = z.infer<typeof EmployerSchema>

const EMPTY_EMPLOYER: Employer = { firstName: '', lastName: '', address: '', fiscalCode: '' }

export const SettingsSchema = z.object({
  // .default([]) / .default(...): un file su Dropbox scritto prima dell'introduzione di
  // questo campo non lo contiene. Deve restare valido contro lo schema corrente — vedi la
  // nota in syncEngine.ts sul perché un mismatch di schema non deve mai più risolversi
  // sovrascrivendo il remoto.
  contributionRateHistory: z.array(ContributionRateEntrySchema).default([]),
  tfrRevaluationRates: z.array(TfrRevaluationRateSchema).default([]),
  employer: EmployerSchema.default(EMPTY_EMPLOYER),
})

export const AppDataSchema = z.object({
  schemaVersion: z.literal(1),
  worker: WorkerSchema,
  timeEntries: z.array(TimeEntrySchema),
  payments: z.array(PaymentSchema),
  quarterlyContributions: z.array(QuarterlyContributionSchema),
  thirteenthMonth: z.array(ThirteenthMonthSchema),
  vacations: VacationsSchema,
  settings: SettingsSchema,
  attachments: z.array(AttachmentSchema),
})
export type AppData = z.infer<typeof AppDataSchema>
