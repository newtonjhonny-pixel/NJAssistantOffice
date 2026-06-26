import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncOutlookEmails } from '@/lib/email/outlook'
import { syncGmailEmails } from '@/lib/email/gmail'
import { analyzeEmail } from '@/lib/email/analyzer'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { accountId } = await req.json()
  if (!accountId) return NextResponse.json({ error: 'accountId obrigatório' }, { status: 400 })

  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
    include: { folders: { where: { isSelected: true } } },
  })
  if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

  const selectedFolders = account.folders
  if (!selectedFolders.length) {
    return NextResponse.json({ error: 'Nenhuma pasta selecionada para sincronização' }, { status: 400 })
  }

  let totalNew = 0
  let totalSkipped = 0
  const errors: string[] = []

  for (const folder of selectedFolders) {
    try {
      let emails: {
        externalId: string
        sender: string
        senderEmail: string
        subject: string
        body: string
        receivedAt: Date
        isRead: boolean
        hasAttachments: boolean
      }[] = []

      if (account.provider === 'OUTLOOK') {
        emails = await syncOutlookEmails(accountId, folder.id, folder.providerFolderId, 25)
      } else if (account.provider === 'GMAIL') {
        emails = await syncGmailEmails(accountId, folder.id, folder.providerFolderId, 25)
      }

      for (const email of emails) {
        // Verificar se já existe (deduplicação por externalId)
        const existing = await prisma.inboxItem.findFirst({
          where: { provider: account.provider, externalId: email.externalId },
        })
        if (existing) { totalSkipped++; continue }

        // Analisar com IA
        let analysis = null
        try {
          analysis = await analyzeEmail(email.subject, email.body, email.sender, email.senderEmail)
        } catch { /* análise opcional */ }

        await prisma.inboxItem.create({
          data: {
            provider: account.provider,
            accountId: account.id,
            folderId: folder.id,
            externalId: email.externalId,
            sender: email.sender,
            senderEmail: email.senderEmail,
            subject: email.subject,
            bodyPreview: (email as { bodyPreview?: string }).bodyPreview ?? email.body.slice(0, 300),
            body: email.body,
            receivedAt: email.receivedAt,
            isRead: email.isRead,
            hasAttachments: email.hasAttachments,
            summary: analysis?.summary ?? null,
            aiSuggestedTaskTitle: analysis?.suggestedTaskTitle ?? null,
            aiSuggestedPriority: analysis?.suggestedPriority ?? null,
            aiSuggestedDueDate: analysis?.suggestedDueDate ?? null,
            aiSuggestedResponse: analysis?.suggestedResponse ?? null,
            // campos legados compatíveis
            suggestedTask: analysis?.suggestedTaskTitle ?? null,
            suggestedReply: analysis?.suggestedResponse ?? null,
          },
        })
        totalNew++
      }
    } catch (err) {
      errors.push(`Pasta "${folder.name}": ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    }
  }

  // Atualizar lastSyncAt
  await prisma.emailAccount.update({
    where: { id: accountId },
    data: { lastSyncAt: new Date() },
  })

  return NextResponse.json({ totalNew, totalSkipped, errors })
}
