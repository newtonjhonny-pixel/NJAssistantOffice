import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filter    = searchParams.get('filter')   // all | favorites | archived | recent
  const category  = searchParams.get('category')
  const tagName   = searchParams.get('tag')
  const q         = searchParams.get('q')

  const where: Record<string, unknown> = {}

  if (filter === 'favorites') {
    where.isFavorite = true
    where.status = { not: 'ARQUIVADA' }
  } else if (filter === 'archived') {
    where.status = 'ARQUIVADA'
  } else if (filter === 'recent') {
    where.status = { not: 'ARQUIVADA' }
    // recentes = últimas 7 dias
    where.updatedAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  } else {
    // all / category
    where.status = category ? { not: 'ARQUIVADA' } : { not: 'ARQUIVADA' }
  }

  if (category) where.category = category

  if (tagName) {
    where.tags = { some: { name: tagName } }
  }

  if (q) {
    where.OR = [
      { title:   { contains: q } },
      { content: { contains: q } },
      { observations: { contains: q } },
      { category: { contains: q } },
    ]
  }

  const notes = await prisma.note.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      tags: true,
      attachments: { select: { id: true } },
    },
  })

  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const note = await prisma.note.create({
    data: {
      title:        body.title        ?? 'Nova anotação',
      content:      body.content      ?? '',
      category:     body.category     ?? 'Outros',
      priority:     body.priority     ?? 'MEDIA',
      status:       body.status       ?? 'ATIVA',
      observations: body.observations ?? null,
      tags: body.tags?.length
        ? { create: (body.tags as string[]).map((name: string) => ({ name: name.trim() })) }
        : undefined,
    },
    include: { tags: true, attachments: true },
  })

  await prisma.noteHistory.create({
    data: { noteId: note.id, type: 'CRIACAO', title: 'Anotação criada' },
  })

  return NextResponse.json(note, { status: 201 })
}
