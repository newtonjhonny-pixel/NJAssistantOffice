import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const conf = await prisma.conference.findUnique({
    where: { id: params.id },
    include: {
      checklist:  { orderBy: { order: 'asc' } },
      issues:     { orderBy: { createdAt: 'desc' } },
      corrections:{ orderBy: { createdAt: 'desc' }, include: { issue: { select: { id: true, title: true } } } },
      analyses:   { orderBy: { createdAt: 'desc' } },
      history:    { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!conf) return NextResponse.json({ error: 'Conferência não encontrada' }, { status: 404 })
  return NextResponse.json(conf)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const prev = await prisma.conference.findUnique({ where: { id: params.id } })
  if (!prev) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })

  const conf = await prisma.conference.update({
    where: { id: params.id },
    data: {
      title:             body.title             ?? prev.title,
      processType:       body.processType       ?? prev.processType,
      competence:        body.competence        !== undefined ? (body.competence || null)         : prev.competence,
      companyUnit:       body.companyUnit       !== undefined ? (body.companyUnit || null)        : prev.companyUnit,
      analystName:       body.analystName       !== undefined ? (body.analystName || null)        : prev.analystName,
      coordinatorName:   body.coordinatorName   !== undefined ? (body.coordinatorName || null)    : prev.coordinatorName,
      conferenceDate:    body.conferenceDate    !== undefined ? (body.conferenceDate    ? new Date(body.conferenceDate)    : null) : prev.conferenceDate,
      correctionDueDate: body.correctionDueDate !== undefined ? (body.correctionDueDate ? new Date(body.correctionDueDate): null) : prev.correctionDueDate,
      status:            body.status            ?? prev.status,
      priority:          body.priority          ?? prev.priority,
      description:       body.description       !== undefined ? (body.description || null)  : prev.description,
      notes:             body.notes             !== undefined ? (body.notes || null)        : prev.notes,
    },
  })

  const histEntries = []
  if (body.status && body.status !== prev.status) {
    histEntries.push({ conferenceId: params.id, type: 'STATUS', title: 'Status alterado', description: `Status: "${prev.status}" → "${body.status}"` })
  }
  if (body.title || body.processType || body.competence !== undefined) {
    if (!body.status || body.status === prev.status) {
      histEntries.push({ conferenceId: params.id, type: 'EDICAO', title: 'Conferência editada', description: 'Dados da conferência atualizados.' })
    }
  }
  for (const entry of histEntries) {
    await prisma.conferenceHistory.create({ data: entry })
  }

  return NextResponse.json(conf)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.conference.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
