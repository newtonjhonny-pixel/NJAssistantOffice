import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'

export const dynamic = 'force-dynamic'



const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em andamento', CONCLUIDO: 'ConcluÃ­do',
  NAO_REALIZADO: 'NÃ£o realizado', ADIADO: 'Adiado', CANCELADO: 'Cancelado',
}
const PRIORITY_LABELS: Record<string, string> = {
  BAIXA: 'Baixa', MEDIA: 'MÃ©dia', ALTA: 'Alta', URGENTE: 'Urgente',
}

function fmtDate(d: string) {
  if (!d) return ''
  if (d.includes('-')) {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }
  return d
}

async function fetchData(id: string) {
  const dtRows = await prisma.$queryRaw<any[]>`SELECT * FROM "DailyTask" WHERE "id" = ${id}`
  const dt     = dtRows[0]
  if (!dt) return null
  const items = await prisma.$queryRaw<any[]>`
    SELECT * FROM "DailyTaskItem" WHERE "dailyTaskId" = ${id} ORDER BY "order" ASC
  `
  const total     = items.length
  const done      = items.filter((i: any) => i.status === 'CONCLUIDO').length
  const cancelled = items.filter((i: any) => i.status === 'CANCELADO').length
  const valid     = total - cancelled
  const pct       = valid > 0 ? Math.round((done / valid) * 100) : 0
  return { dt, items, stats: { total, done, cancelled, valid, pct } }
}

async function buildExcel(id: string): Promise<Buffer> {
  const data = await fetchData(id)
  if (!data) throw new Error('Not found')
  const { dt, items, stats } = data

  const wb = new ExcelJS.Workbook()
  wb.creator = 'NJ Assistant Office'

  // Aba 1 â€” Resumo
  const ws1 = wb.addWorksheet('Resumo')
  ws1.addRow(['RELATÃ“RIO DE ATIVIDADES DIÃRIAS'])
  ws1.getRow(1).font = { bold: true, size: 14 }
  ws1.addRow([])
  ws1.addRow(['Data:', fmtDate(dt.date)])
  ws1.addRow(['ResponsÃ¡vel:', dt.responsible ?? ''])
  ws1.addRow(['TÃ­tulo:', dt.title ?? ''])
  ws1.addRow(['Objetivo:', dt.objective ?? ''])
  ws1.addRow(['Status:', dt.status])
  ws1.addRow(['% ConcluÃ­do:', stats.pct + '%'])
  ws1.addRow([])
  ws1.addRow(['Total planejado:', stats.total])
  ws1.addRow(['ConcluÃ­dos:', stats.done])
  ws1.addRow(['Pendentes:', items.filter((i: any) => i.status === 'PENDENTE').length])
  ws1.addRow(['Em andamento:', items.filter((i: any) => i.status === 'EM_ANDAMENTO').length])
  ws1.addRow(['Adiados:', items.filter((i: any) => i.status === 'ADIADO').length])
  ws1.addRow(['NÃ£o realizados:', items.filter((i: any) => i.status === 'NAO_REALIZADO').length])
  ws1.addRow(['Cancelados:', stats.cancelled])
  ws1.addRow([])
  ws1.addRow(['Resumo do dia:', dt.summary ?? ''])
  ws1.addRow(['ObservaÃ§Ãµes finais:', dt.finalNotes ?? ''])
  ws1.columns = [{ width: 22 }, { width: 50 }]

  // Aba 2 â€” Itens
  const ws2 = wb.addWorksheet('Itens')
  ws2.columns = [
    { header: 'NÂº',           key: 'n',        width: 5  },
    { header: 'Atividade',    key: 'title',     width: 30 },
    { header: 'Categoria',    key: 'cat',       width: 16 },
    { header: 'Prioridade',   key: 'prio',      width: 12 },
    { header: 'Status',       key: 'status',    width: 16 },
    { header: 'Hr Previsto',  key: 'planned',   width: 12 },
    { header: 'ResponsÃ¡vel',  key: 'resp',      width: 20 },
    { header: 'ObservaÃ§Ãµes',  key: 'notes',     width: 30 },
  ]
  ws2.getRow(1).eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
    c.alignment = { horizontal: 'center' }
  })
  items.forEach((item: any, idx: number) => {
    ws2.addRow({
      n: idx + 1, title: item.title,
      cat: item.category ?? '', prio: PRIORITY_LABELS[item.priority] ?? item.priority,
      status: STATUS_LABELS[item.status] ?? item.status,
      planned: item.plannedTime ?? '', resp: item.responsible ?? '', notes: item.notes ?? '',
    })
  })

  // Aba 3 â€” PendÃªncias
  const ws3 = wb.addWorksheet('PendÃªncias')
  ws3.columns = [
    { header: 'Atividade',  key: 'title',  width: 30 },
    { header: 'Status',     key: 'status', width: 16 },
    { header: 'Prioridade', key: 'prio',   width: 12 },
    { header: 'ObservaÃ§Ãµes',key: 'notes',  width: 30 },
  ]
  ws3.getRow(1).eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } }
  })
  items
    .filter((i: any) => ['PENDENTE', 'EM_ANDAMENTO', 'ADIADO', 'NAO_REALIZADO'].includes(i.status))
    .forEach((item: any) => {
      ws3.addRow({ title: item.title, status: STATUS_LABELS[item.status] ?? item.status,
        prio: PRIORITY_LABELS[item.priority] ?? item.priority, notes: item.notes ?? '' })
    })

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

function buildPDF(data: Awaited<ReturnType<typeof fetchData>>): Buffer {
  if (!data) throw new Error('Not found')
  const { dt, items, stats } = data
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()
  const H   = doc.internal.pageSize.getHeight()
  let y = 15

  // Header
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, W, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13); doc.setFont('helvetica', 'bold')
  doc.text('RelatÃ³rio de Atividades DiÃ¡rias', W / 2, 9, { align: 'center' })
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text(
    `${fmtDate(dt.date)}${dt.responsible ? '  |  ' + dt.responsible : ''}   â€¢   ${stats.pct}% concluÃ­do`,
    W / 2, 16, { align: 'center' }
  )

  y = 28
  // Info box
  doc.setFillColor(241, 245, 249)
  doc.rect(10, y - 4, W - 20, 24, 'F')
  doc.setTextColor(30, 41, 59); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
  doc.text('TÃ­tulo:', 14, y);       doc.setFont('helvetica', 'normal'); doc.text(dt.title ?? 'â€”', 30, y)
  doc.setFont('helvetica', 'bold')
  doc.text('Objetivo:', 14, y + 6); doc.setFont('helvetica', 'normal')
  doc.text(dt.objective ?? 'â€”', 30, y + 6, { maxWidth: W - 44 })
  doc.setFont('helvetica', 'bold')
  doc.text('Status:', 14, y + 14); doc.setFont('helvetica', 'normal'); doc.text(dt.status, 30, y + 14)
  doc.text(`Total: ${stats.total}   ConcluÃ­dos: ${stats.done}   Pendentes: ${stats.total - stats.done - stats.cancelled}   Cancelados: ${stats.cancelled}`, 70, y + 14)
  y += 30

  // Table header
  const cols = [
    { label: 'NÂº',          x: 10, w: 8  },
    { label: 'Atividade',   x: 18, w: 65 },
    { label: 'Categoria',   x: 83, w: 28 },
    { label: 'Prioridade',  x: 111, w: 22 },
    { label: 'Hr Prev.',    x: 133, w: 18 },
    { label: 'Status',      x: 151, w: 50 },
  ]
  doc.setFillColor(241, 245, 249)
  doc.rect(10, y - 4, W - 20, 7, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(71, 85, 105)
  cols.forEach(c => doc.text(c.label, c.x, y, { maxWidth: c.w }))
  y += 5

  const STATUS_COLOR: Record<string, [number, number, number]> = {
    CONCLUIDO: [34, 197, 94], PENDENTE: [148, 163, 184], EM_ANDAMENTO: [59, 130, 246],
    NAO_REALIZADO: [239, 68, 68], ADIADO: [202, 138, 4], CANCELADO: [107, 114, 128],
  }

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  items.forEach((item: any, idx: number) => {
    if (y > H - 25) { doc.addPage(); y = 15 }
    doc.setTextColor(30, 41, 59)
    doc.text(String(idx + 1), cols[0].x, y)
    doc.text(item.title, cols[1].x, y, { maxWidth: cols[1].w })
    doc.text(item.category ?? '', cols[2].x, y, { maxWidth: cols[2].w })
    doc.text(PRIORITY_LABELS[item.priority] ?? item.priority, cols[3].x, y)
    doc.text(item.plannedTime ?? '', cols[4].x, y)
    const rgb = STATUS_COLOR[item.status] ?? [148, 163, 184]
    doc.setFillColor(rgb[0], rgb[1], rgb[2])
    doc.roundedRect(cols[5].x, y - 3.5, 32, 5, 1, 1, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold')
    doc.text(STATUS_LABELS[item.status] ?? item.status, cols[5].x + 16, y, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59)
    if (item.notes) {
      y += 5
      doc.setTextColor(100, 116, 139); doc.setFontSize(7)
      doc.text(`  â†³ ${item.notes}`, cols[1].x, y, { maxWidth: 150 })
      doc.setFontSize(8); doc.setTextColor(30, 41, 59)
    }
    y += 7
    doc.setDrawColor(226, 232, 240); doc.line(10, y - 2, W - 10, y - 2)
  })

  // Footer
  doc.setFontSize(7); doc.setTextColor(148, 163, 184)
  doc.text(
    `NJ Assistant Office  â€¢  Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    W / 2, H - 5, { align: 'center' }
  )
  return Buffer.from(doc.output('arraybuffer'))
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') ?? 'pdf'
    const data   = await fetchData(params.id)
    if (!data) return NextResponse.json({ error: 'NÃ£o encontrado' }, { status: 404 })

    if (format === 'xlsx') {
      const buf = await buildExcel(params.id)
      const date = data.dt.date ?? 'relatorio'
      return new Response(buf.buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Tarefa_Diaria_${date}.xlsx"`,
        },
      })
    }

    const buf  = buildPDF(data)
    const date = data.dt.date ?? 'relatorio'
    return new Response(buf.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Tarefa_Diaria_${date}.pdf"`,
      },
    })
  } catch (e) {
    console.error('[daily-task report]', e)
    return NextResponse.json({ error: 'Erro ao gerar relatÃ³rio' }, { status: 500 })
  }
}
