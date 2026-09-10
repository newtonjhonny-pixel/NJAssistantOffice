import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logHistory, requirePermission, AGENDA_STATUS, PRIORITIES } from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'
type Ctx = { params: { id: string; itemId: string } }

const itemInclude = {
  presenter: { select: { id: true, name: true, role: true } },
  decisions: { orderBy: { createdAt: 'asc' } },
  actions: {
    orderBy: { createdAt: 'asc' },
    include: { responsible: { select: { id: true, name: true, role: true } } },
  },
} as const

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const item = await prisma.meetingAgendaItem.findUnique({
      where: { id: params.itemId },
      include: itemInclude,
    })
    if (!item || item.meetingId !== params.id)
      return NextResponse.json({ error: 'Assunto não encontrado nesta reunião.' }, { status: 404 })
    return NextResponse.json(item)
  } catch (e) {
    console.error('[agenda/[itemId] GET]', e)
    return NextResponse.json({ error: 'Erro ao buscar assunto' }, { status: 500 })
  }
}

// ─── PATCH — inclui o registro da discussão durante a reunião ────────────────
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const existing = await prisma.meetingAgendaItem.findUnique({ where: { id: params.itemId } })
    if (!existing || existing.meetingId !== params.id)
      return NextResponse.json({ error: 'Assunto não encontrado nesta reunião.' }, { status: 404 })

    const body = await req.json()
    if (body.priority && !PRIORITIES.includes(body.priority))
      return NextResponse.json({ error: 'Prioridade inválida.' }, { status: 400 })
    if (body.status && !AGENDA_STATUS.includes(body.status))
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}
    if (body.title !== undefined) {
      if (!body.title?.trim()) return NextResponse.json({ error: 'Título não pode ficar vazio.' }, { status: 400 })
      data.title = body.title.trim()
    }
    if (body.description !== undefined)      data.description = body.description?.trim() || null
    if (body.discussion  !== undefined)      data.discussion  = body.discussion || null   // HTML do editor
    if (body.presenterId !== undefined)      data.presenterId = body.presenterId || null
    if (body.priority    !== undefined)      data.priority    = body.priority
    if (body.status      !== undefined)      data.status      = body.status
    if (body.estimatedMinutes !== undefined) data.estimatedMinutes = body.estimatedMinutes != null ? Number(body.estimatedMinutes) : null
    if (body.order !== undefined)            data.order = Number(body.order)

    if (!Object.keys(data).length)
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })

    const item = await prisma.meetingAgendaItem.update({
      where: { id: params.itemId },
      data,
      include: itemInclude,
    })

    await logHistory(params.id, 'PAUTA_ALTERADA', 'Assunto atualizado',
      `${item.title} — campos: ${Object.keys(data).join(', ')}`)

    return NextResponse.json(item)
  } catch (e) {
    console.error('[agenda/[itemId] PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar assunto' }, { status: 500 })
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
// Cascade remove decisões e ações do assunto — sem órfãos.
export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const existing = await prisma.meetingAgendaItem.findUnique({
      where: { id: params.itemId },
      include: { _count: { select: { decisions: true, actions: true } } },
    })
    if (!existing || existing.meetingId !== params.id)
      return NextResponse.json({ error: 'Assunto não encontrado nesta reunião.' }, { status: 404 })

    await prisma.meetingAgendaItem.delete({ where: { id: params.itemId } })

    await logHistory(params.id, 'PAUTA_ALTERADA', 'Assunto removido da pauta',
      `${existing.title} (${existing._count.decisions} decisão/ões, ${existing._count.actions} ação/ões removidas junto)`)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[agenda/[itemId] DELETE]', e)
    return NextResponse.json({ error: 'Erro ao remover assunto' }, { status: 500 })
  }
}
