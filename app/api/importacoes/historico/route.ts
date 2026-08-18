/**
 * GET  /api/importacoes/historico
 * Histórico unificado — agrega ImportSession (sistema geral) + PontoLote (sistema de ponto).
 *
 * DELETE /api/importacoes/historico?id=xxx&fonte=session|ponto
 * Exclui lotes/sessões ainda não importadas.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureImportSchema } from '../_utils'

export const dynamic = 'force-dynamic'

// Labels amigáveis por status (sistema antigo)
const SESSION_STATUS_LABEL: Record<string, string> = {
  PENDENTE:           'Pendente',
  ANALISANDO:         'Analisando',
  AGUARDANDO_REVISAO: 'Aguardando revisão',
  IMPORTANDO:         'Importando',
  CONCLUIDO:          'Concluído',
  ERRO:               'Erro',
  REVERTIDO:          'Revertido',
}

const SESSION_STATUS_COLOR: Record<string, string> = {
  PENDENTE:           'bg-gray-100 text-gray-600',
  ANALISANDO:         'bg-blue-100 text-blue-700',
  AGUARDANDO_REVISAO: 'bg-amber-100 text-amber-700',
  IMPORTANDO:         'bg-indigo-100 text-indigo-700',
  CONCLUIDO:          'bg-green-100 text-green-700',
  ERRO:               'bg-red-100 text-red-700',
  REVERTIDO:          'bg-gray-100 text-gray-500',
}

// Labels por módulo
const MODULE_LABEL: Record<string, string> = {
  PONTO_DIARIO:  'Ponto Diário',
  COLABORADORES: 'Colaboradores',
  FERIAS:        'Férias',
  BANCO_HORAS:   'Banco de Horas',
  TREINAMENTOS:  'Treinamentos',
  OPERACIONAL:   'Dados Operacionais',
  EMPRESAS:      'Empresas',
  PONTO:         'Importação de Ponto',
}

export async function GET(req: NextRequest) {
  try {
    await ensureImportSchema()

    const { searchParams } = new URL(req.url)
    const tipo   = searchParams.get('tipo') ?? ''     // '' = todos; 'PONTO' = só ponto; 'session' = só sessions
    const limit  = Math.min(Number(searchParams.get('limit')  ?? 100), 200)
    const offset = Number(searchParams.get('offset') ?? 0)

    // ── ImportSession (sistema geral) ──────────────────────────────────────────
    let sessions: any[] = []
    if (tipo !== 'PONTO') {
      let where = '1=1'
      const args: unknown[] = []
      if (tipo && tipo !== 'session') { where += ' AND s."module" = ?'; args.push(tipo) }

      sessions = await prisma.$queryRawUnsafe<any[]>(`
        SELECT
          'session'     AS fonte,
          s."id",
          s."fileName"  AS arquivo,
          s."module"    AS tipo,
          s."status",
          s."fileSize",
          COALESCE(s."totalRows",    (SELECT COUNT(*) FROM "ImportRecord" r WHERE r."sessionId"=s."id")) AS encontrados,
          COALESCE(s."importedRows", (SELECT COUNT(*) FROM "ImportRecord" r WHERE r."sessionId"=s."id" AND r."status"='IMPORTADO')) AS importados,
          COALESCE(s."conflictRows", (SELECT COUNT(*) FROM "ImportRecord" r WHERE r."sessionId"=s."id" AND r."status"='CONFLITO'))  AS conflitos,
          COALESCE(s."errorRows",    (SELECT COUNT(*) FROM "ImportRecord" r WHERE r."sessionId"=s."id" AND r."status"='INVALIDO'))  AS erros,
          s."createdAt" AS data
        FROM "ImportSession" s
        WHERE ${where}
        ORDER BY s."createdAt" DESC
        LIMIT ? OFFSET ?
      `, ...args, limit, offset)
    }

    // ── PontoLote (sistema de ponto) ───────────────────────────────────────────
    let lotes: any[] = []
    if (tipo === '' || tipo === 'PONTO') {
      try {
        lotes = await prisma.$queryRawUnsafe<any[]>(`
          SELECT
            'ponto'  AS fonte,
            p."id",
            p."code" AS arquivo,
            'PONTO'  AS tipo,
            CASE p."status"
              WHEN 'IMPORTADO'    THEN 'CONCLUIDO'
              WHEN 'PROCESSANDO'  THEN 'IMPORTANDO'
              ELSE p."status"
            END AS status,
            0                                                       AS fileSize,
            COALESCE(p."totalCollaboradores", 0)                    AS encontrados,
            COALESCE(p."totalCollaboradores",0) - COALESCE(p."totalRejeitados",0) AS importados,
            COALESCE(p."totalConflitos",   0)                       AS conflitos,
            COALESCE(p."totalRejeitados",  0)                       AS erros,
            p."createdAt" AS data
          FROM "PontoLote" p
          ORDER BY p."createdAt" DESC
          LIMIT ? OFFSET ?
        `, limit, offset)
      } catch { /* tabela ainda não existe — ignora */ }
    }

    // ── Mescla e ordena por data ───────────────────────────────────────────────
    const all = [...sessions, ...lotes]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, limit)
      .map(r => {
        const status = String(r.status ?? 'PENDENTE')
        return {
          id:          r.id,
          fonte:       r.fonte,
          arquivo:     r.arquivo ?? '—',
          tipo:        MODULE_LABEL[r.tipo] ?? r.tipo ?? '—',
          tipoId:      r.tipo,
          status,
          statusLabel: SESSION_STATUS_LABEL[status] ?? status,
          statusColor: SESSION_STATUS_COLOR[status]  ?? 'bg-gray-100 text-gray-600',
          encontrados: Number(r.encontrados ?? 0),
          importados:  Number(r.importados  ?? 0),
          conflitos:   Number(r.conflitos   ?? 0),
          erros:       Number(r.erros       ?? 0),
          fileSize:    Number(r.fileSize    ?? 0),
          data:        r.data ?? '',
          // Pode excluir: sessão não concluída / lote não importado
          podeExcluir: r.fonte === 'session'
            ? !['CONCLUIDO', 'REVERTIDO', 'IMPORTANDO'].includes(status)
            : !['CONCLUIDO', 'IMPORTADO'].includes(status),
          // Pode reverter: sessão concluída / lote importado
          podeReverter: r.fonte === 'session'
            ? status === 'CONCLUIDO'
            : status === 'CONCLUIDO',  // mapeado de IMPORTADO acima
        }
      })

    return NextResponse.json({ entries: all, total: all.length })
  } catch (e) {
    console.error('[importacoes/historico GET]', e)
    return NextResponse.json({ error: 'Erro ao carregar histórico' }, { status: 500 })
  }
}

// DELETE /api/importacoes/historico?id=xxx&fonte=session|ponto
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id    = searchParams.get('id')
    const fonte = searchParams.get('fonte') ?? 'session'

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    if (fonte === 'ponto') {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "status" FROM "PontoLote" WHERE "id"=?`, id
      )
      if (!rows.length) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
      if (rows[0].status === 'IMPORTADO') {
        return NextResponse.json(
          { error: 'Lote já importado. Use o endpoint de revert para desfazer.' },
          { status: 409 }
        )
      }
      await prisma.$executeRawUnsafe(`DELETE FROM "PontoLote" WHERE "id"=?`, id)
    } else {
      await ensureImportSchema()
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "status" FROM "ImportSession" WHERE "id"=?`, id
      )
      if (!rows.length) return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
      if (rows[0].status === 'CONCLUIDO') {
        return NextResponse.json(
          { error: 'Sessão concluída. Use o revert para desfazer a importação.' },
          { status: 409 }
        )
      }
      // ON DELETE CASCADE cuida de ImportRecord, ImportAuditLog, ImportConflict
      await prisma.$executeRawUnsafe(`DELETE FROM "ImportSession" WHERE "id"=?`, id)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[importacoes/historico DELETE]', e)
    return NextResponse.json({ error: 'Erro ao excluir entrada' }, { status: 500 })
  }
}
