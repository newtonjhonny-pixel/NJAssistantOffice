import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const item = await prisma.inboxItem.update({
    where: { id: params.id },
    data: {
      ...(body.isRead !== undefined && { isRead: body.isRead }),
      ...(body.isIgnored !== undefined && { isIgnored: body.isIgnored }),
      ...(body.taskCreated !== undefined && { taskCreated: body.taskCreated }),
    },
  })
  return NextResponse.json(item)
}
