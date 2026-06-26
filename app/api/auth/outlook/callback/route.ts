import { NextRequest, NextResponse } from 'next/server'
import { exchangeOutlookCode, getOutlookProfile, listOutlookFolders } from '@/lib/email/outlook'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const BASE = process.env.MICROSOFT_REDIRECT_URI?.replace('/api/auth/outlook/callback', '') ?? 'http://localhost:3000'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${BASE}/integracoes?error=outlook_denied`)
  }

  try {
    const tokens = await exchangeOutlookCode(code)
    const profile = await getOutlookProfile(tokens.accessToken)

    // Salvar ou atualizar conta
    const account = await prisma.emailAccount.upsert({
      where: { provider_email: { provider: 'OUTLOOK', email: profile.email } },
      update: {
        displayName: profile.name,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        isActive: true,
        connectedAt: new Date(),
      },
      create: {
        provider: 'OUTLOOK',
        email: profile.email,
        displayName: profile.name,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    })

    // Sincronizar lista de pastas
    const folders = await listOutlookFolders(account.id)
    for (const f of folders) {
      await prisma.emailFolder.upsert({
        where: { accountId_providerFolderId: { accountId: account.id, providerFolderId: f.providerFolderId } },
        update: { name: f.name, totalCount: f.totalCount, unreadCount: f.unreadCount },
        create: {
          accountId: account.id,
          providerFolderId: f.providerFolderId,
          name: f.name,
          totalCount: f.totalCount,
          unreadCount: f.unreadCount,
          isSelected: f.name === 'Inbox' || f.name === 'INBOX',
        },
      })
    }

    return NextResponse.redirect(`${BASE}/integracoes?success=outlook`)
  } catch (err) {
    console.error('[outlook/callback]', err instanceof Error ? err.message : err)
    return NextResponse.redirect(`${BASE}/integracoes?error=outlook_auth_failed`)
  }
}
