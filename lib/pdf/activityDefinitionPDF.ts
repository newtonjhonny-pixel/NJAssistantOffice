// PDF de definição de atividade — jsPDF 4.x, A4 paisagem, tabela de itens
// Sem autoTable. Layout: cabeçalho + dados + tabela de etapas.

import { safeFilename } from "./actividadesPDF"

interface DefItem {
  title: string; description?: string | null; required: boolean
  defaultResponsible?: string | null; defaultDays?: number | null
  observation?: string | null; active: boolean
}

interface ActivityDef {
  name: string; description?: string | null; category?: string | null; department?: string | null
  active: boolean; order: number; observations?: string | null
  actCategory?: { name: string; icon?: string } | null
  items: DefItem[]
  _count?: { memberLinks: number }
  createdAt?: string | null; updatedAt?: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(s?: string | null | number): string {
  if (!s) return "—"
  if (typeof s === "number") {
    const d = new Date(s)
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`
  }
  const part = String(s).slice(0, 10)
  const [y, m, d] = part.split("-")
  return y && m && d ? `${d}/${m}/${y}` : "—"
}

function todayISO(): string { return new Date().toISOString().slice(0, 10) }
function nowFormatted(): string {
  const n = new Date()
  return `${String(n.getDate()).padStart(2,"0")}/${String(n.getMonth()+1).padStart(2,"0")}/${n.getFullYear()} ${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`
}

// ── Layout A4 landscape: 297 × 210mm ──────────────────────────────────────────

const ML = 15; const MT = 15; const MB = 12
const PW = 297; const PH = 210; const UW = PW - ML * 2  // 267mm

// Colunas da tabela de itens (total = 267mm)
// Nº | Item | Descrição | Obrig. | Responsável | Prazo | Observação | Status
const COLS  = [8, 50, 70, 16, 38, 16, 45, 24] as const
const HEADS = ["Nº", "Item", "Descrição", "Obrig.", "Responsável", "Prazo", "Observação", "Status"] as const

function txt(doc: any, s: string, x: number, y: number, opts?: any) {
  doc.text(String(s ?? ""), x, y, opts)
}
function wrap(doc: any, s: string, maxW: number): string[] {
  if (!s) return []
  return doc.splitTextToSize(String(s), maxW) as string[]
}
function pageNum(doc: any, p: number, total: number) {
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(150, 150, 150)
  doc.text(`Página ${p} de ${total}`, PW / 2, PH - 5, { align: "center" })
  doc.text(`Gerado em: ${nowFormatted()}`, ML, PH - 5)
}

// ── Cabeçalho da tabela ────────────────────────────────────────────────────────

function drawTableHeader(doc: any, y: number): number {
  const hH = 8
  doc.setFillColor(15, 23, 42); doc.rect(ML, y, UW, hH, "F")
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255)
  let x = ML
  COLS.forEach((w, i) => {
    const align = i === 0 ? "center" : "left"
    const tx = i === 0 ? x + w / 2 : x + 1.5
    txt(doc, HEADS[i], tx, y + 5.2, { align })
    x += w
  })
  // Linhas verticais
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.1)
  x = ML
  COLS.forEach(w => { x += w; doc.line(x, y, x, y + hH) })
  doc.setTextColor(30, 41, 59)
  return y + hH
}

// ── Linha de item ──────────────────────────────────────────────────────────────

function drawItemRow(doc: any, item: DefItem, num: number, y: number, rowIdx: number): number {
  const lineH = 3.8; const padV = 2
  doc.setFontSize(8)
  const titleLines = wrap(doc, item.title, COLS[1] - 3)
  const descLines  = wrap(doc, item.description || "—", COLS[2] - 3)
  const respLines  = wrap(doc, item.defaultResponsible || "—", COLS[4] - 3)
  const obsLines   = wrap(doc, item.observation || "—", COLS[6] - 3)
  const maxL = Math.max(titleLines.length, descLines.length, respLines.length, obsLines.length, 1)
  const rowH = maxL * lineH + padV * 2

  if (rowIdx % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(ML, y, UW, rowH, "F") }
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.1); doc.rect(ML, y, UW, rowH, "S")

  let xv = ML; COLS.forEach(w => { xv += w; doc.line(xv, y, xv, y + rowH) })

  const midY = y + rowH / 2 + 1
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(30, 41, 59)
  let x = ML

  // Nº
  txt(doc, String(num), x + COLS[0] / 2, midY, { align: "center" })
  x += COLS[0]

  // Item (bold)
  doc.setFont("helvetica", "bold")
  titleLines.forEach((l, i) => txt(doc, l, x + 1.5, y + padV + (i + 1) * lineH))
  x += COLS[1]

  // Descrição
  doc.setFont("helvetica", "normal")
  descLines.forEach((l, i) => txt(doc, l, x + 1.5, y + padV + (i + 1) * lineH))
  x += COLS[2]

  // Obrigatório
  doc.setTextColor(item.required ? 21 : 100, item.required ? 128 : 116, item.required ? 61 : 139)
  txt(doc, item.required ? "Sim" : "Não", x + 1.5, midY)
  doc.setTextColor(30, 41, 59)
  x += COLS[3]

  // Responsável
  respLines.forEach((l, i) => txt(doc, l, x + 1.5, y + padV + (i + 1) * lineH))
  x += COLS[4]

  // Prazo
  txt(doc, item.defaultDays ? `${item.defaultDays}d` : "—", x + 1.5, midY)
  x += COLS[5]

  // Observação
  obsLines.forEach((l, i) => {
    doc.setTextColor(120, 53, 15)
    txt(doc, l, x + 1.5, y + padV + (i + 1) * lineH)
  })
  doc.setTextColor(30, 41, 59)
  x += COLS[6]

  // Status
  doc.setTextColor(item.active ? 21 : 100, item.active ? 128 : 116, item.active ? 61 : 139)
  txt(doc, item.active ? "Ativo" : "Inativo", x + 1.5, midY)
  doc.setTextColor(30, 41, 59)

  return y + rowH
}

// ── Exportar PDF da atividade ──────────────────────────────────────────────────

export async function generateActivityDefinitionPDF(activity: ActivityDef): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const avoidBottom = PH - MB - 8

  // ── Título
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(15, 23, 42)
  txt(doc, "RELATÓRIO DA ATIVIDADE", PW / 2, MT, { align: "center" })

  const catName = activity.actCategory?.name || activity.category || ""
  if (catName) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 116, 139)
    txt(doc, catName.toUpperCase(), PW / 2, MT + 6, { align: "center" })
  }

  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 41, 59)
  txt(doc, activity.name, PW / 2, MT + (catName ? 12 : 7), { align: "center" })

  let y = MT + (catName ? 18 : 14)

  // Linha separadora
  doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.3); doc.line(ML, y, ML + UW, y); y += 5

  // ── Dados da atividade (2 colunas)
  const colW = (UW - 6) / 2
  const fields: [string, string][] = [
    ["Nome",              activity.name],
    ["Categoria",         catName || "—"],
    ["Departamento",      activity.department || "—"],
    ["Status",            activity.active ? "Ativo" : "Inativo"],
    ["Ordem",             String(activity.order)],
    ["Itens cadastrados", String(activity.items.length)],
    ["Colaboradores",     String(activity._count?.memberLinks ?? "—")],
  ]

  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5)
  const half = Math.ceil(fields.length / 2)
  const leftFields = fields.slice(0, half)
  const rightFields = fields.slice(half)
  const startY = y

  leftFields.forEach(([label, value], i) => {
    doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal")
    txt(doc, label + ":", ML, startY + i * 5.5)
    doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold")
    txt(doc, value, ML + 36, startY + i * 5.5)
  })
  rightFields.forEach(([label, value], i) => {
    doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal")
    txt(doc, label + ":", ML + colW + 6, startY + i * 5.5)
    doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold")
    txt(doc, value, ML + colW + 42, startY + i * 5.5)
  })

  y = startY + Math.max(leftFields.length, rightFields.length) * 5.5 + 3

  // Descrição
  if (activity.description) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
    txt(doc, "Descrição:", ML, y)
    doc.setTextColor(30, 41, 59)
    const lines = wrap(doc, activity.description, UW - 3)
    lines.forEach((l, i) => txt(doc, l, ML + 36, y + i * 4))
    y += Math.max(lines.length, 1) * 4 + 3
  }

  // Observações
  if (activity.observations) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
    txt(doc, "Observações:", ML, y)
    doc.setFont("helvetica", "italic"); doc.setTextColor(120, 53, 15)
    const lines = wrap(doc, activity.observations, UW - 3)
    lines.forEach((l, i) => txt(doc, l, ML + 36, y + i * 4))
    y += Math.max(lines.length, 1) * 4 + 3
  }

  y += 2; doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.3); doc.line(ML, y, ML + UW, y); y += 5

  // ── Tabela de itens
  if (activity.items.length === 0) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(100, 116, 139)
    txt(doc, "Nenhum item/etapa cadastrado.", ML, y + 5)
  } else {
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(15, 23, 42)
    txt(doc, `ETAPAS / ITENS DA ATIVIDADE (${activity.items.length})`, ML, y + 4)
    y += 8

    y = drawTableHeader(doc, y)

    let pageNum_ = 1

    for (let i = 0; i < activity.items.length; i++) {
      const item = activity.items[i]
      // Estimate row height
      doc.setFontSize(8)
      const tL = wrap(doc, item.title, COLS[1] - 3)
      const dL = wrap(doc, item.description || "—", COLS[2] - 3)
      const rL = wrap(doc, item.defaultResponsible || "—", COLS[4] - 3)
      const oL = wrap(doc, item.observation || "—", COLS[6] - 3)
      const maxL = Math.max(tL.length, dL.length, rL.length, oL.length, 1)
      const rowH = maxL * 3.8 + 4

      if (y + rowH > avoidBottom) {
        pageNum(doc, pageNum_, doc.getNumberOfPages() + 1)
        doc.addPage(); pageNum_++; y = MT
        y = drawTableHeader(doc, y)
      }

      y = drawItemRow(doc, item, i + 1, y, i)
    }

    // Totalizador
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139)
    txt(doc, `Total: ${activity.items.length} item(s)`, ML + UW, y + 3.5, { align: "right" })
  }

  // Numeração de páginas
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) { doc.setPage(p); pageNum(doc, p, total) }

  const fname = `Atividade_${safeFilename(activity.name)}_${todayISO()}.pdf`
  doc.save(fname)
}
