import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureImportSchema, analyzeWithAI, SYSTEM_FIELDS, ModuleId, parseFile } from '../../../_utils'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

// POST /api/importacoes/sessions/[id]/analyze
// Envia cabeçalhos + amostra para a IA e retorna mapeamento sugerido.
// A IA NÃO escreve no banco — apenas analisa.
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureImportSchema()

    const sessions = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ImportSession" WHERE "id" = ?`, params.id
    )
    if (!sessions.length) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
    const session = sessions[0]

    if (!['PENDENTE', 'AGUARDANDO_REVISAO'].includes(session.status))
      return NextResponse.json({ error: `Sessão não pode ser analisada (status: ${session.status})` }, { status: 409 })

    const now = new Date().toISOString()

    // Atualiza status para ANALISANDO
    await prisma.$executeRawUnsafe(
      `UPDATE "ImportSession" SET "status" = 'ANALISANDO', "updatedAt" = ? WHERE "id" = ?`,
      now, params.id
    )

    // Carrega cabeçalhos e amostra (do arquivo ou da sessão já salva)
    let headers: string[] = JSON.parse(session.rawHeaders ?? '[]')
    let sampleRows: Record<string, string>[] = JSON.parse(session.sampleJson ?? '[]')

    let metadata: Record<string, string> = {}
    let structure: unknown = null

    // Se não temos amostra, re-lê o arquivo (parser novo retorna estrutura completa)
    if (session.filePath) {
      try {
        const filePath = join(process.cwd(), 'public', session.filePath)
        const buf = await readFile(filePath)
        const parsed = await parseFile(buf, session.fileType)
        if (parsed.headers.length > headers.length) {
          headers    = parsed.headers
          sampleRows = parsed.rows.slice(0, 5)
        }
        metadata  = parsed.metadata ?? {}
        structure = parsed.structure ?? null

        // Persiste metadados e estrutura
        await prisma.$executeRawUnsafe(
          `UPDATE "ImportSession" SET "metadataJson" = ?, "structureJson" = ?, "rawHeaders" = ?, "sampleJson" = ?, "updatedAt" = ? WHERE "id" = ?`,
          JSON.stringify(metadata), JSON.stringify(structure),
          JSON.stringify(parsed.headers), JSON.stringify(parsed.rows.slice(0, 5)),
          now, params.id
        ).catch(() => {})
      } catch { /* arquivo removido */ }
    } else {
      // Tenta usar o que já está salvo
      try { metadata  = JSON.parse(session.metadataJson  ?? '{}') } catch { metadata = {} }
      try { structure = JSON.parse(session.structureJson ?? 'null') } catch { structure = null }
    }

    if (!headers.length)
      return NextResponse.json({ error: 'Não foi possível extrair cabeçalhos do arquivo. Verifique se o formato é suportado e se o arquivo contém uma tabela de dados.' }, { status: 422 })

    // Perfis salvos similares ao módulo
    const profiles = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "name","mappingJson" FROM "ImportSourceProfile"
       WHERE "module" = ? AND "active" = 1 ORDER BY "usageCount" DESC LIMIT 3`,
      session.module
    )

    // Chama IA (cabeçalhos + amostra + módulo — sem dados completos do arquivo)
    const aiResult = await analyzeWithAI(
      headers,
      sampleRows,
      session.module as ModuleId,
      metadata,
      profiles
    )

    // Salva resultado da IA na sessão
    await prisma.$executeRawUnsafe(`
      UPDATE "ImportSession" SET
        "status" = 'AGUARDANDO_REVISAO',
        "aiConfidence" = ?,
        "mappingJson" = ?,
        "aiAnalysisJson" = ?,
        "rawHeaders" = ?,
        "sampleJson" = ?,
        "updatedAt" = ?
      WHERE "id" = ?
    `,
      aiResult.overallConfidence,
      JSON.stringify(aiResult.fieldMappings),
      JSON.stringify(aiResult),
      JSON.stringify(headers),
      JSON.stringify(sampleRows),
      new Date().toISOString(),
      params.id
    )

    return NextResponse.json({
      ...aiResult,
      headers,
      sampleRows,
      metadata,
      structure,
      systemFields: SYSTEM_FIELDS[session.module as ModuleId],
    })
  } catch (e) {
    console.error('[importacoes analyze POST]', e)
    // Reverte status
    await prisma.$executeRawUnsafe(
      `UPDATE "ImportSession" SET "status" = 'PENDENTE', "updatedAt" = ? WHERE "id" = ?`,
      new Date().toISOString(), params.id
    ).catch(() => {})
    return NextResponse.json({ error: 'Erro ao analisar arquivo' }, { status: 500 })
  }
}
