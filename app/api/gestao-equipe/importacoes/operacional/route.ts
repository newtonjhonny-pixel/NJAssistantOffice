/**
 * POST /api/gestao-equipe/importacoes/operacional
 * Parseia arquivo(s) XLSX/XLS/CSV com headcount / movimentações por empresa e competência.
 *
 * Aceita:
 *  - Resumido: Empresa | Competência | Ativos CLT | Aprendizes | Estagiários | Afastados
 *  - Com movimentações: + Admissões | Demissões (ou Rescisões) | Entradas | Saídas | Afastamentos novos | Retornos
 *
 * Não grava nada — use /confirm para efetivar.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { parseFile } from '@/app/api/importacoes/_utils'
import { extname } from 'path'

export const dynamic = 'force-dynamic'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface HeadcountLinha {
  empresa: string
  competencia: string
  ativosClt: number
  aprendizes: number
  estagiarios: number
  afastados: number
  admissoes: number
  rescisoes: number
  entradas: number
  saidas: number
  afastamentosNovos: number
  retornos: number
  _action: 'criar' | 'atualizar' | 'erro'
  _erros: string[]
}

// ─── MAPEAMENTO HEURÍSTICO ────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim()
}

const COL_MAP: Record<string, string> = {
  'empresa':            'empresa',
  'cod empresa':        'empresa',
  'codigo empresa':     'empresa',
  'nome empresa':       'empresa',
  'competencia':        'competencia',
  'mes':                'competencia',
  'periodo':            'competencia',
  'ativos clt':         'ativosClt',
  'clt':                'ativosClt',
  'efetivo':            'ativosClt',
  'ativos':             'ativosClt',
  'qtd':                'ativosClt',
  'headcount':          'ativosClt',
  'aprendizes':         'aprendizes',
  'jovens aprendizes':  'aprendizes',
  'estagiarios':        'estagiarios',
  'estagio':            'estagiarios',
  'afastados':          'afastados',
  'afastamentos':       'afastados',
  'admissoes':          'admissoes',
  'entradas':           'admissoes',
  'rescisoes':          'rescisoes',
  'demissoes':          'rescisoes',
  'saidas':             'rescisoes',
  'transferencias entrada': 'entradas',
  'transf entrada':     'entradas',
  'transferencias saida':   'saidas',
  'transf saida':       'saidas',
  'retornos':           'retornos',
  'afastamentos novos': 'afastamentosNovos',
  'novos afastamentos': 'afastamentosNovos',
}

function applyMapping(headers: string[], rows: Record<string, string>[]) {
  const colMap: Record<string, string> = {}
  for (const h of headers) {
    const hn = norm(h)
    if (COL_MAP[hn]) colMap[h] = COL_MAP[hn]
  }
  return rows.map(row => {
    const mapped: Record<string, string> = {}
    for (const [col, sysKey] of Object.entries(colMap)) {
      if (row[col] !== undefined) mapped[sysKey] = row[col] ?? ''
    }
    return mapped
  })
}

function int0(v: string | undefined): number {
  const n = parseInt(v ?? '0', 10)
  return isNaN(n) ? 0 : n
}

// Normaliza competência para MM/YYYY
function normCompetencia(v: string): string | null {
  if (!v?.trim()) return null
  // YYYY-MM
  const ym = v.match(/^(\d{4})-(\d{2})$/)
  if (ym) return `${ym[2]}/${ym[1]}`
  // MM/YYYY
  if (/^\d{2}\/\d{4}$/.test(v)) return v
  // MM-YYYY
  const my = v.match(/^(\d{2})-(\d{4})$/)
  if (my) return `${my[1]}/${my[2]}`
  return v
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files    = formData.getAll('files') as File[]

    if (!files.length)
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })

    const allMapped: Record<string, string>[] = []

    for (const file of files) {
      const ext = extname(file.name).toLowerCase()
      if (!['.xlsx', '.xls', '.csv'].includes(ext))
        return NextResponse.json({ error: `Formato não suportado: ${ext}.` }, { status: 400 })
      const buf    = Buffer.from(await file.arrayBuffer())
      const parsed = await parseFile(buf, ext)
      const mapped = applyMapping(parsed.headers, parsed.rows)
      allMapped.push(...mapped)
    }

    const linhas: HeadcountLinha[] = []
    let criar = 0, atualizar = 0, erros = 0

    for (const m of allMapped) {
      const empresa     = m.empresa?.trim()     ?? ''
      const competencia = normCompetencia(m.competencia?.trim() ?? '') ?? ''
      const errosList: string[] = []

      if (!empresa)     errosList.push('Empresa obrigatória')
      if (!competencia) errosList.push('Competência obrigatória')

      if (errosList.length) {
        erros++
        linhas.push({
          empresa, competencia,
          ativosClt: 0, aprendizes: 0, estagiarios: 0, afastados: 0,
          admissoes: 0, rescisoes: 0, entradas: 0, saidas: 0,
          afastamentosNovos: 0, retornos: 0,
          _action: 'erro', _erros: errosList,
        })
        continue
      }

      // Verifica se já existe snapshot
      let companyId: string | null = null
      const co = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id" FROM "ClientCompany" WHERE lower("code")=lower(?) OR lower("name")=lower(?) LIMIT 1`,
        empresa, empresa
      )
      if (co.length) companyId = co[0].id

      let existsSnapshot = false
      if (companyId) {
        // Normaliza competência para comparação: MM/YYYY → YYYY-MM ou vice-versa
        const compParts = competencia.match(/^(\d{2})\/(\d{4})$/)
        const compDb = compParts ? `${compParts[2]}-${compParts[1]}` : competencia
        const snap = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "id" FROM "CompanyOperationalSnapshot"
           WHERE "companyId"=? AND ("competence"=? OR "competence"=?) LIMIT 1`,
          companyId, competencia, compDb
        )
        existsSnapshot = snap.length > 0
      }

      const linha: HeadcountLinha = {
        empresa, competencia,
        ativosClt:          int0(m.ativosClt),
        aprendizes:         int0(m.aprendizes),
        estagiarios:        int0(m.estagiarios),
        afastados:          int0(m.afastados),
        admissoes:          int0(m.admissoes),
        rescisoes:          int0(m.rescisoes),
        entradas:           int0(m.entradas),
        saidas:             int0(m.saidas),
        afastamentosNovos:  int0(m.afastamentosNovos),
        retornos:           int0(m.retornos),
        _action: existsSnapshot ? 'atualizar' : 'criar',
        _erros: companyId ? [] : ['Empresa não encontrada no sistema — será ignorada na importação'],
      }

      if (existsSnapshot) atualizar++
      else criar++

      linhas.push(linha)
    }

    return NextResponse.json({ preview: { linhas, criar, atualizar, erros } })
  } catch (e: any) {
    console.error('[importacoes/operacional POST]', e)
    return NextResponse.json({ error: e.message ?? 'Erro ao processar arquivo' }, { status: 500 })
  }
}
