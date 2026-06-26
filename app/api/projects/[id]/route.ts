import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      stages: {
        orderBy: { order: 'asc' },
        include: {
          tasks: { orderBy: { createdAt: 'asc' } },
        },
      },
      tasks:      { orderBy: { createdAt: 'asc' } },
      milestones: { orderBy: { dueDate: 'asc' } },
      history:    { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })

  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  // Recalculate progress
  const totalTasks   = project.tasks.length
  const doneTasks    = project.tasks.filter(t => t.status === 'CONCLUIDA').length
  const progress     = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const isOverdue    = project.dueDate && project.dueDate < new Date() && !['CONCLUIDO', 'CANCELADO'].includes(project.status)

  const now = new Date()
  const startMs      = project.startDate ? project.startDate.getTime() : null
  const dueMs        = project.dueDate   ? project.dueDate.getTime()   : null
  const totalDays    = startMs && dueMs ? Math.ceil((dueMs - startMs) / 86400000) : null
  const elapsedDays  = startMs ? Math.ceil((now.getTime() - startMs) / 86400000) : null
  const remainDays   = dueMs   ? Math.ceil((dueMs - now.getTime()) / 86400000)   : null

  // Recalculate stage progress
  const stages = project.stages.map(s => {
    const sTotal = s.tasks.length
    const sDone  = s.tasks.filter(t => t.status === 'CONCLUIDA').length
    const sProg  = sTotal > 0 ? Math.round((sDone / sTotal) * 100) : s.progress
    return { ...s, progress: sProg }
  })

  return NextResponse.json({
    ...project,
    stages,
    progress,
    isOverdue: !!isOverdue,
    totalDays,
    elapsedDays,
    remainDays,
    totalTasks,
    doneTasks,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.project.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  const body = await req.json()

  const project = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...(body.name        !== undefined && { name:        body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.objective   !== undefined && { objective:   body.objective }),
      ...(body.responsible !== undefined && { responsible: body.responsible }),
      ...(body.startDate   !== undefined && { startDate:   body.startDate ? new Date(body.startDate) : null }),
      ...(body.dueDate     !== undefined && { dueDate:     body.dueDate   ? new Date(body.dueDate)   : null }),
      ...(body.priority    !== undefined && { priority:    body.priority }),
      ...(body.status      !== undefined && { status:      body.status }),
      ...(body.notes       !== undefined && { notes:       body.notes }),
    },
  })

  if (body.status && body.status !== existing.status) {
    await prisma.projectHistory.create({
      data: {
        projectId:   project.id,
        type:        'STATUS',
        title:       'Status alterado',
        description: `Status alterado de "${existing.status}" para "${body.status}".`,
      },
    })
  }

  if (body.dueDate && String(body.dueDate) !== String(existing.dueDate)) {
    await prisma.projectHistory.create({
      data: {
        projectId:   project.id,
        type:        'PRAZO',
        title:       'Prazo alterado',
        description: `Prazo atualizado.`,
      },
    })
  }

  return NextResponse.json(project)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.project.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  await prisma.project.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
