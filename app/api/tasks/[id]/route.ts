import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      history:       { orderBy: { createdAt: 'desc' } },
      statusHistory: { orderBy: { createdAt: 'asc'  } },
      suggestions:   { orderBy: { createdAt: 'desc' } },
      attachments:   { orderBy: { createdAt: 'asc'  } },
    },
  })

  if (!task) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
  return NextResponse.json(task)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const existing = await prisma.task.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  // Status changes must go through /api/tasks/[id]/status
  const { status: _ignored, ...safeBody } = body

  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(safeBody.title       !== undefined && { title:       safeBody.title }),
      ...(safeBody.description !== undefined && { description: safeBody.description }),
      ...(safeBody.origin      !== undefined && { origin:      safeBody.origin }),
      ...(safeBody.priority    !== undefined && { priority:    safeBody.priority }),
      ...(safeBody.person      !== undefined && { person:      safeBody.person }),
      ...(safeBody.responsible !== undefined && { responsible: safeBody.responsible }),
      ...(safeBody.observations !== undefined && { observations: safeBody.observations }),
      ...(safeBody.dueDate     !== undefined && { dueDate:     safeBody.dueDate ? new Date(safeBody.dueDate) : null }),
      ...(safeBody.receivedAt  !== undefined && { receivedAt:  safeBody.receivedAt ? new Date(safeBody.receivedAt) : null }),
    },
  })

  if (safeBody.priority && safeBody.priority !== existing.priority) {
    await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        action: 'PRIORIDADE',
        description: 'Prioridade alterada',
        oldValue: existing.priority,
        newValue: safeBody.priority,
      },
    })
    if (safeBody.priority === 'URGENTE') {
      createNotification({
        type: 'TASK_URGENT',
        title: '🔴 Tarefa marcada como urgente',
        message: task.title,
        relatedType: 'task',
        relatedId: task.id,
      })
    }
  }

  if (safeBody.dueDate !== undefined && String(safeBody.dueDate) !== String(existing.dueDate)) {
    await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        action: 'PRAZO',
        description: 'Prazo alterado',
        oldValue: existing.dueDate?.toISOString(),
        newValue: safeBody.dueDate,
      },
    })
  }

  if (!safeBody.priority && !safeBody.dueDate) {
    await prisma.taskHistory.create({
      data: { taskId: task.id, action: 'EDICAO', description: 'Tarefa editada' },
    })
  }

  return NextResponse.json(task)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.task.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  await prisma.task.update({ where: { id: params.id }, data: { status: 'CANCELADA' } })
  await prisma.taskHistory.create({
    data: { taskId: params.id, action: 'CANCELAMENTO', description: 'Tarefa cancelada' },
  })

  return NextResponse.json({ ok: true })
}
