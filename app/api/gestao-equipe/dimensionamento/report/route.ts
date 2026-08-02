import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'

export const dynamic = 'force-dynamic'


// â”€â”€â”€ Capacity calculation (mirrors dimensionamento/route.ts) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Config {
  weightEmployee: number; weightCompany: number; weightProcess: number
  weightVolume: number; weightComplexity: number; weightManual: number; weightCritical: number
  capacityRef: number
  bandGreen: number; bandBlue: number; bandYellow: number; bandOrange: number
}

const COMPLEXITY_MULT: Record<string, number> = { BAIXA: 0, MEDIA: 1, ALTA: 2, MUITO_ALTA: 3 }
function complexityScore(level: string | null, weight: number): number {
  return ((COMPLEXITY_MULT[level ?? ''] ?? 0) / 3) * weight
}
function calcBand(pct: number, cfg: Config): string {
  if (pct <= cfg.bandGreen)  return 'DisponÃ­vel'
  if (pct <= cfg.bandBlue)   return 'Equilibrado'
  if (pct <= cfg.bandYellow) return 'AtenÃ§Ã£o'
  if (pct <= cfg.bandOrange) return 'Sobrecarga'
  return 'Sobrecarga CrÃ­tica'
}

async function getDimData() {
  const cfgRows = await prisma.$queryRaw<Config[]>`SELECT * FROM "CapacityConfig" WHERE "active" = 1 LIMIT 1`
  const cfg: Config = cfgRows[0] ?? {
    weightEmployee: 1, weightCompany: 5, weightProcess: 2, weightVolume: 0.5,
    weightComplexity: 3, weightManual: 2, weightCritical: 3, capacityRef: 100,
    bandGreen: 70, bandBlue: 85, bandYellow: 100, bandOrange: 120,
  }

  const members = await prisma.$queryRaw<any[]>`
    SELECT "id","name","role","sector","unit" FROM "TeamMember" WHERE "status" = 'ATIVO' ORDER BY "name"
  `
  const links = await prisma.$queryRaw<any[]>`
    SELECT l.*, c."name" as "companyName"
    FROM "MemberCompanyLink" l
    JOIN "ClientCompany" c ON c."id" = l."companyId"
    JOIN "TeamMember" m ON m."id" = l."memberId"
    WHERE m."status" = 'ATIVO'
  `
  const processes = await prisma.$queryRaw<any[]>`
    SELECT p.* FROM "MemberCompanyProcess" p
    JOIN "MemberCompanyLink" l ON l."id" = p."linkId"
    JOIN "TeamMember" m ON m."id" = l."memberId"
    WHERE m."status" = 'ATIVO'
  `

  const linksByMember = links.reduce<Record<string, any[]>>((acc, l) => {
    if (!acc[l.memberId]) acc[l.memberId] = []
    acc[l.memberId].push(l); return acc
  }, {})
  const processByLink = processes.reduce<Record<string, any[]>>((acc, p) => {
    if (!acc[p.linkId]) acc[p.linkId] = []
    acc[p.linkId].push(p); return acc
  }, {})

  const rows = members.map(m => {
    const memberLinks = linksByMember[m.id] ?? []
    let totalScore = 0; let totalHeadcount = 0; let totalProcesses = 0
    const companies: { name: string; score: number }[] = []

    for (const l of memberLinks) {
      let score = cfg.weightCompany
      const hc = (l.headcountActive ?? 0) + (l.headcountApprentice ?? 0) + (l.headcountIntern ?? 0)
      score += hc * cfg.weightEmployee
      score += ((l.avgAdmissions ?? 0) + (l.avgTerminations ?? 0) + (l.avgVacations ?? 0)) * cfg.weightVolume
      score += complexityScore(l.complexity, cfg.weightComplexity)
      if (l.automationLevel === 'MANUAL') score += cfg.weightManual
      const procs = processByLink[l.id] ?? []
      for (const p of procs) {
        score += cfg.weightProcess
        score += (p.volume ?? 0) * cfg.weightVolume
        score += complexityScore(p.complexity, cfg.weightComplexity)
        if (p.automationLevel === 'MANUAL') score += cfg.weightManual
        if (p.isCritical) score += cfg.weightCritical
      }
      totalScore += score; totalHeadcount += hc; totalProcesses += procs.length
      companies.push({ name: l.companyName, score: Math.round(score * 10) / 10 })
    }

    const pct = cfg.capacityRef > 0 ? Math.round((totalScore / cfg.capacityRef) * 1000) / 10 : 0
    return {
      name: m.name, role: m.role, sector: m.sector ?? '', unit: m.unit ?? '',
      companyCount: memberLinks.length, totalHeadcount, totalProcesses,
      totalScore: Math.round(totalScore * 10) / 10,
      capacityPct: pct, band: calcBand(pct, cfg), companies,
    }
  })

  return { cfg, rows }
}

// â”€â”€â”€ Excel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function buildExcel(cfg: Config, rows: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'NJ Assistant Office'
  wb.created = new Date()

  // Sheet 1: Resumo
  const ws = wb.addWorksheet('Dimensionamento')
  ws.columns = [
    { header: 'Colaborador', key: 'name', width: 26 },
    { header: 'Cargo', key: 'role', width: 22 },
    { header: 'Setor', key: 'sector', width: 20 },
    { header: 'Empresas', key: 'companyCount', width: 12 },
    { header: 'Empregados', key: 'totalHeadcount', width: 14 },
    { header: 'Processos', key: 'totalProcesses', width: 13 },
    { header: 'Score Total', key: 'totalScore', width: 14 },
    { header: 'Capacidade %', key: 'capacityPct', width: 16 },
    { header: 'SituaÃ§Ã£o', key: 'band', width: 20 },
  ]

  const BAND_COLOR: Record<string, string> = {
    'DisponÃ­vel': 'FF22C55E', 'Equilibrado': 'FF3B82F6',
    'AtenÃ§Ã£o': 'FFCA8A04', 'Sobrecarga': 'FFF97316', 'Sobrecarga CrÃ­tica': 'FFEF4444',
  }

  ws.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  ws.getRow(1).height = 20

  for (const r of rows) {
    const row = ws.addRow(r)
    const color = BAND_COLOR[r.band] ?? 'FF6B7280'
    const bandCell = row.getCell('band')
    bandCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    bandCell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    bandCell.alignment = { horizontal: 'center' }
    row.getCell('capacityPct').numFmt = '0.0"%"'
    row.getCell('totalScore').numFmt = '0.0'
  }

  ws.addRow([])
  ws.addRow(['ConfiguraÃ§Ã£o', '', `Ref: ${cfg.capacityRef} pts`, `Verde â‰¤${cfg.bandGreen}%`, `Azul â‰¤${cfg.bandBlue}%`, `Amarelo â‰¤${cfg.bandYellow}%`, `Laranja â‰¤${cfg.bandOrange}%`])

  // Sheet 2: Por empresa
  const ws2 = wb.addWorksheet('Por Empresa')
  ws2.columns = [
    { header: 'Colaborador', key: 'member', width: 26 },
    { header: 'Empresa', key: 'company', width: 32 },
    { header: 'Score', key: 'score', width: 12 },
  ]
  ws2.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
    cell.alignment = { horizontal: 'center' }
  })
  for (const r of rows) {
    for (const c of r.companies) {
      ws2.addRow({ member: r.name, company: c.name, score: c.score })
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

// â”€â”€â”€ PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildPDF(cfg: Config, rows: any[]): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  let y = 15

  const BAND_RGB: Record<string, [number, number, number]> = {
    'DisponÃ­vel':       [34, 197, 94],
    'Equilibrado':      [59, 130, 246],
    'AtenÃ§Ã£o':          [202, 138, 4],
    'Sobrecarga':       [249, 115, 22],
    'Sobrecarga CrÃ­tica': [239, 68, 68],
  }

  // Header
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, pageW, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('RelatÃ³rio de Dimensionamento de Equipe', pageW / 2, 9, { align: 'center' })
  doc.setFontSize(8)
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}  |  Ref: ${cfg.capacityRef} pts  |  Verde â‰¤${cfg.bandGreen}%  Azul â‰¤${cfg.bandBlue}%  Amarelo â‰¤${cfg.bandYellow}%  Laranja â‰¤${cfg.bandOrange}%`, pageW / 2, 12.5, { align: 'center' })

  y = 22
  doc.setTextColor(30, 41, 59)

  // Column headers
  const cols = [
    { label: 'Colaborador', x: 10, w: 52 },
    { label: 'Cargo', x: 62, w: 42 },
    { label: 'Setor', x: 104, w: 32 },
    { label: 'Empresas', x: 136, w: 18 },
    { label: 'Empregados', x: 154, w: 22 },
    { label: 'Processos', x: 176, w: 20 },
    { label: 'Score', x: 196, w: 18 },
    { label: 'Cap. %', x: 214, w: 18 },
    { label: 'SituaÃ§Ã£o', x: 232, w: 55 },
  ]

  doc.setFillColor(241, 245, 249)
  doc.rect(10, y - 4, pageW - 20, 7, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  for (const c of cols) doc.text(c.label, c.x, y, { maxWidth: c.w })
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)

  for (const r of rows) {
    if (y > pageH - 20) {
      doc.addPage()
      y = 15
    }

    const rgb = BAND_RGB[r.band] ?? [107, 114, 128]

    doc.setTextColor(30, 41, 59)
    doc.text(r.name, cols[0].x, y, { maxWidth: cols[0].w })
    doc.text(r.role, cols[1].x, y, { maxWidth: cols[1].w })
    doc.text(r.sector || 'â€”', cols[2].x, y, { maxWidth: cols[2].w })
    doc.text(String(r.companyCount), cols[3].x, y, { maxWidth: cols[3].w })
    doc.text(String(r.totalHeadcount), cols[4].x, y, { maxWidth: cols[4].w })
    doc.text(String(r.totalProcesses), cols[5].x, y, { maxWidth: cols[5].w })
    doc.text(String(r.totalScore), cols[6].x, y, { maxWidth: cols[6].w })
    doc.text(`${r.capacityPct}%`, cols[7].x, y, { maxWidth: cols[7].w })

    // Badge for band
    const bx = cols[8].x; const bw = Math.min(cols[8].w, 46)
    doc.setFillColor(rgb[0], rgb[1], rgb[2])
    doc.roundedRect(bx, y - 3.5, bw, 5, 1, 1, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text(r.band, bx + bw / 2, y, { align: 'center', maxWidth: bw })
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)

    y += 7

    doc.setDrawColor(226, 232, 240)
    doc.line(10, y - 2, pageW - 10, y - 2)
  }

  // Footer
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text('NJ Assistant Office â€” GestÃ£o de Equipe', pageW / 2, pageH - 5, { align: 'center' })

  return Buffer.from(doc.output('arraybuffer'))
}

// â”€â”€â”€ Route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') ?? 'xlsx'

    const { cfg, rows } = await getDimData()

    if (format === 'pdf') {
      const buf = buildPDF(cfg, rows)
      return new Response(buf.buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="dimensionamento.pdf"',
        },
      })
    }

    // Default: xlsx
    const buf = await buildExcel(cfg, rows)
    return new Response(buf.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="dimensionamento.xlsx"',
      },
    })
  } catch (e) {
    console.error('[dimensionamento/report GET]', e)
    return NextResponse.json({ error: 'Erro ao gerar relatÃ³rio' }, { status: 500 })
  }
}
