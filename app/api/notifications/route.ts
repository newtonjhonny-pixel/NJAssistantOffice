import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET — últimas 50 notificações
export async function GET() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(notifications)
}

// PATCH — marcar todas como lidas
export async function PATCH() {
  await prisma.notification.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  })
  return NextResponse.json({ ok: true })
}
