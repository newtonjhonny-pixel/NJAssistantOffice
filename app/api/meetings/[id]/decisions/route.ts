import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logHistory, requirePermission, validateAgendaItemOwnership } from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'
type Ctx = { params: { id: string } }

// ─── GET /api/meetings/[id]/decisions ────────────────────────────────────────
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const agendaItemId = req.nextUrl.searchParams.get('agendaItemId')
    const rows = await prisma.meetingDecision.findMany({
      where: { meetingId: params.id, ...(agendaItemId ? { agendaItemId } : {}) },
      orderBy: { createdAt: 'asc' },
      include: { agendaItem: { select: { id: true, title: true, order: true } } },
    })
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[decisions GET]', e)
    return NextResponse.json({ error: 'Erro ao listar decisões' }, { status: 500 })
  }
}

// ─── POST /api/meetings/[id]/decisions ───────────────────────────────────────
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const meeting = await prisma.meeting.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 })

    const body = await req.json()
    const { description, agendaItemId, createdBy } = body

    if (!description?.trim())
      return NextResponse.json({ error: 'Descrição da decisão é obrigatória.' }, { status: 400 })

    // Integridade: o assunto precisa ser DESTA reunião.
    const ownErr = await validateAgendaItemOwnership(params.id, agendaItemId)
    if (ownErr) return NextResponse.json({ error: ownErr }, { status: 400 })

    const decision = await prisma.meetingDecision.create({
      data: {
        meetingId: params.id,
        agendaItemId: agendaItemId || null,
        description: description.trim(),
        createdBy: createdBy || null,
      },
      include: { agendaItem: { select: { id: true, title: true, order: true } } },
    })

    await logHistory(params.id, 'DECISAO_REGISTRADA', 'Decisão registrada',
      decision.description.slice(0, 180), createdBy)

    return NextResponse.json(decision, { status: 201 })
  } catch (e) {
    console.error('[decisions POST]', e)
    return NextResponse.json({ error: 'Erro ao registrar decisão' }, { status: 500 })
  }
}
