import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { name, description, order, startDate, dueDate, status, notes } = body

  if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

  const stage = await prisma.projectStage.create({
    data: {
      projectId:   params.id,
      name,
      description: description ?? null,
      order:       order       ?? 0,
      startDate:   startDate   ? new Date(startDate) : null,
      dueDate:     dueDate     ? new Date(dueDate)   : null,
      status:      status      ?? 'NAO_INICIADA',
      notes:       notes       ?? null,
    },
  })

  await prisma.projectHistory.create({
    data: {
      projectId:   params.id,
      type:        'ETAPA_CRIADA',
      title:       'Etapa criada',
      description: `Etapa "${name}" foi adicionada ao projeto.`,
    },
  })

  return NextResponse.json(stage, { status: 201 })
}
