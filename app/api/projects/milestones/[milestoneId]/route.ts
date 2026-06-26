import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { milestoneId: string } }) {
  const existing = await prisma.projectMilestone.findUnique({ where: { id: params.milestoneId } })
  if (!existing) return NextResponse.json({ error: 'Marco não encontrado' }, { status: 404 })

  const body = await req.json()

  const milestone = await prisma.projectMilestone.update({
    where: { id: params.milestoneId },
    data: {
      ...(body.title       !== undefined && { title:       body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.dueDate     !== undefined && { dueDate:     body.dueDate    ? new Date(body.dueDate)    : null }),
      ...(body.completedAt !== undefined && { completedAt: body.completedAt ? new Date(body.completedAt) : null }),
      ...(body.status      !== undefined && { status:      body.status }),
    },
  })

  if (body.status === 'CONCLUIDA' && existing.status !== 'CONCLUIDA') {
    await prisma.projectHistory.create({
      data: {
        projectId:   milestone.projectId,
        type:        'MARCO_CUMPRIDO',
        title:       'Entrega concluída',
        description: `Entrega "${milestone.title}" foi concluída.`,
      },
    })
  }

  return NextResponse.json(milestone)
}

export async function DELETE(_req: NextRequest, { params }: { params: { milestoneId: string } }) {
  await prisma.projectMilestone.delete({ where: { id: params.milestoneId } })
  return NextResponse.json({ ok: true })
}
