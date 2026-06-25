import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action   = searchParams.get('action') || ''
  const q        = searchParams.get('q')      || ''
  const dateFrom = searchParams.get('dateFrom')
  const dateTo   = searchParams.get('dateTo')

  const history = await prisma.taskHistory.findMany({
    where: {
      ...(action && { action }),
      ...(q && {
        OR: [
          { description: { contains: q } },
          { task: { title: { contains: q } } },
        ],
      }),
      ...(dateFrom || dateTo ? {
        createdAt: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59') } : {}),
        },
      } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: {
      task: { select: { id: true, title: true, status: true, priority: true, origin: true } },
    },
  })

  return NextResponse.json(history)
}
