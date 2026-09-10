import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logHistory, requirePermission, meetingFullInclude } from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'
type Ctx = { params: { id: string } }

// ─── POST /api/meetings/[id]/complete ────────────────────────────────────────
// Conclui a reunião e devolve o resumo consolidado.
// Ações pendentes CONTINUAM pendentes e acessíveis — concluir a reunião não
// fecha nem apaga o que ficou em aberto.
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('complete')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
      include: { _count: { select: { agendaItems: true, decisions: true, actions: true } } },
    })
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 })
    if (meeting.status === 'CONCLUIDA')
      return NextResponse.json({ error: 'Reunião já está concluída.' }, { status: 409 })

    const body = await req.json().catch(() => ({}))
    const { finalSummary, completedBy } = body

    const [completedActions, pendingActions] = await Promise.all([
      prisma.meetingAction.count({ where: { meetingId: params.id, status: 'CONCLUIDA' } }),
      prisma.meetingAction.count({ where: { meetingId: params.id, status: { in: ['A_FAZER', 'EM_ANDAMENTO', 'AGUARDANDO'] } } }),
    ])

    const updated = await prisma.meeting.update({
      where: { id: params.id },
      data: {
        status: 'CONCLUIDA',
        completedAt: new Date(),
        completedBy: completedBy || null,
        ...(finalSummary !== undefined && { finalSummary: finalSummary?.trim() || null }),
      },
      include: meetingFullInclude,
    })

    const resumo =
      `${meeting._count.agendaItems} assunto(s), ${meeting._count.decisions} decisão/ões, ` +
      `${meeting._count.actions} ação/ões (${completedActions} concluída(s), ${pendingActions} pendente(s))`

    await logHistory(params.id, 'CONCLUIDA', 'Reunião concluída', resumo, completedBy)

    return NextResponse.json({
      meeting: updated,
      summary: {
        completedAt:   updated.completedAt,
        completedBy:   updated.completedBy,
        agendaItems:   meeting._count.agendaItems,
        decisions:     meeting._count.decisions,
        actions:       meeting._count.actions,
        actionsDone:   completedActions,
        actionsPending: pendingActions,
      },
    })
  } catch (e) {
    console.error('[meetings/complete POST]', e)
    return NextResponse.json({ error: 'Erro ao concluir reunião' }, { status: 500 })
  }
}

// ─── DELETE /api/meetings/[id]/complete — reabrir ────────────────────────────
export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('complete')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const meeting = await prisma.meeting.findUnique({ where: { id: params.id } })
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 })
    if (meeting.status !== 'CONCLUIDA')
      return NextResponse.json({ error: 'Reunião não está concluída.' }, { status: 409 })

    const updated = await prisma.meeting.update({
      where: { id: params.id },
      data: { status: 'REALIZADA', completedAt: null, completedBy: null },
      include: meetingFullInclude,
    })

    await logHistory(params.id, 'REABERTA', 'Reunião reaberta')
    return NextResponse.json(updated)
  } catch (e) {
    console.error('[meetings/complete DELETE]', e)
    return NextResponse.json({ error: 'Erro ao reabrir reunião' }, { status: 500 })
  }
}
