/**
 * /api/gestao-equipe/importacoes-ponto
 *
 * GET  — lista todos os lotes de importação de ponto
 * POST — faz parse de 1..N arquivos e devolve preview do lote (sem gravar nada)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { ensureTimesheetSchema } from '../members/[id]/timesheet/_utils'
import { prisma } from '@/lib/prisma-sqlite'
import { parsePdfBuffer } from '@/lib/imports/parsers/pdfParser'

export const dynamic = 'force-dynamic'

// ─── Tipos compartilhados ─────────────────────────────────────────────────────

export interface ParsedDay {
  date: string; dayOfWeek: number; dayLabel: string
  entry1: string | null; exit1: string | null
  entry2: string | null; exit2: string | null
  entry3: string | null; exit3: string | null
  entry4: string | null; exit4: string | null
  isBancoH: boolean; bSaldo: string | null; punchCount: number
}

export interface ParsedScheduleDay {
  dayOfWeek: number; isWorked: boolean
  entry1: string | null; exit1: string | null
  entry2: string | null; exit2: string | null
  dailyMinutes: number
}

export interface ParsedColaborador {
  // dados extraídos do cartão
  empresa: string; cnpj: string
  nome: string; matricula: string; cpf: string
  funcao: string; departamento: string
  periodo: string; periodoStart: string; periodoEnd: string; competence: string
  schedule: ParsedScheduleDay[]
  days: ParsedDay[]
  bancoHCount: number; bSaldoFinal: string; totalPunches: number
  // vínculo com o sistema
  memberId: string | null
  memberName: string | null
  status: 'pronto' | 'nao_encontrado' | 'conflito'
  // fonte
  fileName: string; fileHash: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hhmm2min(s: string | null | undefined): number {
  if (!s) return 0
  const m = s.match(/([+-]?)(\d{1,2}):(\d{2})/)
  if (!m) return 0
  return (m[1] === '-' ? -1 : 1) * (parseInt(m[2]) * 60 + parseInt(m[3]))
}

function ddmmyyyy2iso(s: string): string {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ''
}

const DOW_MAP: Record<string, number> = {
  dom:0,seg:1,ter:2,qua:3,qui:4,sex:5,'sáb':6,sab:6,
  sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,
  domingo:0,segunda:1,'terça':2,quarta:3,quinta:4,sexta:5,'sábado':6,sabado:6,
}
function labelToDow(label: string): number {
  return DOW_MAP[label.toLowerCase().replace(/[^a-záéíóúã]/g, '')] ?? -1
}

// ─── Parser de bloco de texto de um colaborador (formato Secullum) ────────────
//
// O Secullum gera PDF com layout de tabela onde labels e valores ficam em linhas
// separadas (a extração de texto do PDF rompe a relação label→valor da mesma linha).
// Estratégia: extração por padrão (regex no texto completo) + heurísticas por linha.

// Labels conhecidos do Secullum que NÃO são nomes/empresas
const SECULLUM_LABELS = new Set([
  'NOME:', 'EMPRESA:', 'CNPJ:', 'INSCRIÇÃO:', 'C.T.P.S.:', 'Nº FOLHA:',
  'FUNÇÃO:', 'DEPARTAMENTO:', 'OBSERVAÇÃO:', 'CPF:', 'ADMISSÃO:',
  'CNPJ: INSCRIÇÃO:', 'FUNÇÃO: DEPARTAMENTO:', 'CPF: ADMISSÃO:',
  'DIA', 'DATA', 'ENTRADA 1', 'SAÍDA 1', 'ENTRADA 2', 'SAÍDA 2',
  'ENTRADA 3', 'SAÍDA 3', 'BSALDO', 'TOTAIS',
])

function isSecullumLabel(line: string): boolean {
  if (SECULLUM_LABELS.has(line)) return true
  if (/^(nome|empresa|cnpj|cpf|fun[çc][aã]o|departamento|depto|setor|matr[íi]cula|n[ºo°]\s*folha|observa[çc][aã]o|admiss[aã]o|inscri[çc][aã]o|c\.t\.p\.s|horario|horário|cartao|cartão|secullum|emitido|www\.|página|pagina|data\s+entrada|entrada\s+\d|saída\s+\d|saida\s+\d|bsaldo|totais)\b/i.test(line)) return true
  return false
}

function parseColaboradorBlock(text: string, fileName: string, fileHash: string): ParsedColaborador {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // ── 1. Extração por padrão regex (independente de layout) ─────────────────

  // Período: "Período: DD/MM/YYYY até DD/MM/YYYY"
  let periodoStart = '', periodoEnd = '', periodo = '', competence = ''
  const perMatch = text.match(/[Pp]er[íi]odo[:\s]+(\d{2}\/\d{2}\/\d{4})\s*(?:até|ate|a|[-–])\s*(\d{2}\/\d{2}\/\d{4})/)
  if (perMatch) {
    periodoStart = ddmmyyyy2iso(perMatch[1])
    periodoEnd   = ddmmyyyy2iso(perMatch[2])
    periodo      = `${perMatch[1]} a ${perMatch[2]}`
    competence   = periodoStart.substring(0, 7)
  }

  // CPF: padrão XXX.XXX.XXX-XX em qualquer linha
  const cpfMatch = text.match(/\b(\d{3})\.(\d{3})\.(\d{3})-(\d{2})\b/)
  const cpf = cpfMatch ? `${cpfMatch[1]}${cpfMatch[2]}${cpfMatch[3]}${cpfMatch[4]}` : ''

  // CNPJ: padrão XX.XXX.XXX/XXXX-XX
  const cnpjMatch = text.match(/\b(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})-(\d{2})\b/)
  const cnpj = cnpjMatch ? `${cnpjMatch[1]}${cnpjMatch[2]}${cnpjMatch[3]}${cnpjMatch[4]}${cnpjMatch[5]}` : ''

  // Departamento: pode vir na linha do período "Departamento: X"
  let departamento = ''
  const deptInPer = text.match(/[Dd]epartamento[:\s]+([^\.\n\r]+)/)
  if (deptInPer) departamento = deptInPer[1].trim()

  // ── 2. Extração heurística por linha ──────────────────────────────────────
  let nome = '', empresa = '', funcao = '', matricula = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.length < 2) continue
    if (isSecullumLabel(line)) continue
    if (/^\d{2}\/\d{2}\/\d{4}/.test(line)) continue // linha de data
    if (/\d{2}:\d{2}/.test(line)) continue            // linha com horário
    if (/www\.|@|\.com\.br|secullum/i.test(line)) continue
    if (/^\([\*\^¨]\)/.test(line)) continue            // legenda
    if (/_{5,}/.test(line)) continue                   // linhas de assinatura

    // Nº FOLHA: próximo número longo na sequência
    if (/n[ºo°°]?\s*folha/i.test(line) && !matricula) {
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        if (/^\d{5,}$/.test(lines[j].trim())) {
          matricula = lines[j].trim().replace(/^0+/, '') || lines[j].trim() // remove zeros à esquerda
          break
        }
      }
      continue
    }

    // Linha só com dígitos longos (matrícula autônoma)
    if (/^\d{5,15}$/.test(line) && !matricula) {
      matricula = line.replace(/^0+/, '') || line
      continue
    }

    // Linha com FUNÇÃO e DEPARTAMENTO juntos (Secullum junta na mesma linha às vezes)
    const funcDept = line.match(/^([A-ZÁÉÍÓÚÃÕÇ][^0-9]{3,}?)\s{3,}([A-ZÁÉÍÓÚÃÕÇ].{2,})$/)
    if (funcDept && !funcao) {
      funcao = funcDept[1].trim()
      if (!departamento) departamento = funcDept[2].trim()
      continue
    }

    // Empresa: contém palavra-chave de PJ
    if (/LTDA|S\.A\.|EIRELI|ME\b|EPP\b|CIA\.|INDUSTRIA|COMERCIO|COMERCIAL|SERVICOS|DIESEL|CONSTRU|TRANS|LOGIS/i.test(line)) {
      if (!empresa) empresa = line
      continue
    }

    // Nome: linha toda em maiúsculas com 2+ palavras, não é label conhecido
    const isAllCaps = line === line.toUpperCase() && /^[A-ZÁÉÍÓÚÃÕÇÀÂÊÔÜ\s\-\.]+$/.test(line)
    const wordCount = line.trim().split(/\s+/).length
    if (isAllCaps && wordCount >= 2 && line.length >= 5 && !isSecullumLabel(line)) {
      if (!nome) {
        nome = line
      }
      continue
    }

    // Função sem Departamento (linha mista maiúsc/minúsc após labels de função)
    if (!funcao && line.length > 4 && /^[A-ZÁÉÍÓÚÃÕÇ]/.test(line) && wordCount <= 6) {
      const prevLabel = i > 0 ? lines[i - 1] : ''
      if (/fun[çc][aã]o/i.test(prevLabel)) {
        funcao = line
        continue
      }
    }
  }

  // Fallback: tenta extrair nome de linha mista (nome com inicial maiúscula no rodapé)
  // "Daniele Rodrigues S Vasconcelos da Costa" aparece no rodapé do Secullum
  if (!nome) {
    for (const line of lines) {
      if (line.length < 5 || /\d/.test(line)) continue
      if (/_{3,}|www\.|secullum|\([\*\^¨]\)/i.test(line)) continue
      const words = line.trim().split(/\s+/)
      if (words.length >= 2 && /^[A-ZÁÉÍÓÚÃÕÇ][a-záéíóúãõç]/.test(words[0])) {
        nome = line.trim().toUpperCase()
        break
      }
    }
  }

  competence = competence || (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })()

  // ── 3. Escala — Secullum ──────────────────────────────────────────────────
  // Após "HORÁRIO DE TRABALHO" vêm os nomes dos dias como cabeçalhos de coluna
  // (SEGUNDA, TERÇA…) e depois as linhas de horário "07:42 12:00 13:00 17:30".
  // Cada linha tem EXATAMENTE 4 horários (sem bsaldo ±HH:MM).
  // A seção termina quando encontramos bsaldo, empresa ou data.
  const schedule: ParsedScheduleDay[] = Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i, isWorked: false,
    entry1: null, exit1: null, entry2: null, exit2: null, dailyMinutes: 0,
  }))

  const SCHEDULE_DAY_ORDER: Record<string, number> = {
    segunda: 1, terca: 2, 'terça': 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6, 'sábado': 6, domingo: 0,
  }

  const schedIdx = lines.findIndex(l => /hor[áa]rio\s*de\s*trabalho/i.test(l))
  if (schedIdx >= 0) {
    const schedDays: number[] = []
    let j = schedIdx + 1
    // Coleta os nomes dos dias até o cabeçalho "DIA ENTRADA 1..."
    while (j < lines.length && !/\bDIA\b.*\bENTRADA\b/i.test(lines[j])) {
      const dl = lines[j].toLowerCase().trim()
      const dow = SCHEDULE_DAY_ORDER[dl]
      if (dow !== undefined) schedDays.push(dow)
      j++
    }
    j++ // pula "DIA ENTRADA 1 SAÍDA 1..."

    let dayIdx = 0
    while (j < lines.length && dayIdx < schedDays.length) {
      const timeLine = lines[j].trim()
      j++
      if (!timeLine) continue
      // Para quando sai da seção de escala: bsaldo, "TOTAIS", data, empresa
      if (/[+-]\d{2}:\d{2}/.test(timeLine)) break        // linha com bsaldo = seção batidas
      if (/TOTAIS|TOTAL/i.test(timeLine)) break
      if (/\d{2}\/\d{2}\/\d{4}/.test(timeLine)) break    // linha de data
      if (!/\d{2}:\d{2}/.test(timeLine)) continue         // linha sem horário (empresa, etc.)

      const times = Array.from(timeLine.matchAll(/\b(\d{2}:\d{2})\b/g)).map(x => x[1])
      // Linha de escala tem exatamente 4 horários (E1 S1 E2 S2), sem bsaldo
      if (times.length < 2) continue
      const dow = schedDays[dayIdx]
      const e1 = times[0] ?? null, x1 = times[1] ?? null
      const e2 = times[2] ?? null, x2 = times[3] ?? null
      let dm = 0
      if (e1 && x1) dm += hhmm2min(x1) - hhmm2min(e1)
      if (e2 && x2) dm += hhmm2min(x2) - hhmm2min(e2)
      schedule[dow] = { dayOfWeek: dow, isWorked: true, entry1: e1, exit1: x1, entry2: e2, exit2: x2, dailyMinutes: dm }
      dayIdx++
    }
  }

  // ── 4. Dias / Batidas — Secullum ──────────────────────────────────────────
  // ATENÇÃO: no Secullum, a data fica no FINAL da linha, os horários ANTES:
  // "[S1] [E2] [S2] [±BSALDO] [E1] DD/MM/YYYY - Dia"
  // Dias sem batidas: "[±BSALDO] DD/MM/YYYY - Dia"
  // Dias com abono/atestado: "Atestad Atestad ... [±BSALDO] DD/MM/YYYY - Dia"
  const days: ParsedDay[] = []
  let bSaldoFinal = '+00:00'

  // Regex que encontra a data em QUALQUER posição da linha
  const DAY_RE = /(\d{2}\/\d{2}\/\d{4})\s*[-–]\s*([A-ZÁÉÍÓÚÃÕa-záéíóúãõ]{2,6})/

  for (const line of lines) {
    const m = line.match(DAY_RE)
    if (!m) continue

    const dateRaw = m[1], dayLabel = m[2]
    const isoDate = ddmmyyyy2iso(dateRaw)
    if (!isoDate) continue
    const dow = labelToDow(dayLabel)
    if (dow < 0) continue

    // Tudo que vem ANTES da data na linha são os horários e bsaldo
    const beforeDate = line.slice(0, m.index ?? 0)
      .replace(/\*/g, '')          // remove marcadores de batida manual
      .replace(/\bAtestad\b/gi, '') // remove texto de atestado
      .replace(/\bAbono\b/gi, '')
      .trim()

    const isBancoH = /banco\s*h\b/i.test(beforeDate)

    // Extrai bsaldo (±HH:MM)
    const bSaldoMatch = beforeDate.match(/([+-]\d{2}:\d{2})/)
    const bSaldo = bSaldoMatch ? bSaldoMatch[1] : null
    if (bSaldo) bSaldoFinal = bSaldo

    // Extrai todos os HH:MM (excluindo o bsaldo se coincidir)
    const allTimes = Array.from(beforeDate.matchAll(/\b(\d{2}:\d{2})\b/g)).map(x => x[1])
    const batidas = allTimes.filter(t => !bSaldo || t !== bSaldo.replace(/^[+-]/, ''))

    // Ordem Secullum nas batidas: [S1, E2, S2, E1] — reordena para [E1, S1, E2, S2]
    // 4 batidas: E1=batidas[3], S1=batidas[0], E2=batidas[1], S2=batidas[2]
    // 2 batidas (só turno 1): E1=batidas[1], S1=batidas[0]
    // 0 batidas: dia sem registro
    let entry1: string|null = null, exit1: string|null = null
    let entry2: string|null = null, exit2: string|null = null
    if (batidas.length >= 4) {
      entry1 = batidas[3]; exit1 = batidas[0]; entry2 = batidas[1]; exit2 = batidas[2]
    } else if (batidas.length === 3) {
      // 3 batidas: S1, E2, E1 (sem S2) ou outra combinação — usa em ordem
      entry1 = batidas[2]; exit1 = batidas[0]; entry2 = batidas[1]
    } else if (batidas.length === 2) {
      entry1 = batidas[1]; exit1 = batidas[0]
    } else if (batidas.length === 1) {
      entry1 = batidas[0]
    }

    days.push({
      date: isoDate, dayOfWeek: dow, dayLabel,
      entry1, exit1, entry2, exit2,
      entry3: null, exit3: null, entry4: null, exit4: null,
      isBancoH, bSaldo,
      punchCount: isBancoH ? 0 : batidas.length,
    })
  }

  return {
    empresa, cnpj, nome, matricula, cpf, funcao, departamento,
    periodo, periodoStart, periodoEnd, competence,
    schedule, days,
    bancoHCount: days.filter(d => d.isBancoH).length,
    bSaldoFinal,
    totalPunches: days.reduce((s, d) => s + d.punchCount, 0),
    memberId: null, memberName: null, status: 'nao_encontrado',
    fileName, fileHash,
  }
}

// ─── Identificação automática dos colaboradores ───────────────────────────────

async function resolveColaborador(col: ParsedColaborador, members: any[]): Promise<ParsedColaborador> {
  // Prioridade: matrícula > CPF > nome completo
  let found: any = null
  if (col.matricula) {
    found = members.find(m => m.registration === col.matricula)
  }
  if (!found && col.cpf && col.cpf.length >= 11) {
    found = members.find(m => m.cpf?.replace(/\D/g, '') === col.cpf)
  }
  if (!found && col.nome) {
    const nomeLower = col.nome.toLowerCase().trim()
    found = members.find(m => m.name?.toLowerCase().trim() === nomeLower)
    if (!found) {
      // Tentativa parcial: últimos 2 sobrenomes + primeiro nome
      found = members.find(m => {
        const parts = nomeLower.split(/\s+/)
        return parts.every((p: string) => m.name?.toLowerCase().includes(p))
      })
    }
  }
  if (found) {
    return { ...col, memberId: found.id, memberName: found.name, status: 'pronto' }
  }
  return col
}

// ─── Split de texto por colaborador ──────────────────────────────────────────

function splitByColaborador(text: string): string[] {
  // Encontra todos os índices de "NOME:" ou "Nome:" no texto
  const splits: number[] = []
  const re = /(?:^|\n)(?:nome|colaborador)\s*:?\s*[A-ZÁÉÍÓÚÃÕ]/gim
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    splits.push(m.index)
  }
  if (splits.length <= 1) return [text]
  return splits.map((start, i) => text.slice(start, splits[i + 1]))
}

// ─── Parse de arquivo ─────────────────────────────────────────────────────────

async function parseFile(buf: Buffer, fileName: string, fileHash: string): Promise<ParsedColaborador[]> {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'pdf') {
    // Cada página do PDF = um cartão de ponto de um colaborador
    const { pages, fullText } = await parsePdfBuffer(buf)

    // Se conseguiu páginas individuais, parseia cada uma separadamente
    if (pages.length > 1) {
      return pages
        .map(pageText => parseColaboradorBlock(pageText, fileName, fileHash))
        .filter(c => c.days.length > 0 || c.nome.trim().length > 0)
    }

    // Fallback: texto único — divide por regex (PDFs de 1 página ou sem pagerender)
    const blocos = splitByColaborador(fullText)
    return blocos
      .filter(b => b.trim().length > 50)
      .map(b => parseColaboradorBlock(b, fileName, fileHash))
      .filter(c => c.days.length > 0 || c.nome)
  }

  let rawText = ''

  if (['xlsx', 'xls'].includes(ext)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx')
    const wb = XLSX.read(buf, { type: 'buffer', raw: true })
    const lines: string[] = []
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName]
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      for (const row of raw) {
        const cells = row.map((c: any) => {
          if (!c && c !== 0) return ''
          if (typeof c === 'number') {
            if (c > 0 && c < 1) {
              const m = Math.round(c * 1440)
              return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`
            }
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
      lines.push('\n')
    }
    rawText = lines.join('\n')
  } else if (ext === 'csv') {
    rawText = buf.toString('utf-8')
  }

  // Divide em blocos por colaborador e parseia cada um
  const blocos = splitByColaborador(rawText)
  return blocos
    .filter(b => b.trim().length > 50)
    .map(b => parseColaboradorBlock(b, fileName, fileHash))
    .filter(c => c.days.length > 0 || c.nome) // descarta blocos vazios
}

// ─── GET — lista lotes ────────────────────────────────────────────────────────

export async function GET() {
  try {
    await ensureTimesheetSchema()
    const lotes = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "PontoLote" ORDER BY "createdAt" DESC LIMIT 100
    `)
    return NextResponse.json(lotes.map(l => ({
      ...l,
      totalFiles:          Number(l.totalFiles ?? 0),
      totalCollaboradores: Number(l.totalCollaboradores ?? 0),
      totalDias:           Number(l.totalDias ?? 0),
      totalBatidas:        Number(l.totalBatidas ?? 0),
      totalConflitos:      Number(l.totalConflitos ?? 0),
      totalRejeitados:     Number(l.totalRejeitados ?? 0),
    })))
  } catch (e: any) {
    console.error('[importacoes-ponto GET]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── POST — parse e preview ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await ensureTimesheetSchema()

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    if (!files.length) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })

    // Carrega todos os membros para resolução
    const members = await prisma.$queryRawUnsafe<any[]>(`
      SELECT m.id, m.name, m.registration, m.cpf, m."companyId",
             cc.name AS companyName, cc.cnpj AS companyCnpj
      FROM "TeamMember" m
      LEFT JOIN "ClientCompany" cc ON cc.id = m."companyId"
      WHERE m.status != 'INATIVO'
    `).catch(() => [] as any[])

    const colaboradores: ParsedColaborador[] = []
    const filesSummary: { name: string; size: number; hash: string; collaboradoresFound: number }[] = []

    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer())
      const hash = createHash('sha256').update(buf).digest('hex')
      const parsed = await parseFile(buf, file.name, hash)

      // Resolve cada colaborador
      const resolved = await Promise.all(parsed.map(c => resolveColaborador(c, members)))
      colaboradores.push(...resolved)
      filesSummary.push({ name: file.name, size: file.size, hash, collaboradoresFound: resolved.length })
    }

    // Deduplicação: se o mesmo colaborador aparece em múltiplos arquivos (por competência),
    // mescla os dias
    const deduped = new Map<string, ParsedColaborador>()
    for (const col of colaboradores) {
      const key = `${col.memberId ?? col.nome ?? col.matricula}::${col.competence}`
      const existing = deduped.get(key)
      if (existing) {
        // Adiciona dias que não existem ainda
        const existingDates = new Set(existing.days.map(d => d.date))
        const newDays = col.days.filter(d => !existingDates.has(d.date))
        existing.days.push(...newDays)
        existing.totalPunches += col.totalPunches
        existing.bancoHCount  += col.bancoHCount
      } else {
        deduped.set(key, { ...col })
      }
    }

    const result = Array.from(deduped.values())

    const summary = {
      totalFiles:          files.length,
      totalCollaboradores: result.length,
      totalDias:           result.reduce((s, c) => s + c.days.length, 0),
      totalBatidas:        result.reduce((s, c) => s + c.totalPunches, 0),
      totalConflitos:      result.filter(c => c.status === 'conflito').length,
      totalNaoEncontrados: result.filter(c => c.status === 'nao_encontrado').length,
    }

    return NextResponse.json({ ok: true, colaboradores: result, files: filesSummary, summary })
  } catch (e: any) {
    console.error('[importacoes-ponto POST]', e)
    return NextResponse.json({ error: e.message ?? 'Erro ao processar arquivos.' }, { status: 500 })
  }
}
