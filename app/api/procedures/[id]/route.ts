import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const doc = await prisma.procedureDocument.findUnique({
    where: { id: params.id },
    include: {
      steps: { orderBy: { order: 'asc' } },
      checklistItems: { orderBy: { order: 'asc' } },
      attachments: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(doc)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const doc = await prisma.procedureDocument.update({
    where: { id: params.id },
    data: {
      title:           body.title           ?? undefined,
      process:         body.process         ?? null,
      department:      body.department      ?? null,
      responsible:     body.responsible     ?? null,
      objective:       body.objective       ?? null,
      application:     body.application     ?? null,
      systemsUsed:     body.systemsUsed     ?? null,
      description:     body.description     ?? null,
      responsibilities:body.responsibilities?? null,
      attentionPoints: body.attentionPoints ?? null,
      risks:           body.risks           ?? null,
      expectedResult:  body.expectedResult  ?? null,
      notes:           body.notes           ?? null,
    },
    include: {
      steps: { orderBy: { order: 'asc' } },
      checklistItems: { orderBy: { order: 'asc' } },
      attachments: { orderBy: { createdAt: 'asc' } },
    },
  })
  return NextResponse.json(doc)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.procedureDocument.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
