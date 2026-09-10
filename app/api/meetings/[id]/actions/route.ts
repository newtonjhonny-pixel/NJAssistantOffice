import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  logHistory, requirePermission, validateAgendaItemOwnership,
  isValidDate, ACTION_STATUS, PRIORITIES,
} from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'
type Ctx = { params: { id: string } }

const actionInclude = {
  responsible: { select: { id: true, name: true, role: true } },
  agendaItem:  { select: { id: true, title: true, order: true } },
  task:        { select: { id: true, title: true, status: true } },
} as const

// ─── GET /api/meetings/[id]/actions ──────────────────────────────────────────
// Sem filtro = consolidado de TODAS as ações da reunião (seção "Ações da Reunião").
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const sp = req.nextUrl.searchParams
    const agendaItemId = sp.get('agendaItemId')
    const status       = sp.get('status')

    const rows = await prisma.meetingAction.findMany({
      where: {
        meetingId: params.id,
        ...(agendaItemId ? { agendaItemId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ createdAt: 'asc' }],
      include: actionInclude,
    })
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[actions GET]', e)
    return NextResponse.json({ error: 'Erro ao listar ações' }, { status: 500 })
  }
}

// ─── POST /api/meetings/[id]/actions ─────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const meeting = await prisma.meeting.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 })

    const body = await req.json()
    const { description, agendaItemId, responsibleId, support, dueDate, priority, status, notes, createdBy } = body

    if (!description?.trim())
      return NextResponse.json({ error: 'Descrição da ação é obrigatória.' }, { status: 400 })
    if (dueDate && !isValidDate(dueDate))
      return NextResponse.json({ error: 'Prazo inválido. Use YYYY-MM-DD.' }, { status: 400 })
    if (priority && !PRIORITIES.includes(priority))
      return NextResponse.json({ error: `Prioridade inválida. Use: ${PRIORITIES.join(', ')}` }, { status: 400 })
    if (status && !ACTION_STATUS.includes(status))
      return NextResponse.json({ error: `Status inválido. Use: ${ACTION_STATUS.join(', ')}` }, { status: 400 })

    const ownErr = await validateAgendaItemOwnership(params.id, agendaItemId)
    if (ownErr) return NextResponse.json({ error: ownErr }, { status: 400 })

    const action = await prisma.meetingAction.create({
      data: {
        meetingId: params.id,
        agendaItemId:  agendaItemId  || null,
        description:   description.trim(),
        responsibleId: responsibleId || null,
        support:       support?.trim() || null,
        dueDate:       dueDate        || null,
        priority:      priority       || 'NORMAL',
        status:        status         || 'A_FAZER',
        notes:         notes?.trim()  || null,
      },
      include: actionInclude,
    })

    await logHistory(params.id, 'ACAO_CRIADA', 'Ação criada',
      `${action.description.slice(0, 140)}${action.responsible ? ` — ${action.responsible.name}` : ''}${action.dueDate ? ` (prazo ${action.dueDate})` : ''}`,
      createdBy)

    return NextResponse.json(action, { status: 201 })
  } catch (e) {
    console.error('[actions POST]', e)
    return NextResponse.json({ error: 'Erro ao criar ação' }, { status: 500 })
  }
}
