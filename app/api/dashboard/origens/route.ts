import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const origens = await prisma.taskOrigin.findMany({
    where: { active: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { tasks: true } } },
  })

  const noOriginCount = await prisma.task.count({
    where: { originId: null, status: { not: 'CANCELADA' } },
  })

  return NextResponse.json({
    byOrigin: origens
      .map(o => ({ id: o.id, name: o.name, color: o.color, icon: o.icon, count: o._count.tasks }))
      .filter(o => o.count > 0),
    noOriginCount,
  })
}
