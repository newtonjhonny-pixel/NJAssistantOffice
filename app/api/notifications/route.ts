import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { prismaSqlite } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'


// ── Sincroniza alertas de conformidade de procedimentos → tabela Notification ─

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

      // ── 1. Sem leitura (VIGENTE, > 90 dias) ──────────────────────────────
      if (doc.status === 'VIGENTE') {
        const ul   = leiturasMap[docId]
        const nid  = `proc-leitura-${docId}`
        if (!ul || ul < d90) {
          const days = ul ? Math.floor((now.getTime() - new Date(ul).getTime()) / 86400000) : null
          const msg  = days ? `Sem leitura registrada há ${days} dias.` : 'Nunca teve leitura registrada.'
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

      // ── 2. Revisão vencida (VIGENTE, nextReview passada) ──────────────────
      if (doc.status === 'VIGENTE' && doc.nextReview) {
        const reviewDate = new Date(doc.nextReview as string)
        const nid        = `proc-revisao-${docId}`
        if (reviewDate < now) {
          const overdue = Math.floor((now.getTime() - reviewDate.getTime()) / 86400000)
          ops.push(prisma.notification.upsert({
            where:  { id: nid },
            create: { id: nid, type: 'PROC_REVISAO_VENCIDA', title: `Revisão vencida: ${docTitle}`,
                      message: `Revisão venceu há ${overdue} dia${overdue !== 1 ? 's' : ''}.`,
                      relatedType: 'procedure', relatedId: docId, isRead: false },
            update: { message: `Revisão venceu há ${overdue} dia${overdue !== 1 ? 's' : ''}.` },
          }))
        } else {
          ops.push(prisma.notification.deleteMany({ where: { id: nid } }))
        }
      }

      // ── 3. Risco crítico sem controle ─────────────────────────────────────
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
                            title: `Risco crítico sem controle`,
                            message: `${docTitle}: ${c.titulo}`,
                            relatedType: 'procedure', relatedId: docId, isRead: false },
                  update: {},
                }))
              } else {
                ops.push(prisma.notification.deleteMany({ where: { id: nid } }))
              }
            }
          }
        } catch { /* não é JSON */ }
      }

      // ── 4. Rascunho abandonado (> 30 dias sem edição) ─────────────────────
      const nidAbandoned = `proc-abandonado-${docId}`
      if (doc.status === 'RASCUNHO' && (doc.updatedAt as string) < d30) {
        const days = Math.floor((now.getTime() - new Date(doc.updatedAt as string).getTime()) / 86400000)
        ops.push(prisma.notification.upsert({
          where:  { id: nidAbandoned },
          create: { id: nidAbandoned, type: 'PROC_ABANDONADO',
                    title: `Rascunho abandonado: ${docTitle}`,
                    message: `Sem atualizações há ${days} dias.`,
                    relatedType: 'procedure', relatedId: docId, isRead: false },
          update: { message: `Sem atualizações há ${days} dias.` },
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

// GET — sincroniza alertas de procedimentos e retorna todas as notificações
export async function GET() {
  await syncProcedureAlerts()
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(notifications)
}

// PATCH — marcar todas como lidas
export async function PATCH() {
  await prisma.notification.updateMany({
    where: { isRead: false },
    data:  { isRead: true },
  })
  return NextResponse.json({ ok: true })
}
