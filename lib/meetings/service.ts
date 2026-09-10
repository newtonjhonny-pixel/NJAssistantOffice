import { prisma } from '@/lib/prisma'

// ─── Constantes de domínio ───────────────────────────────────────────────────

export const MEETING_STATUS = [
  'RASCUNHO', 'AGENDADA', 'EM_ANDAMENTO', 'REALIZADA', 'CONCLUIDA', 'CANCELADA', 'ARQUIVADA',
] as const

export const MEETING_TYPES = [
  'EQUIPE', 'INDIVIDUAL', 'ALINHAMENTO', 'ACOMPANHAMENTO',
  'PROJETO', 'TREINAMENTO', 'DIRETORIA', 'OUTRO',
] as const

export const AGENDA_STATUS = ['NAO_INICIADO', 'EM_DISCUSSAO', 'DISCUTIDO', 'PENDENTE', 'CONCLUIDO'] as const
export const ACTION_STATUS = ['A_FAZER', 'EM_ANDAMENTO', 'AGUARDANDO', 'CONCLUIDA', 'CANCELADA'] as const
export const PRIORITIES    = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'] as const
export const ATTENDANCE    = ['CONVIDADO', 'CONFIRMADO', 'PRESENTE', 'AUSENTE', 'JUSTIFICADO'] as const

/** Status em que a reunião ainda aceita edição estrutural da pauta. */
export const EDITABLE_STATUS = ['RASCUNHO', 'AGENDADA', 'EM_ANDAMENTO', 'REALIZADA'] as const

// ─── Histórico ───────────────────────────────────────────────────────────────
// Gerado sempre no backend — o frontend nunca é responsável por registrar.

export type MeetingHistoryType =
  | 'CRIADA' | 'ATUALIZADA' | 'PAUTA_ALTERADA'
  | 'PARTICIPANTE_ADICIONADO' | 'PARTICIPANTE_REMOVIDO'
  | 'DECISAO_REGISTRADA' | 'DECISAO_REMOVIDA'
  | 'ACAO_CRIADA' | 'ACAO_ATUALIZADA' | 'ACAO_CONCLUIDA' | 'ACAO_REMOVIDA'
  | 'RESPONSAVEL_ALTERADO' | 'PRAZO_ALTERADO'
  | 'TAREFA_GERADA'
  | 'CONCLUIDA' | 'REABERTA' | 'ARQUIVADA' | 'DUPLICADA'
  | 'ANEXO_ADICIONADO' | 'ANEXO_REMOVIDO'

export async function logHistory(
  meetingId: string,
  type: MeetingHistoryType,
  title: string,
  description?: string | null,
  createdBy?: string | null,
) {
  try {
    await prisma.meetingHistory.create({
      data: { meetingId, type, title, description: description ?? null, createdBy: createdBy ?? null },
    })
  } catch (e) {
    // Histórico nunca deve derrubar a operação principal.
    console.error('[meetings/logHistory]', e)
  }
}

// ─── Validações de integridade ───────────────────────────────────────────────

/**
 * Garante que o agendaItem informado pertence à reunião informada.
 * Impede que uma decisão/ação aponte para um item de OUTRA reunião.
 * Retorna mensagem de erro, ou null se estiver tudo certo.
 */
export async function validateAgendaItemOwnership(
  meetingId: string,
  agendaItemId: string | null | undefined,
): Promise<string | null> {
  if (!agendaItemId) return null
  const item = await prisma.meetingAgendaItem.findUnique({
    where: { id: agendaItemId },
    select: { meetingId: true },
  })
  if (!item) return 'Item de pauta não encontrado.'
  if (item.meetingId !== meetingId) return 'O item de pauta pertence a outra reunião.'
  return null
}

/** Participante precisa ser interno (teamMemberId) OU externo (externalName). */
export function validateParticipant(
  teamMemberId?: string | null,
  externalName?: string | null,
): string | null {
  const hasInternal = !!teamMemberId?.trim()
  const hasExternal = !!externalName?.trim()
  if (!hasInternal && !hasExternal)
    return 'Informe um colaborador interno ou o nome do participante externo.'
  if (hasInternal && hasExternal)
    return 'Participante deve ser interno OU externo, não os dois.'
  return null
}

/** Valida "YYYY-MM-DD". */
export function isValidDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

/** Valida "HH:MM". */
export function isValidTime(v: unknown): v is string {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
}

// ─── Permissões ──────────────────────────────────────────────────────────────
// O sistema hoje possui apenas User.role (admin | viewer). Centralizamos aqui
// para que permissões granulares possam ser adicionadas sem tocar nas rotas.

export type MeetingPermission =
  | 'view' | 'create' | 'edit' | 'delete' | 'complete' | 'print' | 'ai'

export class PermissionCheckError extends Error {}

/**
 * Papel do usuário atual. Segue o mesmo mecanismo do restante do sistema
 * (User.role: admin | viewer) — não há RBAC granular.
 *
 * Uma falha de infraestrutura NÃO pode ser tratada como "viewer": isso
 * transformaria erro de banco em 403 e esconderia a causa real. Nesse caso
 * a exceção sobe e vira 500, que é o status correto.
 */
export async function getCurrentRole(): Promise<string> {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { role: true } })
    // Sem usuário cadastrado o sistema opera como admin (instalação single-user),
    // igual ao que /api/me faz ao semear o usuário padrão.
    return user?.role ?? 'admin'
  } catch (e) {
    console.error('[meetings/getCurrentRole] falha ao resolver papel do usuário', e)
    throw new PermissionCheckError('Não foi possível verificar as permissões do usuário.')
  }
}

/**
 * Papéis com permissão total.
 *
 * `system` é a conta técnica criada na instalação (é o único usuário em
 * produção). Tratá-la como somente leitura tornaria o módulo inutilizável.
 * `viewer` — e qualquer papel desconhecido — permanece só leitura.
 */
const PRIVILEGED_ROLES = ['admin', 'system'] as const

export function roleAllows(role: string, permission: MeetingPermission): boolean {
  if ((PRIVILEGED_ROLES as readonly string[]).includes(role)) return true
  return permission === 'view' || permission === 'print'
}

export async function requirePermission(permission: MeetingPermission): Promise<string | null> {
  const role = await getCurrentRole()
  return roleAllows(role, permission) ? null : 'Acesso negado para esta operação.'
}

// ─── Include padrão ──────────────────────────────────────────────────────────

export const meetingFullInclude = {
  organizer:    { select: { id: true, name: true, role: true } },
  participants: {
    include: { teamMember: { select: { id: true, name: true, role: true, sector: true } } },
    orderBy: { createdAt: 'asc' },
  },
  agendaItems: {
    orderBy: { order: 'asc' },
    include: {
      presenter: { select: { id: true, name: true, role: true } },
      decisions: { orderBy: { createdAt: 'asc' } },
      actions: {
        orderBy: { createdAt: 'asc' },
        include: { responsible: { select: { id: true, name: true, role: true } } },
      },
    },
  },
  decisions: { orderBy: { createdAt: 'asc' } },
  actions: {
    orderBy: { createdAt: 'asc' },
    include: {
      responsible: { select: { id: true, name: true, role: true } },
      agendaItem:  { select: { id: true, title: true, order: true } },
    },
  },
  attachments: { orderBy: { createdAt: 'desc' } },
} as const
