/**
 * GET /api/importacoes/sessions/[id]/structure
 * Retorna a estrutura detectada do arquivo (metadata, regiões, cabeçalho, etc.)
 * para exibição no passo "Estrutura" do wizard.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureImportSchema, parseFile } from '../../../_utils'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureImportSchema()

    const sessions = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ImportSession" WHERE "id" = ?`, params.id
    )
    if (!sessions.length) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
    const session = sessions[0]

    // Tenta usar dados já parseados
    let metadata: Record<string, string> = {}
    let structure: unknown = null
    let headers: string[] = []
    let sampleRows: unknown[] = []

    try { metadata  = JSON.parse(session.metadataJson  ?? '{}') } catch { metadata = {} }
    try { structure = JSON.parse(session.structureJson ?? 'null') } catch { structure = null }
    try { headers   = JSON.parse(session.rawHeaders    ?? '[]') }  catch { headers = [] }
    try { sampleRows = JSON.parse(session.sampleJson   ?? '[]') }  catch { sampleRows = [] }

    // Se não há estrutura salva, re-parseia o arquivo
    if (!structure && session.filePath) {
      try {
        const filePath = join(process.cwd(), 'public', session.filePath)
        const buf = await readFile(filePath)
        const parsed = await parseFile(buf, session.fileType)
        metadata   = parsed.metadata ?? {}
        structure  = parsed.structure ?? null
        headers    = parsed.headers
        sampleRows = parsed.rows.slice(0, 5)

        // Persiste
        const now = new Date().toISOString()
        await prisma.$executeRawUnsafe(
          `UPDATE "ImportSession" SET "metadataJson" = ?, "structureJson" = ?, "rawHeaders" = ?, "sampleJson" = ?, "updatedAt" = ? WHERE "id" = ?`,
          JSON.stringify(metadata), JSON.stringify(structure),
          JSON.stringify(headers), JSON.stringify(sampleRows),
          now, params.id
        ).catch(() => {})
      } catch (err) {
        console.warn('[structure GET] parse error:', err)
      }
    }

    return NextResponse.json({ metadata, structure, headers, sampleRows })
  } catch (e) {
    console.error('[structure GET]', e)
    return NextResponse.json({ error: 'Erro ao obter estrutura' }, { status: 500 })
  }
}
