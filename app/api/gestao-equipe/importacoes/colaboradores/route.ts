/**
 * POST /api/gestao-equipe/importacoes/colaboradores
 * Parseia arquivo(s) XLSX/XLS/CSV, aplica mapeamento heurístico e retorna preview
 * com ação por colaborador (criar | atualizar | duplicado | erro).
 *
 * Não grava nada no banco — use /confirm para efetivar.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { parseFile } from '@/app/api/importacoes/_utils'
import { extname } from 'path'

export const dynamic = 'force-dynamic'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface ColaboradorPreview {
  nome: string
  matricula: string
  cpf: string
  email: string
  cargo: string
  departamento: string
  empresa: string
  unidade: string
  admissao: string
  jornada: string
  status: string
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
  'cpf':               'cpf',
  'nome':              'nome',
  'nome completo':     'nome',
  'colaborador':       'nome',
  'cargo':             'cargo',
  'funcao':            'cargo',
  'funcao cargo':      'cargo',
  'setor':             'setor',
  'departamento':      'setor',
  'dept':              'setor',
  'unidade':           'unidade',
  'filial':            'unidade',
  'email':             'email',
  'e mail':            'email',
  'correio':           'email',
  'telefone':          'telefone',
  'celular':           'telefone',
  'fone':              'telefone',
  'matricula':         'matricula',
  'no identificador':  'matricula',
  'n identificador':   'matricula',
  'cod':               'matricula',
  'codigo':            'matricula',
  'admissao':          'dataAdmissao',
  'data admissao':     'dataAdmissao',
  'dt admissao':       'dataAdmissao',
  'ingresso':          'dataAdmissao',
  'status':            'status',
  'situacao':          'status',
  'ativo':             'status',
  'empresa':           'empresa',
  'razao social':      'empresa',
  'jornada':           'jornada',
  'carga horaria':     'jornada',
  'observacoes':       'observacoes',
  'obs':               'observacoes',
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

function normCpf(v: string): string {
  return (v ?? '').replace(/\D/g, '')
}

function toPreview(m: Record<string, string>, cpfRaw: string): Omit<ColaboradorPreview, '_action' | '_erros'> {
  return {
    nome:         m.nome         ?? '',
    matricula:    m.matricula    ?? '',
    cpf:          cpfRaw,
    email:        m.email        ?? '',
    cargo:        m.cargo        ?? '',
    departamento: m.setor        ?? '',
    empresa:      m.empresa      ?? '',
    unidade:      m.unidade      ?? '',
    admissao:     m.dataAdmissao ?? '',
    jornada:      m.jornada      ?? '',
    status:       m.status       ?? 'ATIVO',
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
        return NextResponse.json({ error: `Formato não suportado: ${ext}. Use XLSX, XLS ou CSV.` }, { status: 400 })
      const buf    = Buffer.from(await file.arrayBuffer())
      const parsed = await parseFile(buf, ext)
      const mapped = applyMapping(parsed.headers, parsed.rows)
      allMapped.push(...mapped)
    }

    const colaboradores: ColaboradorPreview[] = []
    let criar = 0, atualizar = 0, duplicado = 0, erros = 0
    const seenCpfs = new Set<string>()
    const seenMats = new Set<string>()

    for (const m of allMapped) {
      const cpfRaw = m.cpf ?? ''
      const cpf    = normCpf(cpfRaw)
      const mat    = m.matricula?.trim() ?? ''
      const errosList: string[] = []

      if (!m.nome?.trim())              errosList.push('Nome obrigatório')
      if (!cpf && !mat)                 errosList.push('CPF ou matrícula obrigatório')
      if (cpf && cpf.length !== 11)     errosList.push(`CPF inválido (${cpf.length} dígitos): ${cpfRaw}`)

      if (errosList.length) {
        erros++
        colaboradores.push({ ...toPreview(m, cpfRaw), _action: 'erro', _erros: errosList })
        continue
      }

      // Duplicata dentro do arquivo
      const dupKey = cpf || mat
      if (cpf && seenCpfs.has(cpf)) {
        duplicado++
        colaboradores.push({ ...toPreview(m, cpfRaw), _action: 'duplicado', _erros: ['CPF duplicado no arquivo'] })
        continue
      }
      if (mat && seenMats.has(mat)) {
        duplicado++
        colaboradores.push({ ...toPreview(m, cpfRaw), _action: 'duplicado', _erros: ['Matrícula duplicada no arquivo'] })
        continue
      }
      if (cpf) seenCpfs.add(cpf)
      if (mat) seenMats.add(mat)

      // Verifica no banco
      let existingId: string | null = null
      if (cpf) {
        const r = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "id" FROM "TeamMember" WHERE "cpf"=? LIMIT 1`, cpf
        )
        if (r.length) existingId = r[0].id
      }
      if (!existingId && mat) {
        const r = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "id" FROM "TeamMember" WHERE "registration"=? LIMIT 1`, mat
        )
        if (r.length) existingId = r[0].id
      }

      if (existingId) {
        atualizar++
        colaboradores.push({ ...toPreview(m, cpfRaw), _action: 'atualizar', _erros: [] })
      } else {
        criar++
        colaboradores.push({ ...toPreview(m, cpfRaw), _action: 'criar', _erros: [] })
      }
    }

    return NextResponse.json({ preview: { colaboradores, criar, atualizar, duplicado, erros } })
  } catch (e: any) {
    console.error('[importacoes/colaboradores POST]', e)
    return NextResponse.json({ error: e.message ?? 'Erro ao processar arquivo' }, { status: 500 })
  }
}
