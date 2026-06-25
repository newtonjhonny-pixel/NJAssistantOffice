import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const corr = await prisma.conferenceCorrection.create({
    data: {
      conferenceId: params.id,
      issueId:      body.issueId      || null,
      responsible:  body.responsible  || null,
      dueDate:      body.dueDate      ? new Date(body.dueDate) : null,
      status:       body.status       ?? 'ABERTA',
      notes:        body.notes        || null,
      correctedAt:  body.correctedAt  ? new Date(body.correctedAt) : null,
      validatedAt:  body.validatedAt  ? new Date(body.validatedAt) : null,
    },
  })

  await prisma.conferenceHistory.create({
    data: {
      conferenceId: params.id,
      type:         'CORRECAO_SOLICITADA',
      title:        'Correção solicitada',
      description:  `Correção atribuída a ${corr.responsible ?? 'responsável não definido'}.`,
    },
  })

  return NextResponse.json(corr, { status: 201 })
}
