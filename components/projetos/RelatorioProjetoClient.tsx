"use client"

import { useState } from "react"
import {
  Bot, X, Loader2, Printer, FileSpreadsheet, Info,
  Clock, Layers, ListChecks, Flag, AlertTriangle,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectTask {
  id: string; title: string; responsible: string | null
  startDate: string | null; dueDate: string | null
  status: string; priority: string; progress: number
  stageId: string | null; createdAt: string
}

interface ProjectStage {
  id: string; name: string; order: number
  startDate: string | null; dueDate: string | null
  status: string; progress: number
  tasks: ProjectTask[]
}

interface ProjectMilestone {
  id: string; title: string; description: string | null
  dueDate: string | null; completedAt: string | null; status: string; createdAt: string
}

interface ProjectHistoryItem {
  id: string; type: string; title: string; description: string | null; createdAt: string
}

interface ProjectDetail {
  id: string; name: string; description: string | null; objective: string | null
  responsible: string | null; startDate: string | null; dueDate: string | null
  priority: string; status: string; progress: number; notes: string | null
  isOverdue: boolean; totalDays: number | null; elapsedDays: number | null
  remainDays: number | null; totalTasks: number; doneTasks: number
  stages: ProjectStage[]; tasks: ProjectTask[]
  milestones: ProjectMilestone[]; history: ProjectHistoryItem[]
}

interface IAResult { content: string; aiPowered: boolean; aiConfigured: boolean }

// ─── Labels ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PLANEJADO: "Planejado", EM_ANDAMENTO: "Em andamento",
  PAUSADO: "Pausado",     ATRASADO: "Atrasado",
  CONCLUIDO: "Concluído", CANCELADO: "Cancelado",
}
const PRIORITY_LABEL: Record<string, string> = {
  BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", URGENTE: "Urgente",
}
const STAGE_STATUS_LABEL: Record<string, string> = {
  NAO_INICIADA: "Não iniciada", EM_ANDAMENTO: "Em andamento",
  AGUARDANDO: "Aguardando",     CONCLUIDA: "Concluída",
  ATRASADA: "Atrasada",         CANCELADA: "Cancelada",
}
const TASK_STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",               EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_RETORNO: "Ag. retorno",  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",             ATRASADA: "Atrasada",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function kpiValue(v: number | null | undefined, suffix = ""): string {
  if (v === null || v === undefined) return "—"
  return `${v}${suffix}`
}

function esc(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—"
  const s = d.slice(0, 10)
  const [y, m, day] = s.split("-")
  return `${day}/${m}/${y}`
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob(["﻿" + content], { type: mime })
  const a    = document.createElement("a")
  a.href     = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

// ─── PDF HTML builder ─────────────────────────────────────────────────────────
// Opens a blank popup window, writes a standalone HTML document, then prints it.
// The blank window URL is "about:blank" — the browser never shows localhost/path.
// @page { margin: 0 } + body padding eliminates browser-generated header/footer.

function buildReportHTML(p: ProjectDetail, iaContent: string | null, emitDate: string): string {
  const doneStages     = p.stages.filter(s => s.status === "CONCLUIDA").length
  const doneMilestones = p.milestones.filter(m => m.status === "CONCLUIDA").length
  const lateTasks      = p.tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() &&
    t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
  ).length
  const productivity = p.totalTasks > 0 ? Math.round((p.doneTasks / p.totalTasks) * 100) : 0

  const css = `
    @charset "UTF-8";
    @page {
      size: A4 portrait;
      /* margin: 0 suppresses browser-generated URL / page-number in header-footer */
      margin: 0;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
      font-size: 10.5pt;
      color: #1e293b;
      background: white;
      /* all page margins live here, not in @page */
      padding: 14mm 16mm 14mm 16mm;
    }

    /* ── Typography ─────────────────────────────────────────────────────── */
    h1 { font-size: 20pt; font-weight: 800; color: #1e293b; margin-bottom: 4pt; }
    h2 { font-size: 13pt; font-weight: 700; color: #6366f1; margin-bottom: 2pt; }
    /*
     * break-after: avoid keeps h3 glued to whatever follows it.
     * If there is not enough room for h3 + first table row on the current
     * page, the entire h3 moves to the next page — preventing orphaned titles.
     */
    h3 {
      font-size: 11pt; font-weight: 700; color: #1e293b;
      margin: 14pt 0 6pt; border-bottom: 1.5pt solid #e2e8f0; padding-bottom: 4pt;
      break-after: avoid;
      page-break-after: avoid;
    }
    p { font-size: 10pt; color: #475569; line-height: 1.55; margin-bottom: 4pt; }

    /* ── Cover ──────────────────────────────────────────────────────────── */
    .cover { border-bottom: 3pt solid #6366f1; padding-bottom: 14pt; margin-bottom: 16pt; }
    .cover-meta { font-size: 9.5pt; color: #64748b; margin-top: 6pt; }

    /* ── KPI grid ───────────────────────────────────────────────────────── */
    /*
     * Use a table-based layout instead of CSS grid — CSS grid columns can
     * collapse in some print engines; table cells are guaranteed equal width.
     */
    .kpi-table { width: 100%; border-collapse: separate; border-spacing: 5pt; margin-bottom: 10pt; }
    .kpi-card {
      border: 1pt solid #e2e8f0; border-radius: 6pt; padding: 7pt 9pt;
      background: #f8fafc; vertical-align: top; width: 25%;
      break-inside: avoid; page-break-inside: avoid;
    }
    .kpi-card.accent { border-color: #c7d2fe; background: #eef2ff; }
    .kpi-label { font-size: 8pt; color: #64748b; margin-bottom: 3pt; }
    .kpi-value { font-size: 15pt; font-weight: 800; color: #1e293b; display: block; }
    .kpi-card.accent .kpi-value { color: #4f46e5; }
    .kpi-sub { font-size: 7.5pt; color: #94a3b8; margin-top: 2pt; display: block; }

    /* ── Meta table ─────────────────────────────────────────────────────── */
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 6pt; }
    .meta-table td { font-size: 9.5pt; padding: 4pt 7pt; vertical-align: top; border-bottom: 1pt solid #f1f5f9; }
    .meta-table td:first-child { color: #64748b; font-weight: 600; width: 28%; }
    .meta-table tr:nth-child(even) td { background: #f8fafc; }
    .meta-table tr { break-inside: avoid; page-break-inside: avoid; }

    /* ── Data tables ────────────────────────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      /* auto allows the table to break across pages */
      break-inside: auto;
      page-break-inside: auto;
      margin-bottom: 6pt;
    }
    /* thead repeats on every printed page when table spans multiple pages */
    thead { display: table-header-group; }
    tbody { display: table-row-group; }
    thead tr { background: #6366f1; }
    thead th {
      font-size: 8.5pt; font-weight: 700; color: white;
      padding: 5pt 7pt; text-align: left;
      word-break: break-word;
    }
    /* each data row stays on one page — never split mid-row */
    tbody tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    tbody td {
      font-size: 9.5pt; padding: 4.5pt 7pt; border-bottom: 1pt solid #f1f5f9;
      color: #374151; vertical-align: top;
      word-break: break-word;
    }
    tbody td.bold { font-weight: 600; color: #1e293b; }

    /* ── Progress bar ───────────────────────────────────────────────────── */
    .bar-wrap { background: #e2e8f0; border-radius: 99pt; height: 5pt; width: 70pt; display: inline-block; vertical-align: middle; }
    .bar-fill { background: #6366f1; border-radius: 99pt; height: 5pt; }
    .bar-fill.done { background: #22c55e; }

    /* ── Timeline ───────────────────────────────────────────────────────── */
    .timeline-item {
      display: flex; gap: 8pt; padding: 5pt 0; border-bottom: 1pt solid #f1f5f9;
      break-inside: avoid; page-break-inside: avoid;
    }
    .timeline-date { font-size: 8.5pt; color: #94a3b8; min-width: 55pt; flex-shrink: 0; }
    .timeline-title { font-size: 9.5pt; font-weight: 600; color: #1e293b; }
    .timeline-desc { font-size: 9pt; color: #64748b; margin-top: 1pt; }

    /* ── IA analysis ────────────────────────────────────────────────────── */
    .ia-box { background: #faf5ff; border: 1pt solid #ddd6fe; border-radius: 6pt; padding: 10pt 12pt; }
    .ia-box h4 { font-size: 9.5pt; color: #6d28d9; font-weight: 700; margin-bottom: 7pt; }
    .ia-content { font-size: 9.5pt; line-height: 1.6; color: #374151; }

    /* ── Conclusion ─────────────────────────────────────────────────────── */
    .conclusion { background: #f0f9ff; border: 1pt solid #bae6fd; border-radius: 6pt; padding: 10pt 12pt; margin-top: 10pt; }
    .conclusion p { color: #0369a1; }

    /* ── Section break control ──────────────────────────────────────────── */
    /*
     * .section: entire block must fit on one page (cover, indicators, conclusion).
     * .section-flow: block can span pages but h3 inside stays with first content row
     *   thanks to h3 { break-after: avoid }.
     * .section-newpage: always starts on a fresh page (major sections).
     */
    .section { break-inside: avoid; page-break-inside: avoid; }
    .section-flow { break-inside: auto; page-break-inside: auto; }
    .section-newpage {
      break-before: page;
      page-break-before: always;
    }
  `

  // ── Etapas rows ──
  const stagesRows = p.stages.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:#94a3b8">Nenhuma etapa cadastrada</td></tr>` :
    p.stages.map(s => {
      const pct = s.progress
      return `<tr>
        <td class="bold">${esc(s.name)}</td>
        <td>${esc(STAGE_STATUS_LABEL[s.status] ?? s.status)}</td>
        <td>
          <span class="bar-wrap"><span class="bar-fill${pct >= 100 ? " done" : ""}" style="width:${pct}%"></span></span>
          <span style="margin-left:4pt;font-weight:700">${pct}%</span>
        </td>
        <td>${fmtDate(s.startDate)}</td>
        <td>${fmtDate(s.dueDate)}</td>
      </tr>`
    }).join("")

  // ── Tarefas rows ──
  const tasksRows = p.tasks.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:#94a3b8">Nenhuma tarefa cadastrada</td></tr>` :
    p.tasks.map(t => {
      const isLate = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
      return `<tr>
        <td class="bold">${esc(t.title)}</td>
        <td>${esc(t.responsible ?? "—")}</td>
        <td>${esc(TASK_STATUS_LABEL[t.status] ?? t.status)}</td>
        <td>${esc(PRIORITY_LABEL[t.priority] ?? t.priority)}</td>
        <td style="${isLate ? "color:#ea580c;font-weight:600" : ""}">${isLate ? "⚠ " : ""}${fmtDate(t.dueDate)}</td>
      </tr>`
    }).join("")

  // ── Entregas rows ──
  const entregasRows = p.milestones.length === 0 ? `<tr><td colspan="4" style="text-align:center;color:#94a3b8">Nenhuma entrega cadastrada</td></tr>` :
    p.milestones.map(m => {
      const statusIcon = m.status === "CONCLUIDA" ? "✅" : m.status === "ATRASADA" ? "⚠" : "◯"
      return `<tr>
        <td class="bold">${esc(m.title)}</td>
        <td>${statusIcon} ${esc(STAGE_STATUS_LABEL[m.status] ?? m.status)}</td>
        <td>${fmtDate(m.dueDate)}</td>
        <td style="${m.completedAt ? "color:#16a34a;font-weight:600" : "color:#94a3b8"}">${fmtDate(m.completedAt)}</td>
      </tr>`
    }).join("")

  // ── Cronograma rows ──
  const historyRows = p.history.length === 0 ? `<p style="color:#94a3b8">Nenhum evento registrado.</p>` :
    p.history.map(h => `
      <div class="timeline-item">
        <div class="timeline-date">${fmtDate(h.createdAt)}</div>
        <div>
          <div class="timeline-title">${esc(h.title)}</div>
          ${h.description ? `<div class="timeline-desc">${esc(h.description)}</div>` : ""}
        </div>
      </div>
    `).join("")

  // ── IA content ──
  const iaHtml = iaContent
    ? `<div class="section-newpage section-flow">
         <h3>Análise de Inteligência Artificial</h3>
         <div class="ia-box">
           <h4>✨ Análise gerada por IA</h4>
           <div class="ia-content">${iaContent.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>")}</div>
         </div>
       </div>`
    : ""

  // ── Conclusion ──
  const conclusionText = p.status === "CONCLUIDO"
    ? `O projeto <strong>${esc(p.name)}</strong> foi concluído com ${p.progress}% de progresso registrado. ${p.doneTasks} de ${p.totalTasks} tarefas foram entregues.`
    : p.isOverdue
    ? `O projeto <strong>${esc(p.name)}</strong> está <strong>atrasado</strong> em relação ao prazo de ${fmtDate(p.dueDate)}. Progresso atual: ${p.progress}%. É recomendada ação imediata para regularização.`
    : `O projeto <strong>${esc(p.name)}</strong> está em andamento com ${p.progress}% de progresso. ${p.remainDays !== null ? `Restam ${p.remainDays} dia(s) para o prazo de ${fmtDate(p.dueDate)}.` : ""} ${p.doneTasks} de ${p.totalTasks} tarefas foram concluídas.`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Relatório — ${esc(p.name)}</title>
  <style>${css}</style>
</head>
<body>

  <!-- CAPA -->
  <div class="cover section">
    <h1>Relatório do Projeto</h1>
    <h2>${esc(p.name)}</h2>
    <p class="cover-meta">
      Responsável: <strong>${esc(p.responsible ?? "—")}</strong> &nbsp;·&nbsp;
      Status: <strong>${esc(STATUS_LABEL[p.status] ?? p.status)}</strong> &nbsp;·&nbsp;
      Prioridade: <strong>${esc(PRIORITY_LABEL[p.priority] ?? p.priority)}</strong>
    </p>
    <p class="cover-meta">Emitido em: <strong>${esc(emitDate)}</strong></p>
  </div>

  <!-- RESUMO EXECUTIVO
       .section = break-inside:avoid → entire block stays on one page if it fits;
       h3 is INSIDE the div so title + content are always co-located. -->
  <div class="section">
    <h3>Resumo Executivo</h3>
    <table class="meta-table">
      <tbody>
        <tr><td>Projeto</td><td>${esc(p.name)}</td></tr>
        <tr><td>Responsável</td><td>${esc(p.responsible ?? "—")}</td></tr>
        <tr><td>Prioridade</td><td>${esc(PRIORITY_LABEL[p.priority] ?? p.priority)}</td></tr>
        <tr><td>Status</td><td>${esc(STATUS_LABEL[p.status] ?? p.status)}</td></tr>
        <tr><td>Início</td><td>${fmtDate(p.startDate)}</td></tr>
        <tr><td>Prazo final</td><td>${fmtDate(p.dueDate)}</td></tr>
        ${p.objective   ? `<tr><td>Objetivo</td><td>${esc(p.objective)}</td></tr>`   : ""}
        ${p.description ? `<tr><td>Descrição</td><td>${esc(p.description)}</td></tr>` : ""}
        ${p.notes       ? `<tr><td>Observações</td><td>${esc(p.notes)}</td></tr>`     : ""}
      </tbody>
    </table>
  </div>

  <!-- INDICADORES
       Table-based 4-column grid: more reliable than CSS grid in print engines.
       Each td is a .kpi-card with break-inside:avoid so cards never split. -->
  <div class="section">
    <h3>Indicadores</h3>
    <table class="kpi-table">
      <tbody>
        <tr>
          <td class="kpi-card accent">
            <span class="kpi-label">Progresso geral</span>
            <span class="kpi-value">${p.progress}%</span>
          </td>
          <td class="kpi-card">
            <span class="kpi-label">Tarefas concluídas</span>
            <span class="kpi-value">${p.doneTasks}/${p.totalTasks}</span>
          </td>
          <td class="kpi-card">
            <span class="kpi-label">Etapas concluídas</span>
            <span class="kpi-value">${doneStages}/${p.stages.length}</span>
          </td>
          <td class="kpi-card">
            <span class="kpi-label">Entregas concluídas</span>
            <span class="kpi-value">${doneMilestones}/${p.milestones.length}</span>
          </td>
        </tr>
        <tr>
          <td class="kpi-card">
            <span class="kpi-label">Dias decorridos</span>
            <span class="kpi-value">${kpiValue(p.elapsedDays, "d")}</span>
          </td>
          <td class="kpi-card">
            <span class="kpi-label">Dias restantes</span>
            <span class="kpi-value">${kpiValue(p.remainDays, "d")}</span>
          </td>
          <td class="kpi-card">
            <span class="kpi-label">Tarefas atrasadas</span>
            <span class="kpi-value">${lateTasks}</span>
            <span class="kpi-sub">${lateTasks > 0 ? "⚠ atenção" : "✅ em dia"}</span>
          </td>
          <td class="kpi-card">
            <span class="kpi-label">Produtividade</span>
            <span class="kpi-value">${productivity}%</span>
            <span class="kpi-sub">tarefas concluídas</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ETAPAS
       .section-newpage → always starts on a fresh page.
       .section-flow → table can span multiple pages; tr stays intact (break-inside:avoid on tr).
       h3 INSIDE the div + h3{break-after:avoid} = title glued to first table row. -->
  <div class="section-newpage section-flow">
    <h3>Etapas (${doneStages}/${p.stages.length} concluídas)</h3>
    <table>
      <thead><tr><th>Etapa</th><th>Status</th><th>Progresso</th><th>Início</th><th>Prazo</th></tr></thead>
      <tbody>${stagesRows}</tbody>
    </table>
  </div>

  <!-- TAREFAS — new page, long tables allowed to paginate row by row -->
  <div class="section-newpage section-flow">
    <h3>Tarefas (${p.doneTasks}/${p.totalTasks} concluídas)</h3>
    <table>
      <thead><tr><th>Tarefa</th><th>Responsável</th><th>Status</th><th>Prioridade</th><th>Prazo</th></tr></thead>
      <tbody>${tasksRows}</tbody>
    </table>
  </div>

  <!-- ENTREGAS — new page -->
  <div class="section-newpage section-flow">
    <h3>Entregas (${doneMilestones}/${p.milestones.length} concluídas)</h3>
    <table>
      <thead><tr><th>Entrega</th><th>Status</th><th>Prazo</th><th>Data de conclusão</th></tr></thead>
      <tbody>${entregasRows}</tbody>
    </table>
  </div>

  <!-- CRONOGRAMA / LINHA DO TEMPO
       Each .timeline-item has break-inside:avoid so events stay intact. -->
  <div class="section-flow" style="margin-top:14pt">
    <h3>Cronograma — Linha do Tempo</h3>
    ${historyRows}
  </div>

  <!-- ANÁLISE IA (conditionally rendered, always on new page if present) -->
  ${iaHtml}

  <!-- CONCLUSÃO — small block, keep together -->
  <div class="section" style="margin-top:14pt">
    <h3>Conclusão</h3>
    <div class="conclusion">
      <p>${conclusionText}</p>
      ${p.notes ? `<p style="margin-top:6pt"><em>Obs.: ${esc(p.notes)}</em></p>` : ""}
    </div>
  </div>

</body>
</html>`
}

// ─── PDF export — blank window approach ───────────────────────────────────────

function openPdfWindow(p: ProjectDetail, iaContent: string | null) {
  const emitDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  })

  const html = buildReportHTML(p, iaContent, emitDate)

  // Open a truly blank popup — URL will be "about:blank", no localhost visible
  const win = window.open("", "_blank", "width=900,height=700,scrollbars=yes")
  if (!win) {
    alert("O navegador bloqueou o popup. Permita popups para este site e tente novamente.")
    return
  }

  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()

  // Wait for images/fonts to load, then print
  win.onload = () => {
    win.print()
    // Keep the window open so the user can save as PDF — closing immediately
    // would interrupt the save dialog on some browsers.
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateCSV(p: ProjectDetail): string {
  const rows: string[][] = [
    ["Campo", "Valor"],
    ["Projeto",      p.name],
    ["Responsável",  p.responsible ?? "—"],
    ["Prioridade",   PRIORITY_LABEL[p.priority] ?? p.priority],
    ["Status",       STATUS_LABEL[p.status]     ?? p.status],
    ["Início",       p.startDate ? p.startDate.slice(0, 10) : "—"],
    ["Prazo",        p.dueDate   ? p.dueDate.slice(0, 10)   : "—"],
    ["Progresso",    `${p.progress}%`],
    ["Tarefas concluídas",  `${p.doneTasks}/${p.totalTasks}`],
    ["Etapas concluídas",   `${p.stages.filter(s => s.status === "CONCLUIDA").length}/${p.stages.length}`],
    ["Entregas concluídas", `${p.milestones.filter(m => m.status === "CONCLUIDA").length}/${p.milestones.length}`],
    ["Dias decorridos",     kpiValue(p.elapsedDays, "d")],
    ["Dias restantes",      kpiValue(p.remainDays,  "d")],
    [],
    ["Etapa", "Status", "Progresso", "Início", "Prazo"],
    ...p.stages.map(s => [s.name, STAGE_STATUS_LABEL[s.status] ?? s.status, `${s.progress}%`, s.startDate?.slice(0,10) ?? "—", s.dueDate?.slice(0,10) ?? "—"]),
    [],
    ["Tarefa", "Responsável", "Status", "Prioridade", "Prazo"],
    ...p.tasks.map(t => [t.title, t.responsible ?? "—", TASK_STATUS_LABEL[t.status] ?? t.status, PRIORITY_LABEL[t.priority] ?? t.priority, t.dueDate?.slice(0,10) ?? "—"]),
    [],
    ["Entrega", "Status", "Prazo", "Conclusão"],
    ...p.milestones.map(m => [m.title, m.status, m.dueDate?.slice(0,10) ?? "—", m.completedAt?.slice(0,10) ?? "—"]),
  ]
  return rows.map(r => r.map(c => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
}

function generateSummaryText(p: ProjectDetail): string {
  const doneStages     = p.stages.filter(s => s.status === "CONCLUIDA").length
  const doneMilestones = p.milestones.filter(m => m.status === "CONCLUIDA").length
  const lateTasks      = p.tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() &&
    t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
  )
  return `
PROJETO: ${p.name}
Responsável: ${p.responsible ?? "—"}
Prioridade: ${PRIORITY_LABEL[p.priority]} | Status: ${STATUS_LABEL[p.status]}
Objetivo: ${p.objective ?? "Não informado"}
Descrição: ${p.description ?? "Não informada"}

CRONOGRAMA:
- Início: ${p.startDate?.slice(0,10) ?? "—"}
- Prazo: ${p.dueDate?.slice(0,10) ?? "—"}
- Dias totais: ${p.totalDays ?? "—"} | Decorridos: ${p.elapsedDays ?? "—"} | Restantes: ${p.remainDays ?? "—"}
- Atrasado: ${p.isOverdue ? "SIM" : "Não"}

PROGRESSO GERAL: ${p.progress}%

ETAPAS: ${doneStages}/${p.stages.length} concluídas
${p.stages.map(s => `  [${STAGE_STATUS_LABEL[s.status]}] ${s.name} — ${s.progress}%`).join("\n")}

TAREFAS: ${p.doneTasks}/${p.totalTasks} concluídas
- Atrasadas (${lateTasks.length}): ${lateTasks.map(t => t.title).join(", ") || "Nenhuma"}
${p.tasks.map(t => `  [${TASK_STATUS_LABEL[t.status]}] ${t.title} | ${PRIORITY_LABEL[t.priority]} | Resp: ${t.responsible ?? "—"}`).join("\n")}

ENTREGAS: ${doneMilestones}/${p.milestones.length} concluídas
${p.milestones.map(m => `  [${m.status}] ${m.title} | Prazo: ${m.dueDate?.slice(0,10) ?? "—"} | Conclusão: ${m.completedAt?.slice(0,10) ?? "Pendente"}`).join("\n")}

HISTÓRICO RECENTE:
${p.history.slice(0, 10).map(h => `  [${h.createdAt.slice(0,10)}] ${h.title}`).join("\n")}
`.trim()
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent = false }: {
  label: string; value: string | number; sub?: string; accent?: boolean
}) {
  return (
    <div className={cn("rounded-xl border p-4", accent ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-200")}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={cn("text-2xl font-bold leading-none", accent ? "text-indigo-700" : "text-slate-800")}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── IA Modal ─────────────────────────────────────────────────────────────────

function IAModal({ result, onClose }: { result: IAResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[94vh] w-full flex-col rounded-2xl bg-white shadow-2xl sm:max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Bot className="w-4 h-4 text-violet-600" />
            Análise de IA
            {result.aiPowered && (
              <span className="text-xs font-normal bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">✨ IA Real</span>
            )}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {!result.aiConfigured && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>IA não configurada.</strong> Adicione <code className="bg-amber-100 px-1 rounded">OPENAI_API_KEY</code> no <code className="bg-amber-100 px-1 rounded">.env</code> para análises reais.
              </p>
            </div>
          )}
          <div
            className="text-sm text-slate-700 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: result.content
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\n/g, "<br/>"),
            }}
          />
        </div>
        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="text-sm border border-slate-200 rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-50 transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RelatorioProjetoClient({ project: p, onReload }: { project: ProjectDetail; onReload: () => void }) {
  const [iaResult,  setIaResult]  = useState<IAResult | null>(null)
  const [iaLoading, setIaLoading] = useState(false)
  const [savedIA,   setSavedIA]   = useState<string | null>(null)

  const emitDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })

  const doneStages     = p.stages.filter(s => s.status === "CONCLUIDA").length
  const pendingStages  = p.stages.length - doneStages
  const doneMilestones = p.milestones.filter(m => m.status === "CONCLUIDA").length
  const pendingMilest  = p.milestones.length - doneMilestones
  const lateTasks      = p.tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() &&
    t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
  ).length
  const productivity = p.totalTasks > 0 ? Math.round((p.doneTasks / p.totalTasks) * 100) : 0

  async function handleAnalyzeAI() {
    setIaLoading(true)
    try {
      const summary = generateSummaryText(p)
      const res  = await fetch("/api/projects/relatorios/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, projectName: p.name }),
      })
      const data = await res.json()
      const result: IAResult = {
        content:      data.content ?? data.error ?? "Erro ao analisar.",
        aiPowered:    data.aiPowered    ?? false,
        aiConfigured: data.aiConfigured ?? false,
      }
      setIaResult(result)
      setSavedIA(result.content)
    } finally {
      setIaLoading(false)
    }
  }

  function handlePDF() {
    openPdfWindow(p, savedIA)
  }

  function handleExcel() {
    const stages   = p.stages.map(s => `<tr><td>${s.name}</td><td>${STAGE_STATUS_LABEL[s.status]}</td><td>${s.progress}%</td><td>${s.startDate?.slice(0,10) ?? "—"}</td><td>${s.dueDate?.slice(0,10) ?? "—"}</td></tr>`).join("")
    const tasks    = p.tasks.map(t => `<tr><td>${t.title}</td><td>${t.responsible ?? "—"}</td><td>${TASK_STATUS_LABEL[t.status]}</td><td>${PRIORITY_LABEL[t.priority]}</td><td>${t.dueDate?.slice(0,10) ?? "—"}</td></tr>`).join("")
    const entregas = p.milestones.map(m => `<tr><td>${m.title}</td><td>${m.status}</td><td>${m.dueDate?.slice(0,10) ?? "—"}</td><td>${m.completedAt?.slice(0,10) ?? "—"}</td></tr>`).join("")
    const html = `<html><head><meta charset="UTF-8"><style>
      th{background:#6366f1;color:white;padding:6px 8px;text-align:left}
      td{padding:5px 8px;border:1pt solid #e2e8f0}
      table{border-collapse:collapse;margin-bottom:16px;width:100%}
      h2{color:#1e293b;font-size:14pt;margin:12px 0 4px}
      h3{color:#4f46e5;font-size:11pt;margin:10px 0 4px}
      body{font-family:Arial,sans-serif;font-size:10pt;padding:12px}
    </style></head><body>
      <h2>Relatório do Projeto: ${esc(p.name)}</h2>
      <p>Responsável: ${esc(p.responsible ?? "—")} | Status: ${STATUS_LABEL[p.status]} | Progresso: ${p.progress}% | Emitido em: ${emitDate}</p>
      <h3>Etapas</h3>
      <table><tr><th>Etapa</th><th>Status</th><th>Progresso</th><th>Início</th><th>Prazo</th></tr>${stages}</table>
      <h3>Tarefas</h3>
      <table><tr><th>Tarefa</th><th>Responsável</th><th>Status</th><th>Prioridade</th><th>Prazo</th></tr>${tasks}</table>
      <h3>Entregas</h3>
      <table><tr><th>Entrega</th><th>Status</th><th>Prazo</th><th>Conclusão</th></tr>${entregas}</table>
    </body></html>`
    downloadFile(html, `relatorio-${p.name.replace(/\s+/g, "-").toLowerCase()}.xls`, "application/vnd.ms-excel;charset=utf-8")
  }

  return (
    <>
      {/* IA Modal */}
      {iaResult && <IAModal result={iaResult} onClose={() => setIaResult(null)} />}

      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">Relatório do Projeto</h3>
            <p className="text-xs text-slate-400 mt-0.5">Emitido em {emitDate}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAnalyzeAI}
              disabled={iaLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-violet-600 border border-violet-200 bg-violet-50 rounded-xl hover:bg-violet-100 transition-colors font-medium disabled:opacity-50"
            >
              {iaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
              {iaLoading ? "Analisando…" : "Analisar com IA"}
            </button>
            <button
              onClick={handlePDF}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-400" /> Exportar PDF
            </button>
            <button
              onClick={handleExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-500" /> Exportar Excel
            </button>
          </div>
        </div>

        {/* ── Resumo Executivo ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Resumo Executivo
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              ["Projeto",     p.name],
              ["Responsável", p.responsible ?? "—"],
              ["Prioridade",  PRIORITY_LABEL[p.priority] ?? p.priority],
              ["Status",      STATUS_LABEL[p.status] ?? p.status],
              ["Início",      formatDate(p.startDate)],
              ["Prazo final", formatDate(p.dueDate)],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-slate-400 w-24 shrink-0">{k}:</span>
                <span className="font-medium text-slate-700">{v}</span>
              </div>
            ))}
          </div>
          {p.objective && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Objetivo</p>
              <p className="text-sm text-slate-700">{p.objective}</p>
            </div>
          )}
          {p.description && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Descrição</p>
              <p className="text-sm text-slate-600">{p.description}</p>
            </div>
          )}
        </div>

        {/* ── Indicadores ── */}
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Indicadores
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Progresso"           value={`${p.progress}%`}                     accent />
            <KpiCard label="Tarefas concluídas"  value={`${p.doneTasks}/${p.totalTasks}`}        />
            <KpiCard label="Etapas concluídas"   value={`${doneStages}/${p.stages.length}`}      />
            <KpiCard label="Entregas concluídas" value={`${doneMilestones}/${p.milestones.length}`} />
            <KpiCard label="Tarefas atrasadas"   value={lateTasks} sub={lateTasks > 0 ? "⚠ atenção" : "✅ em dia"} />
            <KpiCard label="Produtividade"        value={`${productivity}%`} sub="tarefas concluídas" />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <KpiCard label="Dias decorridos"    value={kpiValue(p.elapsedDays, "d")} />
            <KpiCard label="Dias restantes"     value={kpiValue(p.remainDays,  "d")} />
            <KpiCard label="Etapas pendentes"   value={pendingStages} />
            <KpiCard label="Entregas pendentes" value={pendingMilest} />
          </div>
        </div>

        {/* ── Linha do Tempo ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" /> Linha do Tempo
          </h4>
          {p.history.length === 0
            ? <p className="text-xs text-slate-400 py-4 text-center">Nenhum evento registrado.</p>
            : (
              <div className="relative pl-6">
                <div className="absolute left-2.5 top-0 bottom-0 w-px bg-slate-200" />
                <div className="space-y-4">
                  {p.history.map(h => (
                    <div key={h.id} className="relative flex items-start gap-3">
                      <div className="absolute -left-4 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-700">{h.title}</p>
                          <span className="text-xs text-slate-400 shrink-0">{formatDate(h.createdAt)}</span>
                        </div>
                        {h.description && <p className="text-xs text-slate-400 mt-0.5">{h.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </div>

        {/* ── Etapas ── */}
        {p.stages.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" /> Etapas ({doneStages}/{p.stages.length} concluídas)
              </h4>
            </div>
            <div className="divide-y divide-slate-50">
              {p.stages.map(s => (
                <div key={s.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{s.name}</p>
                    <p className="text-xs text-slate-400">
                      {STAGE_STATUS_LABEL[s.status] ?? s.status}
                      {s.dueDate && ` · prazo ${formatDate(s.dueDate)}`}
                    </p>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5 max-w-xs">
                      <div className={cn("h-full rounded-full", s.progress >= 100 ? "bg-green-500" : "bg-indigo-500")} style={{ width: `${s.progress}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-700 shrink-0">{s.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tarefas ── */}
        {p.tasks.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-indigo-500" /> Tarefas ({p.doneTasks}/{p.totalTasks} concluídas)
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Tarefa","Responsável","Status","Prioridade","Prazo"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {p.tasks.map(t => {
                    const isLate = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
                    return (
                      <tr key={t.id} className={cn("hover:bg-slate-50", isLate && "bg-orange-50/30")}>
                        <td className="px-4 py-2.5 text-sm text-slate-700 font-medium">{t.title}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{t.responsible ?? "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{TASK_STATUS_LABEL[t.status] ?? t.status}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{PRIORITY_LABEL[t.priority] ?? t.priority}</td>
                        <td className="px-4 py-2.5 text-xs">
                          <span className={cn(isLate ? "text-orange-600 font-medium" : "text-slate-400")}>
                            {isLate && <AlertTriangle className="inline w-3 h-3 mr-0.5" />}
                            {formatDate(t.dueDate)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Entregas ── */}
        {p.milestones.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Flag className="w-4 h-4 text-indigo-500" /> Entregas ({doneMilestones}/{p.milestones.length} concluídas)
              </h4>
            </div>
            <div className="divide-y divide-slate-50">
              {p.milestones.map(m => (
                <div key={m.id} className="px-5 py-3 flex items-center gap-4">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", m.status === "CONCLUIDA" ? "bg-green-500" : m.status === "ATRASADA" ? "bg-orange-500" : "bg-slate-300")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{m.title}</p>
                    {m.description && <p className="text-xs text-slate-400">{m.description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">Prazo: {formatDate(m.dueDate)}</p>
                    {m.completedAt && <p className="text-xs text-green-600">✅ {formatDate(m.completedAt)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Análise IA ── */}
        {savedIA && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-violet-800 flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4" /> Análise de IA
            </h4>
            <div
              className="text-sm text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: savedIA
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\n/g, "<br/>"),
              }}
            />
          </div>
        )}

        {/* CTA se IA ainda não foi executada */}
        {!savedIA && (
          <div className="bg-violet-50 border border-dashed border-violet-300 rounded-2xl p-6 text-center">
            <Bot className="w-8 h-8 text-violet-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700 mb-1">Análise de IA disponível</p>
            <p className="text-xs text-slate-400 mb-4">
              Clique em "Analisar com IA" para obter riscos, gargalos, previsão de conclusão e recomendações personalizadas.
              O resultado também será incluído no PDF ao exportar após a análise.
            </p>
            <button
              onClick={handleAnalyzeAI}
              disabled={iaLoading}
              className="flex items-center gap-2 mx-auto px-4 py-2 text-sm text-violet-600 border border-violet-300 bg-white rounded-xl hover:bg-violet-100 transition-colors font-medium disabled:opacity-50"
            >
              {iaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
              {iaLoading ? "Analisando…" : "Analisar Projeto com IA"}
            </button>
          </div>
        )}

      </div>
    </>
  )
}
