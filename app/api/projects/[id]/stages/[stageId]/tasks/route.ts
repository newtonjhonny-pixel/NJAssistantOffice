import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string; stageId: string } }) {
  const body = await req.json()
  const { title, description, responsible, startDate, dueDate, status, priority, progress, notes } = body

  if (!title) return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })

  const task = await prisma.projectTask.create({
    data: {
      projectId:   params.id,
      stageId:     params.stageId,
      title,
      description: description ?? null,
      responsible: responsible ?? null,
      startDate:   startDate   ? new Date(startDate) : null,
      dueDate:     dueDate     ? new Date(dueDate)   : null,
      status:      status      ?? 'PENDENTE',
      priority:    priority    ?? 'MEDIA',
      progress:    progress    ?? 0,
      notes:       notes       ?? null,
    },
  })

  await prisma.projectHistory.create({
    data: {
      projectId:   params.id,
      type:        'TAREFA_CRIADA',
      title:       'Tarefa criada',
      description: `Tarefa "${title}" foi adicionada.`,
    },
  })

  return NextResponse.json(task, { status: 201 })
}
