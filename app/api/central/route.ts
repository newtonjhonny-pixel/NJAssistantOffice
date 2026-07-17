import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const category = searchParams.get('category')
  const priority = searchParams.get('priority')
  const source   = searchParams.get('source')
  const search   = searchParams.get('search')

  const where = {
    ...(status   ? { status }   : {}),
    ...(category ? { category } : {}),
    ...(priority ? { priority } : {}),
    ...(source   ? { source }   : {}),
    ...(search ? {
      OR: [
        { title:       { contains: search } },
        { subject:     { contains: search } },
        { summary:     { contains: search } },
        { company:     { contains: search } },
        { collaborator:{ contains: search } },
        { senderName:  { contains: search } },
        { keywords:    { contains: search } },
      ],
    } : {}),
  }

  const [items, total, pending, analyzed, urgente, actioned] = await Promise.all([
    prisma.centralItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        attachments: true,
        suggestions: { orderBy: { createdAt: 'asc' } },
        _count: { select: { history: true } },
      },
    }),
    prisma.centralItem.count(),
    prisma.centralItem.count({ where: { status: 'PENDING' } }),
    prisma.centralItem.count({ where: { status: 'ANALYZED' } }),
    prisma.centralItem.count({ where: { priority: 'URGENTE' } }),
    prisma.centralItem.count({ where: { status: 'ACTIONED' } }),
  ])

  // Today count
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayCount = await prisma.centralItem.count({
    where: { createdAt: { gte: today } },
  })

  // Category counts
  const catGroups = await prisma.centralItem.groupBy({
    by: ['category'],
    _count: { id: true },
    where: { category: { not: null } },
  })

  return NextResponse.json({
    items,
    stats: { total, pending, analyzed, urgente, actioned, today: todayCount },
    categories: catGroups.map(g => ({ name: g.category!, count: g._count.id })),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const item = await prisma.centralItem.create({
    data: {
      source:       body.source       || 'PASTE',
      title:        body.title        || 'Nova entrada',
      pastedContent:body.pastedContent|| null,
      senderName:   body.senderName   || null,
      senderEmail:  body.senderEmail  || null,
      subject:      body.subject      || null,
    },
    include: { attachments: true, suggestions: true },
  })
  await prisma.centralHistory.create({
    data: { itemId: item.id, action: 'RECEBIDO', detail: `Via ${item.source}` },
  })
  return NextResponse.json(item, { status: 201 })
}
