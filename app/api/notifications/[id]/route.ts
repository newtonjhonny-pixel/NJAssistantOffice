import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH — marcar uma notificação como lida
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const notification = await prisma.notification.update({
    where: { id: params.id },
    data: { isRead: true },
  })
  return NextResponse.json(notification)
}
