import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await prisma.inboxItem.findMany({
    where: { isIgnored: false },
    orderBy: { receivedAt: 'desc' },
  })
  return NextResponse.json(items)
}
