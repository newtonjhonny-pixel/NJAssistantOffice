"use client"

// ─── Types (espelha os tipos do editor) ───────────────────────────────────────

export type StepStatus  = "not_started"|"planned"|"in_progress"|"waiting"|"blocked"|"done"|"cancelled"
export type NodeType    = "start"|"middle"|"milestone"|"end"
export type ProjStatus  = "idea"|"planned"|"in_progress"|"waiting"|"done"|"cancelled"|"late"
export type Priority    = "low"|"medium"|"high"|"critical"

export interface MapStep {
  id: string; number: number; title: string; description: string
  responsible: string; startDate: string; endDate: string; endDateActual: string
  status: StepStatus; progress: number; notes: string; deliverable: string
  dependsOn: string | null; system: string; nodeType: NodeType
}

export interface MapProject {
  id: string; code: string; name: string; objective: string; description: string
  responsible: string; team: string; status: ProjStatus; priority: Priority
  startDate: string; endDate: string; progress: number; progressManual: boolean
  category: string; systems: string; processes: string; color: string; steps: MapStep[]
}

export interface ProjectMapData {
  title: string; subtitle: string; projects: MapProject[]
  view: "detailed"|"executive"; showDependencies: boolean; crossDeps: any[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function calcProgress(p: MapProject): number {
  if (p.progressManual) return p.progress
  if (!p.steps.length) return 0
  const done = p.steps.filter(s => s.status === "done").length
  return Math.round((done / p.steps.length) * 100)
}

// Hex colors mapeando as classes Tailwind usadas no editor
const STEP_COLORS: Record<StepStatus, { bg: string; border: string; text: string }> = {
  not_started: { bg: "#f8fafc", border: "#e2e8f0", text: "#64748b" },
  planned:     { bg: "#eff6ff", border: "#bfdbfe", text: "#2563eb" },
  in_progress: { bg: "#fffbeb", border: "#fcd34d", text: "#d97706" },
  waiting:     { bg: "#faf5ff", border: "#e9d5ff", text: "#9333ea" },
  blocked:     { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626" },
  done:        { bg: "#ecfdf5", border: "#6ee7b7", text: "#059669" },
  cancelled:   { bg: "#f1f5f9", border: "#e2e8f0", text: "#94a3b8" },
}

const PROJ_STATUS_COLOR: Record<ProjStatus, string> = {
  idea: "#94a3b8", planned: "#3b82f6", in_progress: "#f59e0b",
  waiting: "#a855f7", done: "#10b981", cancelled: "#94a3b8", late: "#ef4444",
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s
}

// ─── Canvas helper: round rect ────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2
  if (h < 2 * r) r = h / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Canvas helper: wrap text, returns next Y
function fillTextWrapped(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines = 2,
): number {
  if (!text) return y
  const words = text.split(" ")
  let line = ""
  let lines = 0
  for (let i = 0; i < words.length && lines < maxLines; i++) {
    const test = line ? line + " " + words[i] : words[i]
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(lines === maxLines - 1 ? truncate(line, 25) : line, x, y)
      y += lineH
      line = words[i]
      lines++
    } else {
      line = test
    }
  }
  if (line && lines < maxLines) {
    ctx.fillText(truncate(line, 28), x, y)
    y += lineH
  }
  return y
}

// ─── CANVAS RENDERER (usado por PDF e prévia) ─────────────────────────────────

interface CanvasLayout {
  W: number; H: number
  MARGIN: number; TITLE_H: number; SUB_H: number; GAP: number
  PROJ_CARD_W: number; CONN_W: number
  rowH: number; stepW: number; stepH: number
  contentX: number; contentY: number; contentW: number
  fontScale: number
}

function computeLayout(data: ProjectMapData, W: number, H: number): CanvasLayout {
  const MARGIN      = Math.round(W * 0.018)
  const TITLE_H     = Math.round(H * 0.075)
  const SUB_H       = Math.round(H * 0.038)
  const GAP         = Math.round(H * 0.008)

  const contentX    = MARGIN
  const contentY    = MARGIN + TITLE_H + SUB_H + GAP
  const contentW    = W - 2 * MARGIN
  const contentH    = H - contentY - MARGIN

  const numProj     = Math.max(data.projects.length, 1)
  const maxSteps    = Math.max(...data.projects.map(p => p.steps.length), 1)

  const rowH        = Math.floor((contentH - GAP * (numProj - 1)) / numProj)
  const PROJ_CARD_W = Math.min(Math.round(contentW * 0.13), 200)
  const CONN_W      = Math.max(20, Math.round(W * 0.012))

  const stepsAreaW  = contentW - PROJ_CARD_W - GAP
  const stepW       = Math.max(72, Math.floor((stepsAreaW - CONN_W * (maxSteps - 1)) / maxSteps))
  const stepH       = Math.round(rowH * 0.82)

  const fontScale   = Math.min(1, rowH / 90)

  return { W, H, MARGIN, TITLE_H, SUB_H, GAP, PROJ_CARD_W, CONN_W, rowH, stepW, stepH, contentX, contentY, contentW, fontScale }
}

function renderProjectMapToCanvas(data: ProjectMapData, W: number, H: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext("2d")!

  const l = computeLayout(data, W, H)
  const { MARGIN, TITLE_H, SUB_H, GAP, PROJ_CARD_W, CONN_W, rowH, stepW, stepH, contentX, contentY, contentW, fontScale } = l

  // Fundo branco
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, W, H)

  // Linha de cabeçalho sutil
  ctx.fillStyle = "#f1f5f9"
  ctx.fillRect(0, 0, W, MARGIN + TITLE_H + SUB_H + GAP * 0.5)

  // Título
  const titleSize = Math.max(14, Math.round(H * 0.032))
  ctx.font        = `bold ${titleSize}px Arial, sans-serif`
  ctx.fillStyle   = "#1e293b"
  ctx.textBaseline = "top"
  ctx.fillText(data.title, MARGIN, Math.round(MARGIN * 1.2))

  // Subtítulo
  if (data.subtitle) {
    const subSize = Math.max(10, Math.round(H * 0.018))
    ctx.font      = `${subSize}px Arial, sans-serif`
    ctx.fillStyle = "#64748b"
    ctx.fillText(data.subtitle, MARGIN, Math.round(MARGIN * 1.2) + titleSize + 6)
  }

  // Swimlanes
  data.projects.forEach((proj, pi) => {
    const rowY   = contentY + pi * (rowH + GAP)
    const pct    = calcProgress(proj)
    const sc     = STEP_COLORS

    // Fundo da linha (alternado)
    ctx.fillStyle = pi % 2 === 0 ? "#f8fafc" : "#ffffff"
    roundRect(ctx, contentX, rowY, contentW, rowH, 8)
    ctx.fill()

    // Separador leve
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth   = 1
    ctx.stroke()

    // ── Project card ──────────────────────────────────────────────────────────

    const pcX = contentX + 4
    const pcY = rowY + Math.round(rowH * 0.08)
    const pcH = Math.round(rowH * 0.84)
    const pcW = PROJ_CARD_W - 8

    ctx.fillStyle   = "#ffffff"
    roundRect(ctx, pcX, pcY, pcW, pcH, 6)
    ctx.fill()

    ctx.strokeStyle = proj.color + "55"
    ctx.lineWidth   = 1
    ctx.stroke()

    // Barra lateral colorida
    ctx.fillStyle = proj.color
    roundRect(ctx, pcX, pcY, 4, pcH, 2)
    ctx.fill()

    // Código do projeto
    const codeSize = Math.max(8, Math.round(12 * fontScale))
    ctx.font        = `bold ${codeSize}px Arial, sans-serif`
    ctx.fillStyle   = "#94a3b8"
    ctx.textBaseline = "top"
    ctx.fillText(proj.code, pcX + 10, pcY + 6)

    // Nome do projeto
    const nameSize  = Math.max(9, Math.round(13 * fontScale))
    ctx.font        = `bold ${nameSize}px Arial, sans-serif`
    ctx.fillStyle   = "#1e293b"
    const nameY     = pcY + codeSize + 10
    fillTextWrapped(ctx, proj.name, pcX + 10, nameY, pcW - 16, nameSize + 3)

    // Status + %
    const statusSize = Math.max(7, Math.round(10 * fontScale))
    ctx.font         = `${statusSize}px Arial, sans-serif`
    ctx.fillStyle    = PROJ_STATUS_COLOR[proj.status]
    const statusY    = pcY + pcH - statusSize - 10
    const STATUS_LBL: Record<string, string> = {
      idea:"Ideia",planned:"Planejado",in_progress:"Em andamento",
      waiting:"Aguardando",done:"Concluído",cancelled:"Cancelado",late:"Atrasado",
    }
    ctx.fillText(`${STATUS_LBL[proj.status] ?? proj.status} · ${pct}%`, pcX + 10, statusY)

    // Barra de progresso
    const barY  = statusY + statusSize + 3
    const barW  = pcW - 20
    const barH  = 4
    ctx.fillStyle = "#e2e8f0"
    roundRect(ctx, pcX + 10, barY, barW, barH, 2)
    ctx.fill()
    if (pct > 0) {
      ctx.fillStyle = proj.color
      roundRect(ctx, pcX + 10, barY, Math.round(barW * pct / 100), barH, 2)
      ctx.fill()
    }

    // ── Steps ─────────────────────────────────────────────────────────────────

    const stepsX = contentX + PROJ_CARD_W + GAP
    proj.steps.forEach((step, si) => {
      const sx    = stepsX + si * (stepW + CONN_W)
      const sy    = rowY + Math.round((rowH - stepH) / 2)
      const scfg  = STEP_COLORS[step.status]

      // Card de etapa
      ctx.fillStyle   = scfg.bg
      roundRect(ctx, sx, sy, stepW, stepH, 6)
      ctx.fill()
      ctx.strokeStyle = scfg.border
      ctx.lineWidth   = 1.5
      ctx.stroke()

      // Badge INÍCIO / FIM / MARCO
      if (step.nodeType === "start" || step.nodeType === "end" || step.nodeType === "milestone") {
        const badgeLabel = step.nodeType === "start" ? "INÍCIO" : step.nodeType === "end" ? "FIM" : "MARCO"
        const badgeColor = step.nodeType === "milestone" ? "#f59e0b" : proj.color
        const badgeW     = step.nodeType === "start" ? 32 : step.nodeType === "end" ? 22 : 32
        const badgeH     = 11
        ctx.fillStyle    = badgeColor
        roundRect(ctx, sx + 5, sy - 1, badgeW, badgeH, 3)
        ctx.fill()
        ctx.font         = `bold 7px Arial, sans-serif`
        ctx.fillStyle    = "#ffffff"
        ctx.textBaseline = "middle"
        ctx.fillText(badgeLabel, sx + 7, sy + 4.5)
        ctx.textBaseline = "top"
      }

      // Nº da etapa
      const numSize = Math.max(7, Math.round(9 * fontScale))
      ctx.font      = `bold ${numSize}px Arial, sans-serif`
      ctx.fillStyle = scfg.text
      ctx.textBaseline = "top"
      ctx.fillText(`${step.number}`, sx + 6, sy + 9)

      // Título da etapa
      const titleSize2 = Math.max(7, Math.round(10 * fontScale))
      ctx.font         = `bold ${titleSize2}px Arial, sans-serif`
      ctx.fillStyle    = "#1e293b"
      fillTextWrapped(ctx, step.title, sx + 6, sy + numSize + 12, stepW - 12, titleSize2 + 2, 2)

      // Barra de progresso da etapa
      if (step.progress > 0) {
        const spBarY  = sy + stepH - 8
        const spBarW  = stepW - 12
        ctx.fillStyle = "#e2e8f0"
        roundRect(ctx, sx + 6, spBarY, spBarW, 3, 1)
        ctx.fill()
        ctx.fillStyle = proj.color
        roundRect(ctx, sx + 6, spBarY, Math.round(spBarW * step.progress / 100), 3, 1)
        ctx.fill()
      }

      // Conector →  (exceto na última etapa)
      if (si < proj.steps.length - 1) {
        const arrowStartX = sx + stepW + 2
        const arrowEndX   = sx + stepW + CONN_W - 4
        const arrowY      = rowY + Math.round(rowH / 2)

        ctx.strokeStyle = proj.color + "88"
        ctx.lineWidth   = 1.5
        ctx.beginPath()
        ctx.moveTo(arrowStartX, arrowY)
        ctx.lineTo(arrowEndX - 1, arrowY)
        ctx.stroke()

        // Cabeça da seta
        ctx.fillStyle = proj.color
        ctx.beginPath()
        ctx.moveTo(arrowEndX - 5, arrowY - 4)
        ctx.lineTo(arrowEndX,     arrowY)
        ctx.lineTo(arrowEndX - 5, arrowY + 4)
        ctx.fill()
      }
    })
  })

  return canvas
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. EXPORTAR PDF (A3 Paisagem)
// ═══════════════════════════════════════════════════════════════════════════════

export async function exportProjectMapPdf(data: ProjectMapData, filename: string): Promise<void> {
  const { jsPDF } = await import("jspdf")

  // A3 landscape em pixels a 150dpi: 420mm × 297mm
  const MM_TO_PX = 150 / 25.4
  const W = Math.round(420 * MM_TO_PX)   // ~2480
  const H = Math.round(297 * MM_TO_PX)   // ~1754

  const canvas  = renderProjectMapToCanvas(data, W, H)
  const dataUrl = canvas.toDataURL("image/png")

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" })
  const pageW   = pdf.internal.pageSize.getWidth()   // 420mm
  const pageH   = pdf.internal.pageSize.getHeight()  // 297mm
  const margin  = 5
  const imgW    = pageW - margin * 2
  const imgH    = pageH - margin * 2

  pdf.addImage(dataUrl, "PNG", margin, margin, imgW, imgH)
  pdf.save(`${filename}.pdf`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. EXPORTAR POWERPOINT (via API server-side — pptxgenjs usa node:fs)
// ═══════════════════════════════════════════════════════════════════════════════

export async function exportProjectMapPptx(data: ProjectMapData, filename: string): Promise<void> {
  const res = await fetch("/api/apresentacoes/export", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ content: JSON.stringify(data), title: filename, type: "project-map" }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }))
    throw new Error(err.error ?? "Falha ao gerar PPTX")
  }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.download = `${filename}.pptx`
  link.href     = url
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. EXPORTAR EXCEL (via API server-side — exceljs usa módulos Node.js)
// ═══════════════════════════════════════════════════════════════════════════════

export async function exportProjectMapExcel(data: ProjectMapData, filename: string): Promise<void> {
  const res = await fetch("/api/apresentacoes/export/excel", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ content: JSON.stringify(data), title: filename }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }))
    throw new Error(err.error ?? "Falha ao gerar Excel")
  }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.download = `${filename}.xlsx`
  link.href     = url
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. GERAR PRÉVIA (retorna canvas como dataURL)
// ═══════════════════════════════════════════════════════════════════════════════

export function generatePreviewDataUrl(data: ProjectMapData): string {
  // A4 landscape a 96dpi para prévia rápida
  const W = 1123
  const H = 794
  const canvas = renderProjectMapToCanvas(data, W, H)
  return canvas.toDataURL("image/png")
}
