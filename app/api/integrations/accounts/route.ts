import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isOutlookConfigured } from '@/lib/email/outlook'
import { isGmailConfigured } from '@/lib/email/gmail'

export const dynamic = 'force-dynamic'

export async function GET() {
  const accounts = await prisma.emailAccount.findMany({
    where: { isActive: true },
    include: {
      folders: { orderBy: { name: 'asc' } },
      _count: { select: { inboxItems: true } },
    },
    orderBy: { connectedAt: 'desc' },
  })

  return NextResponse.json({
    accounts,
    config: {
      outlookConfigured: isOutlookConfigured(),
      gmailConfigured: isGmailConfigured(),
    },
  })
}
