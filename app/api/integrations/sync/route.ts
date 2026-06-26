import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncOutlookEmails } from '@/lib/email/outlook'
import { syncGmailEmails } from '@/lib/email/gmail'
import { analyzeEmail } from '@/lib/email/analyzer'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

// POST /api/integrations/sync
// Body: { accountId: string }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { accountId } = body

  if (!accountId) {
    return NextResponse.json({ error: 'accountId obrigatório' }, { status: 400 })
  }

  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
    include: { folders: { where: { isSelected: true } } },
  })

  if (!account || !account.isActive) {
    return NextResponse.json({ error: 'Conta não encontrada ou inativa' }, { status: 404 })
  }

  const selectedFolders = account.folders
  if (!selectedFolders.length) {
    return NextResponse.json(
      { error: 'Nenhuma pasta selecionada. Selecione ao menos uma pasta antes de sincronizar.' },
      { status: 400 }
    )
  }

  let totalNew = 0
  let totalSkipped = 0
  const errors: string[] = []

  for (const folder of selectedFolders) {
    try {
      type RawEmail = {
        externalId: string
        sender: string
        senderEmail: string
        subject: string
        body: string
        bodyPreview?: string
        receivedAt: Date
        isRead: boolean
        hasAttachments: boolean
      }

      let emails: RawEmail[] = []

      if (account.provider === 'OUTLOOK') {
        emails = await syncOutlookEmails(accountId, folder.id, folder.providerFolderId, 25)
      } else if (account.provider === 'GMAIL') {
        emails = await syncGmailEmails(accountId, folder.id, folder.providerFolderId, 25)
      }

      for (const email of emails) {
        // Deduplicação — pula se já existe pelo externalId neste provider
        const existing = await prisma.inboxItem.findFirst({
          where: { provider: account.provider, externalId: email.externalId },
          select: { id: true },
        })
        if (existing) {
          totalSkipped++
          continue
        }

        // Análise de IA (opcional — não bloqueia o save se falhar)
        let analysis = null
        try {
          analysis = await analyzeEmail(
            email.subject,
            email.body,
            email.sender,
            email.senderEmail
          )
        } catch {
          // análise não é obrigatória
        }

        await prisma.inboxItem.create({
          data: {
            provider: account.provider,
            accountId: account.id,
            folderId: folder.id,
            externalId: email.externalId,
            sender: email.sender,
            senderEmail: email.senderEmail,
            subject: email.subject,
            bodyPreview: email.bodyPreview ?? email.body.slice(0, 300),
            body: email.body,
            receivedAt: email.receivedAt,
            isRead: email.isRead,
            hasAttachments: email.hasAttachments,
            summary: analysis?.summary ?? null,
            aiSuggestedTaskTitle: analysis?.suggestedTaskTitle ?? null,
            aiSuggestedPriority: analysis?.suggestedPriority ?? null,
            aiSuggestedDueDate: analysis?.suggestedDueDate ?? null,
            aiSuggestedResponse: analysis?.suggestedResponse ?? null,
            suggestedTask: analysis?.suggestedTaskTitle ?? null,
            suggestedReply: analysis?.suggestedResponse ?? null,
          },
        })
        createNotification({
          type: 'EMAIL_RECEIVED',
          title: '📧 Novo e-mail sincronizado',
          message: `${email.sender}: ${email.subject}`,
          relatedType: 'inbox',
        })
        totalNew++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      errors.push(`Pasta "${folder.name}": ${msg}`)
    }
  }

  // Atualiza lastSyncAt mesmo se houve erros parciais
  await prisma.emailAccount.update({
    where: { id: accountId },
    data: { lastSyncAt: new Date() },
  })

  return NextResponse.json({ totalNew, totalSkipped, errors })
}
