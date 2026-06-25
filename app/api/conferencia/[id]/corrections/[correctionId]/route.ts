import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; correctionId: string } }) {
  const body = await req.json()
  const prev = await prisma.conferenceCorrection.findUnique({ where: { id: params.correctionId } })
  if (!prev) return NextResponse.json({ error: 'Correção não encontrada' }, { status: 404 })

  const now = new Date()
  const corr = await prisma.conferenceCorrection.update({
    where: { id: params.correctionId },
    data: {
      issueId:     body.issueId     !== undefined ? (body.issueId || null)     : prev.issueId,
      responsible: body.responsible !== undefined ? (body.responsible || null) : prev.responsible,
      dueDate:     body.dueDate     !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : prev.dueDate,
      status:      body.status      ?? prev.status,
      notes:       body.notes       !== undefined ? (body.notes || null) : prev.notes,
      correctedAt: body.status === 'CORRIGIDA' && !prev.correctedAt ? now : prev.correctedAt,
      validatedAt: body.status === 'VALIDADA'  && !prev.validatedAt ? now : prev.validatedAt,
    },
  })

  if (body.status && body.status !== prev.status) {
    const isRealized = body.status === 'CORRIGIDA' || body.status === 'VALIDADA'
    await prisma.conferenceHistory.create({
      data: {
        conferenceId: params.id,
        type:         isRealized ? 'CORRECAO_REALIZADA' : 'STATUS',
        title:        isRealized ? 'Correção realizada' : 'Status da correção atualizado',
        description:  `Status da correção: "${prev.status}" → "${body.status}".`,
      },
    })
  }

  return NextResponse.json(corr)
}

export async function DELETE(_req: NextRequest, { params }: { params: { correctionId: string } }) {
  await prisma.conferenceCorrection.delete({ where: { id: params.correctionId } })
  return NextResponse.json({ ok: true })
}
