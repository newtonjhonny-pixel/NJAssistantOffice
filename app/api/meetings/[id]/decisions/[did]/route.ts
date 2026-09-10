import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logHistory, requirePermission, validateAgendaItemOwnership } from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'
type Ctx = { params: { id: string; did: string } }

// ─── PATCH ───────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const existing = await prisma.meetingDecision.findUnique({ where: { id: params.did } })
    if (!existing || existing.meetingId !== params.id)
      return NextResponse.json({ error: 'Decisão não encontrada nesta reunião.' }, { status: 404 })

    const body = await req.json()
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
    if (!Object.keys(data).length)
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })

    const decision = await prisma.meetingDecision.update({
      where: { id: params.did },
      data,
      include: { agendaItem: { select: { id: true, title: true, order: true } } },
    })
    return NextResponse.json(decision)
  } catch (e) {
    console.error('[decisions PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar decisão' }, { status: 500 })
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const existing = await prisma.meetingDecision.findUnique({ where: { id: params.did } })
    if (!existing || existing.meetingId !== params.id)
      return NextResponse.json({ error: 'Decisão não encontrada nesta reunião.' }, { status: 404 })

    await prisma.meetingDecision.delete({ where: { id: params.did } })
    await logHistory(params.id, 'DECISAO_REMOVIDA', 'Decisão removida', existing.description.slice(0, 180))

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[decisions DELETE]', e)
    return NextResponse.json({ error: 'Erro ao remover decisão' }, { status: 500 })
  }
}
