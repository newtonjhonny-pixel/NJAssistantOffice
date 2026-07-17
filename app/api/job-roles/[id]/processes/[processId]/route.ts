import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string; processId: string } }) {
  const body = await req.json()
  const process = await prisma.jobProcess.update({
    where: { id: params.processId },
    data: {
      name:        body.name        ?? undefined,
      description: body.description ?? undefined,
      steps:       body.steps       ?? undefined,
      responsible: body.responsible ?? undefined,
      deadline:    body.deadline    ?? undefined,
      flowchart:   body.flowchart   ?? undefined,
    },
  })
  // Replace checklist if provided
  if (Array.isArray(body.checklistItems)) {
    await prisma.jobChecklistItem.deleteMany({ where: { processId: params.processId } })
    if (body.checklistItems.length) {
      await prisma.jobChecklistItem.createMany({
        data: body.checklistItems.map((text: string, i: number) => ({
          processId: params.processId,
          text,
          order: i,
        })),
      })
    }
  }
  const full = await prisma.jobProcess.findUnique({
    where: { id: params.processId },
    include: { checklistItems: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json(full)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string; processId: string } }) {
  await prisma.jobProcess.delete({ where: { id: params.processId } })
  return NextResponse.json({ ok: true })
}
