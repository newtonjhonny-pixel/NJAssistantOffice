import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, readFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID, createHash } from 'crypto'
import { ensureTimesheetSchema } from '../_utils'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface ParsedDay {
  date: string           // YYYY-MM-DD
  dateRaw: string        // DD/MM/YYYY
  dayOfWeek: number      // 0=Dom..6=Sáb
  dayLabel: string       // Seg, Ter, ...
  entry1: string | null
  exit1: string | null
  entry2: string | null
  exit2: string | null
  entry3: string | null
  exit3: string | null
  entry4: string | null
  exit4: string | null
  isBancoH: boolean
  bSaldo: string | null  // "+HH:MM" ou "-HH:MM" — apenas conferência
  punchCount: number
}

interface ParsedScheduleDay {
  dayOfWeek: number
  isWorked: boolean
  entry1: string | null
  exit1: string | null
  entry2: string | null
  exit2: string | null
  dailyMinutes: number
}

interface ParsedReport {
  empresa: string
  cnpj: string
  nome: string
  matricula: string
  cpf: string
  funcao: string
  departamento: string
  periodo: string
  periodoStart: string   // YYYY-MM-DD
  periodoEnd: string     // YYYY-MM-DD
  competence: string     // YYYY-MM
  schedule: ParsedScheduleDay[]
  days: ParsedDay[]
  bancoHCount: number
  bSaldoFinal: string    // último BSaldo do relatório
  totalPunches: number
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function hhmm2min(s: string | null | undefined): number {
  if (!s) return 0
  const m = s.match(/([+-]?)(\d{1,2}):(\d{2})/)
  if (!m) return 0
  const sign = m[1] === '-' ? -1 : 1
  return sign * (parseInt(m[2]) * 60 + parseInt(m[3]))
}

function ddmmyyyy2iso(s: string): string {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!m) return ''
  return `${m[3]}-${m[2]}-${m[1]}`
}

const DOW_MAP: Record<string, number> = {
  dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sáb: 6, sab: 6,
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}

function labelToDow(label: string): number {
  return DOW_MAP[label.toLowerCase().substring(0, 3)] ?? -1
}

// ─── PARSER PDF (Secullum) ────────────────────────────────────────────────────

function parsePdfText(text: string): ParsedReport {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Metadados básicos
  let empresa = '', cnpj = '', nome = '', matricula = '', cpf = ''
  let funcao = '', departamento = '', periodo = '', periodoStart = '', periodoEnd = ''

  for (const line of lines) {
    if (!empresa && line.length > 5 && !line.match(/^\d/) &&
        (line.toUpperCase() === line || line.match(/LTDA|S\.A\.|ME\b|EIRELI/i))) {
      empresa = line
    }
    const mCnpj = line.match(/CNPJ[:\s]+(\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2})/i)
    if (mCnpj) cnpj = mCnpj[1].replace(/\D/g, '')

    const mNome = line.match(/nome\s*:?\s*(.+)/i)
    if (mNome && !nome) nome = mNome[1].trim()

    const mMatr = line.match(/matr[íi]cula\s*:?\s*(\d+)/i)
    if (mMatr) matricula = mMatr[1]

    const mCpf = line.match(/CPF\s*:?\s*([\d.\-]+)/i)
    if (mCpf) cpf = mCpf[1].replace(/\D/g, '')

    const mFunc = line.match(/fun[çc][aã]o\s*:?\s*(.+)/i)
    if (mFunc && !funcao) funcao = mFunc[1].trim()

    const mDepto = line.match(/(?:depto|departamento|setor)\s*:?\s*(.+)/i)
    if (mDepto && !departamento) departamento = mDepto[1].trim()

    // período: "01/07/2026 a 31/07/2026" ou "Período: 01/07/2026 - 31/07/2026"
    const mPer = line.match(/(\d{2}\/\d{2}\/\d{4})\s*(?:a|[-–])\s*(\d{2}\/\d{2}\/\d{4})/i)
    if (mPer && !periodoStart) {
      periodoStart = ddmmyyyy2iso(mPer[1])
      periodoEnd   = ddmmyyyy2iso(mPer[2])
      periodo = `${mPer[1]} a ${mPer[2]}`
    }
  }

  // Competência a partir de periodoStart ou do primeiro dia encontrado
  let competence = periodoStart ? periodoStart.substring(0, 7) : ''

  // ─── Escala (HORÁRIO DE TRABALHO) ─────────────────────────────────────────
  const schedule: ParsedScheduleDay[] = Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    isWorked: i >= 1 && i <= 5,
    entry1: i >= 1 && i <= 5 ? '08:00' : null,
    exit1:  i >= 1 && i <= 5 ? '12:00' : null,
    entry2: i >= 1 && i <= 5 ? '13:00' : null,
    exit2:  i >= 1 && i <= 5 ? '17:00' : null,
    dailyMinutes: i >= 1 && i <= 5 ? 480 : 0,
  }))

  let inSchedule = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/hor[áa]rio\s*de\s*trabalho/i.test(line)) { inSchedule = true; continue }
    if (inSchedule && line.match(/^\d{2}\/\d{2}\/\d{4}/)) { inSchedule = false }
    if (!inSchedule) continue

    // Exemplo: "Seg Ter Qua Qui Sex: 07:42 - 12:00 / 13:00 - 17:30"
    // Ou: "Segunda a Sexta: 07:42 - 12:00 / 13:00 - 17:30"
    // Ou: "Sábado Dom: Folga"
    const timeRanges = Array.from(line.matchAll(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/g))
    const isFolga = /folga|descanso|—|--/i.test(line)

    // Identifica quais dias da semana esta linha se aplica
    const dayLabels = Array.from(line.matchAll(/\b(dom|seg|ter|qua|qui|sex|s[aá]b|segunda|ter[çc]a|quarta|quinta|sexta|s[aá]bado|domingo)\b/gi))
    const applicableDowsSet = new Set<number>()

    if (dayLabels.length >= 2) {
      // Pode ser um intervalo "Seg a Sex" ou lista
      const d1 = labelToDow(dayLabels[0][1])
      const d2 = labelToDow(dayLabels[dayLabels.length - 1][1])
      if (line.match(/\ba\b/i) && d1 >= 0 && d2 >= 0) {
        // Intervalo
        for (let d = d1; d <= d2; d++) applicableDowsSet.add(d)
      } else {
        dayLabels.forEach(m => { const d = labelToDow(m[1]); if (d >= 0) applicableDowsSet.add(d) })
      }
    } else if (dayLabels.length === 1) {
      const d = labelToDow(dayLabels[0][1])
      if (d >= 0) applicableDowsSet.add(d)
    }

    for (const dow of Array.from(applicableDowsSet)) {
      if (isFolga || timeRanges.length === 0) {
        schedule[dow] = { dayOfWeek: dow, isWorked: false, entry1: null, exit1: null, entry2: null, exit2: null, dailyMinutes: 0 }
      } else {
        const e1 = timeRanges[0]?.[1] ?? null
        const x1 = timeRanges[0]?.[2] ?? null
        const e2 = timeRanges[1]?.[1] ?? null
        const x2 = timeRanges[1]?.[2] ?? null
        let dm = 0
        if (e1 && x1) dm += hhmm2min(x1) - hhmm2min(e1)
        if (e2 && x2) dm += hhmm2min(x2) - hhmm2min(e2)
        schedule[dow] = { dayOfWeek: dow, isWorked: true, entry1: e1, exit1: x1, entry2: e2, exit2: x2, dailyMinutes: dm }
      }
    }
  }

  // ─── Dias / Batidas ────────────────────────────────────────────────────────
  const days: ParsedDay[] = []
  let bSaldoFinal = '+00:00'

  // Padrão: DD/MM/YYYY - [Dow] [tempos...] [BSaldo]
  // BSaldo pode aparecer como "+HH:MM" ou "-HH:MM" no final da linha
  const DAY_RE = /^(\d{2}\/\d{2}\/\d{4})\s*[-–]\s*(\w{2,5})\s+(.*)/

  for (const line of lines) {
    const m = line.match(DAY_RE)
    if (!m) continue

    const dateRaw = m[1]
    const dayLabel = m[2]
    const rest = m[3].trim()
    const isoDate = ddmmyyyy2iso(dateRaw)
    if (!isoDate) continue

    const dow = labelToDow(dayLabel)
    if (dow < 0) continue

    if (!competence) competence = isoDate.substring(0, 7)

    const isBancoH = /banco\s*h\b/i.test(rest)

    // Extrai todos os tokens HH:MM do resto
    const timeTokens = Array.from(rest.matchAll(/\b(\d{2}:\d{2})\b/g)).map(x => x[1])
    // BSaldo: token com sinal + ou - no final
    const bSaldoMatch = rest.match(/([+-]\d{2}:\d{2})\s*$/)
    const bSaldo = bSaldoMatch ? bSaldoMatch[1] : null
    if (bSaldo) bSaldoFinal = bSaldo

    // Remove o BSaldo dos timeTokens (o último token se tiver sinal)
    // Os tokens sem sinal são as batidas
    const batidas = timeTokens.filter(t => {
      if (!bSaldo) return true
      return t !== bSaldo.replace(/^[+-]/, '')
    })

    const entry1 = batidas[0] ?? null
    const exit1  = batidas[1] ?? null
    const entry2 = batidas[2] ?? null
    const exit2  = batidas[3] ?? null
    const entry3 = batidas[4] ?? null
    const exit3  = batidas[5] ?? null
    const entry4 = batidas[6] ?? null
    const exit4  = batidas[7] ?? null

    const punchCount = batidas.length

    days.push({
      date: isoDate,
      dateRaw,
      dayOfWeek: dow,
      dayLabel,
      entry1: isBancoH ? null : entry1,
      exit1:  isBancoH ? null : exit1,
      entry2: isBancoH ? null : entry2,
      exit2:  isBancoH ? null : exit2,
      entry3: isBancoH ? null : entry3,
      exit3:  isBancoH ? null : exit3,
      entry4: isBancoH ? null : entry4,
      exit4:  isBancoH ? null : exit4,
      isBancoH,
      bSaldo,
      punchCount: isBancoH ? 0 : punchCount,
    })
  }

  const bancoHCount = days.filter(d => d.isBancoH).length
  const totalPunches = days.reduce((s, d) => s + d.punchCount, 0)

  return {
    empresa,
    cnpj,
    nome,
    matricula,
    cpf,
    funcao,
    departamento,
    periodo,
    periodoStart,
    periodoEnd,
    competence,
    schedule,
    days,
    bancoHCount,
    bSaldoFinal,
    totalPunches,
  }
}

// ─── PARSER XLSX (Secullum / genérico) ───────────────────────────────────────

function parseXlsxBuffer(buf: Buffer): ParsedReport {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx')
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: false, raw: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Converte para texto e reutiliza o parser de PDF
  const lines: string[] = []
  for (const row of raw) {
    const cells = row.map((c: any) => {
      if (c === null || c === undefined || c === '') return ''
      if (typeof c === 'number') {
        // Detecta frações de tempo
        if (c > 0 && c < 1) {
          const totalMin = Math.round(c * 24 * 60)
          const h = Math.floor(totalMin / 60)
          const m = totalMin % 60
          return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
        }
        // Data serial Excel
        if (c > 40000 && c < 60000) {
          const d = XLSX.SSF.parse_date_code(c)
          if (d) return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`
        }
        return String(c)
      }
      return String(c)
    }).join(' ').trim()
    if (cells) lines.push(cells)
  }
  return parsePdfText(lines.join('\n'))
}

// ─── ROUTE ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureTimesheetSchema()
    const memberId = params.id

    // Recebe o arquivo via form-data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['pdf', 'xlsx', 'xls'].includes(ext)) {
      return NextResponse.json({ error: 'Formato não suportado. Use PDF ou XLSX.' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const hash = createHash('sha256').update(buf).digest('hex')

    // Salva temporariamente para pdf-parse (que aceita Buffer direto, sem escrita obrigatória)
    let report: ParsedReport

    if (ext === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
      const { text } = await pdfParse(buf)
      report = parsePdfText(text)
    } else {
      report = parseXlsxBuffer(buf)
    }

    // Fallback: usa o memberId para buscar dados do colaborador se não encontrado no arquivo
    if (!report.nome || !report.competence) {
      const members = await prisma.$queryRawUnsafe<any[]>(
        `SELECT m.name, m.id, m."companyId",
                cc.name AS companyName, cc.cnpj AS companyCnpj,
                m.registration, m.cpf
         FROM "TeamMember" m
         LEFT JOIN "ClientCompany" cc ON cc.id = m."companyId"
         WHERE m.id = ?`,
        memberId
      ).catch(() => [])
      if (members.length) {
        const mb = members[0]
        if (!report.nome) report.nome = mb.name ?? ''
        if (!report.empresa) report.empresa = mb.companyName ?? ''
        if (!report.cnpj) report.cnpj = mb.companyCnpj ?? ''
        if (!report.matricula) report.matricula = mb.registration ?? ''
        if (!report.cpf) report.cpf = mb.cpf ?? ''
      }
    }

    // Competência a partir do período do relatório ou mês atual
    if (!report.competence) {
      const now = new Date()
      report.competence = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      fileHash: hash,
      report,
    })
  } catch (e: any) {
    console.error('[timesheet/import POST]', e)
    return NextResponse.json({ error: e.message ?? 'Erro ao processar arquivo.' }, { status: 500 })
  }
}
