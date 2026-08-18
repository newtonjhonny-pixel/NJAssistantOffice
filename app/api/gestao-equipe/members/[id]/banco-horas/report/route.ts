import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'

export const dynamic = 'force-dynamic'



function minutesToHHMM(min: number): string {
  const sign = min < 0 ? '-' : ''
  const abs = Math.abs(min)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h}h${m > 0 ? String(m).padStart(2, '0') + 'min' : ''}`
}

function competenceLabel(comp: string): string {
  const [y, m] = comp.split('-')
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${months[parseInt(m) - 1]}/${y}`
}

async function fetchData(memberId: string) {
  const memberRows = await prisma.$queryRaw<any[]>`
    SELECT "id","name","role","sector","unit" FROM "TeamMember" WHERE "id" = ${memberId}
  `
  const member = memberRows[0]

  const cfgRows = await prisma.$queryRaw<any[]>`SELECT * FROM "HourBankConfig" WHERE "memberId" = ${memberId} LIMIT 1`
  const cfg = cfgRows[0] ?? { compensationDays: 180, alertDaysBeforeExp: 30 }

  const entries = await prisma.$queryRaw<any[]>`
    SELECT * FROM "HourBankEntry"
    WHERE "memberId" = ${memberId} AND "status" = 'ATIVO'
    ORDER BY "entryDate" ASC
  `

  const compMap = new Map<string, { credit: number; debit: number; expired: number }>()
  for (const e of entries) {
    if (!compMap.has(e.competence)) compMap.set(e.competence, { credit: 0, debit: 0, expired: 0 })
    const c = compMap.get(e.competence)!
    if (e.type === 'LANCAMENTO' || e.type === 'IMPORTACAO') c.credit += e.creditMinutes
    else if (e.type === 'COMPENSACAO') c.debit += e.debitMinutes
    else if (e.type === 'AJUSTE') { c.credit += e.creditMinutes; c.debit += e.debitMinutes }
    else if (e.type === 'VENCIMENTO') c.expired += e.debitMinutes
  }

  const competences = Array.from(compMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([comp, v]) => {
    const [y, m] = comp.split('-').map(Number)
    const end = new Date(y, m, 0)
    const exp = new Date(end); exp.setDate(exp.getDate() + cfg.compensationDays)
    const dl = Math.ceil((exp.getTime() - Date.now()) / 86400000)
    const bal = v.credit - v.debit - v.expired
    return { comp, credit: v.credit, debit: v.debit, expired: v.expired, balance: bal, expiresAt: exp.toLocaleDateString('pt-BR'), daysLeft: dl }
  })

  const total = { credit: competences.reduce((s,c)=>s+c.credit,0), debit: competences.reduce((s,c)=>s+c.debit,0), expired: competences.reduce((s,c)=>s+c.expired,0) }
  const balance = total.credit - total.debit - total.expired

  return { member, entries, competences, total, balance, cfg }
}

async function buildExcel(memberId: string): Promise<Buffer> {
  const { member, entries, competences, total, balance } = await fetchData(memberId)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'NJ Assistant Office'
  wb.created = new Date()

  // Sheet: Resumo por competência
  const ws1 = wb.addWorksheet('Competências')
  ws1.columns = [
    { header: 'Competência', key: 'comp', width: 16 },
    { header: 'Créditos', key: 'credit', width: 14 },
    { header: 'Compensações', key: 'debit', width: 16 },
    { header: 'Vencidos', key: 'expired', width: 14 },
    { header: 'Saldo', key: 'balance', width: 14 },
    { header: 'Vencimento', key: 'expiresAt', width: 14 },
    { header: 'Dias Restantes', key: 'daysLeft', width: 16 },
  ]
  ws1.getRow(1).eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
    c.alignment = { horizontal: 'center' }
  })
  for (const c of competences) {
    ws1.addRow({ comp: competenceLabel(c.comp), credit: minutesToHHMM(c.credit), debit: minutesToHHMM(c.debit), expired: minutesToHHMM(c.expired), balance: minutesToHHMM(c.balance), expiresAt: c.expiresAt, daysLeft: c.daysLeft })
  }
  ws1.addRow([])
  ws1.addRow({ comp: 'TOTAL', credit: minutesToHHMM(total.credit), debit: minutesToHHMM(total.debit), expired: minutesToHHMM(total.expired), balance: minutesToHHMM(balance) })

  // Sheet: Movimentações
  const ws2 = wb.addWorksheet('Movimentações')
  ws2.columns = [
    { header: 'Data', key: 'date', width: 14 },
    { header: 'Competência', key: 'comp', width: 14 },
    { header: 'Tipo', key: 'type', width: 16 },
    { header: 'Crédito', key: 'credit', width: 12 },
    { header: 'Débito', key: 'debit', width: 12 },
    { header: 'Responsável', key: 'resp', width: 20 },
    { header: 'Observação', key: 'obs', width: 30 },
  ]
  ws2.getRow(1).eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
  })
  for (const e of entries) {
    ws2.addRow({ date: new Date(e.entryDate).toLocaleDateString('pt-BR'), comp: e.competence, type: e.type, credit: minutesToHHMM(e.creditMinutes), debit: minutesToHHMM(e.debitMinutes), resp: e.responsible ?? '', obs: e.observations ?? '' })
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

function buildPDF(data: Awaited<ReturnType<typeof fetchData>>): Buffer {
  const { member, competences, total, balance } = data
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  let y = 15

  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, W, 18, 'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(13); doc.setFont('helvetica','bold')
  doc.text('Relatório — Banco de Horas', W/2, 8, { align: 'center' })
  doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text(`${member?.name ?? ''} | ${member?.role ?? ''}${member?.sector ? ' · ' + member.sector : ''}   Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, W/2, 14, { align: 'center' })

  y = 26
  // Summary row
  doc.setFillColor(241,245,249); doc.rect(10, y-5, W-20, 12, 'F')
  doc.setTextColor(30,41,59); doc.setFontSize(8); doc.setFont('helvetica','bold')
  doc.text(`Saldo Atual: ${minutesToHHMM(balance)}`, 14, y)
  doc.text(`Total Créditos: ${minutesToHHMM(total.credit)}`, 70, y)
  doc.text(`Total Compensações: ${minutesToHHMM(total.debit)}`, 140, y)
  doc.text(`Total Vencidos: ${minutesToHHMM(total.expired)}`, 215, y)
  y += 12

  // Table header
  const cols = [
    { label: 'Competência', x: 10, w: 30 },
    { label: 'Créditos', x: 40, w: 28 },
    { label: 'Compensações', x: 68, w: 32 },
    { label: 'Vencidos', x: 100, w: 28 },
    { label: 'Saldo', x: 128, w: 28 },
    { label: 'Vencimento', x: 156, w: 32 },
    { label: 'Dias Restantes', x: 188, w: 32 },
    { label: 'Situação', x: 220, w: 67 },
  ]
  doc.setFillColor(241,245,249); doc.rect(10, y-4, W-20, 7, 'F')
  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(71,85,105)
  for (const c of cols) doc.text(c.label, c.x, y, { maxWidth: c.w })
  y += 5

  const SIT_COLOR: Record<string, [number,number,number]> = {
    REGULAR: [34,197,94], ATENCAO: [202,138,4], VENCIDO: [239,68,68], ZERADO: [148,163,184],
  }
  doc.setFont('helvetica','normal'); doc.setFontSize(8)

  for (const c of competences) {
    if (y > H - 20) { doc.addPage(); y = 15 }
    const sit = c.balance <= 0 ? 'ZERADO' : c.daysLeft < 0 ? 'VENCIDO' : c.daysLeft <= 30 ? 'ATENCAO' : 'REGULAR'
    const sitLabel: Record<string,string> = { REGULAR:'Regular', ATENCAO:'Atenção', VENCIDO:'Vencido', ZERADO:'Zerado' }
    doc.setTextColor(30,41,59)
    doc.text(competenceLabel(c.comp), cols[0].x, y, { maxWidth: cols[0].w })
    doc.text(minutesToHHMM(c.credit), cols[1].x, y)
    doc.text(minutesToHHMM(c.debit), cols[2].x, y)
    doc.text(minutesToHHMM(c.expired), cols[3].x, y)
    doc.text(minutesToHHMM(c.balance), cols[4].x, y)
    doc.text(c.expiresAt, cols[5].x, y)
    doc.text(String(c.daysLeft > 0 ? c.daysLeft + ' dias' : 'Vencido'), cols[6].x, y)
    const rgb = SIT_COLOR[sit] ?? [148,163,184]
    doc.setFillColor(rgb[0],rgb[1],rgb[2])
    doc.roundedRect(cols[7].x, y-3.5, 28, 5, 1, 1, 'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold')
    doc.text(sitLabel[sit], cols[7].x+14, y, { align: 'center' })
    doc.setFont('helvetica','normal'); doc.setTextColor(30,41,59)
    y += 7
    doc.setDrawColor(226,232,240); doc.line(10, y-2, W-10, y-2)
  }

  doc.setFontSize(7); doc.setTextColor(148,163,184)
  doc.text('NJ Assistant Office — Banco de Horas', W/2, H-5, { align: 'center' })
  return Buffer.from(doc.output('arraybuffer'))
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') ?? 'xlsx'
    const data = await fetchData(params.id)

    if (format === 'pdf') {
      const buf = buildPDF(data)
      return new Response(buf.buffer as ArrayBuffer, {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="banco-horas.pdf"' },
      })
    }

    const buf = await buildExcel(params.id)
    return new Response(buf.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="banco-horas.xlsx"',
      },
    })
  } catch (e) {
    console.error('[banco-horas report GET]', e)
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
  }
}
