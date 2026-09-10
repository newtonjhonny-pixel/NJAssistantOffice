import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logHistory, requirePermission, validateParticipant, ATTENDANCE } from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'
type Ctx = { params: { id: string } }

// ─── GET /api/meetings/[id]/participants ─────────────────────────────────────
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const rows = await prisma.meetingParticipant.findMany({
      where: { meetingId: params.id },
      include: { teamMember: { select: { id: true, name: true, role: true, sector: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[participants GET]', e)
    return NextResponse.json({ error: 'Erro ao listar participantes' }, { status: 500 })
  }
}

// ─── POST /api/meetings/[id]/participants ────────────────────────────────────
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const meeting = await prisma.meeting.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 })

    const body = await req.json()
    const { teamMemberId, externalName, externalEmail, externalRole, attendanceStatus } = body

    const invalid = validateParticipant(teamMemberId, externalName)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

    if (attendanceStatus && !ATTENDANCE.includes(attendanceStatus))
      return NextResponse.json({ error: `Presença inválida. Use: ${ATTENDANCE.join(', ')}` }, { status: 400 })

    if (teamMemberId) {
      const dup = await prisma.meetingParticipant.findFirst({
        where: { meetingId: params.id, teamMemberId },
        select: { id: true },
      })
      if (dup) return NextResponse.json({ error: 'Colaborador já é participante desta reunião.' }, { status: 409 })
    }

    const participant = await prisma.meetingParticipant.create({
      data: {
        meetingId:     params.id,
        teamMemberId:  teamMemberId || null,
        externalName:  externalName?.trim()  || null,
        externalEmail: externalEmail?.trim() || null,
        externalRole:  externalRole?.trim()  || null,
        attendanceStatus: attendanceStatus || 'CONVIDADO',
      },
      include: { teamMember: { select: { id: true, name: true, role: true, sector: true } } },
    })

    const nome = participant.teamMember?.name ?? participant.externalName ?? '—'
    await logHistory(params.id, 'PARTICIPANTE_ADICIONADO', 'Participante adicionado', nome, body.createdBy)

    return NextResponse.json(participant, { status: 201 })
  } catch (e) {
    console.error('[participants POST]', e)
    return NextResponse.json({ error: 'Erro ao adicionar participante' }, { status: 500 })
  }
}
