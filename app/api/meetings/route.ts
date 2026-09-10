import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  logHistory, requirePermission, isValidDate, isValidTime,
  MEETING_TYPES, MEETING_STATUS,
} from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'

// ─── GET /api/meetings ───────────────────────────────────────────────────────
// Filtros: ?filter=proximas|hoje|realizadas|com-acoes|concluidas|arquivadas
//          &from=YYYY-MM-DD&to=YYYY-MM-DD&participantId=&responsibleId=
//          &category=&status=&q=
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const filter        = sp.get('filter') ?? 'todas'
    const from          = sp.get('from')
    const to            = sp.get('to')
    const participantId = sp.get('participantId')
    const responsibleId = sp.get('responsibleId')
    const category      = sp.get('category')
    const status        = sp.get('status')
    const q             = sp.get('q')?.trim()

    const today = new Date().toISOString().slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // Arquivadas só aparecem quando explicitamente pedidas.
    if (filter === 'arquivadas') where.archivedAt = { not: null }
    else where.archivedAt = null

    if (filter === 'proximas')   { where.date = { gt: today };  where.status = { notIn: ['CONCLUIDA', 'CANCELADA'] } }
    if (filter === 'hoje')       { where.date = today }
    if (filter === 'realizadas') { where.status = { in: ['REALIZADA', 'CONCLUIDA'] } }
    if (filter === 'concluidas') { where.status = 'CONCLUIDA' }

    if (status)   where.status   = status
    if (category) where.category = category
    if (from || to) {
      where.date = { ...(typeof where.date === 'object' ? where.date : {}) }
      if (from) where.date.gte = from
      if (to)   where.date.lte = to
    }
    if (q) {
      where.OR = [
        { title:     { contains: q } },
        { objective: { contains: q } },
        { location:  { contains: q } },
      ]
    }
    if (participantId) where.participants = { some: { teamMemberId: participantId } }
    if (responsibleId) where.actions      = { some: { responsibleId } }
    if (filter === 'com-acoes') {
      where.actions = { some: { status: { in: ['A_FAZER', 'EM_ANDAMENTO', 'AGUARDANDO'] } } }
    }

    const rows = await prisma.meeting.findMany({
      where,
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      include: {
        organizer:    { select: { id: true, name: true } },
        participants: {
          select: {
            id: true, externalName: true,
            teamMember: { select: { id: true, name: true } },
          },
        },
        _count: { select: { agendaItems: true, decisions: true, actions: true } },
        actions: {
          where: { status: { in: ['A_FAZER', 'EM_ANDAMENTO', 'AGUARDANDO'] } },
          select: { id: true },
        },
      },
    })

    const data = rows.map(m => ({
      ...m,
      pendingActions: m.actions.length,
      actions: undefined,
    }))

    return NextResponse.json(data)
  } catch (e) {
    console.error('[meetings GET]', e)
    return NextResponse.json({ error: 'Erro ao listar reuniões' }, { status: 500 })
  }
}

// ─── POST /api/meetings ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const denied = await requirePermission('create')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const body = await req.json()
    const { title, objective, type, category, date, startTime, endTime,
            location, meetingUrl, organizerId, recurrence, observations,
            status, createdBy } = body

    if (!title?.trim())
      return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 })
    if (!isValidDate(date))
      return NextResponse.json({ error: 'Data inválida. Use YYYY-MM-DD.' }, { status: 400 })
    if (startTime && !isValidTime(startTime))
      return NextResponse.json({ error: 'Hora inicial inválida. Use HH:MM.' }, { status: 400 })
    if (endTime && !isValidTime(endTime))
      return NextResponse.json({ error: 'Hora final inválida. Use HH:MM.' }, { status: 400 })
    if (startTime && endTime && endTime <= startTime)
      return NextResponse.json({ error: 'Hora final deve ser posterior à inicial.' }, { status: 400 })
    if (type && !MEETING_TYPES.includes(type))
      return NextResponse.json({ error: `Tipo inválido. Use: ${MEETING_TYPES.join(', ')}` }, { status: 400 })
    if (status && !MEETING_STATUS.includes(status))
      return NextResponse.json({ error: `Status inválido. Use: ${MEETING_STATUS.join(', ')}` }, { status: 400 })

    const meeting = await prisma.meeting.create({
      data: {
        title: title.trim(),
        objective:    objective?.trim()    || null,
        type:         type                 || 'EQUIPE',
        category:     category?.trim()     || null,
        date,
        startTime:    startTime            || null,
        endTime:      endTime              || null,
        location:     location?.trim()     || null,
        meetingUrl:   meetingUrl?.trim()   || null,
        organizerId:  organizerId          || null,
        recurrence:   recurrence           || 'NENHUMA',
        observations: observations?.trim() || null,
        status:       status               || 'RASCUNHO',
        createdBy:    createdBy            || null,
      },
      include: { organizer: { select: { id: true, name: true } } },
    })

    await logHistory(meeting.id, 'CRIADA', 'Reunião criada', meeting.title, createdBy)
    return NextResponse.json(meeting, { status: 201 })
  } catch (e) {
    console.error('[meetings POST]', e)
    return NextResponse.json({ error: 'Erro ao criar reunião' }, { status: 500 })
  }
}
