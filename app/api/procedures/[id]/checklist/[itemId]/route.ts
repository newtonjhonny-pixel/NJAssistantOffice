import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const body = await req.json()
  const item = await prisma.procedureChecklistItem.update({
    where: { id: params.itemId },
    data: {
      description: body.description ?? undefined,
      required:    body.required    ?? undefined,
      notes:       body.notes       ?? undefined,
      order:       body.order       ?? undefined,
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  await prisma.procedureChecklistItem.delete({ where: { id: params.itemId } })
  return NextResponse.json({ ok: true })
}
