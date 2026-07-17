import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"

export const dynamic = "force-dynamic"

interface ExportTask {
  title: string; status: string; priority: string
  origin: string | null
  taskOrigin: { name: string } | null
  person: string | null; responsible: string | null
  dueDate: string | null; receivedAt: string | null
  createdAt: string; updatedAt: string
  description: string | null; observations: string | null
  _count?: { attachments: number }
}

const PRIORITY_LABELS: Record<string, string> = {
  URGENTE: "Urgente", ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa",
}
const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente", EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_RETORNO: "Aguardando retorno", CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
}

function fmtDate(d: string | null): string {
  if (!d) return ""
  const s = d.slice(0, 10)
  const [y, m, day] = s.split("-")
  return `${day}/${m}/${y}`
}

function daysDiff(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { tasks: ExportTask[]; title: string; filename: string }
    const { tasks, title, filename } = body

    const wb = new ExcelJS.Workbook()
    wb.creator = "NJ Assistant Office"
    wb.created = new Date()

    const ws = wb.addWorksheet("Tarefas", {
      views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
    })

    // Definição de colunas
    ws.columns = [
      { header: "Título",              key: "titulo",       width: 40 },
      { header: "Status",              key: "status",       width: 20 },
      { header: "Prioridade",          key: "prioridade",   width: 14 },
      { header: "Origem",              key: "origem",       width: 18 },
      { header: "Responsável",         key: "responsavel",  width: 20 },
      { header: "Solicitante",         key: "solicitante",  width: 20 },
      { header: "Prazo",               key: "prazo",        width: 14 },
      { header: "Recebida em",         key: "recebida",     width: 14 },
      { header: "Data criação",        key: "criacao",      width: 14 },
      { header: "Última atualização",  key: "atualizacao",  width: 18 },
      { header: "Descrição",           key: "descricao",    width: 50 },
      { header: "Observações",         key: "observacoes",  width: 40 },
      { header: "Dias em atraso",      key: "atraso",       width: 14 },
      { header: "Dias restantes",      key: "restantes",    width: 14 },
      { header: "Qtd. evidências",     key: "evidencias",   width: 14 },
    ]

    // Estilo do cabeçalho
    const headerRow = ws.getRow(1)
    headerRow.eachCell(cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false }
      cell.border = {
        bottom: { style: "medium", color: { argb: "FF1E3A8A" } },
      }
    })
    headerRow.height = 20

    // Linhas de dados
    tasks.forEach((task, i) => {
      const originName = task.taskOrigin?.name ?? task.origin ?? ""
      const diff = task.dueDate ? daysDiff(task.dueDate) : null
      const active = task.status !== "CONCLUIDA" && task.status !== "CANCELADA"
      const diasAtraso = diff !== null && diff < 0 && active ? Math.abs(diff) : ""
      const diasRestantes = diff !== null && diff >= 0 ? diff : ""

      const row = ws.addRow({
        titulo:      task.title,
        status:      STATUS_LABELS[task.status] ?? task.status,
        prioridade:  PRIORITY_LABELS[task.priority] ?? task.priority,
        origem:      originName,
        responsavel: task.responsible ?? "",
        solicitante: task.person ?? "",
        prazo:       fmtDate(task.dueDate),
        recebida:    fmtDate(task.receivedAt),
        criacao:     fmtDate(task.createdAt),
        atualizacao: fmtDate(task.updatedAt),
        descricao:   task.description ?? "",
        observacoes: task.observations ?? "",
        atraso:      diasAtraso,
        restantes:   diasRestantes,
        evidencias:  task._count?.attachments ?? 0,
      })

      // Fundo alternado
      const bg = i % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC"
      row.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
        cell.font = { size: 9 }
        cell.alignment = { vertical: "top", wrapText: true }
      })

      // Destacar atrasadas
      if (diasAtraso !== "") {
        const atCell = row.getCell("atraso")
        atCell.font = { bold: true, color: { argb: "FFDC2626" }, size: 9 }
      }

      // Altura mínima da linha
      row.height = 16
    })

    // Auto-filtro
    ws.autoFilter = { from: "A1", to: `O1` }

    // Gerar buffer
    const buffer = await wb.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    })
  } catch (err) {
    console.error("[export/excel]", err)
    return NextResponse.json({ error: "Falha ao gerar Excel" }, { status: 500 })
  }
}
