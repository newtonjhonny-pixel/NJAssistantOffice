import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { title, description, dueDate, status } = body

  if (!title) return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })

  const { completedAt } = body

  const milestone = await prisma.projectMilestone.create({
    data: {
      projectId:   params.id,
      title,
      description: description  ?? null,
      dueDate:     dueDate      ? new Date(dueDate)      : null,
      completedAt: completedAt  ? new Date(completedAt)  : null,
      status:      status       ?? 'PENDENTE',
    },
  })

  await prisma.projectHistory.create({
    data: {
      projectId:   params.id,
      type:        'MARCO_CRIADO',
      title:       'Entrega criada',
      description: `Entrega "${title}" foi adicionada.`,
    },
  })

  return NextResponse.json(milestone, { status: 201 })
}
