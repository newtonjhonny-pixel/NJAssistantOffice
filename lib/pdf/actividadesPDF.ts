// Relatórios PDF de atividades dos colaboradores — jsPDF 4.x, layout em blocos
// Sem autoTable, sem html2canvas, sem URL/localhost visíveis

interface PDFMember {
  id: string; name: string; role: string; sector?: string | null; unit?: string | null
}
interface PDFItem {
  id: string; title: string; description?: string | null; observation?: string | null
  required: boolean; defaultResponsible?: string | null; defaultDays?: number | null; active: boolean
}
interface PDFItemLink {
  id: string; itemId: string; observation?: string | null; includedAt: string
  item: PDFItem
}
interface PDFActivityTemplate {
  name: string; description?: string | null; category?: string | null; observations?: string | null
  actCategory?: { name: string; icon?: string } | null
  items: PDFItem[]
}
interface PDFLink {
  id: string; memberId: string; includedAt: string; observation?: string | null
  member: PDFMember; activityTemplate: PDFActivityTemplate; itemLinks: PDFItemLink[]
}
interface PDFGroup { member: PDFMember; links: PDFLink[] }

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(s?: string | null): string {
  if (!s) return "—"
  // Handle epoch ms stored as number
  if (typeof s === "number") {
    const d = new Date(s)
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`
  }
  const part = String(s).slice(0, 10)
  const [y, m, d] = part.split("-")
  return y && m && d ? `${d}/${m}/${y}` : "—"
}

function nowFormatted(): string {
  const now = new Date()
  return `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`
}

function todayISO(): string { return new Date().toISOString().slice(0, 10) }

export function safeFilename(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "")
}

// ── Constantes de layout ───────────────────────────────────────────────────────

const ML = 15; const MT = 15; const MB = 12
const PW = 210; const PH = 297; const UW = PW - ML * 2

// ── Utilidades de desenho ──────────────────────────────────────────────────────

function pageNum(doc: any, p: number, total: number) {
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(150, 150, 150)
  doc.text(`Página ${p} de ${total}`, PW / 2, PH - 5, { align: "center" })
}

function txt(doc: any, s: string, x: number, y: number, opts?: any) {
  doc.text(String(s ?? ""), x, y, opts)
}

// Wraps text and returns array of lines; uses splitTextToSize
function wrap(doc: any, s: string, maxW: number): string[] {
  if (!s) return []
  return doc.splitTextToSize(String(s), maxW) as string[]
}

// Draw a filled-background info header block — returns new Y
function drawMemberHeader(doc: any, member: PDFMember, totalActs: number, totalItems: number, y: number): number {
  const h = 18
  doc.setFillColor(15, 23, 42); doc.rect(ML, y, UW, h, "F")
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255, 255, 255)
  txt(doc, member.name, ML + 3, y + 6.5)
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5)
  const sub = [member.role, member.sector, member.unit].filter(Boolean).join(" · ")
  txt(doc, sub, ML + 3, y + 12.5)
  doc.setFontSize(8); doc.setTextColor(148, 163, 184)
  txt(doc, `${totalActs} atividade(s) · ${totalItems} item(s)`, ML + UW - 3, y + 6.5, { align: "right" })
  return y + h + 4
}

// Draw a single activity block — returns new Y
// avoidBottom: if less than this Y before drawing, add new page
function drawActivityBlock(doc: any, link: PDFLink, num: number, y: number, avoidBottom: number, addPage: () => number): number {
  const tpl = link.activityTemplate
  const catName = tpl.actCategory?.name || tpl.category || ""
  const itemsToShow: PDFItem[] = link.itemLinks.length > 0 ? link.itemLinks.map(il => il.item) : tpl.items

  // Estimate minimum height needed to at least show header
  if (y + 30 > avoidBottom) { y = addPage() }

  // Activity header bar
  doc.setFillColor(241, 245, 249); doc.rect(ML, y, UW, 11, "F")
  doc.setDrawColor(203, 213, 225); doc.rect(ML, y, UW, 11, "S")

  let xi = ML + 3
  if (catName) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139)
    txt(doc, catName.toUpperCase(), xi, y + 4.2)
    xi += doc.getTextWidth(catName.toUpperCase()) + 3
    doc.setFillColor(100, 116, 139); doc.circle(xi - 1.5, y + 3.5, 0.6, "F")
    xi += 1
  }

  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(15, 23, 42)
  txt(doc, `${num}. ${tpl.name}`, xi, y + 4.2)

  doc.setFontSize(7.5); doc.setTextColor(100, 116, 139)
  txt(doc, `Incluído: ${fmtDate(link.includedAt)}`, ML + UW - 3, y + 4.2, { align: "right" })
  txt(doc, `${link.itemLinks.length > 0 ? link.itemLinks.length : itemsToShow.length} item(s)`, ML + UW - 3, y + 8.8, { align: "right" })

  y += 13

  // Description
  if (tpl.description) {
    const lines = wrap(doc, tpl.description, UW - 6)
    if (y + lines.length * 4 + 4 > avoidBottom) { y = addPage() }
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(71, 85, 105)
    lines.forEach((l, i) => txt(doc, l, ML + 3, y + 4 + i * 4))
    y += lines.length * 4 + 6
  }

  // Specific observation from the link
  if (link.observation) {
    const lines = wrap(doc, link.observation, UW - 10)
    const boxH = lines.length * 4 + 7
    if (y + boxH > avoidBottom) { y = addPage() }
    doc.setFillColor(255, 247, 237); doc.rect(ML, y, UW, boxH, "F")
    doc.setDrawColor(253, 186, 116); doc.rect(ML, y, UW, boxH, "S")
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(154, 52, 18)
    txt(doc, "Observação específica do colaborador:", ML + 3, y + 4.5)
    doc.setFont("helvetica", "italic")
    lines.forEach((l, i) => txt(doc, l, ML + 3, y + 9 + i * 4))
    y += boxH + 4
  }

  // Items list
  if (itemsToShow.length > 0) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(51, 65, 85)
    if (y + 5 > avoidBottom) { y = addPage() }
    txt(doc, "ETAPAS / ITENS:", ML + 3, y + 4)
    y += 7

    itemsToShow.forEach((item, idx) => {
      const titleLines = wrap(doc, `${idx + 1}. ${item.title}`, UW - 10)
      const descLines = item.description ? wrap(doc, item.description, UW - 16) : []
      const itemH = titleLines.length * 4 + descLines.length * 3.8 + 7

      if (y + itemH > avoidBottom) { y = addPage() }

      // Item background
      if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(ML + 3, y - 1, UW - 3, itemH, "F") }

      // Left accent bar
      doc.setFillColor(148, 163, 184); doc.rect(ML + 3, y - 1, 1.5, itemH, "F")

      // Title
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(15, 23, 42)
      titleLines.forEach((l, li) => txt(doc, l, ML + 7, y + 3 + li * 4))
      let itemY = y + titleLines.length * 4 + 2

      // Description
      if (descLines.length > 0) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(71, 85, 105)
        descLines.forEach((l, li) => txt(doc, l, ML + 9, itemY + li * 3.8))
        itemY += descLines.length * 3.8 + 1
      }

      y = itemY + 3
    })
  }

  y += 6
  // Thin separator
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2)
  doc.line(ML, y - 3, ML + UW, y - 3)

  return y
}

// ── Geração do PDF individual ──────────────────────────────────────────────────

export async function generateMemberPDF(member: PDFMember, links: PDFLink[]): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const avoidBottom = PH - MB - 8

  const totalItems = links.reduce((s, l) => s + Math.max(l.itemLinks.length, l.activityTemplate.items.length), 0)

  // Título
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(15, 23, 42)
  doc.text("RELATÓRIO DE ATIVIDADES DO COLABORADOR", PW / 2, MT, { align: "center" })

  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139)
  doc.text(`Gerado em: ${nowFormatted()}`, PW / 2, MT + 6, { align: "center" })

  let y = MT + 12
  y = drawMemberHeader(doc, member, links.length, totalItems, y)

  let pageNum_ = 1
  function addPage(): number {
    doc.addPage(); pageNum_++; return MT
  }

  for (let i = 0; i < links.length; i++) {
    y = drawActivityBlock(doc, links[i], i + 1, y, avoidBottom, addPage)
  }

  // Numeração
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) { doc.setPage(p); pageNum(doc, p, total) }

  doc.save(`Atividades_${safeFilename(member.name)}_${todayISO()}.pdf`)
}

// ── Geração do PDF geral ───────────────────────────────────────────────────────

export async function generateAllMembersPDF(groups: PDFGroup[]): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const avoidBottom = PH - MB - 8

  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(15, 23, 42)
  doc.text("RELATÓRIO GERAL DE ATIVIDADES DOS COLABORADORES", PW / 2, MT, { align: "center" })
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139)
  doc.text(`Gerado em: ${nowFormatted()}`, PW / 2, MT + 6, { align: "center" })

  let y = MT + 14
  let pageNum_ = 1

  function addPage(): number { doc.addPage(); pageNum_++; return MT }

  for (const group of groups) {
    const totalItems = group.links.reduce((s, l) => s + Math.max(l.itemLinks.length, l.activityTemplate.items.length), 0)
    if (y + 40 > avoidBottom) { y = addPage() }
    y = drawMemberHeader(doc, group.member, group.links.length, totalItems, y)
    for (let i = 0; i < group.links.length; i++) {
      y = drawActivityBlock(doc, group.links[i], i + 1, y, avoidBottom, addPage)
    }
    y += 6
  }

  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) { doc.setPage(p); pageNum(doc, p, total) }

  doc.save(`Atividades_Colaboradores_${todayISO()}.pdf`)
}
