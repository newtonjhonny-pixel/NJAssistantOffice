import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const note = await prisma.note.findUnique({
    where: { id: params.id },
    include: {
      tags:        true,
      attachments: { orderBy: { createdAt: 'asc' } },
      aiMessages:  { orderBy: { createdAt: 'asc' } },
      history:     { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!note) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
  return NextResponse.json(note)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()

  const existing = await prisma.note.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })

  // Handle tags separately
  const { tags, ...fields } = body

  const note = await prisma.note.update({
    where: { id: params.id },
    data: {
      ...(fields.title        !== undefined && { title:        fields.title }),
      ...(fields.content      !== undefined && { content:      fields.content }),
      ...(fields.category     !== undefined && { category:     fields.category }),
      ...(fields.priority     !== undefined && { priority:     fields.priority }),
      ...(fields.status       !== undefined && { status:       fields.status }),
      ...(fields.isFavorite   !== undefined && { isFavorite:   fields.isFavorite }),
      ...(fields.observations !== undefined && { observations: fields.observations }),
      ...(fields.archivedAt   !== undefined && { archivedAt:   fields.archivedAt ? new Date(fields.archivedAt) : null }),
      ...(tags !== undefined && {
        tags: {
          deleteMany: {},
          create: (tags as string[]).map((name: string) => ({ name: name.trim() })).filter(t => t.name),
        },
      }),
    },
    include: { tags: true, attachments: { select: { id: true } } },
  })

  return NextResponse.json(note)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.note.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
