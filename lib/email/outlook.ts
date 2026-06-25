import { prisma } from '@/lib/prisma'

export function isOutlookConfigured(): boolean {
  return !!(
    process.env.MICROSOFT_CLIENT_ID &&
    process.env.MICROSOFT_CLIENT_SECRET &&
    process.env.MICROSOFT_REDIRECT_URI
  )
}

export function getOutlookAuthUrl(state?: string): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID!
  const redirectUri = encodeURIComponent(process.env.MICROSOFT_REDIRECT_URI!)
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common'
  const scopes = encodeURIComponent('Mail.Read offline_access User.Read')
  const st = encodeURIComponent(state || 'outlook')

  return (
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${redirectUri}` +
    `&response_mode=query` +
    `&scope=${scopes}` +
    `&state=${st}`
  )
}

export async function exchangeOutlookCode(code: string): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
}> {
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common'
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
        grant_type: 'authorization_code',
        scope: 'Mail.Read offline_access User.Read',
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Outlook token error: ${err}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
  }
}

async function refreshOutlookToken(accountId: string): Promise<string> {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  if (!account || !account.refreshToken) throw new Error('Sem refresh token')

  const tenant = process.env.MICROSOFT_TENANT_ID || 'common'
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: account.refreshToken,
        grant_type: 'refresh_token',
        scope: 'Mail.Read offline_access User.Read',
      }),
    }
  )

  if (!res.ok) throw new Error('Falha ao renovar token Outlook')
  const data = await res.json()

  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000)
  await prisma.emailAccount.update({
    where: { id: accountId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? account.refreshToken,
      expiresAt,
    },
  })

  return data.access_token
}

async function getValidToken(accountId: string): Promise<string> {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  if (!account) throw new Error('Conta não encontrada')

  // Renovar se faltam menos de 5 minutos para expirar
  if (account.expiresAt && account.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    return refreshOutlookToken(accountId)
  }

  return account.accessToken
}

export async function getOutlookProfile(accessToken: string): Promise<{ email: string; name: string }> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Falha ao buscar perfil Outlook')
  const data = await res.json()
  return { email: data.mail ?? data.userPrincipalName, name: data.displayName }
}

export async function listOutlookFolders(accountId: string) {
  const token = await getValidToken(accountId)
  const res = await fetch('https://graph.microsoft.com/v1.0/me/mailFolders?$top=20', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Falha ao listar pastas Outlook')
  const data = await res.json()

  return (data.value ?? []).map((f: Record<string, unknown>) => ({
    providerFolderId: f.id as string,
    name: f.displayName as string,
    totalCount: f.totalItemCount as number,
    unreadCount: f.unreadItemCount as number,
  }))
}

export async function syncOutlookEmails(accountId: string, folderId: string, providerFolderId: string, limit = 25) {
  const token = await getValidToken(accountId)

  const url =
    `https://graph.microsoft.com/v1.0/me/mailFolders/${providerFolderId}/messages` +
    `?$top=${limit}` +
    `&$orderby=receivedDateTime desc` +
    `&$select=id,subject,from,receivedDateTime,bodyPreview,body,isRead,hasAttachments`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.body-content-type="text"' },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Falha ao buscar e-mails Outlook: ${err}`)
  }
  const data = await res.json()

  const emails = (data.value ?? []) as Record<string, unknown>[]
  return emails.map((m) => {
    const from = m.from as Record<string, Record<string, string>>
    return {
      externalId: m.id as string,
      sender: from?.emailAddress?.name ?? '',
      senderEmail: from?.emailAddress?.address ?? '',
      subject: (m.subject as string) || '(sem assunto)',
      body: (m.body as Record<string, string>)?.content ?? (m.bodyPreview as string) ?? '',
      bodyPreview: m.bodyPreview as string,
      receivedAt: new Date(m.receivedDateTime as string),
      isRead: (m.isRead as boolean) ?? false,
      hasAttachments: (m.hasAttachments as boolean) ?? false,
    }
  })
}
