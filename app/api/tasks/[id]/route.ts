import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      history: { orderBy: { createdAt: 'desc' } },
      suggestions: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!task) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
  return NextResponse.json(task)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const existing = await prisma.task.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.origin !== undefined && { origin: body.origin }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.person !== undefined && { person: body.person }),
      ...(body.observations !== undefined && { observations: body.observations }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
    },
  })

  // Registrar histórico de mudanças
  const changes: string[] = []
  if (body.status && body.status !== existing.status) {
    changes.push(`Status alterado de "${existing.status}" para "${body.status}"`)
    await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        action: 'STATUS',
        description: `Status alterado`,
        oldValue: existing.status,
        newValue: body.status,
      },
    })
  }
  if (body.priority && body.priority !== existing.priority) {
    await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        action: 'PRIORIDADE',
        description: `Prioridade alterada`,
        oldValue: existing.priority,
        newValue: body.priority,
      },
    })
    if (body.priority === 'URGENTE') {
      createNotification({
        type: 'TASK_URGENT',
        title: '🔴 Tarefa marcada como urgente',
        message: task.title,
        relatedType: 'task',
        relatedId: task.id,
      })
    }
  }
  if (body.status && body.status !== existing.status && body.status === 'AGUARDANDO_RETORNO') {
    createNotification({
      type: 'TASK_WAITING',
      title: '⏳ Tarefa aguardando retorno',
      message: task.title,
      relatedType: 'task',
      relatedId: task.id,
    })
  }
  if (body.dueDate && String(body.dueDate) !== String(existing.dueDate)) {
    await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        action: 'PRAZO',
        description: `Prazo alterado`,
        oldValue: existing.dueDate?.toISOString(),
        newValue: body.dueDate,
      },
    })
  }
  if (changes.length === 0 && Object.keys(body).length > 0) {
    await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        action: 'EDICAO',
        description: 'Tarefa editada',
      },
    })
  }

  return NextResponse.json(task)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.task.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  await prisma.task.update({
    where: { id: params.id },
    data: { status: 'CANCELADA' },
  })

  await prisma.taskHistory.create({
    data: {
      taskId: params.id,
      action: 'CANCELAMENTO',
      description: 'Tarefa cancelada',
    },
  })

  return NextResponse.json({ ok: true })
}
