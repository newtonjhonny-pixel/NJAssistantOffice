import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const history = await prisma.noteHistory.findMany({
    where: { noteId: params.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(history)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const entry = await prisma.noteHistory.create({
    data: {
      noteId:      params.id,
      type:        body.type        ?? 'EDICAO',
      title:       body.title       ?? 'Ação registrada',
      description: body.description ?? null,
    },
  })
  return NextResponse.json(entry, { status: 201 })
}
