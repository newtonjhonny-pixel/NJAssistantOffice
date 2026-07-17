"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn, PRIORITY_LABELS, STATUS_LABELS, formatDate } from "@/lib/utils"

// ─── TIPOS ─────────────────────────────────────────────────────────────────────

export interface ExportTask {
  id: string; title: string; status: string; priority: string
  origin: string | null
  taskOrigin: { name: string; icon: string; color: string } | null
  person: string | null; responsible: string | null
  dueDate: string | null; receivedAt: string | null
  createdAt: string; updatedAt: string
  description: string | null; observations: string | null
  _count?: { attachments: number }
}

export interface ExportGroup { key: string; tasks: ExportTask[] }

interface ExportButtonsProps {
  sorted:      ExportTask[]
  grouped:     ExportGroup[]
  title:       string
  groupField:  string   // "none" = sem agrupamento
  filenameBase: string  // ex: "Lista_Tarefas"
  className?:  string
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function getTs() {
  const d = new Date(), p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`
}

function calcDiff(dateStr: string): number {
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(dateStr); d.setHours(0,0,0,0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

function originName(task: ExportTask) {
  return task.taskOrigin?.name ?? task.origin ?? ""
}

// ─── GERAÇÃO DO PDF ────────────────────────────────────────────────────────────

function buildPdfHtml(
  tasks: ExportTask[],
  grouped: ExportGroup[],
  title: string,
  groupField: string
): string {
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
  const isActive = (t: ExportTask) => t.status !== "CONCLUIDA" && t.status !== "CANCELADA"

  const counts = {
    total:      tasks.length,
    pendentes:  tasks.filter(t => t.status === "PENDENTE").length,
    andamento:  tasks.filter(t => t.status === "EM_ANDAMENTO").length,
    aguardando: tasks.filter(t => t.status === "AGUARDANDO_RETORNO").length,
    concluidas: tasks.filter(t => t.status === "CONCLUIDA").length,
    canceladas: tasks.filter(t => t.status === "CANCELADA").length,
    atrasadas:  tasks.filter(t => isActive(t) && !!t.dueDate && calcDiff(t.dueDate) < 0).length,
  }

  function taskHtml(task: ExportTask): string {
    const overdue = isActive(task) && !!task.dueDate && calcDiff(task.dueDate) < 0
    const diff    = task.dueDate ? calcDiff(task.dueDate) : null
    const prazoLabel = diff === null ? ""
      : diff < 0  ? `⚠️ Atrasada há ${Math.abs(diff)} dia(s)`
      : diff === 0 ? "Vence hoje"
      : `Faltam ${diff} dia(s)`
    const origin = originName(task)

    const fields = [
      task.person      && `<div class="field"><span class="fl">Solicitante</span><span class="fv">${esc(task.person)}</span></div>`,
      task.responsible && `<div class="field"><span class="fl">Responsável</span><span class="fv">${esc(task.responsible)}</span></div>`,
      origin           && `<div class="field"><span class="fl">Origem</span><span class="fv">${esc(origin)}</span></div>`,
      task.dueDate     && `<div class="field"><span class="fl">Prazo</span><span class="fv">${formatDate(task.dueDate)}${prazoLabel ? ` — ${prazoLabel}` : ""}</span></div>`,
      task.receivedAt  && `<div class="field"><span class="fl">Recebida em</span><span class="fv">${formatDate(task.receivedAt)}</span></div>`,
      `<div class="field"><span class="fl">Criada em</span><span class="fv">${formatDate(task.createdAt)}</span></div>`,
      `<div class="field"><span class="fl">Atualizada em</span><span class="fv">${formatDate(task.updatedAt)}</span></div>`,
    ].filter(Boolean).join("")

    return `
<div class="task${overdue ? " overdue" : ""}">
  <div class="ttitle">${esc(task.title)}</div>
  <div class="badges">
    <span class="badge p-${task.priority.toLowerCase()}">${PRIORITY_LABELS[task.priority] ?? task.priority}</span>
    <span class="badge s-${task.status.toLowerCase()}">${STATUS_LABELS[task.status] ?? task.status}</span>
    ${origin ? `<span class="badge b-origin">${esc(origin)}</span>` : ""}
  </div>
  <div class="fields">${fields}</div>
  ${task.description ? `<div class="tdesc"><strong>Descrição:</strong> ${esc(truncate(task.description, 300))}</div>` : ""}
  ${task.observations ? `<div class="tdesc"><strong>Observações:</strong> ${esc(truncate(task.observations, 200))}</div>` : ""}
</div>`
  }

  const bodyHtml = groupField === "none"
    ? tasks.map(taskHtml).join("")
    : grouped.map(g => `
<div class="gsection">
  <div class="gheader">${esc(g.key)} <span class="gcnt">(${g.tasks.length})</span></div>
  ${g.tasks.map(taskHtml).join("")}
</div>`).join("")

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:10px;color:#1e293b;padding:20px;max-width:960px;margin:0 auto}
@media print{body{padding:0;font-size:9px}@page{margin:1.5cm}}
.hd{text-align:center;border-bottom:2px solid #1e40af;padding-bottom:10px;margin-bottom:14px}
.logo{font-size:20px;font-weight:800;color:#1e40af}.logo span{color:#64748b;font-weight:400}
.doctitle{font-size:15px;font-weight:700;color:#0f172a;margin-top:3px}
.meta{font-size:8.5px;color:#94a3b8;margin-top:3px}
.summary{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:16px;padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
.si{text-align:center;min-width:66px}.si .v{font-size:18px;font-weight:700;color:#1e40af}.si .l{font-size:8px;color:#64748b;margin-top:1px}
.gsection{margin-bottom:14px}
.gheader{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#475569;border-bottom:2px solid #e2e8f0;padding:5px 0 3px;margin-bottom:7px}
.gcnt{font-weight:400;color:#94a3b8}
.task{border:1px solid #e2e8f0;border-radius:5px;padding:9px 11px;margin-bottom:7px;page-break-inside:avoid;background:#fff}
.task.overdue{border-color:#fecaca;background:#fff5f5}
.ttitle{font-size:11px;font-weight:600;color:#0f172a;margin-bottom:5px}
.badges{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:5px}
.badge{font-size:8px;border:1px solid #e2e8f0;border-radius:100px;padding:1px 6px}
.p-urgente{background:#fff1f2;border-color:#fecdd3;color:#be123c}
.p-alta{background:#fff7ed;border-color:#fed7aa;color:#c2410c}
.p-media{background:#fefce8;border-color:#fde68a;color:#92400e}
.p-baixa{background:#f0fdf4;border-color:#bbf7d0;color:#15803d}
.s-concluida{background:#f0fdf4;border-color:#bbf7d0;color:#15803d}
.s-cancelada{background:#f8fafc;border-color:#cbd5e1;color:#64748b}
.s-em_andamento{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.s-aguardando_retorno{background:#faf5ff;border-color:#e9d5ff;color:#7c3aed}
.b-origin{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.fields{display:grid;grid-template-columns:repeat(3,1fr);gap:2px 10px;margin-bottom:3px}
.field{display:flex;flex-direction:column}
.fl{font-size:7.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
.fv{font-size:8.5px;color:#334155}
.tdesc{font-size:8.5px;color:#475569;border-top:1px solid #f1f5f9;margin-top:5px;padding-top:4px;line-height:1.4}
.footer{margin-top:20px;border-top:1px solid #e2e8f0;padding-top:7px;text-align:center;font-size:7.5px;color:#94a3b8}
</style>
</head>
<body>
<div class="hd">
  <div class="logo">NJ<span> Assistant Office</span></div>
  <div class="doctitle">${esc(title)}</div>
  <div class="meta">Gerado em ${now} · Usuário: Newton · ${tasks.length} tarefa(s)</div>
</div>
<div class="summary">
  <div class="si"><div class="v">${counts.total}</div><div class="l">Total</div></div>
  <div class="si"><div class="v" style="color:#ca8a04">${counts.pendentes}</div><div class="l">Pendentes</div></div>
  <div class="si"><div class="v" style="color:#2563eb">${counts.andamento}</div><div class="l">Em andamento</div></div>
  <div class="si"><div class="v" style="color:#7c3aed">${counts.aguardando}</div><div class="l">Aguardando</div></div>
  <div class="si"><div class="v" style="color:#16a34a">${counts.concluidas}</div><div class="l">Concluídas</div></div>
  <div class="si"><div class="v" style="color:#6b7280">${counts.canceladas}</div><div class="l">Canceladas</div></div>
  <div class="si"><div class="v" style="color:#dc2626">${counts.atrasadas}</div><div class="l">Atrasadas</div></div>
</div>
${bodyHtml}
<div class="footer">NJ Assistant Office · Exportado em ${now}</div>
</body>
</html>`
}

function esc(s: string) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")
}
function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s
}

// ─── COMPONENTE ────────────────────────────────────────────────────────────────

export function ExportButtons({ sorted, grouped, title, groupField, filenameBase, className }: ExportButtonsProps) {
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null)

  function handleExportPdf() {
    if (!sorted.length) return
    setExporting("pdf")
    try {
      const html = buildPdfHtml(sorted, grouped, title, groupField)
      const win  = window.open("", "_blank", "width=1000,height=800")
      if (!win) return
      win.document.open()
      win.document.write(html)
      win.document.close()
      setTimeout(() => { win.print(); setExporting(null) }, 700)
    } catch {
      setExporting(null)
    }
  }

  async function handleExportExcel() {
    if (!sorted.length) return
    setExporting("excel")
    try {
      const ts  = getTs()
      const res = await fetch("/api/export/excel", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tasks: sorted, title, filename: `${filenameBase}_${ts}` }),
      })
      if (!res.ok) throw new Error("Falha ao gerar Excel")
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `${filenameBase}_${ts}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  const disabled = exporting !== null || sorted.length === 0

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        size="sm"
        variant="outline"
        onClick={handleExportPdf}
        disabled={disabled}
        title={sorted.length === 0 ? "Nenhuma tarefa para exportar" : "Exportar PDF"}
        className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-8 px-3"
      >
        {exporting === "pdf"
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Download className="w-3.5 h-3.5" />
        }
        PDF
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleExportExcel}
        disabled={disabled}
        title={sorted.length === 0 ? "Nenhuma tarefa para exportar" : "Exportar Excel"}
        className="text-green-700 border-green-200 hover:bg-green-50 text-xs h-8 px-3"
      >
        {exporting === "excel"
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Download className="w-3.5 h-3.5" />
        }
        Excel
      </Button>
    </div>
  )
}
