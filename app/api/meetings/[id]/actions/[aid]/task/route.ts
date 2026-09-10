import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logHistory, requirePermission } from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'
type Ctx = { params: { id: string; aid: string } }

// Prioridade da reunião → prioridade da Task
const PRIORITY_MAP: Record<string, string> = {
  BAIXA: 'BAIXA', NORMAL: 'MEDIA', ALTA: 'ALTA', URGENTE: 'ALTA',
}

// ─── POST /api/meetings/[id]/actions/[aid]/task ──────────────────────────────
// Gera a Task a partir da ação. Só roda quando o usuário clica explicitamente
// em "Criar tarefa" ou "Enviar para Pendências" — nunca automaticamente.
//
// "Pendências" é uma visão da mesma lista de Task; por isso os dois botões
// criam uma Task, diferindo apenas no status inicial.
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const action = await prisma.meetingAction.findUnique({
      where: { id: params.aid },
      include: {
        responsible: { select: { id: true, name: true } },
        agendaItem:  { select: { title: true } },
        meeting:     { select: { id: true, title: true, date: true } },
        task:        { select: { id: true, title: true } },
      },
    })
    if (!action || action.meetingId !== params.id)
      return NextResponse.json({ error: 'Ação não encontrada nesta reunião.' }, { status: 404 })

    // Não duplica: se já existe vínculo, devolve o existente.
    if (action.taskId && action.task) {
      return NextResponse.json(
        { error: 'Esta ação já possui uma tarefa vinculada.', task: action.task },
        { status: 409 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const status: string = body.status || 'PENDENTE'

    const contexto = [
      `Origem: reunião "${action.meeting.title}" (${action.meeting.date}).`,
      action.agendaItem ? `Assunto: ${action.agendaItem.title}.` : null,
      action.notes || null,
    ].filter(Boolean).join(' ')

    const task = await prisma.task.create({
      data: {
        title:       action.description.slice(0, 200),
        description: contexto,
        origin:      'REUNIAO',
        priority:    PRIORITY_MAP[action.priority] ?? 'MEDIA',
        status,
        responsible: action.responsible?.name ?? null,
        // dueDate da ação é "YYYY-MM-DD"; fixa meio-dia UTC para não escorregar
        // de dia por timezone ao ser exibida.
        dueDate:     action.dueDate ? new Date(`${action.dueDate}T12:00:00.000Z`) : null,
        observations: `Gerada a partir de ação de reunião.`,
        userId:      'default-user',
      },
    })

    const updated = await prisma.meetingAction.update({
      where: { id: params.aid },
      data:  { taskId: task.id },
      include: {
        responsible: { select: { id: true, name: true, role: true } },
        agendaItem:  { select: { id: true, title: true, order: true } },
        task:        { select: { id: true, title: true, status: true } },
      },
    })

    await logHistory(params.id, 'TAREFA_GERADA', 'Tarefa criada a partir de ação',
      `${action.description.slice(0, 140)} → tarefa "${task.title}"`, body.createdBy)

    return NextResponse.json({ action: updated, task }, { status: 201 })
  } catch (e) {
    console.error('[meetings/actions/task POST]', e)
    return NextResponse.json({ error: 'Erro ao gerar tarefa' }, { status: 500 })
  }
}

// ─── DELETE — desvincula (mantém a Task existente) ───────────────────────────
export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const action = await prisma.meetingAction.findUnique({ where: { id: params.aid } })
    if (!action || action.meetingId !== params.id)
      return NextResponse.json({ error: 'Ação não encontrada nesta reunião.' }, { status: 404 })

    await prisma.meetingAction.update({ where: { id: params.aid }, data: { taskId: null } })
    await logHistory(params.id, 'ACAO_ATUALIZADA', 'Vínculo com tarefa removido',
      action.description.slice(0, 140))

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[meetings/actions/task DELETE]', e)
    return NextResponse.json({ error: 'Erro ao desvincular tarefa' }, { status: 500 })
  }
}
