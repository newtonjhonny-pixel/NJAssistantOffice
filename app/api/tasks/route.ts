import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const search = searchParams.get('q')

  const tasks = await prisma.task.findMany({
    where: {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { person: { contains: search } },
          { observations: { contains: search } },
        ],
      }),
    },
    orderBy: [
      { priority: 'desc' },
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
    include: { history: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Garante que o usuário padrão existe (sistema single-user)
    await prisma.user.upsert({
      where:  { id: 'default-user' },
      update: {},
      create: { id: 'default-user', name: 'Newton', email: 'admin@sistema.local', role: 'admin' },
    })

    const task = await prisma.task.create({
      data: {
        title:        body.title,
        description:  body.description,
        origin:       body.origin,
        priority:     body.priority    || 'MEDIA',
        status:       body.status      || 'PENDENTE',
        person:       body.person,
        responsible:  body.responsible,
        observations: body.observations,
        dueDate:      body.dueDate    ? new Date(body.dueDate)    : undefined,
        receivedAt:   body.receivedAt ? new Date(body.receivedAt) : undefined,
        userId: 'default-user',
        ...(body.inboxItemId && { inboxItemId: body.inboxItemId }),
      },
    })

    await prisma.taskHistory.create({
      data: { taskId: task.id, action: 'CRIACAO', description: 'Tarefa criada' },
    })

    createNotification({
      type: task.priority === 'URGENTE' ? 'TASK_URGENT' : 'TASK_CREATED',
      title: task.priority === 'URGENTE' ? '🔴 Tarefa urgente criada' : 'Nova tarefa criada',
      message: task.title,
      relatedType: 'task',
      relatedId: task.id,
    })

    return NextResponse.json(task, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/tasks]', message)
    return NextResponse.json(
      { error: 'Não foi possível criar a tarefa.', details: process.env.NODE_ENV === 'development' ? message : undefined },
      { status: 500 }
    )
  }
}
