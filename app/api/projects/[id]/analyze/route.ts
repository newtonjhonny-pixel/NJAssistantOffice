import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeProject, ProjectAnalysisInput } from '@/lib/ai/agents'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      stages: {
        orderBy: { order: 'asc' },
        include: { tasks: { orderBy: { createdAt: 'asc' } } },
      },
      tasks:      { orderBy: { createdAt: 'asc' } },
      milestones: { orderBy: { dueDate: 'asc' } },
    },
  })

  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  const now          = new Date()
  const totalTasks   = project.tasks.length
  const doneTasks    = project.tasks.filter(t => t.status === 'CONCLUIDA').length
  const progress     = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const startMs      = project.startDate?.getTime() ?? null
  const dueMs        = project.dueDate?.getTime()   ?? null
  const totalDays    = startMs && dueMs ? Math.ceil((dueMs - startMs) / 86400000) : null
  const elapsedDays  = startMs ? Math.ceil((now.getTime() - startMs) / 86400000) : null
  const remainDays   = dueMs   ? Math.ceil((dueMs - now.getTime()) / 86400000)   : null

  const input: ProjectAnalysisInput = {
    name:        project.name,
    description: project.description,
    objective:   project.objective,
    responsible: project.responsible,
    status:      project.status,
    priority:    project.priority,
    startDate:   project.startDate?.toISOString()  ?? null,
    dueDate:     project.dueDate?.toISOString()    ?? null,
    progress,
    totalDays,
    elapsedDays,
    remainDays,
    totalTasks,
    doneTasks,
    stages: project.stages.map(s => ({
      name:      s.name,
      status:    s.status,
      startDate: s.startDate?.toISOString() ?? null,
      dueDate:   s.dueDate?.toISOString()   ?? null,
      progress:  s.progress,
      tasks:     s.tasks.map(t => ({
        title:       t.title,
        description: t.description,
        responsible: t.responsible,
        priority:    t.priority,
        status:      t.status,
        dueDate:     t.dueDate?.toISOString() ?? null,
        progress:    t.progress,
      })),
    })),
    milestones: project.milestones.map(m => ({
      title:       m.title,
      status:      m.status,
      dueDate:     m.dueDate?.toISOString()     ?? null,
      completedAt: m.completedAt?.toISOString() ?? null,
      description: m.description,
    })),
  }

  const result = await analyzeProject(input)

  // Registrar no histórico do projeto
  await prisma.projectHistory.create({
    data: {
      projectId:   params.id,
      type:        'IA_ANALISE',
      title:       'Projeto analisado pela IA',
      description: `Análise realizada pelo Especialista em Gestão de Projetos${result.aiPowered ? ' (OpenAI)' : ' (modo local)'}.`,
    },
  })

  return NextResponse.json({ content: result.content, aiPowered: result.aiPowered })
}
