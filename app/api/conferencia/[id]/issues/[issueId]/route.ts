import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; issueId: string } }) {
  const body = await req.json()
  const prev = await prisma.conferenceIssue.findUnique({ where: { id: params.issueId } })
  if (!prev) return NextResponse.json({ error: 'Inconsistência não encontrada' }, { status: 404 })

  const issue = await prisma.conferenceIssue.update({
    where: { id: params.issueId },
    data: {
      title:                body.title                ?? prev.title,
      description:          body.description          !== undefined ? (body.description || null)           : prev.description,
      severity:             body.severity             ?? prev.severity,
      impact:               body.impact               !== undefined ? (body.impact || null)                : prev.impact,
      probableCause:        body.probableCause        !== undefined ? (body.probableCause || null)         : prev.probableCause,
      recommendedSolution:  body.recommendedSolution  !== undefined ? (body.recommendedSolution || null)   : prev.recommendedSolution,
      correctionResponsible:body.correctionResponsible!== undefined ? (body.correctionResponsible || null) : prev.correctionResponsible,
      correctionDueDate:    body.correctionDueDate    !== undefined ? (body.correctionDueDate ? new Date(body.correctionDueDate) : null) : prev.correctionDueDate,
      correctionStatus:     body.correctionStatus     ?? prev.correctionStatus,
      finalNotes:           body.finalNotes           !== undefined ? (body.finalNotes || null) : prev.finalNotes,
    },
  })
  return NextResponse.json(issue)
}

export async function DELETE(_req: NextRequest, { params }: { params: { issueId: string } }) {
  await prisma.conferenceIssue.delete({ where: { id: params.issueId } })
  return NextResponse.json({ ok: true })
}
