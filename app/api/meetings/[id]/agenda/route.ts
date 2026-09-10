import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logHistory, requirePermission, AGENDA_STATUS, PRIORITIES } from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'
type Ctx = { params: { id: string } }

// ─── GET /api/meetings/[id]/agenda ───────────────────────────────────────────
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const rows = await prisma.meetingAgendaItem.findMany({
      where: { meetingId: params.id },
      orderBy: { order: 'asc' },
      include: {
        presenter: { select: { id: true, name: true, role: true } },
        decisions: { orderBy: { createdAt: 'asc' } },
        actions: {
          orderBy: { createdAt: 'asc' },
          include: { responsible: { select: { id: true, name: true, role: true } } },
        },
      },
    })
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[agenda GET]', e)
    return NextResponse.json({ error: 'Erro ao listar pauta' }, { status: 500 })
  }
}

// ─── POST /api/meetings/[id]/agenda ──────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const meeting = await prisma.meeting.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 })

    const body = await req.json()
    const { title, description, presenterId, estimatedMinutes, priority, status } = body

    if (!title?.trim())
      return NextResponse.json({ error: 'Título do assunto é obrigatório.' }, { status: 400 })
    if (priority && !PRIORITIES.includes(priority))
      return NextResponse.json({ error: `Prioridade inválida. Use: ${PRIORITIES.join(', ')}` }, { status: 400 })
    if (status && !AGENDA_STATUS.includes(status))
      return NextResponse.json({ error: `Status inválido. Use: ${AGENDA_STATUS.join(', ')}` }, { status: 400 })

    const last = await prisma.meetingAgendaItem.findFirst({
      where: { meetingId: params.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const item = await prisma.meetingAgendaItem.create({
      data: {
        meetingId: params.id,
        order: (last?.order ?? 0) + 1,
        title: title.trim(),
        description: description?.trim() || null,
        presenterId: presenterId || null,
        estimatedMinutes: estimatedMinutes != null ? Number(estimatedMinutes) : null,
        priority: priority || 'NORMAL',
        status:   status   || 'NAO_INICIADO',
      },
      include: {
        presenter: { select: { id: true, name: true, role: true } },
        decisions: true,
        actions:   { include: { responsible: { select: { id: true, name: true, role: true } } } },
      },
    })

    await logHistory(params.id, 'PAUTA_ALTERADA', 'Assunto adicionado à pauta', item.title, body.createdBy)
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    console.error('[agenda POST]', e)
    return NextResponse.json({ error: 'Erro ao adicionar assunto' }, { status: 500 })
  }
}

// ─── PUT /api/meetings/[id]/agenda — reordenação em lote ─────────────────────
// body: { order: [{ id, order }, ...] }
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const { order } = await req.json()
    if (!Array.isArray(order) || !order.length)
      return NextResponse.json({ error: 'Envie a lista "order".' }, { status: 400 })

    // Garante que todos os itens pertencem a esta reunião antes de gravar.
    const ids = order.map((o: { id: string }) => o.id)
    const owned = await prisma.meetingAgendaItem.count({
      where: { id: { in: ids }, meetingId: params.id },
    })
    if (owned !== ids.length)
      return NextResponse.json({ error: 'Há itens que não pertencem a esta reunião.' }, { status: 400 })

    await prisma.$transaction(
      order.map((o: { id: string; order: number }) =>
        prisma.meetingAgendaItem.update({ where: { id: o.id }, data: { order: Number(o.order) } })
      )
    )

    await logHistory(params.id, 'PAUTA_ALTERADA', 'Pauta reordenada', `${ids.length} assunto(s)`)

    const rows = await prisma.meetingAgendaItem.findMany({
      where: { meetingId: params.id },
      orderBy: { order: 'asc' },
      include: {
        presenter: { select: { id: true, name: true, role: true } },
        decisions: { orderBy: { createdAt: 'asc' } },
        actions: { include: { responsible: { select: { id: true, name: true, role: true } } } },
      },
    })
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[agenda PUT]', e)
    return NextResponse.json({ error: 'Erro ao reordenar pauta' }, { status: 500 })
  }
}
