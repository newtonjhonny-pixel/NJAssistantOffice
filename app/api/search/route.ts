import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q') || ''

  if (!q.trim()) return NextResponse.json({ tasks: [], inbox: [] })

  const [tasks, inbox] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { person: { contains: q } },
          { observations: { contains: q } },
          { origin: { contains: q } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.inboxItem.findMany({
      where: {
        OR: [
          { subject: { contains: q } },
          { sender: { contains: q } },
          { body: { contains: q } },
          { summary: { contains: q } },
        ],
      },
      orderBy: { receivedAt: 'desc' },
      take: 10,
    }),
  ])

  return NextResponse.json({ tasks, inbox })
}
