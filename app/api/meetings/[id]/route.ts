import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  logHistory, requirePermission, isValidDate, isValidTime,
  meetingFullInclude, MEETING_TYPES, MEETING_STATUS,
} from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

// ─── GET /api/meetings/[id] ──────────────────────────────────────────────────
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
      include: meetingFullInclude,
    })
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 })
    return NextResponse.json(meeting)
  } catch (e) {
    console.error('[meetings/[id] GET]', e)
    return NextResponse.json({ error: 'Erro ao buscar reunião' }, { status: 500 })
  }
}

// ─── PATCH /api/meetings/[id] ────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const body = await req.json()
    const current = await prisma.meeting.findUnique({ where: { id: params.id } })
    if (!current) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 })

    if (body.date !== undefined && !isValidDate(body.date))
      return NextResponse.json({ error: 'Data inválida. Use YYYY-MM-DD.' }, { status: 400 })
    if (body.startTime && !isValidTime(body.startTime))
      return NextResponse.json({ error: 'Hora inicial inválida.' }, { status: 400 })
    if (body.endTime && !isValidTime(body.endTime))
      return NextResponse.json({ error: 'Hora final inválida.' }, { status: 400 })
    if (body.type && !MEETING_TYPES.includes(body.type))
      return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 })
    if (body.status && !MEETING_STATUS.includes(body.status))
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })

    const start = body.startTime !== undefined ? body.startTime : current.startTime
    const end   = body.endTime   !== undefined ? body.endTime   : current.endTime
    if (start && end && end <= start)
      return NextResponse.json({ error: 'Hora final deve ser posterior à inicial.' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}
    for (const f of ['title', 'objective', 'type', 'category', 'date', 'startTime', 'endTime',
                     'location', 'meetingUrl', 'organizerId', 'recurrence', 'observations',
                     'status', 'finalSummary'] as const) {
      if (body[f] !== undefined) {
        data[f] = typeof body[f] === 'string' ? (body[f].trim() || null) : body[f]
      }
    }
    if (data.title === null)
      return NextResponse.json({ error: 'Título não pode ficar vazio.' }, { status: 400 })

    if (!Object.keys(data).length)
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })

    const meeting = await prisma.meeting.update({
      where: { id: params.id },
      data,
      include: meetingFullInclude,
    })

    const changed = Object.keys(data).join(', ')
    await logHistory(params.id, 'ATUALIZADA', 'Reunião atualizada', `Campos: ${changed}`, body.updatedBy)

    return NextResponse.json(meeting)
  } catch (e) {
    console.error('[meetings/[id] PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar reunião' }, { status: 500 })
  }
}

// ─── DELETE /api/meetings/[id] ───────────────────────────────────────────────
// Reunião já realizada/concluída NUNCA é apagada: vira arquivada (soft-delete).
// Use ?force=true para excluir definitivamente um rascunho.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('delete')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const meeting = await prisma.meeting.findUnique({ where: { id: params.id } })
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 })

    const realizada = ['REALIZADA', 'CONCLUIDA'].includes(meeting.status)
    const force = req.nextUrl.searchParams.get('force') === 'true'

    if (realizada || !force) {
      const archived = await prisma.meeting.update({
        where: { id: params.id },
        data: { archivedAt: new Date(), status: 'ARQUIVADA' },
      })
      await logHistory(params.id, 'ARQUIVADA', 'Reunião arquivada',
        realizada ? 'Reunião já realizada — arquivada em vez de excluída.' : null)
      return NextResponse.json({ ok: true, archived: true, meeting: archived })
    }

    // Rascunho + force: exclusão real. Cascade remove filhos, sem órfãos.
    await prisma.meeting.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true, archived: false })
  } catch (e) {
    console.error('[meetings/[id] DELETE]', e)
    return NextResponse.json({ error: 'Erro ao excluir reunião' }, { status: 500 })
  }
}
