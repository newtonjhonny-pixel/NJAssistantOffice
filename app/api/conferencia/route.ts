import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q           = searchParams.get('q')          ?? ''
  const status      = searchParams.get('status')      ?? ''
  const priority    = searchParams.get('priority')    ?? ''
  const processType = searchParams.get('processType') ?? ''
  const analyst     = searchParams.get('analyst')     ?? ''
  const unit        = searchParams.get('unit')        ?? ''
  const competence  = searchParams.get('competence')  ?? ''
  const hasIssues   = searchParams.get('hasIssues')   === 'true'
  const overdue     = searchParams.get('overdue')     === 'true'

  const where: Record<string, unknown> = {}
  if (status)      where.status      = status
  if (priority)    where.priority    = priority
  if (processType) where.processType = processType
  if (analyst)     where.analystName = { contains: analyst }
  if (unit)        where.companyUnit = { contains: unit }
  if (competence)  where.competence  = { contains: competence }
  if (q) {
    where.OR = [
      { title:       { contains: q } },
      { processType: { contains: q } },
      { analystName: { contains: q } },
      { companyUnit: { contains: q } },
      { description: { contains: q } },
    ]
  }

  const all = await prisma.conference.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      issues:   { select: { id: true, severity: true, correctionStatus: true } },
      checklist: { select: { id: true, result: true } },
      _count: { select: { issues: true, checklist: true, corrections: true } },
    },
  })

  const now = new Date()
  let result = all.map(c => ({
    ...c,
    issueCount: c._count.issues,
    checklistCount: c._count.checklist,
    correctionCount: c._count.corrections,
    hasOpenIssues: c.issues.some(i => i.correctionStatus === 'ABERTA' || i.correctionStatus === 'EM_CORRECAO'),
    isOverdue: !!c.correctionDueDate && new Date(c.correctionDueDate) < now && c.status !== 'APROVADO' && c.status !== 'CANCELADO',
  }))

  if (hasIssues) result = result.filter(c => c.issueCount > 0)
  if (overdue)   result = result.filter(c => c.isOverdue)

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const conf = await prisma.conference.create({
    data: {
      title:             body.title,
      processType:       body.processType,
      competence:        body.competence        || null,
      companyUnit:       body.companyUnit       || null,
      analystName:       body.analystName       || null,
      coordinatorName:   body.coordinatorName   || null,
      conferenceDate:    body.conferenceDate    ? new Date(body.conferenceDate)   : null,
      correctionDueDate: body.correctionDueDate ? new Date(body.correctionDueDate): null,
      status:            body.status            ?? 'PENDENTE',
      priority:          body.priority          ?? 'MEDIA',
      description:       body.description       || null,
      notes:             body.notes             || null,
    },
  })

  await prisma.conferenceHistory.create({
    data: {
      conferenceId: conf.id,
      type:         'CRIACAO',
      title:        'ConferÃªncia criada',
      description:  `ConferÃªncia "${conf.title}" criada.`,
    },
  })

  return NextResponse.json(conf, { status: 201 })
}
