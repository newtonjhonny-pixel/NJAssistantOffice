export interface TeamMemberLite {
  id: string
  name: string
  role?: string | null
  sector?: string | null
}

export interface Participant {
  id: string
  teamMemberId: string | null
  teamMember: TeamMemberLite | null
  externalName: string | null
  externalEmail: string | null
  externalRole: string | null
  attendanceStatus: string
}

export interface Decision {
  id: string
  meetingId: string
  agendaItemId: string | null
  description: string
  createdBy: string | null
  createdAt: string
  agendaItem?: { id: string; title: string; order: number } | null
}

export interface Action {
  id: string
  meetingId: string
  agendaItemId: string | null
  description: string
  responsibleId: string | null
  responsible: TeamMemberLite | null
  support: string | null
  dueDate: string | null
  priority: string
  status: string
  completedAt: string | null
  notes: string | null
  taskId: string | null
  task?: { id: string; title: string; status: string } | null
  agendaItem?: { id: string; title: string; order: number } | null
  createdAt: string
}

export interface AgendaItem {
  id: string
  meetingId: string
  order: number
  title: string
  description: string | null
  discussion: string | null
  presenterId: string | null
  presenter: TeamMemberLite | null
  estimatedMinutes: number | null
  priority: string
  status: string
  decisions: Decision[]
  actions: Action[]
}

export interface Meeting {
  id: string
  title: string
  objective: string | null
  type: string
  status: string
  category: string | null
  date: string
  startTime: string | null
  endTime: string | null
  location: string | null
  meetingUrl: string | null
  recurrence: string | null
  observations: string | null
  finalSummary: string | null
  completedAt: string | null
  completedBy: string | null
  organizerId: string | null
  organizer: TeamMemberLite | null
  duplicatedFromId: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  participants: Participant[]
  agendaItems: AgendaItem[]
  decisions: Decision[]
  actions: Action[]
  attachments?: unknown[]
}

export interface MeetingListItem extends Omit<Meeting, 'agendaItems' | 'decisions' | 'actions' | 'participants'> {
  participants: Array<{ id: string; externalName: string | null; teamMember: { id: string; name: string } | null }>
  pendingActions: number
  _count: { agendaItems: number; decisions: number; actions: number }
}

export interface HistoryEntry {
  id: string
  type: string
  title: string
  description: string | null
  createdBy: string | null
  createdAt: string
}

// ─── Rótulos ─────────────────────────────────────────────────────────────────

export const MEETING_TYPE_LABELS: Record<string, string> = {
  EQUIPE: "Reunião de Equipe", INDIVIDUAL: "Reunião Individual",
  ALINHAMENTO: "Alinhamento", ACOMPANHAMENTO: "Acompanhamento",
  PROJETO: "Projeto", TREINAMENTO: "Treinamento",
  DIRETORIA: "Diretoria", OUTRO: "Outro",
}

export const MEETING_STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho", AGENDADA: "Agendada", EM_ANDAMENTO: "Em andamento",
  REALIZADA: "Realizada", CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
  ARQUIVADA: "Arquivada",
}

export const MEETING_STATUS_COLORS: Record<string, string> = {
  RASCUNHO: "bg-slate-100 text-slate-600", AGENDADA: "bg-blue-100 text-blue-700",
  EM_ANDAMENTO: "bg-amber-100 text-amber-700", REALIZADA: "bg-violet-100 text-violet-700",
  CONCLUIDA: "bg-emerald-100 text-emerald-700", CANCELADA: "bg-red-100 text-red-600",
  ARQUIVADA: "bg-slate-200 text-slate-500",
}

export const AGENDA_STATUS_LABELS: Record<string, string> = {
  NAO_INICIADO: "Não iniciado", EM_DISCUSSAO: "Em discussão",
  DISCUTIDO: "Discutido", PENDENTE: "Pendente", CONCLUIDO: "Concluído",
}

export const AGENDA_STATUS_COLORS: Record<string, string> = {
  NAO_INICIADO: "bg-slate-100 text-slate-500", EM_DISCUSSAO: "bg-amber-100 text-amber-700",
  DISCUTIDO: "bg-blue-100 text-blue-700", PENDENTE: "bg-orange-100 text-orange-700",
  CONCLUIDO: "bg-emerald-100 text-emerald-700",
}

export const ACTION_STATUS_LABELS: Record<string, string> = {
  A_FAZER: "A fazer", EM_ANDAMENTO: "Em andamento", AGUARDANDO: "Aguardando",
  CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
}

export const ACTION_STATUS_COLORS: Record<string, string> = {
  A_FAZER: "bg-slate-100 text-slate-600", EM_ANDAMENTO: "bg-blue-100 text-blue-700",
  AGUARDANDO: "bg-amber-100 text-amber-700", CONCLUIDA: "bg-emerald-100 text-emerald-700",
  CANCELADA: "bg-red-100 text-red-600",
}

export const PRIORITY_LABELS: Record<string, string> = {
  BAIXA: "Baixa", NORMAL: "Normal", ALTA: "Alta", URGENTE: "Urgente",
}

export const PRIORITY_COLORS: Record<string, string> = {
  BAIXA: "bg-slate-100 text-slate-500", NORMAL: "bg-blue-100 text-blue-600",
  ALTA: "bg-orange-100 text-orange-700", URGENTE: "bg-red-100 text-red-700",
}

export const ATTENDANCE_LABELS: Record<string, string> = {
  CONVIDADO: "Convidado", CONFIRMADO: "Confirmado", PRESENTE: "Presente",
  AUSENTE: "Ausente", JUSTIFICADO: "Justificado",
}

/** Formata "YYYY-MM-DD" sem passar por Date — evita deslocamento de timezone. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function fmtDateLong(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return String(iso)
  const meses = ["janeiro","fevereiro","março","abril","maio","junho",
                 "julho","agosto","setembro","outubro","novembro","dezembro"]
  return `${String(d).padStart(2,"0")} de ${meses[m-1]} de ${y}`
}
