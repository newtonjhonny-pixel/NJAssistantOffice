import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveBase64Image } from '../image-utils'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string; stepId: string } }) {
  const body = await req.json()

  let imagePath: string | undefined = undefined
  if (body.imageBase64 === null) {
    imagePath = ''
  } else if (body.imageBase64) {
    imagePath = await saveBase64Image(body.imageBase64, params.id)
  }

  const step = await prisma.procedureStep.update({
    where: { id: params.stepId },
    data: {
      title:          body.title          ?? undefined,
      description:    body.description    ?? undefined,
      notes:          body.notes          ?? undefined,
      attentionPoint: body.attentionPoint ?? undefined,
      order:          body.order          ?? undefined,
      ...(imagePath !== undefined ? { imagePath: imagePath || null } : {}),
    },
  })
  return NextResponse.json(step)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string; stepId: string } }) {
  await prisma.procedureStep.delete({ where: { id: params.stepId } })
  return NextResponse.json({ ok: true })
}
