import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()

  // batch create (array) or single
  if (Array.isArray(body)) {
    const count = await prisma.conferenceChecklistItem.count({ where: { conferenceId: params.id } })
    const items = await prisma.$transaction(
      body.map((item: { description: string }, i: number) =>
        prisma.conferenceChecklistItem.create({
          data: {
            conferenceId:  params.id,
            description:   item.description,
            result:        'PENDENTE_ANALISE',
            order:         count + i,
          },
        })
      )
    )
    await prisma.conferenceHistory.create({
      data: {
        conferenceId: params.id,
        type:         'ITEM_CONFERIDO',
        title:        'Checklist adicionado',
        description:  `${items.length} itens adicionados ao checklist.`,
      },
    })
    return NextResponse.json(items, { status: 201 })
  }

  const count = await prisma.conferenceChecklistItem.count({ where: { conferenceId: params.id } })
  const item = await prisma.conferenceChecklistItem.create({
    data: {
      conferenceId:         params.id,
      description:          body.description,
      result:               body.result               ?? 'PENDENTE_ANALISE',
      notes:                body.notes                || null,
      correctionResponsible:body.correctionResponsible|| null,
      correctionDueDate:    body.correctionDueDate    ? new Date(body.correctionDueDate): null,
      order:                count,
    },
  })
  await prisma.conferenceHistory.create({
    data: {
      conferenceId: params.id,
      type:         'ITEM_CONFERIDO',
      title:        'Item adicionado ao checklist',
      description:  `Item "${item.description}" adicionado.`,
    },
  })
  return NextResponse.json(item, { status: 201 })
}
