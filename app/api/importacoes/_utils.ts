/**
 * Central de Importações Inteligentes — Utilitários compartilhados
 * Prefixado com _ para não ser tratado como route pelo Next.js.
 */

import { prisma } from '@/lib/prisma-sqlite'
import { createHash } from 'crypto'

// ─── SCHEMA ──────────────────────────────────────────────────────────────────

export async function ensureImportSchema() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS "ImportSourceProfile" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "module" TEXT NOT NULL,
      "fileType" TEXT NOT NULL,
      "mappingJson" TEXT NOT NULL DEFAULT '[]',
      "sampleHeadersJson" TEXT NOT NULL DEFAULT '[]',
      "confidence" REAL NOT NULL DEFAULT 0,
      "usageCount" INTEGER NOT NULL DEFAULT 0,
      "lastUsedAt" TEXT,
      "active" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "ImportSession" (
      "id" TEXT PRIMARY KEY,
      "fileName" TEXT NOT NULL,
      "fileType" TEXT NOT NULL,
      "fileSize" INTEGER NOT NULL DEFAULT 0,
      "fileHash" TEXT NOT NULL,
      "filePath" TEXT NOT NULL,
      "module" TEXT NOT NULL,
      "sourceProfileId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDENTE',
      "totalRows" INTEGER NOT NULL DEFAULT 0,
      "validRows" INTEGER NOT NULL DEFAULT 0,
      "errorRows" INTEGER NOT NULL DEFAULT 0,
      "conflictRows" INTEGER NOT NULL DEFAULT 0,
      "importedRows" INTEGER NOT NULL DEFAULT 0,
      "aiConfidence" REAL,
      "mappingJson" TEXT,
      "rawHeaders" TEXT,
      "sampleJson" TEXT,
      "aiAnalysisJson" TEXT,
      "metadataJson" TEXT,
      "structureJson" TEXT,
      "errorMessage" TEXT,
      "userId" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "ImportRecord" (
      "id" TEXT PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "rowIndex" INTEGER NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'VALIDO',
      "memberId" TEXT,
      "companyId" TEXT,
      "sourceValuesJson" TEXT NOT NULL DEFAULT '{}',
      "mappedValuesJson" TEXT NOT NULL DEFAULT '{}',
      "importedEntityId" TEXT,
      "importedEntity" TEXT,
      "errorMessage" TEXT,
      "conflictType" TEXT,
      "conflictDetail" TEXT,
      "resolution" TEXT DEFAULT 'PENDENTE',
      "resolvedAt" TEXT,
      "createdAt" TEXT NOT NULL,
      FOREIGN KEY("sessionId") REFERENCES "ImportSession"("id") ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "ImportAuditLog" (
      "id" TEXT PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "recordId" TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "fieldName" TEXT NOT NULL,
      "oldValue" TEXT,
      "newValue" TEXT,
      "action" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      FOREIGN KEY("sessionId") REFERENCES "ImportSession"("id") ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "ImportConflict" (
      "id" TEXT PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "recordId" TEXT NOT NULL,
      "conflictType" TEXT NOT NULL,
      "description" TEXT,
      "existingValue" TEXT,
      "incomingValue" TEXT,
      "resolution" TEXT,
      "resolvedBy" TEXT,
      "resolvedAt" TEXT,
      "createdAt" TEXT NOT NULL,
      FOREIGN KEY("sessionId") REFERENCES "ImportSession"("id") ON DELETE CASCADE
    )`,
  ]

  // Adiciona colunas novas se ainda não existem
  const newCols = [
    `ALTER TABLE "ImportSession" ADD COLUMN "metadataJson" TEXT`,
    `ALTER TABLE "ImportSession" ADD COLUMN "structureJson" TEXT`,
    // Campos extras em TeamMember para importação
    `ALTER TABLE "TeamMember" ADD COLUMN "registration" TEXT`,
    `ALTER TABLE "TeamMember" ADD COLUMN "cpf" TEXT`,
  ]

  for (const sql of stmts) {
    try { await prisma.$executeRawUnsafe(sql) } catch { /* already exists */ }
  }
  for (const sql of newCols) {
    try { await prisma.$executeRawUnsafe(sql) } catch { /* already exists */ }
  }
}

// ─── HASH ────────────────────────────────────────────────────────────────────

export function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex').slice(0, 32)
}

// ─── MÓDULOS DISPONÍVEIS ─────────────────────────────────────────────────────

export const MODULES = [
  { id: 'PONTO_DIARIO',   label: 'Ponto Diário' },
  { id: 'COLABORADORES',  label: 'Colaboradores' },
  { id: 'FERIAS',         label: 'Férias' },
  { id: 'BANCO_HORAS',    label: 'Banco de Horas' },
  { id: 'TREINAMENTOS',   label: 'Treinamentos' },
  { id: 'OPERACIONAL',    label: 'Dados Operacionais' },
  { id: 'EMPRESAS',       label: 'Empresas' },
] as const

export type ModuleId = typeof MODULES[number]['id']

// ─── CAMPOS DO SISTEMA POR MÓDULO ────────────────────────────────────────────

export const SYSTEM_FIELDS: Record<ModuleId, { key: string; label: string; required?: boolean }[]> = {
  PONTO_DIARIO: [
    { key: 'cpf',            label: 'CPF do colaborador' },
    { key: 'nome',           label: 'Nome do colaborador' },
    { key: 'matricula',      label: 'Matrícula / Identificador' },
    { key: 'data',           label: 'Data (YYYY-MM-DD ou DD/MM/YYYY)', required: true },
    { key: 'entrada1',       label: 'Entrada 1 (HH:MM)' },
    { key: 'saida1',         label: 'Saída 1 (HH:MM)' },
    { key: 'entrada2',       label: 'Entrada 2 (HH:MM)' },
    { key: 'saida2',         label: 'Saída 2 (HH:MM)' },
    { key: 'entrada3',       label: 'Entrada 3 (HH:MM)' },
    { key: 'saida3',         label: 'Saída 3 (HH:MM)' },
    { key: 'entrada4',       label: 'Entrada 4 (HH:MM)' },
    { key: 'saida4',         label: 'Saída 4 (HH:MM)' },
    { key: 'totalMinutos',   label: 'Total de minutos trabalhados' },
    { key: 'justificativa',  label: 'Justificativa / Ocorrência' },
    { key: 'observacoes',    label: 'Observações' },
  ],
  COLABORADORES: [
    { key: 'cpf',            label: 'CPF',                   required: true },
    { key: 'nome',           label: 'Nome completo',         required: true },
    { key: 'cargo',          label: 'Cargo' },
    { key: 'setor',          label: 'Setor' },
    { key: 'unidade',        label: 'Unidade' },
    { key: 'email',          label: 'E-mail' },
    { key: 'telefone',       label: 'Telefone' },
    { key: 'dataAdmissao',   label: 'Data de admissão' },
    { key: 'status',         label: 'Status (ATIVO/INATIVO)' },
    { key: 'empresa',        label: 'Empresa' },
    { key: 'observacoes',    label: 'Observações' },
  ],
  FERIAS: [
    { key: 'cpf',              label: 'CPF',                   required: true },
    { key: 'nome',             label: 'Nome do colaborador' },
    { key: 'inicioAquisitivo', label: 'Início do período aquisitivo' },
    { key: 'fimAquisitivo',    label: 'Fim do período aquisitivo' },
    { key: 'inicioGozo',       label: 'Início do gozo',        required: true },
    { key: 'fimGozo',          label: 'Fim do gozo',           required: true },
    { key: 'diasFerias',       label: 'Dias de férias' },
    { key: 'abono',            label: 'Abono pecuniário (S/N)' },
    { key: 'diasAbono',        label: 'Dias de abono' },
    { key: 'status',           label: 'Status' },
    { key: 'observacoes',      label: 'Observações' },
  ],
  BANCO_HORAS: [
    { key: 'cpf',            label: 'CPF',                   required: true },
    { key: 'nome',           label: 'Nome do colaborador' },
    { key: 'competencia',    label: 'Competência (MM/YYYY)', required: true },
    { key: 'creditoMinutos', label: 'Crédito (minutos)' },
    { key: 'debitoMinutos',  label: 'Débito (minutos)' },
    { key: 'tipo',           label: 'Tipo (LANCAMENTO/AJUSTE)' },
    { key: 'responsavel',    label: 'Responsável' },
    { key: 'observacoes',    label: 'Observações' },
  ],
  TREINAMENTOS: [
    { key: 'cpf',            label: 'CPF',                   required: true },
    { key: 'nome',           label: 'Nome do colaborador' },
    { key: 'topico',         label: 'Tópico / Tema',         required: true },
    { key: 'objetivo',       label: 'Objetivo' },
    { key: 'dataPlano',      label: 'Data planejada' },
    { key: 'dataConclusao',  label: 'Data de conclusão' },
    { key: 'status',         label: 'Status' },
    { key: 'responsavel',    label: 'Responsável' },
    { key: 'resultado',      label: 'Resultado esperado' },
    { key: 'avaliacao',      label: 'Avaliação' },
    { key: 'observacoes',    label: 'Observações' },
  ],
  OPERACIONAL: [
    { key: 'empresa',        label: 'Empresa / Código',      required: true },
    { key: 'competencia',    label: 'Competência (MM/YYYY)', required: true },
    { key: 'saldoInicial',   label: 'Saldo inicial' },
    { key: 'admissoes',      label: 'Admissões' },
    { key: 'demissoes',      label: 'Demissões' },
    { key: 'transferencias', label: 'Transferências' },
    { key: 'saldoFinal',     label: 'Saldo final' },
    { key: 'observacoes',    label: 'Observações' },
  ],
  EMPRESAS: [
    { key: 'cnpj',           label: 'CNPJ',                  required: true },
    { key: 'nome',           label: 'Nome / Razão social',   required: true },
    { key: 'codigo',         label: 'Código interno' },
    { key: 'unidade',        label: 'Unidade' },
    { key: 'uf',             label: 'UF' },
    { key: 'municipio',      label: 'Município' },
    { key: 'observacoes',    label: 'Observações' },
  ],
}

// ─── TIPOS DO RESULTADO DE PARSE ─────────────────────────────────────────────

export interface ParsedFile {
  /** Cabeçalhos da tabela principal */
  headers: string[]
  /** Linhas de dados da tabela principal */
  rows: Record<string, string>[]
  /** Metadados extraídos (empresa, colaborador, período etc.) */
  metadata: Record<string, string>
  /** Estrutura detectada */
  structure: {
    sheetName: string
    reportType: string          // 'TABULAR' | 'FORMATTED_REPORT'
    headerRowIndex: number      // 0-based row where headers were found
    dataStartRow: number
    totalRows: number
    confidence: number
    regions: Array<{ type: string; rows: string; description: string }>
  }
  /** Texto bruto (PDF/DOCX) */
  rawText?: string
}

// ─── PARSER XLSX / XLS (SheetJS — robusto) ───────────────────────────────────

/** Converte valor numérico do Excel para HH:MM quando é horário (fração de dia) */
function excelNumToTime(v: number): string | null {
  // Frações de dia: 0 < v < 1  (ex: 0.5 = 12:00)
  // Também aceita v < 2 para horários com dia (ex: 1.5 = 36h = 12:00 do dia seguinte, raro)
  if (typeof v !== 'number') return null
  if (v >= 0 && v < 2) {
    const totalMin = Math.round((v % 1 === 0 && v === 0 ? 0 : v) * 24 * 60)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return null
}

/** Converte serial de data Excel para YYYY-MM-DD */
function excelSerialToDate(v: number): string | null {
  if (typeof v !== 'number' || v < 1) return null
  // Excel serial: dias desde 1900-01-01 (com bug do dia 29/fev/1900)
  const XLSX = require('xlsx')
  try {
    const formatted = XLSX.SSF.format('yyyy-mm-dd', v)
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) return formatted
  } catch { /* ignore */ }
  return null
}

/** Palavras-chave para detectar linha de cabeçalho de tabela de ponto */
const PONTO_HEADER_KEYWORDS = [
  'data', 'dia', 'entrada', 'saída', 'saida', 'ent.', 'saí.', 'sai.',
  'batida', 'marcação', 'marcacao', 'horas', 'saldo', 'bsaldo', 'b.saldo',
  'ent 1', 'ent. 1', 'sai. 1', 'saí. 1', 'h.ent', 'h.sai',
]

/** Outros tipos de cabeçalho */
const GENERIC_HEADER_KEYWORDS = [
  'nome', 'cpf', 'cnpj', 'código', 'codigo', 'empresa', 'competência',
  'competencia', 'matrícula', 'matricula', 'admissão', 'admissao',
  'crédito', 'credito', 'débito', 'debito', 'valor', 'total', 'período',
  'periodo', 'início', 'inicio', 'fim', 'status', 'situação',
]

function scoreHeaderRow(cells: string[]): number {
  if (!cells.length) return 0
  const normalized = cells.map(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  let score = 0
  for (const kw of PONTO_HEADER_KEYWORDS) {
    const kwN = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (normalized.some(c => c.includes(kwN))) score += 2
  }
  for (const kw of GENERIC_HEADER_KEYWORDS) {
    const kwN = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (normalized.some(c => c.includes(kwN))) score += 1
  }
  // Bonus: many cells on the same row
  if (cells.length >= 4) score += cells.length
  // Penalty: looks like a data row (has times/dates but no labels)
  const hasOnlyNumbers = normalized.every(c => /^[\d:\/\-\s]+$/.test(c))
  if (hasOnlyNumbers) score -= 5
  return score
}

/** Extrai pares rótulo:valor de linhas de metadados */
function extractMetadataFromRows(
  rows: Array<Array<{col: number; val: string}>>
): Record<string, string> {
  const meta: Record<string, string> = {}
  const LABEL_PATTERNS: Array<[RegExp, string]> = [
    [/^empresa$/i,          'empresa'],
    [/^cnpj$/i,             'cnpj'],
    [/^inscri/i,            'inscricao'],
    [/^nome$/i,             'nome'],
    [/^n[°º]\s*identificad/i, 'matricula'],
    [/^n[°º]\s*folha/i,     'folha'],
    [/^admiss/i,            'admissao'],
    [/^fun[cç]/i,           'funcao'],
    [/^departamento$/i,     'departamento'],
    [/^per[ií]odo/i,        'periodo'],
    [/^c\.?t\.?p\.?s/i,     'ctps'],
    [/^obs/i,               'observacao'],
  ]
  for (const rowCells of rows) {
    for (let i = 0; i < rowCells.length - 1; i++) {
      const label = rowCells[i]?.val?.trim() ?? ''
      const value = rowCells[i + 1]?.val?.trim() ?? ''
      if (!label || !value) continue
      for (const [pattern, key] of LABEL_PATTERNS) {
        if (pattern.test(label)) {
          meta[key] = value
          break
        }
      }
    }
    // Período na mesma célula: "Período: 01/07/2026 até 31/07/2026."
    for (const cell of rowCells) {
      const m = cell.val.match(/per[ií]odo[:\s]+(\d{2}\/\d{2}\/\d{4})\s*(?:até|a|–|-)\s*(\d{2}\/\d{2}\/\d{4})/i)
      if (m) { meta['periodoInicio'] = m[1]; meta['periodoFim'] = m[2] }
    }
  }
  return meta
}

/** Extrai horário de trabalho das colunas H/I do relatório */
function extractScheduleFromRows(
  rows: Array<Array<{col: number; val: string}>>
): Record<string, string> {
  const schedule: Record<string, string> = {}
  const DAYS: Array<[RegExp, string]> = [
    [/^seg/i, 'SEG'], [/^ter/i, 'TER'], [/^qua/i, 'QUA'],
    [/^qui/i, 'QUI'], [/^sex/i, 'SEX'], [/^s[aá]b/i, 'SAB'], [/^dom/i, 'DOM'],
  ]
  for (const rowCells of rows) {
    for (const [pattern, day] of DAYS) {
      const dayCell = rowCells.find(c => pattern.test(c.val.trim()))
      if (dayCell) {
        // Colunas vizinhas podem ter horários
        const times = rowCells
          .filter(c => c.col > dayCell.col && /^\d{1,2}:\d{2}$/.test(c.val.trim()))
          .map(c => c.val.trim())
        if (times.length >= 2) schedule[day] = times.join('–')
      }
    }
  }
  return schedule
}

export async function parseExcel(buf: Buffer): Promise<ParsedFile> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX = require('xlsx')

  const wb = XLSX.read(buf, {
    type: 'buffer',
    cellDates: false,
    cellText: false,
    raw: true,
  })

  const sheetName = wb.SheetNames[0] ?? 'Sheet1'
  const ws = wb.Sheets[sheetName]

  if (!ws || !ws['!ref']) {
    return {
      headers: [],
      rows: [],
      metadata: {},
      structure: {
        sheetName, reportType: 'EMPTY', headerRowIndex: -1,
        dataStartRow: -1, totalRows: 0, confidence: 0, regions: [],
      },
    }
  }

  const range = XLSX.utils.decode_range(ws['!ref'])
  const maxRow = range.e.r
  const maxCol = range.e.c

  // ── Lê todas as células em estrutura de linhas ─────────────────────────────
  type CellEntry = { col: number; val: string; rawVal: unknown; type: string }
  const allRows: CellEntry[][] = []

  for (let r = 0; r <= maxRow; r++) {
    const rowCells: CellEntry[] = []
    for (let c = 0; c <= maxCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = ws[addr]
      if (!cell) continue

      let val = ''
      const rawVal = cell.v

      if (rawVal == null || rawVal === '') continue

      const t = cell.t as string

      if (t === 'n') {
        // Número — pode ser horário, data ou número puro
        const num = rawVal as number
        const fmt = (cell.z as string) || ''

        // Detecta horário (fração de dia)
        if (num >= 0 && num < 2 && (fmt.includes(':') || fmt.includes('h') || fmt.includes('mm'))) {
          const time = excelNumToTime(num)
          val = time ?? String(num)
        } else if (num > 0 && num < 1) {
          // Sem formato mas claramente fração de dia
          val = excelNumToTime(num) ?? String(num)
        } else if (num >= 40000 && num < 50000 && (fmt.includes('d') || fmt.includes('y') || fmt.includes('m'))) {
          // Data serial
          val = excelSerialToDate(num) ?? String(num)
        } else {
          val = String(num)
        }
      } else if (t === 'd') {
        // Date object (quando cellDates:true, mas deixamos false para controle manual)
        val = String(rawVal)
      } else if (t === 'b') {
        val = rawVal ? 'true' : 'false'
      } else if (t === 'e') {
        val = '' // erro de fórmula — ignora
      } else {
        // texto ou fórmula com resultado de string
        if (typeof rawVal === 'object' && rawVal !== null && 'result' in (rawVal as object)) {
          val = String((rawVal as {result: unknown}).result ?? '')
        } else if (typeof rawVal === 'object' && rawVal !== null && 'richText' in (rawVal as object)) {
          const rt = (rawVal as {richText: Array<{text: string}>}).richText
          val = rt.map(p => p.text).join('')
        } else {
          val = String(rawVal)
        }
      }

      val = val.trim()
      if (val) rowCells.push({ col: c, val, rawVal, type: t })
    }
    allRows.push(rowCells)
  }

  // ── Detecta o tipo de planilha ─────────────────────────────────────────────
  // Heurística: se linha 1 tem vários tokens que parecem cabeçalho → TABULAR
  // Se tem títulos, rótulos e texto na parte superior → FORMATTED_REPORT

  const firstRowCells = allRows[0] ?? []
  const firstRowTexts = firstRowCells.map(c => c.val)
  const firstRowScore = scoreHeaderRow(firstRowTexts)

  // Escaneia as primeiras 40 linhas em busca do melhor cabeçalho
  let bestHeaderRow = -1
  let bestScore = 0
  const SCAN_LIMIT = Math.min(50, allRows.length)

  for (let r = 0; r < SCAN_LIMIT; r++) {
    const texts = allRows[r].map(c => c.val)
    if (texts.length < 2) continue
    const score = scoreHeaderRow(texts)
    if (score > bestScore) { bestScore = score; bestHeaderRow = r }
  }

  const isTabular = firstRowScore >= 6 && bestHeaderRow === 0
  const reportType = isTabular ? 'TABULAR' : 'FORMATTED_REPORT'

  // ── Extrai metadados (sempre, mesmo em planilhas tabulares) ───────────────
  const metaRows = allRows.slice(0, bestHeaderRow >= 0 ? bestHeaderRow : 20)
  const metadata = extractMetadataFromRows(metaRows)
  const schedule = extractScheduleFromRows(metaRows)
  if (Object.keys(schedule).length) metadata['horario'] = JSON.stringify(schedule)

  // Período a partir do título se não encontrado nos rótulos
  if (!metadata['periodoInicio']) {
    for (const rowCells of metaRows) {
      for (const cell of rowCells) {
        const m = cell.val.match(/(\d{2}\/\d{2}\/\d{4})\s*(?:até|a|-|–)\s*(\d{2}\/\d{2}\/\d{4})/i)
        if (m) { metadata['periodoInicio'] = m[1]; metadata['periodoFim'] = m[2] }
      }
    }
  }

  // ── Cabeçalhos e dados ────────────────────────────────────────────────────
  let headers: string[] = []
  const rows: Record<string, string>[] = []

  if (bestHeaderRow >= 0) {
    headers = allRows[bestHeaderRow].map(c => c.val)

    // Dados começam na linha após o cabeçalho
    // Mas pula linhas de "Totais" que possam vir logo após
    const dataStart = bestHeaderRow + 1
    for (let r = dataStart; r < allRows.length; r++) {
      const rowCells = allRows[r]
      if (!rowCells.length) continue

      // Pula linhas de totais/rodapé
      const firstVal = rowCells[0]?.val ?? ''
      if (/^totai[s]?$/i.test(firstVal) || /^total$/i.test(firstVal)) continue

      // Mapeia células para cabeçalhos (por posição de coluna)
      const obj: Record<string, string> = {}
      let hasContent = false
      for (const cell of rowCells) {
        // Encontra o cabeçalho correspondente à coluna
        const headerIdx = allRows[bestHeaderRow].findIndex(h => h.col === cell.col)
        const headerName = headerIdx >= 0 ? headers[headerIdx] : `col_${cell.col}`
        obj[headerName] = cell.val
        hasContent = true
      }
      if (hasContent) rows.push(obj)
    }
  }

  // ── Detecta regiões ───────────────────────────────────────────────────────
  const regions: ParsedFile['structure']['regions'] = []
  if (reportType === 'FORMATTED_REPORT') {
    if (metaRows.some(r => r.length > 0)) {
      regions.push({ type: 'METADADOS', rows: `1–${bestHeaderRow}`, description: 'Cabeçalho do relatório (empresa, colaborador, período)' })
    }
    if (bestHeaderRow >= 0) {
      regions.push({ type: 'CABECALHO_TABELA', rows: `${bestHeaderRow + 1}`, description: `Cabeçalho da tabela de dados (${headers.join(', ')})` })
    }
    if (rows.length > 0) {
      regions.push({ type: 'DADOS', rows: `${bestHeaderRow + 2}–${bestHeaderRow + 1 + rows.length}`, description: `${rows.length} linha(s) de dados` })
    }
    // Detecta totais
    const totalRow = allRows.findIndex((r, i) => i > bestHeaderRow && r.some(c => /^totai?s?$/i.test(c.val)))
    if (totalRow >= 0) regions.push({ type: 'TOTAIS', rows: `${totalRow + 1}`, description: 'Linha de totais' })
  }

  const confidence = bestScore > 0
    ? Math.min(1, (bestScore / 20) + (Object.keys(metadata).length > 3 ? 0.2 : 0))
    : 0

  return {
    headers,
    rows,
    metadata,
    structure: {
      sheetName,
      reportType,
      headerRowIndex: bestHeaderRow,
      dataStartRow: bestHeaderRow + 1,
      totalRows: rows.length,
      confidence,
      regions,
    },
  }
}

// ─── PARSER CSV ──────────────────────────────────────────────────────────────

export function parseCsv(buf: Buffer): ParsedFile {
  const text = buf.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = text.split('\n').filter(l => l.trim())
  if (!lines.length) return { headers: [], rows: [], metadata: {}, structure: { sheetName: 'CSV', reportType: 'EMPTY', headerRowIndex: -1, dataStartRow: -1, totalRows: 0, confidence: 0, regions: [] } }

  const sample = lines[0]
  const delimiter = sample.split(';').length > sample.split(',').length ? ';'
    : sample.split('\t').length > 2 ? '\t' : ','

  function parseLine(line: string): string[] {
    const result: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ; continue }
      if (!inQ && c === delimiter) { result.push(cur.trim()); cur = ''; continue }
      cur += c
    }
    result.push(cur.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i])
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => { obj[h] = vals[idx] ?? '' })
    if (Object.values(obj).some(v => v !== '')) rows.push(obj)
  }

  return {
    headers,
    rows,
    metadata: {},
    structure: { sheetName: 'CSV', reportType: 'TABULAR', headerRowIndex: 0, dataStartRow: 1, totalRows: rows.length, confidence: 0.9, regions: [] },
  }
}

// ─── PARSER PDF ──────────────────────────────────────────────────────────────

export async function parsePdf(buf: Buffer): Promise<ParsedFile> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse/lib/pdf-parse.js')
    const data = await pdfParse(buf)
    const rawText = (data.text as string) || ''

    // Extrai metadados do texto
    const metaLines = rawText.split('\n').map(l => l.trim()).filter(l => l)
    const metadata: Record<string, string> = {}

    for (const line of metaLines.slice(0, 30)) {
      const match = line.match(/^([^:]{3,40}):\s*(.{1,100})$/)
      if (match) metadata[match[1].trim().toLowerCase()] = match[2].trim()
      const periodo = line.match(/(\d{2}\/\d{2}\/\d{4})\s*(?:a|até|-)\s*(\d{2}\/\d{2}\/\d{4})/i)
      if (periodo) { metadata['periodoInicio'] = periodo[1]; metadata['periodoFim'] = periodo[2] }
    }

    // Tenta detectar tabela
    let bestHeaderRow = -1
    let bestScore = 0
    for (let i = 0; i < Math.min(metaLines.length, 40); i++) {
      const cols = metaLines[i].split(/\s{2,}|\t/).map(s => s.trim()).filter(s => s)
      const score = scoreHeaderRow(cols)
      if (score > bestScore) { bestScore = score; bestHeaderRow = i }
    }

    let headers: string[] = []
    const rows: Record<string, string>[] = []

    if (bestHeaderRow >= 0) {
      headers = metaLines[bestHeaderRow].split(/\s{2,}|\t/).map(s => s.trim()).filter(s => s)
      for (let i = bestHeaderRow + 1; i < metaLines.length; i++) {
        const vals = metaLines[i].split(/\s{2,}|\t/).map(s => s.trim())
        if (vals.length < 2) continue
        const obj: Record<string, string> = {}
        headers.forEach((h, idx) => { obj[h] = vals[idx] ?? '' })
        rows.push(obj)
      }
    }

    return {
      headers,
      rows,
      metadata,
      rawText: rawText.slice(0, 8000),
      structure: {
        sheetName: 'PDF',
        reportType: bestHeaderRow > 0 ? 'FORMATTED_REPORT' : 'TABULAR',
        headerRowIndex: bestHeaderRow,
        dataStartRow: bestHeaderRow + 1,
        totalRows: rows.length,
        confidence: bestScore / 20,
        regions: [],
      },
    }
  } catch {
    return { headers: [], rows: [], metadata: {}, rawText: '', structure: { sheetName: 'PDF', reportType: 'EMPTY', headerRowIndex: -1, dataStartRow: -1, totalRows: 0, confidence: 0, regions: [] } }
  }
}

// ─── PARSER DOCX ─────────────────────────────────────────────────────────────

export async function parseDocx(buf: Buffer): Promise<ParsedFile> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ buffer: buf })
    const rawText = (result.value as string) || ''
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l)

    let bestHeaderRow = -1, bestScore = 0
    for (let i = 0; i < Math.min(lines.length, 40); i++) {
      const cols = lines[i].split(/\t|\s{2,}/).map(s => s.trim()).filter(s => s)
      const score = scoreHeaderRow(cols)
      if (score > bestScore) { bestScore = score; bestHeaderRow = i }
    }

    let headers: string[] = []
    const rows: Record<string, string>[] = []
    const metadata: Record<string, string> = {}

    if (bestHeaderRow >= 0) {
      headers = lines[bestHeaderRow].split(/\t|\s{2,}/).map(s => s.trim()).filter(s => s)
      for (let i = bestHeaderRow + 1; i < lines.length; i++) {
        const vals = lines[i].split(/\t|\s{2,}/).map(s => s.trim())
        if (vals.length < 2) continue
        const obj: Record<string, string> = {}
        headers.forEach((h, idx) => { obj[h] = vals[idx] ?? '' })
        rows.push(obj)
      }
      for (const line of lines.slice(0, bestHeaderRow)) {
        const m = line.match(/^([^:]{3,40}):\s*(.{1,100})$/)
        if (m) metadata[m[1].trim().toLowerCase()] = m[2].trim()
      }
    }

    return {
      headers, rows, metadata, rawText: rawText.slice(0, 8000),
      structure: { sheetName: 'DOCX', reportType: bestHeaderRow > 0 ? 'FORMATTED_REPORT' : 'TABULAR', headerRowIndex: bestHeaderRow, dataStartRow: bestHeaderRow + 1, totalRows: rows.length, confidence: bestScore / 20, regions: [] },
    }
  } catch {
    return { headers: [], rows: [], metadata: {}, structure: { sheetName: 'DOCX', reportType: 'EMPTY', headerRowIndex: -1, dataStartRow: -1, totalRows: 0, confidence: 0, regions: [] } }
  }
}

// ─── DISPATCH PARSER ─────────────────────────────────────────────────────────

export async function parseFile(buf: Buffer, ext: string): Promise<ParsedFile> {
  if (ext === '.xlsx' || ext === '.xls') return parseExcel(buf)
  if (ext === '.csv') return parseCsv(buf)
  if (ext === '.pdf') return parsePdf(buf)
  if (ext === '.docx') return parseDocx(buf)
  throw new Error(`Formato não suportado: ${ext}`)
}

// ─── NORMALIZAÇÃO DE DATA ─────────────────────────────────────────────────────

export function normalizeDate(v: string): string | null {
  if (!v) return null
  // Remove sufixo "- Qua", "- Seg" etc. (cartão ponto Secullum/Ahgora)
  const cleaned = v.replace(/\s*[-–]\s*[A-Za-zÀ-ÿ]{3,10}\s*$/, '').trim()
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
    const [d, m, y] = cleaned.split('/')
    return `${y}-${m}-${d}`
  }
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(cleaned)) {
    const [d, m, y] = cleaned.split('-')
    return `${y}-${m}-${d}`
  }
  return null
}

// ─── NORMALIZAÇÃO DE HORÁRIO ──────────────────────────────────────────────────

export function normalizeTime(v: string): string | null {
  if (!v) return null
  const s = v.trim()
  // Já é HH:MM
  const m = s.match(/^(\d{1,2})[:\h](\d{2})/)
  if (!m) return null
  return `${String(m[1]).padStart(2, '0')}:${m[2]}`
}

// ─── CALL IA — ANÁLISE DE MAPEAMENTO ─────────────────────────────────────────
// A IA NÃO escreve no banco. Recebe apenas cabeçalhos + amostra + módulo.

export async function analyzeWithAI(
  headers: string[],
  sampleRows: Record<string, string>[],
  moduleId: ModuleId,
  metadata: Record<string, string>,
  savedProfiles: { name: string; mappingJson: string }[]
): Promise<{
  fieldMappings: { source: string; system: string | null; confidence: number; notes: string }[]
  overallConfidence: number
  detectedLayout: string
  suggestions: string
}> {
  const systemFields = SYSTEM_FIELDS[moduleId]
  const sampleStr = JSON.stringify(sampleRows.slice(0, 5), null, 2)
  const metaStr = Object.keys(metadata).length
    ? `\nMetadados extraídos do relatório:\n${JSON.stringify(metadata, null, 2)}`
    : ''
  const profilesStr = savedProfiles.length
    ? `\nPerfis salvos similares:\n${savedProfiles.map(p => `- ${p.name}: ${p.mappingJson}`).join('\n')}`
    : ''

  const prompt = `Você é especialista em mapeamento de dados para sistemas de RH brasileiro.

Módulo alvo: ${moduleId}
Campos disponíveis no sistema:
${systemFields.map(f => `- ${f.key}: ${f.label}${f.required ? ' (OBRIGATÓRIO)' : ''}`).join('\n')}

Cabeçalhos detectados no arquivo:
${JSON.stringify(headers)}

Amostra dos dados (até 5 linhas):
${sampleStr}
${metaStr}
${profilesStr}

Instruções específicas:
- "Ent. 1", "Ent.1", "H.Ent", "Entrada 1" → entrada1
- "Saí. 1", "Saí.1", "Sai. 1", "H.Sai" → saida1
- "BSaldo", "B.Saldo", "Saldo" → NÃO mapear automaticamente (campo auxiliar, verificar)
- Data com sufixo de dia ("01/07/2026 - Qua") → data (extrair somente a data)
- Horários em formato HH:MM → manter como string
- Identificador/Matrícula → matricula

Responda APENAS com JSON válido (sem markdown):
{
  "fieldMappings": [
    { "source": "coluna_do_arquivo", "system": "campo_do_sistema_ou_null", "confidence": 0.95, "notes": "motivo" }
  ],
  "overallConfidence": 0.87,
  "detectedLayout": "descrição do layout detectado",
  "suggestions": "sugestões ou avisos"
}`

  try {
    const OpenAI = (await import('openai')).default
    const client = new OpenAI()
    // gpt-5 não aceita temperature nem max_tokens — usa max_completion_tokens
    const resp = await client.chat.completions.create({
      model: 'gpt-5',
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 2000,
    })
    const content = resp.choices[0]?.message?.content ?? '{}'
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return buildHeuristicMapping(headers, systemFields)
  }
}

function buildHeuristicMapping(
  headers: string[],
  systemFields: { key: string; label: string }[]
): ReturnType<typeof analyzeWithAI> extends Promise<infer T> ? T : never {
  const norm = (s: string) => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim()

  // Mapeamento heurístico direto para campos de ponto
  const DIRECT: Record<string, string> = {
    'ent 1': 'entrada1', 'ent. 1': 'entrada1', 'entrada 1': 'entrada1', 'entrada1': 'entrada1', 'h ent': 'entrada1',
    'sai 1': 'saida1', 'sai. 1': 'saida1', 'saida 1': 'saida1', 'saida1': 'saida1', 'saí 1': 'saida1', 'saí. 1': 'saida1',
    'ent 2': 'entrada2', 'ent. 2': 'entrada2', 'entrada 2': 'entrada2', 'entrada2': 'entrada2',
    'sai 2': 'saida2', 'sai. 2': 'saida2', 'saida 2': 'saida2', 'saida2': 'saida2', 'saí 2': 'saida2', 'saí. 2': 'saida2',
    'ent 3': 'entrada3', 'ent. 3': 'entrada3', 'entrada 3': 'entrada3',
    'sai 3': 'saida3', 'sai. 3': 'saida3', 'saida 3': 'saida3', 'saí 3': 'saida3',
    'data': 'data', 'dia': 'data',
    'cpf': 'cpf', 'nome': 'nome',
    'matricula': 'matricula', 'no identificador': 'matricula', 'n identificador': 'matricula',
  }

  const fieldMappings = headers.map(h => {
    const hn = norm(h)
    // Mapeamento direto
    if (DIRECT[hn]) {
      return { source: h, system: DIRECT[hn], confidence: 0.92, notes: 'Mapeamento direto por palavra-chave' }
    }
    // BSaldo e variações → auxiliar, não mapear automaticamente
    if (/bsaldo|b\.saldo|saldo/i.test(h)) {
      return { source: h, system: null as any, confidence: 0, notes: 'Campo auxiliar — verifique o significado antes de mapear' }
    }
    // Busca parcial nos campos do sistema
    const match = systemFields.find(f =>
      norm(f.key).includes(hn) || hn.includes(norm(f.key)) ||
      norm(f.label).includes(hn) || hn.includes(norm(f.label).split(' ')[0])
    )
    return {
      source: h,
      system: match?.key ?? null as any,
      confidence: match ? 0.6 : 0,
      notes: match ? 'Mapeamento heurístico parcial' : 'Não mapeado — revise manualmente',
    }
  })

  const mapped = fieldMappings.filter(f => f.system).length
  return {
    fieldMappings,
    overallConfidence: mapped / Math.max(headers.length, 1),
    detectedLayout: 'Layout detectado por heurística (modo offline)',
    suggestions: 'Revise os mapeamentos antes de importar.',
  }
}
