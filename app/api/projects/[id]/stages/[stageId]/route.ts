import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; stageId: string } }) {
  const existing = await prisma.projectStage.findUnique({ where: { id: params.stageId } })
  if (!existing) return NextResponse.json({ error: 'Etapa não encontrada' }, { status: 404 })

  const body = await req.json()

  const stage = await prisma.projectStage.update({
    where: { id: params.stageId },
    data: {
      ...(body.name        !== undefined && { name:        body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.order       !== undefined && { order:       body.order }),
      ...(body.startDate   !== undefined && { startDate:   body.startDate ? new Date(body.startDate) : null }),
      ...(body.dueDate     !== undefined && { dueDate:     body.dueDate   ? new Date(body.dueDate)   : null }),
      ...(body.status      !== undefined && { status:      body.status }),
      ...(body.progress    !== undefined && { progress:    body.progress }),
      ...(body.notes       !== undefined && { notes:       body.notes }),
    },
  })

  if (body.status === 'CONCLUIDA' && existing.status !== 'CONCLUIDA') {
    await prisma.projectHistory.create({
      data: {
        projectId:   params.id,
        type:        'ETAPA_CONCLUIDA',
        title:       'Etapa concluída',
        description: `Etapa "${stage.name}" foi concluída.`,
      },
    })
  }

  return NextResponse.json(stage)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; stageId: string } }) {
  const existing = await prisma.projectStage.findUnique({ where: { id: params.stageId } })
  if (!existing) return NextResponse.json({ error: 'Etapa não encontrada' }, { status: 404 })

  await prisma.projectStage.delete({ where: { id: params.stageId } })
  return NextResponse.json({ ok: true })
}
