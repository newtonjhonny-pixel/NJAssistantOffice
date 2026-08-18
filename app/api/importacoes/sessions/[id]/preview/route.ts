import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureImportSchema, parseFile, normalizeDate, normalizeTime, SYSTEM_FIELDS, ModuleId } from '../../../_utils'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

// POST /api/importacoes/sessions/[id]/preview
// Valida as primeiras N linhas com o mapeamento aprovado — SEM escrever no banco.
// Body: { limit?: number (default 20) }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureImportSchema()
    const body = await req.json().catch(() => ({}))
    const previewLimit = Number(body.limit ?? 20)

    const sessions = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ImportSession" WHERE "id" = ?`, params.id
    )
    if (!sessions.length) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
    const session = sessions[0]

    if (!session.mappingJson)
      return NextResponse.json({ error: 'Nenhum mapeamento configurado. Execute a análise primeiro.' }, { status: 400 })

    const mappings: { source: string; system: string | null }[] = JSON.parse(session.mappingJson)

    // Lê o arquivo
    const filePath = join(process.cwd(), 'public', session.filePath)
    const buf = await readFile(filePath)
    const { rows } = await parseFile(buf, session.fileType)

    const systemFields = SYSTEM_FIELDS[session.module as ModuleId] ?? []
    const requiredFields = systemFields.filter(f => f.required).map(f => f.key)

    // Metadados do relatório injetados em cada linha (para relatórios mono-pessoa)
    let sessionMetadata: Record<string, string> = {}
    try { sessionMetadata = JSON.parse(session.metadataJson ?? '{}') } catch { sessionMetadata = {} }
    const METADATA_FIELD_MAP: Record<string, string> = {
      nome: 'nome', matricula: 'matricula', cpf: 'cpf', empresa: 'empresa', cnpj: 'cnpj',
    }

    const previewRows = rows.slice(0, previewLimit).map((row, i) => {
      // Injeta metadados e aplica mapeamento de colunas
      const mapped: Record<string, string> = {}
      for (const [k, v] of Object.entries(METADATA_FIELD_MAP)) {
        if (sessionMetadata[k]) mapped[v] = sessionMetadata[k]
      }
      for (const m of mappings) {
        if (m.system && m.source && row[m.source] !== undefined) {
          mapped[m.system] = row[m.source] ?? ''
        }
      }

      // Normaliza datas e horários
      for (const k of Object.keys(mapped)) {
        if (k === 'data' || k.includes('Data') || k.includes('data') || k === 'inicioGozo' || k === 'fimGozo' ||
            k === 'inicioAquisitivo' || k === 'fimAquisitivo' || k === 'dataAdmissao' || k === 'dataPlano' || k === 'dataConclusao') {
          const norm = normalizeDate(mapped[k])
          if (norm) mapped[k] = norm
        }
        if (['entrada1','saida1','entrada2','saida2','entrada3','saida3','entrada4','saida4'].includes(k)) {
          const norm = normalizeTime(mapped[k])
          if (norm) mapped[k] = norm
        }
      }

      // Valida campos obrigatórios
      const errors: string[] = []
      for (const req of requiredFields) {
        if (!mapped[req]?.trim()) errors.push(`Campo obrigatório "${req}" não mapeado ou vazio`)
      }

      const status = errors.length ? 'INVALIDO' : 'VALIDO'

      return {
        rowIndex: i + 2, // +2 porque linha 1 é cabeçalho
        status,
        sourceValues: row,
        mappedValues: mapped,
        errors,
      }
    })

    const valid    = previewRows.filter(r => r.status === 'VALIDO').length
    const invalid  = previewRows.filter(r => r.status === 'INVALIDO').length
    const total    = rows.length

    return NextResponse.json({ previewRows, valid, invalid, total, totalRows: total })
  } catch (e) {
    console.error('[importacoes preview POST]', e)
    return NextResponse.json({ error: 'Erro ao gerar preview' }, { status: 500 })
  }
}
