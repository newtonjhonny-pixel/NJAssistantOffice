import { NextResponse } from 'next/server'
import { prismaSqlite as prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'


export async function GET() {
  const now    = new Date()
  const d90    = new Date(now.getTime() - 90  * 24 * 3600 * 1000).toISOString()
  const d30    = new Date(now.getTime() - 30  * 24 * 3600 * 1000).toISOString()

  // â”€â”€ Docs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const docs = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, type, status, risks, description, title, createdAt, updatedAt FROM "ProcedureDocument"`
  )

  const total   = docs.length
  const vigente = docs.filter(d => d.status === 'VIGENTE').length
  const revisao = docs.filter(d => d.status === 'EM_REVISAO').length
  const rascunho= docs.filter(d => d.status === 'RASCUNHO').length
  const obsoleto= docs.filter(d => d.status === 'OBSOLETO').length

  // Docs em rascunho hÃ¡ mais de 30 dias (possÃ­vel abandono)
  const abandonados = docs.filter(d =>
    d.status === 'RASCUNHO' &&
    (d.updatedAt as string) < d30
  ).map(d => ({ id: d.id, title: d.title, type: d.type, updatedAt: d.updatedAt }))

  // â”€â”€ Riscos crÃ­ticos sem controles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const riscosCriticos: { docId: string; docTitle: string; risco: string }[] = []
  for (const doc of docs) {
    if (!doc.risks) continue
    try {
      const r = JSON.parse(doc.risks as string)
      if (r.__tipo !== 'RISCOS_CONTROLES') continue
      const criticos = (r.riscos ?? []).filter(
        (rk: Record<string, string>) => rk.severidade === 'CRITICO'
      )
      for (const c of criticos) {
        const hasControl = (r.controles ?? []).some(
          (ct: Record<string, string>) => ct.riscoId === c.id
        )
        if (!hasControl) {
          riscosCriticos.push({ docId: doc.id as string, docTitle: doc.title as string, risco: c.titulo })
        }
      }
    } catch { /* skip */ }
  }

  // â”€â”€ Treinamentos pendentes por documento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const treinamentos = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT "documentId", "filePath", "fileName" FROM "ProcedureAttachment"
     WHERE "fileType" LIKE '__treinamento__%'`
  )
  const pendentes = treinamentos.filter(t => {
    try {
      const fp = JSON.parse(t.filePath as string)
      return fp.status === 'PENDENTE' || fp.status === 'EM_ANDAMENTO'
    } catch { return false }
  })

  // Agrupar pendentes por documento
  const pendentesPorDoc: Record<string, { docId: string; docTitle: string; count: number }> = {}
  for (const t of pendentes) {
    const docId = t.documentId as string
    if (!pendentesPorDoc[docId]) {
      const d = docs.find(dd => dd.id === docId)
      pendentesPorDoc[docId] = { docId, docTitle: d?.title as string ?? docId, count: 0 }
    }
    pendentesPorDoc[docId].count++
  }

  // â”€â”€ Documentos vigentes sem leitura nos Ãºltimos 90 dias â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const leituras = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT "documentId", MAX("createdAt") as ultimaLeitura FROM "ProcedureHistory"
     WHERE action = 'LEITURA'
     GROUP BY "documentId"`
  )
  const leituraMap: Record<string, string> = {}
  for (const l of leituras) leituraMap[l.documentId as string] = l.ultimaLeitura as string

  const semLeitura = docs
    .filter(d => d.status === 'VIGENTE')
    .filter(d => {
      const ul = leituraMap[d.id as string]
      return !ul || ul < d90
    })
    .map(d => ({
      id: d.id, title: d.title, type: d.type,
      ultimaLeitura: leituraMap[d.id as string] ?? null,
    }))

  // â”€â”€ Score de conformidade geral â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // FÃ³rmula: base nos vigentes que tÃªm leitura recente e sem riscos crÃ­ticos abertos
  const vigentesSemProblema = vigente
    - semLeitura.length
    - riscosCriticos.length
  const score = total > 0
    ? Math.max(0, Math.round((vigentesSemProblema / Math.max(total, 1)) * 100))
    : 100

  return NextResponse.json({
    total,
    vigente,
    revisao,
    rascunho,
    obsoleto,
    score,
    alertas: {
      abandonados:       abandonados.slice(0, 10),
      riscosCriticos:    riscosCriticos.slice(0, 10),
      semLeitura:        semLeitura.slice(0, 10),
      treiamentosPendentes: Object.values(pendentesPorDoc).slice(0, 10),
    },
    treinamentosPendentesTotal: pendentes.length,
    semLeituraTotal:   semLeitura.length,
  })
}
