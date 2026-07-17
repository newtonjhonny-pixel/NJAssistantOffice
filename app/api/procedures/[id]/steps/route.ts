import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveBase64Image } from './image-utils'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const steps = await prisma.procedureStep.findMany({
    where: { documentId: params.id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(steps)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const count = await prisma.procedureStep.count({ where: { documentId: params.id } })

  let imagePath: string | null = null
  if (body.imageBase64) {
    imagePath = await saveBase64Image(body.imageBase64, params.id)
  }

  const step = await prisma.procedureStep.create({
    data: {
      documentId:    params.id,
      order:         body.order     ?? count,
      title:         body.title,
      description:   body.description    || null,
      imagePath:     imagePath,
      notes:         body.notes          || null,
      attentionPoint:body.attentionPoint || null,
    },
  })
  return NextResponse.json(step, { status: 201 })
}
