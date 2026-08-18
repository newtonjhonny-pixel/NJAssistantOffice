/**
 * POST /api/gestao-equipe/importacoes/empresas
 * Parseia arquivo(s) XLSX/XLS/CSV, detecta empresas e retorna preview
 * com ação: criar | atualizar | duplicado | erro.
 *
 * Não grava nada — use /confirm para efetivar.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { parseFile } from '@/app/api/importacoes/_utils'
import { extname } from 'path'

export const dynamic = 'force-dynamic'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface EmpresaPreview {
  codigo: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  segmento: string
  tipo: string
  municipio: string
  uf: string
  situacao: string
  _action: 'criar' | 'atualizar' | 'duplicado' | 'erro'
  _erros: string[]
}

// ─── MAPEAMENTO HEURÍSTICO ────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim()
}

const COL_MAP: Record<string, string> = {
  'cnpj':              'cnpj',
  'razao social':      'razaoSocial',
  'razao':             'razaoSocial',
  'empresa':           'razaoSocial',
  'nome':              'razaoSocial',
  'nome fantasia':     'nomeFantasia',
  'fantasia':          'nomeFantasia',
  'codigo':            'codigo',
  'cod':               'codigo',
  'cod empresa':       'codigo',
  'segmento':          'segmento',
  'ramo':              'segmento',
  'atividade':         'segmento',
  'tipo':              'tipo',
  'matriz filial':     'tipo',
  'tipo estabelecimento': 'tipo',
  'municipio':         'municipio',
  'cidade':            'municipio',
  'uf':                'uf',
  'estado':            'uf',
  'sigla':             'uf',
  'situacao':          'situacao',
  'status':            'situacao',
  'ativo':             'situacao',
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

function normCnpj(v: string): string {
  return (v ?? '').replace(/\D/g, '')
}

function toPreview(m: Record<string, string>): Omit<EmpresaPreview, '_action' | '_erros'> {
  return {
    codigo:       m.codigo      ?? '',
    razaoSocial:  m.razaoSocial ?? '',
    nomeFantasia: m.nomeFantasia ?? '',
    cnpj:         m.cnpj        ?? '',
    segmento:     m.segmento    ?? '',
    tipo:         m.tipo        ?? '',
    municipio:    m.municipio   ?? '',
    uf:           m.uf          ?? '',
    situacao:     m.situacao    ?? 'ATIVO',
  }
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

    const empresas: EmpresaPreview[] = []
    let criar = 0, atualizar = 0, duplicado = 0, erros = 0
    const seenCnpjs  = new Set<string>()
    const seenCodigos = new Set<string>()

    for (const m of allMapped) {
      const cnpjRaw = m.cnpj ?? ''
      const cnpj    = normCnpj(cnpjRaw)
      const codigo  = m.codigo?.trim() ?? ''
      const errosList: string[] = []

      if (!m.razaoSocial?.trim()) errosList.push('Razão Social obrigatória')
      if (!cnpj && !codigo)       errosList.push('CNPJ ou código obrigatório')
      if (cnpj && cnpj.length !== 14) errosList.push(`CNPJ inválido (${cnpj.length} dígitos)`)

      if (errosList.length) {
        erros++
        empresas.push({ ...toPreview(m), cnpj: cnpjRaw, _action: 'erro', _erros: errosList })
        continue
      }

      // Duplicata no arquivo
      if (cnpj && seenCnpjs.has(cnpj)) {
        duplicado++
        empresas.push({ ...toPreview(m), cnpj: cnpjRaw, _action: 'duplicado', _erros: ['CNPJ duplicado no arquivo'] })
        continue
      }
      if (cnpj) seenCnpjs.add(cnpj)
      if (codigo) seenCodigos.add(codigo)

      // Verifica no banco
      let exists = false
      if (cnpj) {
        const r = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "id" FROM "ClientCompany" WHERE "cnpj"=? LIMIT 1`, cnpj
        )
        exists = r.length > 0
      }
      if (!exists && codigo) {
        const r = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "id" FROM "ClientCompany" WHERE "code"=? LIMIT 1`, codigo
        )
        exists = r.length > 0
      }

      if (exists) {
        atualizar++
        empresas.push({ ...toPreview(m), cnpj: cnpjRaw, _action: 'atualizar', _erros: [] })
      } else {
        criar++
        empresas.push({ ...toPreview(m), cnpj: cnpjRaw, _action: 'criar', _erros: [] })
      }
    }

    return NextResponse.json({ preview: { empresas, criar, atualizar, duplicado, erros } })
  } catch (e: any) {
    console.error('[importacoes/empresas POST]', e)
    return NextResponse.json({ error: e.message ?? 'Erro ao processar arquivo' }, { status: 500 })
  }
}
