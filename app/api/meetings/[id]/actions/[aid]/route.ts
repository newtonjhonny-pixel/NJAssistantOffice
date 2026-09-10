import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  logHistory, requirePermission, validateAgendaItemOwnership,
  isValidDate, ACTION_STATUS, PRIORITIES,
} from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'
type Ctx = { params: { id: string; aid: string } }

const actionInclude = {
  responsible: { select: { id: true, name: true, role: true } },
  agendaItem:  { select: { id: true, title: true, order: true } },
  task:        { select: { id: true, title: true, status: true } },
} as const

// ─── PATCH ───────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const existing = await prisma.meetingAction.findUnique({
      where: { id: params.aid },
      include: { responsible: { select: { name: true } } },
    })
    if (!existing || existing.meetingId !== params.id)
      return NextResponse.json({ error: 'Ação não encontrada nesta reunião.' }, { status: 404 })

    const body = await req.json()
    if (body.dueDate && !isValidDate(body.dueDate))
      return NextResponse.json({ error: 'Prazo inválido. Use YYYY-MM-DD.' }, { status: 400 })
    if (body.priority && !PRIORITIES.includes(body.priority))
      return NextResponse.json({ error: 'Prioridade inválida.' }, { status: 400 })
    if (body.status && !ACTION_STATUS.includes(body.status))
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}
    if (body.description !== undefined) {
      if (!body.description?.trim())
        return NextResponse.json({ error: 'Descrição não pode ficar vazia.' }, { status: 400 })
      data.description = body.description.trim()
    }
    if (body.agendaItemId !== undefined) {
      const ownErr = await validateAgendaItemOwnership(params.id, body.agendaItemId)
      if (ownErr) return NextResponse.json({ error: ownErr }, { status: 400 })
      data.agendaItemId = body.agendaItemId || null
    }
    if (body.responsibleId !== undefined) data.responsibleId = body.responsibleId || null
    if (body.support       !== undefined) data.support       = body.support?.trim() || null
    if (body.dueDate       !== undefined) data.dueDate       = body.dueDate || null
    if (body.priority      !== undefined) data.priority      = body.priority
    if (body.notes         !== undefined) data.notes         = body.notes?.trim() || null

    if (body.status !== undefined) {
      data.status = body.status
      // completedAt acompanha o status automaticamente.
      if (body.status === 'CONCLUIDA' && existing.status !== 'CONCLUIDA') data.completedAt = new Date()
      if (body.status !== 'CONCLUIDA' && existing.status === 'CONCLUIDA') data.completedAt = null
    }

    if (!Object.keys(data).length)
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })

    const action = await prisma.meetingAction.update({
      where: { id: params.aid },
      data,
      include: actionInclude,
    })

    // Histórico granular para os eventos que importam.
    const resumo = action.description.slice(0, 140)
    if (data.status === 'CONCLUIDA') {
      await logHistory(params.id, 'ACAO_CONCLUIDA', 'Ação concluída', resumo, body.updatedBy)
    } else if (data.responsibleId !== undefined && data.responsibleId !== existing.responsibleId) {
      await logHistory(params.id, 'RESPONSAVEL_ALTERADO', 'Responsável alterado',
        `${resumo}: ${existing.responsible?.name ?? '—'} → ${action.responsible?.name ?? '—'}`, body.updatedBy)
    } else if (data.dueDate !== undefined && data.dueDate !== existing.dueDate) {
      await logHistory(params.id, 'PRAZO_ALTERADO', 'Prazo alterado',
        `${resumo}: ${existing.dueDate ?? '—'} → ${action.dueDate ?? '—'}`, body.updatedBy)
    } else {
      await logHistory(params.id, 'ACAO_ATUALIZADA', 'Ação atualizada', resumo, body.updatedBy)
    }

    return NextResponse.json(action)
  } catch (e) {
    console.error('[actions PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar ação' }, { status: 500 })
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const existing = await prisma.meetingAction.findUnique({ where: { id: params.aid } })
    if (!existing || existing.meetingId !== params.id)
      return NextResponse.json({ error: 'Ação não encontrada nesta reunião.' }, { status: 404 })

    await prisma.meetingAction.delete({ where: { id: params.aid } })
    await logHistory(params.id, 'ACAO_REMOVIDA', 'Ação removida', existing.description.slice(0, 140))

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[actions DELETE]', e)
    return NextResponse.json({ error: 'Erro ao remover ação' }, { status: 500 })
  }
}
