import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const processes = await prisma.jobProcess.findMany({
    where: { jobRoleId: params.id },
    orderBy: { order: 'asc' },
    include: { checklistItems: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json(processes)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const count = await prisma.jobProcess.count({ where: { jobRoleId: params.id } })
  const process = await prisma.jobProcess.create({
    data: {
      jobRoleId:   params.id,
      name:        body.name,
      description: body.description || null,
      steps:       body.steps       || null,
      responsible: body.responsible || null,
      deadline:    body.deadline    || null,
      flowchart:   body.flowchart   || null,
      aiGenerated: body.aiGenerated || false,
      order:       count,
    },
    include: { checklistItems: true },
  })
  if (body.checklistItems?.length) {
    await prisma.jobChecklistItem.createMany({
      data: body.checklistItems.map((text: string, i: number) => ({
        processId: process.id,
        text,
        order: i,
      })),
    })
  }
  return NextResponse.json(process, { status: 201 })
}
