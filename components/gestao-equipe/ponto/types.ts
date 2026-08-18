// ─── TIPOS COMPARTILHADOS — Ponto Diário ─────────────────────────────────────

export interface DailyRecord {
  id: string
  memberId: string
  date: string         // YYYY-MM-DD
  dayOfWeek: number    // 0=Dom … 6=Sáb
  competence: string   // YYYY-MM
  dayType: string      // UTIL | SABADO | DOMINGO | FERIADO | FOLGA | ESPECIAL
  calendarEntryId: string | null
  scheduleId: string | null
  plannedMinutes: number
  entryMode: string    // MARCACAO | TOTAL | IMPORTACAO | AJUSTE
  entry1: string | null; exit1: string | null
  entry2: string | null; exit2: string | null
  entry3: string | null; exit3: string | null
  entry4: string | null; exit4: string | null
  totalMinutes: number | null
  workedMinutes: number
  balanceMinutes: number
  classification: string  // BANCO | HORA_EXTRA | ABONADO | DESCONTO | COMPENSACAO | SEM_EFEITO | PENDENTE
  justification: string | null
  justificationDesc: string | null
  hasAttachment: boolean
  status: string       // NAO_PREENCHIDO | PREENCHIDO | CONFERIDO | DIVERGENCIA | JUSTIFICADO | PENDENTE | FECHADO
  source: string
  observations: string | null
  createdAt: string
  updatedAt: string
}

export interface MonthlyCompetence {
  id: string
  memberId: string
  competence: string
  plannedMinutes: number
  workedMinutes: number
  balanceMinutes: number
  bankCreditMinutes: number
  bankDebitMinutes: number
  overtimeMinutes: number
  abonoMinutes: number
  compensationMinutes: number
  pendingCount: number
  status: string   // ABERTA | FECHADA | REABERTA
  closedAt: string | null
  closedBy: string | null
  bankHoursEntryId: string | null
  observations: string | null
}

export interface TimesheetSummary {
  plannedMinutes: number;   plannedHHMM: string
  workedMinutes: number;    workedHHMM: string
  balanceMinutes: number;   balanceHHMM: string
  bankCreditMinutes: number; bankCreditHHMM: string
  bankDebitMinutes: number;  bankDebitHHMM: string
  overtimeMinutes: number;   overtimeHHMM: string
  abonoMinutes: number;      abonoHHMM: string
  compensationMinutes: number; compensationHHMM: string
  pendingCount: number
  totalDays: number
  workedDays: number
}

export interface ScheduleDay {
  id: string
  scheduleId: string
  dayOfWeek: number
  isWorked: boolean
  entry1: string | null; exit1: string | null
  entry2: string | null; exit2: string | null
  entry3: string | null; exit3: string | null
  dailyMinutes: number
}

export interface Schedule {
  id: string
  memberId: string
  name: string
  weeklyMinutes: number
  monthlyMinutes: number
  startDate: string
  endDate: string | null
  observations: string | null
  active: boolean
  days: ScheduleDay[]
}

export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const DAY_NAMES_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

export const CLASSIFICATION_LABELS: Record<string, string> = {
  BANCO:       'Banco de Horas',
  HORA_EXTRA:  'Hora Extra',
  ABONADO:     'Abonado',
  DESCONTO:    'Desconto',
  COMPENSACAO: 'Compensação',
  SEM_EFEITO:  'Sem Efeito',
  PENDENTE:    'Pendente',
}

export const STATUS_LABELS: Record<string, string> = {
  NAO_PREENCHIDO: 'Não preenchido',
  PREENCHIDO:     'Preenchido',
  CONFERIDO:      'Conferido',
  DIVERGENCIA:    'Divergência',
  JUSTIFICADO:    'Justificado',
  PENDENTE:       'Pendente',
  FECHADO:        'Fechado',
}

export const DAY_TYPE_LABELS: Record<string, string> = {
  UTIL:    'Útil',
  SABADO:  'Sábado',
  DOMINGO: 'Domingo',
  FERIADO: 'Feriado',
  FOLGA:   'Folga',
  ESPECIAL: 'Especial',
}

export function min2hhmm(min: number): string {
  const abs = Math.abs(min)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${min < 0 ? '-' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function currentCompetence(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function competenceLabel(comp: string): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const [y, m] = comp.split('-').map(Number)
  return `${months[m - 1]}/${y}`
}

export function prevCompetence(comp: string): string {
  const [y, m] = comp.split('-').map(Number)
  const pm = m === 1 ? 12 : m - 1
  const py = m === 1 ? y - 1 : y
  return `${py}-${String(pm).padStart(2, '0')}`
}

export function nextCompetence(comp: string): string {
  const [y, m] = comp.split('-').map(Number)
  const nm = m === 12 ? 1 : m + 1
  const ny = m === 12 ? y + 1 : y
  return `${ny}-${String(nm).padStart(2, '0')}`
}
