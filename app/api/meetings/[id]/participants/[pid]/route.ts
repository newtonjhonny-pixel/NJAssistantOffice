import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logHistory, requirePermission, ATTENDANCE } from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'
type Ctx = { params: { id: string; pid: string } }

// ─── PATCH — atualiza presença ───────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const body = await req.json()
    if (body.attendanceStatus && !ATTENDANCE.includes(body.attendanceStatus))
      return NextResponse.json({ error: 'Presença inválida.' }, { status: 400 })

    const existing = await prisma.meetingParticipant.findUnique({ where: { id: params.pid } })
    if (!existing || existing.meetingId !== params.id)
      return NextResponse.json({ error: 'Participante não encontrado nesta reunião.' }, { status: 404 })

    const updated = await prisma.meetingParticipant.update({
      where: { id: params.pid },
      data: {
        ...(body.attendanceStatus !== undefined && { attendanceStatus: body.attendanceStatus }),
        ...(body.externalRole     !== undefined && { externalRole: body.externalRole?.trim() || null }),
        ...(body.externalEmail    !== undefined && { externalEmail: body.externalEmail?.trim() || null }),
      },
      include: { teamMember: { select: { id: true, name: true, role: true, sector: true } } },
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('[participants PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar participante' }, { status: 500 })
  }
}

// ─── DELETE — remove participante ────────────────────────────────────────────
export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const existing = await prisma.meetingParticipant.findUnique({
      where: { id: params.pid },
      include: { teamMember: { select: { name: true } } },
    })
    if (!existing || existing.meetingId !== params.id)
      return NextResponse.json({ error: 'Participante não encontrado nesta reunião.' }, { status: 404 })

    await prisma.meetingParticipant.delete({ where: { id: params.pid } })

    const nome = existing.teamMember?.name ?? existing.externalName ?? '—'
    await logHistory(params.id, 'PARTICIPANTE_REMOVIDO', 'Participante removido', nome)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[participants DELETE]', e)
    return NextResponse.json({ error: 'Erro ao remover participante' }, { status: 500 })
  }
}
