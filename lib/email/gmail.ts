import { prisma } from '@/lib/prisma'

export function isGmailConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  )
}

export function getGmailAuthUrl(state?: string): string {
  const clientId = encodeURIComponent(process.env.GOOGLE_CLIENT_ID!)
  const redirectUri = encodeURIComponent(process.env.GOOGLE_REDIRECT_URI!)
  const scopes = encodeURIComponent(
    'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
  )
  const st = encodeURIComponent(state || 'gmail')

  return (
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=${scopes}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${st}`
  )
}

export async function exchangeGmailCode(code: string): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gmail token error: ${err}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
  }
}

async function refreshGmailToken(accountId: string): Promise<string> {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  if (!account || !account.refreshToken) throw new Error('Sem refresh token Gmail')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) throw new Error('Falha ao renovar token Gmail')
  const data = await res.json()

  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000)
  await prisma.emailAccount.update({
    where: { id: accountId },
    data: { accessToken: data.access_token, expiresAt },
  })

  return data.access_token
}

async function getValidToken(accountId: string): Promise<string> {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  if (!account) throw new Error('Conta Gmail não encontrada')

  if (account.expiresAt && account.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    return refreshGmailToken(accountId)
  }

  return account.accessToken
}

export async function getGmailProfile(accessToken: string): Promise<{ email: string; name: string }> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Falha ao buscar perfil Gmail')
  const data = await res.json()
  return { email: data.email, name: data.name ?? data.email }
}

export async function listGmailLabels(accountId: string) {
  const token = await getValidToken(accountId)
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Falha ao listar labels Gmail')
  const data = await res.json()

  // Mostrar apenas labels relevantes (não os internos como CATEGORY_*)
  const SKIP = ['CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS', 'SPAM', 'TRASH', 'CHAT', 'SENT', 'DRAFT']
  return (data.labels ?? [])
    .filter((l: Record<string, string>) => !SKIP.includes(l.id))
    .map((l: Record<string, string>) => ({
      providerFolderId: l.id,
      name: translateGmailLabel(l.name),
    }))
}

function translateGmailLabel(name: string): string {
  const map: Record<string, string> = {
    INBOX: 'Caixa de entrada',
    STARRED: 'Com estrela',
    IMPORTANT: 'Importante',
    UNREAD: 'Não lidas',
    SENT: 'Enviados',
    DRAFT: 'Rascunhos',
  }
  return map[name] ?? name
}

export async function syncGmailEmails(accountId: string, folderId: string, labelId: string, limit = 25) {
  const token = await getValidToken(accountId)

  // Listar IDs de mensagens
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}&labelIds=${labelId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!listRes.ok) throw new Error('Falha ao listar mensagens Gmail')
  const listData = await listRes.json()

  const messageIds: string[] = (listData.messages ?? []).map((m: Record<string, string>) => m.id)

  // Buscar detalhes de cada mensagem (em paralelo, grupos de 5)
  const emails = []
  for (let i = 0; i < messageIds.length; i += 5) {
    const batch = messageIds.slice(i, i + 5)
    const results = await Promise.all(
      batch.map(async (id) => {
        const r = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!r.ok) return null
        return r.json()
      })
    )
    emails.push(...results.filter(Boolean))
  }

  return emails.map((msg) => {
    const headers: Record<string, string> = {}
    for (const h of (msg.payload?.headers ?? [])) {
      headers[h.name.toLowerCase()] = h.value
    }

    const body = extractGmailBody(msg.payload)
    const isRead = !(msg.labelIds ?? []).includes('UNREAD')
    const hasAttachments = (msg.payload?.parts ?? []).some(
      (p: Record<string, unknown>) => p.filename && (p.filename as string).length > 0
    )

    return {
      externalId: msg.id as string,
      sender: parseEmailName(headers['from'] ?? ''),
      senderEmail: parseEmailAddress(headers['from'] ?? ''),
      subject: headers['subject'] ?? '(sem assunto)',
      body: body.slice(0, 4000), // limitar tamanho
      receivedAt: new Date(parseInt(msg.internalDate ?? '0')),
      isRead,
      hasAttachments,
    }
  })
}

function extractGmailBody(payload: Record<string, unknown>): string {
  if (!payload) return ''

  // Texto plano direto
  if ((payload.mimeType as string)?.startsWith('text/plain') && payload.body) {
    const b = payload.body as Record<string, string>
    if (b.data) return Buffer.from(b.data, 'base64').toString('utf-8')
  }

  // Multipart — buscar text/plain recursivamente
  const parts = (payload.parts ?? []) as Record<string, unknown>[]
  for (const part of parts) {
    const result = extractGmailBody(part)
    if (result) return result
  }

  return ''
}

function parseEmailName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</)
  return match ? match[1].trim() : from.replace(/<[^>]+>/, '').trim() || from
}

function parseEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : from.trim()
}
