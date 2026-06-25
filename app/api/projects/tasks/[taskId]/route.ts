import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { taskId: string } }) {
  const existing = await prisma.projectTask.findUnique({ where: { id: params.taskId } })
  if (!existing) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  const body = await req.json()

  const task = await prisma.projectTask.update({
    where: { id: params.taskId },
    data: {
      ...(body.title       !== undefined && { title:       body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.responsible !== undefined && { responsible: body.responsible }),
      ...(body.startDate   !== undefined && { startDate:   body.startDate ? new Date(body.startDate) : null }),
      ...(body.dueDate     !== undefined && { dueDate:     body.dueDate   ? new Date(body.dueDate)   : null }),
      ...(body.status      !== undefined && { status:      body.status }),
      ...(body.priority    !== undefined && { priority:    body.priority }),
      ...(body.progress    !== undefined && { progress:    body.progress }),
      ...(body.notes       !== undefined && { notes:       body.notes }),
    },
  })

  if (body.status === 'CONCLUIDA' && existing.status !== 'CONCLUIDA') {
    await prisma.projectHistory.create({
      data: {
        projectId:   task.projectId,
        type:        'TAREFA_CONCLUIDA',
        title:       'Tarefa concluída',
        description: `Tarefa "${task.title}" foi concluída.`,
      },
    })
  }

  return NextResponse.json(task)
}

export async function DELETE(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const existing = await prisma.projectTask.findUnique({ where: { id: params.taskId } })
  if (!existing) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  await prisma.projectTask.delete({ where: { id: params.taskId } })
  return NextResponse.json({ ok: true })
}
