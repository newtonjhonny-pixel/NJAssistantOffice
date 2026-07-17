import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { type, suggestionId, title, description, priority, responsible, dueDate } = body

  const item = await prisma.centralItem.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let createdId: string | null = null

  if (type === 'TASK') {
    const firstUser = await prisma.user.findFirst()
    const userId = firstUser?.id
    if (!userId) return NextResponse.json({ error: 'Nenhum usuário encontrado' }, { status: 500 })
    const task = await prisma.task.create({
      data: {
        title:       title || item.subject || item.title,
        description: description || item.summary || null,
        origin:      'Central Inteligente de Entrada',
        priority:    priority || item.priority || 'MEDIA',
        status:      'PENDENTE',
        responsible: responsible || item.responsible || null,
        dueDate:     dueDate ? new Date(dueDate) : null,
        receivedAt:  new Date(),
        userId,
      },
    })
    createdId = task.id
  }

  // Mark suggestion as applied
  if (suggestionId) {
    await prisma.centralSuggestion.update({
      where: { id: suggestionId },
      data: { applied: true },
    })
  }

  // Update item status
  await prisma.centralItem.update({
    where: { id: params.id },
    data: { status: 'ACTIONED' },
  })

  await prisma.centralHistory.create({
    data: {
      itemId: params.id,
      action: 'AÇÃO CRIADA',
      detail: `${type}: ${title}${createdId ? ` (ID: ${createdId})` : ''}`,
    },
  })

  return NextResponse.json({ ok: true, type, createdId })
}
