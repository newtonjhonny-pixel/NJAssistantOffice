import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const item = await prisma.centralItem.findUnique({
    where: { id: params.id },
    include: {
      attachments: { orderBy: { createdAt: 'asc' } },
      history:     { orderBy: { createdAt: 'asc' } },
      suggestions: { orderBy: { createdAt: 'asc' } },
      chats:       { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const item = await prisma.centralItem.update({
    where: { id: params.id },
    data: {
      title:       body.title       ?? undefined,
      status:      body.status      ?? undefined,
      priority:    body.priority    ?? undefined,
      category:    body.category    ?? undefined,
      company:     body.company     ?? undefined,
      collaborator:body.collaborator?? undefined,
      subject:     body.subject     ?? undefined,
      summary:     body.summary     ?? undefined,
      risks:       body.risks       ?? undefined,
      keywords:    body.keywords    ?? undefined,
      department:  body.department  ?? undefined,
      responsible: body.responsible ?? undefined,
      dueDate:     body.dueDate     ?? undefined,
    },
    include: {
      attachments: true,
      history: { orderBy: { createdAt: 'asc' } },
      suggestions: { orderBy: { createdAt: 'asc' } },
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.centralItem.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
