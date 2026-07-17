"use client"

import { useState, useCallback } from "react"
import { FileDown, Copy, Check, BarChart2, Printer } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import {
  cn,
  PRIORITY_LABELS, PRIORITY_COLORS,
  STATUS_LABELS, STATUS_COLORS,
  formatDate, formatDateTime,
} from "@/lib/utils"

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface StatusHistoryEntry {
  id: string
  statusAnterior: string
  statusNovo: string
  observacao: string
  responsavel: string
  waitingFor: string | null
  waitingReason: string | null
  createdAt: string
}

interface TaskAttachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  filePath: string
  createdAt: string
}

interface Task {
  id: string
  title: string
  description: string | null
  origin: string | null
  originId: string | null
  taskOrigin: { id: string; name: string; icon: string; color: string } | null
  priority: string
  status: string
  person: string | null
  responsible: string | null
  observations: string | null
  dueDate: string | null
  receivedAt: string | null
  createdAt: string
  updatedAt: string
  statusHistory: StatusHistoryEntry[]
  attachments: TaskAttachment[]
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function durationBetween(from: string, to?: string): string {
  const start = new Date(from).getTime()
  const end   = to ? new Date(to).getTime() : Date.now()
  const diff  = Math.abs(end - start)
  const mins  = Math.floor(diff / 60000)
  if (mins < 60)  return `${mins}min`
  const hrs  = Math.floor(mins / 60)
  if (hrs  < 24)  return `${hrs}h`
  const days = Math.floor(hrs  / 24)
  if (days < 30)  return `${days}d`
  const months = Math.floor(days / 30)
  return `${months} ${months === 1 ? "mês" : "meses"}`
}

function situacaoAtual(task: Task): string {
  const status = task.status
  const lastChange = task.statusHistory.length > 0
    ? task.statusHistory[task.statusHistory.length - 1]
    : null
  const duracao = durationBetween(
    lastChange?.createdAt ?? task.createdAt
  )

  switch (status) {
    case "PENDENTE":
      return `A tarefa aguarda início há ${duracao}. Não foi iniciada nem atribuída para execução até o momento.`
    case "EM_ANDAMENTO":
      return `A tarefa está em andamento há ${duracao}. Está sendo executada pela equipe responsável.`
    case "AGUARDANDO_RETORNO":
      return lastChange?.waitingFor
        ? `A tarefa aguarda retorno de "${lastChange.waitingFor}" há ${duracao}. ${lastChange.waitingReason ? `Motivo: ${lastChange.waitingReason}.` : ""}`
        : `A tarefa aguarda retorno externo há ${duracao}.`
    case "CONCLUIDA":
      return `A tarefa foi concluída. Duração total: ${durationBetween(task.receivedAt ?? task.createdAt, task.updatedAt)}.`
    case "CANCELADA":
      return `A tarefa foi cancelada. Última observação disponível no histórico de status.`
    default:
      return `Status: ${STATUS_LABELS[status] ?? status}.`
  }
}

function isImage(fileType: string) {
  return fileType.startsWith("image/")
}

// Retorna o nome da origem priorizando a relation (taskOrigin) sobre o campo texto legado (origin)
function resolveOriginName(task: Task): string | null {
  return task.taskOrigin?.name ?? task.origin ?? null
}

async function registrarHistorico(taskId: string, action: string, description: string) {
  try {
    await fetch(`/api/tasks/${taskId}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, description }),
    })
  } catch {
    // silencioso — não interromper o fluxo
  }
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

async function imageToBase64(url: string): Promise<string | null> {
  try {
    const res  = await fetch(url, { cache: "no-store" })
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function buildPdfHtml(
  task: Task,
  conclusao: string,
  base64Map: Record<string, string>,
): string {
  const originName = resolveOriginName(task)
  const emitDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  })

  const statusHistoryRows = task.statusHistory.map(h => `
    <tr>
      <td>${formatDateTime(h.createdAt)}</td>
      <td>${STATUS_LABELS[h.statusAnterior] ?? h.statusAnterior} → ${STATUS_LABELS[h.statusNovo] ?? h.statusNovo}</td>
      <td>${h.observacao}</td>
      <td>${h.responsavel}</td>
      ${h.waitingFor ? `<td>${h.waitingFor}${h.waitingReason ? ` — ${h.waitingReason}` : ""}</td>` : "<td>—</td>"}
    </tr>
  `).join("")

  const imageAttachments = task.attachments.filter(a => isImage(a.fileType))
  const otherAttachments = task.attachments.filter(a => !isImage(a.fileType))

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Tarefa</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #1e293b; padding: 14mm 16mm; background: #fff; }
  h2 { font-size: 15pt; font-weight: 700; color: #0f172a; margin-bottom: 3pt; }
  h3 { font-size: 10.5pt; font-weight: 700; color: #1e3a5f; margin-bottom: 6pt; break-after: avoid; page-break-after: avoid; }
  p, td, li { line-height: 1.45; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  th { background: #1e3a5f; color: #fff; text-align: left; padding: 5pt 7pt; font-weight: 600; font-size: 8pt; }
  td { padding: 4pt 7pt; vertical-align: top; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  thead { display: table-header-group; }
  tbody { display: table-row-group; }
  tbody tr { break-inside: avoid; page-break-inside: avoid; }
  .header { border-bottom: 2pt solid #1e3a5f; padding-bottom: 8pt; margin-bottom: 12pt; }
  .header-sub { font-size: 8.5pt; color: #64748b; margin-top: 3pt; }
  .section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 14pt; }
  .section-flow { break-inside: auto; page-break-inside: auto; margin-bottom: 14pt; }
  .section-newpage { break-before: page; page-break-before: always; margin-bottom: 14pt; }
  .badge { display: inline-block; border-radius: 99pt; padding: 1.5pt 7pt; font-size: 7.5pt; font-weight: 600; border: 1pt solid; }
  .badge-pendente   { background: #fef9c3; color: #854d0e; border-color: #fde047; }
  .badge-andamento  { background: #dbeafe; color: #1e40af; border-color: #93c5fd; }
  .badge-aguardando { background: #f3e8ff; color: #6b21a8; border-color: #d8b4fe; }
  .badge-concluida  { background: #dcfce7; color: #166534; border-color: #86efac; }
  .badge-cancelada  { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
  .badge-alta       { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
  .badge-media      { background: #fef9c3; color: #854d0e; border-color: #fde047; }
  .badge-baixa      { background: #dcfce7; color: #166534; border-color: #86efac; }
  .kpi-table { width: 100%; border-collapse: separate; border-spacing: 5pt; margin-bottom: 8pt; }
  .kpi-card { background: #f8fafc; border: 1pt solid #e2e8f0; border-radius: 6pt; padding: 7pt 10pt; break-inside: avoid; page-break-inside: avoid; vertical-align: top; }
  .kpi-label { font-size: 7.5pt; color: #64748b; margin-bottom: 2pt; }
  .kpi-value { font-size: 11pt; font-weight: 700; color: #0f172a; }
  .situacao-box { background: #eff6ff; border: 1pt solid #bfdbfe; border-radius: 6pt; padding: 8pt 10pt; font-size: 9pt; color: #1e40af; }
  .conclusao-box { background: #f0fdf4; border: 1pt solid #bbf7d0; border-radius: 6pt; padding: 8pt 10pt; font-size: 9pt; color: #166534; }
  .report-image-block { break-inside: avoid; page-break-inside: avoid; margin-bottom: 14pt; border: 1pt solid #e2e8f0; border-radius: 6pt; padding: 8pt; background: #f8fafc; }
  .report-image { max-width: 100%; max-height: 500px; object-fit: contain; display: block; margin: 6pt auto 0; break-inside: avoid; page-break-inside: avoid; }
  .report-image-caption { font-size: 7.5pt; color: #64748b; margin-top: 4pt; text-align: center; }
  .footer { border-top: 1pt solid #e2e8f0; padding-top: 6pt; margin-top: 12pt; font-size: 7.5pt; color: #94a3b8; display: flex; justify-content: space-between; }
</style>
</head>
<body>

<!-- Cabeçalho -->
<div class="header">
  <h2>Relatório de Tarefa</h2>
  <p class="header-sub">Emitido em ${emitDate}</p>
</div>

<!-- KPIs -->
<div class="section">
  <h3>Dados Gerais</h3>
  <table class="kpi-table">
    <tr>
      <td class="kpi-card">
        <div class="kpi-label">Status</div>
        <div><span class="badge badge-${task.status.toLowerCase().replace("_", "-").replace("aguardando_retorno", "aguardando").replace("em_andamento", "andamento").replace("concluida", "concluida").replace("cancelada", "cancelada")}">${STATUS_LABELS[task.status] ?? task.status}</span></div>
      </td>
      <td class="kpi-card">
        <div class="kpi-label">Prioridade</div>
        <div><span class="badge badge-${task.priority.toLowerCase()}">${PRIORITY_LABELS[task.priority] ?? task.priority}</span></div>
      </td>
      <td class="kpi-card">
        <div class="kpi-label">Alterações de Status</div>
        <div class="kpi-value">${task.statusHistory.length}</div>
      </td>
      <td class="kpi-card">
        <div class="kpi-label">Evidências</div>
        <div class="kpi-value">${task.attachments.length}</div>
      </td>
    </tr>
  </table>

  <table>
    <tbody>
      <tr><td style="width:30%;color:#64748b;font-weight:600">Título</td><td>${task.title}</td></tr>
      ${task.description ? `<tr><td style="color:#64748b;font-weight:600">Descrição</td><td>${task.description}</td></tr>` : ""}
      ${originName      ? `<tr><td style="color:#64748b;font-weight:600">Origem</td><td>${originName}</td></tr>` : ""}
      ${task.person     ? `<tr><td style="color:#64748b;font-weight:600">Solicitante</td><td>${task.person}</td></tr>` : ""}
      ${task.responsible? `<tr><td style="color:#64748b;font-weight:600">Responsável</td><td>${task.responsible}</td></tr>` : ""}
      ${task.receivedAt ? `<tr><td style="color:#64748b;font-weight:600">Recebida em</td><td>${formatDateTime(task.receivedAt)}</td></tr>` : ""}
      <tr><td style="color:#64748b;font-weight:600">Criada em</td><td>${formatDateTime(task.createdAt)}</td></tr>
      ${task.dueDate    ? `<tr><td style="color:#64748b;font-weight:600">Prazo</td><td>${formatDate(task.dueDate)}</td></tr>` : ""}
      ${task.observations ? `<tr><td style="color:#64748b;font-weight:600">Observações</td><td>${task.observations}</td></tr>` : ""}
    </tbody>
  </table>
</div>

<!-- Situação Atual -->
<div class="section">
  <h3>Situação Atual</h3>
  <div class="situacao-box">${situacaoAtual(task)}</div>
</div>

<!-- Histórico de Status -->
${task.statusHistory.length > 0 ? `
<div class="section-flow section-newpage">
  <h3>Histórico de Status</h3>
  <table>
    <thead>
      <tr>
        <th style="width:18%">Data</th>
        <th style="width:26%">Alteração</th>
        <th style="width:28%">Observação</th>
        <th style="width:15%">Responsável</th>
        <th style="width:13%">Aguardando</th>
      </tr>
    </thead>
    <tbody>${statusHistoryRows}</tbody>
  </table>
</div>
` : ""}

<!-- Evidências -->
${task.attachments.length > 0 ? `
<div class="section-flow section-newpage">
  <h3>Evidências Anexadas (${task.attachments.length})</h3>
  ${imageAttachments.length > 0 ? imageAttachments.map(a => {
    const src = base64Map[a.filePath]
    if (!src) return `
      <div class="report-image-block">
        <p style="font-size:8pt;color:#94a3b8;text-align:center">Imagem não disponível: ${a.fileName}</p>
      </div>`
    return `
      <div class="report-image-block">
        <p style="font-size:8pt;font-weight:600;color:#1e293b;margin-bottom:4pt">${a.fileName}</p>
        <p style="font-size:7.5pt;color:#64748b;margin-bottom:4pt">Incluída em: ${formatDate(a.createdAt)}</p>
        <img src="${src}" class="report-image" alt="${a.fileName}" />
      </div>`
  }).join("") : ""}
  ${otherAttachments.length > 0 ? `
  <p style="font-size:8pt;color:#64748b;margin-top:8pt;margin-bottom:4pt">Documentos anexados:</p>
  <table>
    <thead><tr><th>Arquivo</th><th>Tipo</th><th>Data</th></tr></thead>
    <tbody>${otherAttachments.map(a => `<tr><td>${a.fileName}</td><td>${a.fileType}</td><td>${formatDate(a.createdAt)}</td></tr>`).join("")}</tbody>
  </table>` : ""}
</div>
` : ""}

<!-- Conclusão -->
${conclusao.trim() ? `
<div class="section">
  <h3>Conclusão e Encaminhamentos</h3>
  <div class="conclusao-box">${conclusao}</div>
</div>
` : ""}

<!-- Rodapé -->
<div class="footer">
  <span>Relatório gerado em ${emitDate}</span>
  <span>Tarefa ID: ${task.id.slice(0, 8).toUpperCase()}</span>
</div>

</body>
</html>`
}

async function openPdfWindow(task: Task, conclusao: string) {
  const base64Map: Record<string, string> = {}
  const origin = window.location.origin
  const imageAttachments = task.attachments.filter(a => isImage(a.fileType))

  await Promise.all(
    imageAttachments.map(async a => {
      const url  = `${origin}${a.filePath}`
      const data = await imageToBase64(url)
      if (data) base64Map[a.filePath] = data
    })
  )

  const html = buildPdfHtml(task, conclusao, base64Map)
  const win  = window.open("", "_blank", "width=900,height=700,scrollbars=yes")
  if (!win) { alert("Popup bloqueado. Permita pop-ups para exportar o PDF."); return }
  win.document.write(html)
  win.document.close()
  // Give browser time to parse the written HTML before printing
  setTimeout(() => { try { win.print() } catch { /* ignore */ } }, 500)
}

// ─── COMPONENTE ──────────────────────────────────────────────────────────────

export function RelatorioTarefaClient({ task, onReload }: { task: Task; onReload: () => void }) {
  const [conclusao, setConclusao] = useState("")
  const [copied,    setCopied]    = useState(false)

  const handleExportPdf = useCallback(async () => {
    await openPdfWindow(task, conclusao)
    await registrarHistorico(task.id, "PDF_EXPORT", "Relatório da tarefa exportado em PDF")
    onReload()
  }, [task, conclusao, onReload])

  const handleCopy = useCallback(async () => {
    const originName = resolveOriginName(task)
    const lines: string[] = [
      `RELATÓRIO DE TAREFA`,
      `Emitido em: ${new Date().toLocaleDateString("pt-BR")}`,
      ``,
      `Título: ${task.title}`,
      `Status: ${STATUS_LABELS[task.status] ?? task.status}`,
      `Prioridade: ${PRIORITY_LABELS[task.priority] ?? task.priority}`,
      task.responsible ? `Responsável: ${task.responsible}` : "",
      task.person      ? `Solicitante: ${task.person}` : "",
      originName       ? `Origem: ${originName}` : "",
      task.dueDate     ? `Prazo: ${formatDate(task.dueDate)}` : "",
      task.description ? `\nDescrição: ${task.description}` : "",
      ``,
      `SITUAÇÃO ATUAL`,
      situacaoAtual(task),
      ``,
      task.statusHistory.length > 0 ? `HISTÓRICO DE STATUS (${task.statusHistory.length} alterações)` : "",
      ...task.statusHistory.map(h =>
        `  [${formatDateTime(h.createdAt)}] ${STATUS_LABELS[h.statusAnterior]} → ${STATUS_LABELS[h.statusNovo]}: ${h.observacao} (${h.responsavel})`
      ),
      conclusao.trim() ? `\nCONCLUSÃO\n${conclusao}` : "",
    ].filter(Boolean)

    await navigator.clipboard.writeText(lines.join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [task, conclusao])

  const originName = resolveOriginName(task)

  return (
    <div className="space-y-5">
      {/* Ações */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={handleExportPdf} variant="outline" size="sm">
          <FileDown className="w-3.5 h-3.5 mr-1.5" />
          Exportar PDF
        </Button>
        <Button onClick={() => window.print()} variant="outline" size="sm">
          <Printer className="w-3.5 h-3.5 mr-1.5" />
          Imprimir
        </Button>
        <Button onClick={handleCopy} variant="outline" size="sm">
          {copied
            ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />Copiado!</>
            : <><Copy className="w-3.5 h-3.5 mr-1.5" />Copiar relatório</>}
        </Button>
      </div>

      {/* Dados da Tarefa */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-400" />
            Dados da Tarefa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Status</p>
              <span className={cn("text-xs border rounded-full px-2 py-0.5 font-medium", STATUS_COLORS[task.status])}>
                {STATUS_LABELS[task.status]}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400">Prioridade</p>
              <span className={cn("text-xs border rounded-full px-2 py-0.5 font-medium", PRIORITY_COLORS[task.priority])}>
                {PRIORITY_LABELS[task.priority]}
              </span>
            </div>
            {task.responsible && (
              <div>
                <p className="text-xs text-slate-400">Responsável</p>
                <p className="font-medium text-slate-700">{task.responsible}</p>
              </div>
            )}
            {task.person && (
              <div>
                <p className="text-xs text-slate-400">Solicitante</p>
                <p className="font-medium text-slate-700">{task.person}</p>
              </div>
            )}
            {originName && (
              <div>
                <p className="text-xs text-slate-400">Origem</p>
                <p className="font-medium text-slate-700">{originName}</p>
              </div>
            )}
            {task.dueDate && (
              <div>
                <p className="text-xs text-slate-400">Prazo</p>
                <p className="font-medium text-slate-700">{formatDate(task.dueDate)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400">Alterações de status</p>
              <p className="font-medium text-slate-700">{task.statusHistory.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Evidências</p>
              <p className="font-medium text-slate-700">{task.attachments.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Situação Atual */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Situação Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
            {situacaoAtual(task)}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Status */}
      {task.statusHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Histórico de Status ({task.statusHistory.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">Data</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">Alteração</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">Observação</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {task.statusHistory.map(h => (
                    <tr key={h.id} className="border-b border-slate-100">
                      <td className="px-4 py-2 text-slate-500">{formatDateTime(h.createdAt)}</td>
                      <td className="px-4 py-2">
                        <span className={cn("border rounded-full px-2 py-0.5 font-medium", STATUS_COLORS[h.statusAnterior])}>
                          {STATUS_LABELS[h.statusAnterior]}
                        </span>
                        {" → "}
                        <span className={cn("border rounded-full px-2 py-0.5 font-medium", STATUS_COLORS[h.statusNovo])}>
                          {STATUS_LABELS[h.statusNovo]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {h.observacao}
                        {h.waitingFor && (
                          <p className="text-purple-700 mt-0.5">Aguardando: {h.waitingFor}{h.waitingReason ? ` — ${h.waitingReason}` : ""}</p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{h.responsavel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evidências */}
      {task.attachments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Evidências Anexadas ({task.attachments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {task.attachments.filter(a => isImage(a.fileType)).map(a => {
                const filename = a.filePath.split(/[\\/]/).pop()
                return (
                  <a key={a.id} href={`/uploads/${filename}`} target="_blank" rel="noopener noreferrer">
                    <div className="border border-slate-200 rounded-lg overflow-hidden hover:border-slate-400 transition-colors">
                      <img
                        src={`/uploads/${filename}`}
                        alt={a.fileName}
                        className="w-full h-24 object-cover"
                      />
                      <p className="px-2 py-1 text-xs text-slate-500 truncate">{a.fileName}</p>
                    </div>
                  </a>
                )
              })}
              {task.attachments.filter(a => !isImage(a.fileType)).map(a => (
                <div key={a.id} className="border border-slate-200 rounded-lg p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      {a.fileName.split(".").pop()?.slice(0, 3) ?? "?"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 truncate">{a.fileName}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conclusão */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Conclusão e Encaminhamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            rows={4}
            value={conclusao}
            onChange={e => setConclusao(e.target.value)}
            placeholder="Descreva a conclusão desta tarefa, encaminhamentos, decisões tomadas ou observações finais..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
          />
          <p className="text-xs text-slate-400 mt-1">Este campo será incluído no PDF exportado.</p>
        </CardContent>
      </Card>
    </div>
  )
}
