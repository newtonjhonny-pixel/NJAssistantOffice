import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { listOutlookFolders } from '@/lib/email/outlook'
import { listGmailLabels } from '@/lib/email/gmail'

export const dynamic = 'force-dynamic'

// GET /api/integrations/folders?accountId=xxx
// Lista e atualiza pastas/labels de uma conta no banco
export async function GET(req: NextRequest) {
  const accountId = new URL(req.url).searchParams.get('accountId')
  if (!accountId) return NextResponse.json({ error: 'accountId obrigatório' }, { status: 400 })

  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  if (!account || !account.isActive) {
    return NextResponse.json({ error: 'Conta não encontrada ou inativa' }, { status: 404 })
  }

  try {
    let remoteFolders: { providerFolderId: string; name: string; totalCount?: number; unreadCount?: number }[] = []

    if (account.provider === 'OUTLOOK') {
      remoteFolders = await listOutlookFolders(accountId)
    } else if (account.provider === 'GMAIL') {
      remoteFolders = await listGmailLabels(accountId)
    }

    // Upsert no banco
    for (const f of remoteFolders) {
      await prisma.emailFolder.upsert({
        where: { accountId_providerFolderId: { accountId, providerFolderId: f.providerFolderId } },
        update: {
          name: f.name,
          ...(f.totalCount != null && { totalCount: f.totalCount }),
          ...(f.unreadCount != null && { unreadCount: f.unreadCount }),
        },
        create: {
          accountId,
          providerFolderId: f.providerFolderId,
          name: f.name,
          totalCount: f.totalCount,
          unreadCount: f.unreadCount,
          isSelected:
            f.providerFolderId === 'INBOX' ||
            f.name === 'Inbox' ||
            f.name === 'Caixa de entrada',
        },
      })
    }

    const folders = await prisma.emailFolder.findMany({
      where: { accountId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ folders })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar pastas'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
