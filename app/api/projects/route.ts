import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')    || ''
  const priority  = searchParams.get('priority')  || ''
  const q         = searchParams.get('q')          || ''
  const overdue   = searchParams.get('overdue')   === 'true'

  const projects = await prisma.project.findMany({
    where: {
      ...(status   && { status }),
      ...(priority && { priority }),
      ...(q && {
        OR: [
          { name:        { contains: q } },
          { description: { contains: q } },
          { responsible: { contains: q } },
          { objective:   { contains: q } },
        ],
      }),
      ...(overdue && {
        dueDate: { lt: new Date() },
        status:  { notIn: ['CONCLUIDO', 'CANCELADO'] },
      }),
    },
    include: {
      stages:     { select: { id: true, status: true } },
      tasks:      { select: { id: true, status: true } },
      milestones: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = projects.map(p => {
    const totalTasks     = p.tasks.length
    const doneTasks      = p.tasks.filter(t => t.status === 'CONCLUIDA').length
    const progress       = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
    const isOverdue      = p.dueDate && p.dueDate < new Date() && !['CONCLUIDO', 'CANCELADO'].includes(p.status)
    const hasLateTasks   = p.tasks.some(t => t.status === 'ATRASADA')
    return {
      ...p,
      progress,
      isOverdue: !!isOverdue,
      hasLateTasks,
      totalStages: p.stages.length,
      doneStages:  p.stages.filter(s => s.status === 'CONCLUIDA').length,
      totalTasks,
      doneTasks,
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, description, objective, responsible, startDate, dueDate, priority, status, notes } = body

  if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

  const project = await prisma.project.create({
    data: {
      name,
      description: description ?? null,
      objective:   objective   ?? null,
      responsible: responsible ?? null,
      startDate:   startDate   ? new Date(startDate) : null,
      dueDate:     dueDate     ? new Date(dueDate)   : null,
      priority:    priority    ?? 'MEDIA',
      status:      status      ?? 'PLANEJADO',
      notes:       notes       ?? null,
    },
  })

  await prisma.projectHistory.create({
    data: {
      projectId:   project.id,
      type:        'CRIACAO',
      title:       'Projeto criado',
      description: `Projeto "${project.name}" foi criado.`,
    },
  })

  return NextResponse.json(project, { status: 201 })
}
