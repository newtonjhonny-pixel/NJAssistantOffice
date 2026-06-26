import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const issue = await prisma.conferenceIssue.create({
    data: {
      conferenceId:         params.id,
      title:                body.title,
      description:          body.description          || null,
      severity:             body.severity             ?? 'MEDIA',
      impact:               body.impact               || null,
      probableCause:        body.probableCause        || null,
      recommendedSolution:  body.recommendedSolution  || null,
      correctionResponsible:body.correctionResponsible|| null,
      correctionDueDate:    body.correctionDueDate    ? new Date(body.correctionDueDate) : null,
      correctionStatus:     body.correctionStatus     ?? 'ABERTA',
      finalNotes:           body.finalNotes           || null,
    },
  })

  // Auto update conference status to COM_INCONSISTENCIA if was PENDENTE / EM_CONFERENCIA
  const conf = await prisma.conference.findUnique({ where: { id: params.id } })
  if (conf && (conf.status === 'PENDENTE' || conf.status === 'EM_CONFERENCIA')) {
    await prisma.conference.update({ where: { id: params.id }, data: { status: 'COM_INCONSISTENCIA' } })
  }

  await prisma.conferenceHistory.create({
    data: {
      conferenceId: params.id,
      type:         'INCONSISTENCIA',
      title:        'Inconsistência registrada',
      description:  `"${issue.title}" [${issue.severity}] registrada.`,
    },
  })

  return NextResponse.json(issue, { status: 201 })
}
