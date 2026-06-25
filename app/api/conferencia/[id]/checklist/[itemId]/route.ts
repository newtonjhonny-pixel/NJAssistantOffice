import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const body = await req.json()
  const prev = await prisma.conferenceChecklistItem.findUnique({ where: { id: params.itemId } })
  if (!prev) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })

  const item = await prisma.conferenceChecklistItem.update({
    where: { id: params.itemId },
    data: {
      description:          body.description          ?? prev.description,
      result:               body.result               ?? prev.result,
      notes:                body.notes                !== undefined ? (body.notes || null) : prev.notes,
      correctionResponsible:body.correctionResponsible !== undefined ? (body.correctionResponsible || null) : prev.correctionResponsible,
      correctionDueDate:    body.correctionDueDate    !== undefined ? (body.correctionDueDate ? new Date(body.correctionDueDate) : null) : prev.correctionDueDate,
    },
  })

  if (body.result && body.result !== prev.result) {
    await prisma.conferenceHistory.create({
      data: {
        conferenceId: params.id,
        type:         'ITEM_CONFERIDO',
        title:        'Item do checklist atualizado',
        description:  `"${item.description}": ${prev.result} → ${item.result}`,
      },
    })
  }

  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, { params }: { params: { itemId: string } }) {
  await prisma.conferenceChecklistItem.delete({ where: { id: params.itemId } })
  return NextResponse.json({ ok: true })
}
