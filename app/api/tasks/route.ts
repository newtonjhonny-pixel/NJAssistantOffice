import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { parseLocalDate } from '@/lib/utils'

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
    include: {
      history:    { orderBy: { createdAt: 'desc' }, take: 1 },
      taskOrigin: true,
      _count:     { select: { attachments: true } },
    },
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

    // Resolve origin name from originId for backward compat
    let resolvedOrigin = body.origin ?? null
    if (body.originId) {
      const orig = await prisma.taskOrigin.findUnique({ where: { id: body.originId } })
      if (orig) resolvedOrigin = orig.name
    }

    const task = await prisma.task.create({
      data: {
        title:        body.title,
        description:  body.description,
        origin:       resolvedOrigin,
        originId:     body.originId  ?? null,
        priority:     body.priority  || 'MEDIA',
        status:       body.status    || 'PENDENTE',
        person:       body.person,
        responsible:  body.responsible,
        observations: body.observations,
        dueDate:    body.dueDate    ? parseLocalDate(body.dueDate) ?? undefined : undefined,
        receivedAt: body.receivedAt ? new Date(body.receivedAt)                : undefined,
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
