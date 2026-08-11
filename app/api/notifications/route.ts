import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { prismaSqlite } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'


// â”€â”€ Sincroniza alertas de conformidade de procedimentos â†’ tabela Notification â”€

async function syncProcedureAlerts() {
  const now = new Date()
  const d90 = new Date(now.getTime() - 90 * 24 * 3600 * 1000).toISOString()
  const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString()

  try {
    const docs = await prismaSqlite.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT "id", "title", "type", "status", "risks", "nextReview", "updatedAt" FROM "ProcedureDocument"`
    )

    const leituras = await prismaSqlite.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT "documentId", MAX("createdAt") as "ultimaLeitura"
       FROM "ProcedureHistory" WHERE action = 'LEITURA'
       GROUP BY "documentId"`
    )
    const leiturasMap: Record<string, string> = {}
    for (const l of leituras) leiturasMap[l.documentId as string] = l.ultimaLeitura as string

    const ops: Promise<unknown>[] = []

    for (const doc of docs) {
      const docId    = doc.id    as string
      const docTitle = doc.title as string

      // â”€â”€ 1. Sem leitura (VIGENTE, > 90 dias) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (doc.status === 'VIGENTE') {
        const ul   = leiturasMap[docId]
        const nid  = `proc-leitura-${docId}`
        if (!ul || ul < d90) {
          const days = ul ? Math.floor((now.getTime() - new Date(ul).getTime()) / 86400000) : null
          const msg  = days ? `Sem leitura registrada hÃ¡ ${days} dias.` : 'Nunca teve leitura registrada.'
          ops.push(prisma.notification.upsert({
            where:  { id: nid },
            create: { id: nid, type: 'PROC_SEM_LEITURA', title: `Leitura pendente: ${docTitle}`,
                      message: msg, relatedType: 'procedure', relatedId: docId, isRead: false },
            update: { message: msg },
          }))
        } else {
          ops.push(prisma.notification.deleteMany({ where: { id: nid } }))
        }
      }

      // â”€â”€ 2. RevisÃ£o vencida (VIGENTE, nextReview passada) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (doc.status === 'VIGENTE' && doc.nextReview) {
        const reviewDate = new Date(doc.nextReview as string)
        const nid        = `proc-revisao-${docId}`
        if (reviewDate < now) {
          const overdue = Math.floor((now.getTime() - reviewDate.getTime()) / 86400000)
          ops.push(prisma.notification.upsert({
            where:  { id: nid },
            create: { id: nid, type: 'PROC_REVISAO_VENCIDA', title: `RevisÃ£o vencida: ${docTitle}`,
                      message: `RevisÃ£o venceu hÃ¡ ${overdue} dia${overdue !== 1 ? 's' : ''}.`,
                      relatedType: 'procedure', relatedId: docId, isRead: false },
            update: { message: `RevisÃ£o venceu hÃ¡ ${overdue} dia${overdue !== 1 ? 's' : ''}.` },
          }))
        } else {
          ops.push(prisma.notification.deleteMany({ where: { id: nid } }))
        }
      }

      // â”€â”€ 3. Risco crÃ­tico sem controle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (doc.risks) {
        try {
          const r = JSON.parse(doc.risks as string)
          if (r.__tipo === 'RISCOS_CONTROLES') {
            const criticos = (r.riscos ?? []).filter(
              (rk: Record<string, string>) => rk.severidade === 'CRITICO'
            )
            for (const c of criticos) {
              const hasControl = (r.controles ?? []).some(
                (ct: Record<string, string>) => ct.riscoId === c.id
              )
              const nid = `proc-risco-${docId}-${c.id}`
              if (!hasControl) {
                ops.push(prisma.notification.upsert({
                  where:  { id: nid },
                  create: { id: nid, type: 'PROC_RISCO_CRITICO',
                            title: `Risco crÃ­tico sem controle`,
                            message: `${docTitle}: ${c.titulo}`,
                            relatedType: 'procedure', relatedId: docId, isRead: false },
                  update: {},
                }))
              } else {
                ops.push(prisma.notification.deleteMany({ where: { id: nid } }))
              }
            }
          }
        } catch { /* nÃ£o Ã© JSON */ }
      }

      // â”€â”€ 4. Rascunho abandonado (> 30 dias sem ediÃ§Ã£o) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const nidAbandoned = `proc-abandonado-${docId}`
      if (doc.status === 'RASCUNHO' && (doc.updatedAt as string) < d30) {
        const days = Math.floor((now.getTime() - new Date(doc.updatedAt as string).getTime()) / 86400000)
        ops.push(prisma.notification.upsert({
          where:  { id: nidAbandoned },
          create: { id: nidAbandoned, type: 'PROC_ABANDONADO',
                    title: `Rascunho abandonado: ${docTitle}`,
                    message: `Sem atualizaÃ§Ãµes hÃ¡ ${days} dias.`,
                    relatedType: 'procedure', relatedId: docId, isRead: false },
          update: { message: `Sem atualizaÃ§Ãµes hÃ¡ ${days} dias.` },
        }))
      } else {
        ops.push(prisma.notification.deleteMany({ where: { id: nidAbandoned } }))
      }
    }

    await Promise.allSettled(ops)
  } catch (err) {
    console.error('[syncProcedureAlerts]', err)
  }
}

// GET â€” sincroniza alertas de procedimentos e retorna todas as notificaÃ§Ãµes
export async function GET() {
  await syncProcedureAlerts()
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(notifications)
}

// PATCH â€” marcar todas como lidas
export async function PATCH() {
  await prisma.notification.updateMany({
    where: { isRead: false },
    data:  { isRead: true },
  })
  return NextResponse.json({ ok: true })
}
