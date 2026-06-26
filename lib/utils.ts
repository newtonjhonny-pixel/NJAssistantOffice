import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Helpers de data sem deslocamento de fuso ────────────────────────────────

/**
 * Interpreta uma string "YYYY-MM-DD" como data local ao meio-dia,
 * evitando que `new Date("yyyy-MM-dd")` interprete em UTC e desloque o dia.
 */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day, 12, 0, 0) // meio-dia local
}

/**
 * Extrai a parte YYYY-MM-DD de uma string ISO ou Date sem conversão de fuso.
 * "2026-06-30T00:00:00.000Z" → "2026-06-30"
 */
function toDatePart(date: Date | string): string {
  if (typeof date === 'string') return date.slice(0, 10)
  return date.toISOString().slice(0, 10) // UTC date — seguro para datas salvas como meio-dia local
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD no fuso de São Paulo.
 */
function todayBR(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

// ─── Formatação ───────────────────────────────────────────────────────────────

/**
 * Formata data como DD/MM/YYYY sem conversão de fuso.
 * Extrai diretamente os componentes da string ISO para evitar deslocamento.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const part = toDatePart(date)  // "YYYY-MM-DD"
  const [year, month, day] = part.split('-')
  if (!year || !month || !day) return '-'
  return `${day}/${month}/${year}`
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor(diff / 60000)

  if (days > 1) return `há ${days} dias`
  if (days === 1) return 'há 1 dia'
  if (hours > 1) return `há ${hours} horas`
  if (hours === 1) return 'há 1 hora'
  if (minutes > 1) return `há ${minutes} minutos`
  return 'agora mesmo'
}

/**
 * Compara apenas a parte da data (sem horário/fuso) para determinar atraso.
 * "2026-06-30T00:00:00Z" salvo como UTC midnight ainda é exibido como 30/06.
 */
export function isOverdue(date: Date | string | null | undefined): boolean {
  if (!date) return false
  const duePart   = toDatePart(date)   // "YYYY-MM-DD" da tarefa
  const todayPart = todayBR()          // "YYYY-MM-DD" de hoje em SP
  return duePart < todayPart
}

export function daysUntilDue(date: Date | string | null | undefined): number | null {
  if (!date) return null
  const duePart   = toDatePart(date)
  const todayPart = todayBR()
  const [dy, dm, dd] = duePart.split('-').map(Number)
  const [ty, tm, td] = todayPart.split('-').map(Number)
  const due   = new Date(dy, dm - 1, dd)
  const today = new Date(ty, tm - 1, td)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

export const PRIORITY_LABELS: Record<string, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
}

export const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_RETORNO: 'Aguardando retorno',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

export const PRIORITY_COLORS: Record<string, string> = {
  BAIXA: 'bg-slate-100 text-slate-700 border-slate-200',
  MEDIA: 'bg-blue-50 text-blue-700 border-blue-200',
  ALTA: 'bg-orange-50 text-orange-700 border-orange-200',
  URGENTE: 'bg-red-50 text-red-700 border-red-200',
}

export const STATUS_COLORS: Record<string, string> = {
  PENDENTE: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  EM_ANDAMENTO: 'bg-blue-50 text-blue-700 border-blue-200',
  AGUARDANDO_RETORNO: 'bg-purple-50 text-purple-700 border-purple-200',
  CONCLUIDA: 'bg-green-50 text-green-700 border-green-200',
  CANCELADA: 'bg-slate-100 text-slate-500 border-slate-200',
}

export const AGENT_NAMES: Record<string, string> = {
  ASSISTENTE: 'Assistente Administrativo',
  ANALISTA: 'Analista Administrativo',
  REDATOR: 'Redator Administrativo',
  PENDENCIAS: 'Gestor de Pendências',
  COORDENADOR: 'Coordenador Administrativo',
}

export const AGENT_COLORS: Record<string, string> = {
  ASSISTENTE: 'from-blue-500 to-blue-600',
  ANALISTA: 'from-violet-500 to-violet-600',
  REDATOR: 'from-emerald-500 to-emerald-600',
  PENDENCIAS: 'from-orange-500 to-orange-600',
  COORDENADOR: 'from-slate-600 to-slate-700',
}

export const AGENT_ICONS: Record<string, string> = {
  ASSISTENTE: '🗂️',
  ANALISTA: '🔍',
  REDATOR: '✍️',
  PENDENCIAS: '⚠️',
  COORDENADOR: '🎯',
}
