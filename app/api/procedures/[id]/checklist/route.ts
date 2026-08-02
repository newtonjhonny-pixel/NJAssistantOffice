import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'



export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const items = await prisma.procedureChecklistItem.findMany({
    where: { documentId: params.id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const count = await prisma.procedureChecklistItem.count({ where: { documentId: params.id } })
  const item = await prisma.procedureChecklistItem.create({
    data: {
      documentId:  params.id,
      order:       body.order ?? count,
      description: body.description,
      required:    body.required ?? true,
      notes:       body.notes || null,
    },
  })
  return NextResponse.json(item, { status: 201 })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  // Bulk replace all items
  const body: { items: Array<{ description: string; required: boolean; notes?: string }> } = await req.json()
  await prisma.procedureChecklistItem.deleteMany({ where: { documentId: params.id } })
  if (body.items.length) {
    await prisma.procedureChecklistItem.createMany({
      data: body.items.map((item, i) => ({
        documentId:  params.id,
        order:       i,
        description: item.description,
        required:    item.required ?? true,
        notes:       item.notes || null,
      })),
    })
  }
  const items = await prisma.procedureChecklistItem.findMany({
    where: { documentId: params.id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(items)
}
