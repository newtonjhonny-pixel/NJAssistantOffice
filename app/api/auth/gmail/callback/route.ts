import { NextRequest, NextResponse } from 'next/server'
import { exchangeGmailCode, getGmailProfile, listGmailLabels } from '@/lib/email/gmail'
import { prisma } from '@/lib/prisma'

const BASE = process.env.GOOGLE_REDIRECT_URI?.replace('/api/auth/gmail/callback', '') ?? 'http://localhost:3000'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${BASE}/integracoes?error=gmail_denied`)
  }

  try {
    const tokens = await exchangeGmailCode(code)
    const profile = await getGmailProfile(tokens.accessToken)

    const account = await prisma.emailAccount.upsert({
      where: { provider_email: { provider: 'GMAIL', email: profile.email } },
      update: {
        displayName: profile.name,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? undefined,
        expiresAt: tokens.expiresAt,
        isActive: true,
        connectedAt: new Date(),
      },
      create: {
        provider: 'GMAIL',
        email: profile.email,
        displayName: profile.name,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    })

    const labels = await listGmailLabels(account.id)
    for (const l of labels) {
      await prisma.emailFolder.upsert({
        where: { accountId_providerFolderId: { accountId: account.id, providerFolderId: l.providerFolderId } },
        update: { name: l.name },
        create: {
          accountId: account.id,
          providerFolderId: l.providerFolderId,
          name: l.name,
          isSelected: l.providerFolderId === 'INBOX',
        },
      })
    }

    return NextResponse.redirect(`${BASE}/integracoes?success=gmail`)
  } catch (err) {
    console.error('[gmail/callback]', err instanceof Error ? err.message : err)
    return NextResponse.redirect(`${BASE}/integracoes?error=gmail_auth_failed`)
  }
}
