import {
  Meeting, fmtDateLong, fmtDate,
  MEETING_TYPE_LABELS, ACTION_STATUS_LABELS, ATTENDANCE_LABELS,
} from "./types"

const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** Mantém o HTML do editor (já é conteúdo nosso), só evita documento vazio. */
const richOrDash = (html: string | null | undefined) => {
  const plain = (html ?? "").replace(/<[^>]*>/g, "").trim()
  return plain ? (html as string) : '<p class="muted">Não registrado.</p>'
}

/**
 * Monta o documento de impressão/PDF da pauta/ata.
 * Layout próprio — não imprime sidebar, botões nem qualquer parte da interface.
 */
export function buildMeetingPrintHtml(m: Meeting): string {
  const emitido = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })

  const horario = [m.startTime, m.endTime].filter(Boolean).join(" às ") || "—"

  const participantes = m.participants.length
    ? `<ul class="plain">${m.participants.map(p => {
        const nome = esc(p.teamMember?.name ?? p.externalName ?? "—")
        const fn   = esc(p.teamMember?.role ?? p.externalRole ?? "")
        const pres = ATTENDANCE_LABELS[p.attendanceStatus] ?? p.attendanceStatus
        return `<li><strong>${nome}</strong>${fn ? ` — ${fn}` : ""} <span class="muted">(${pres})</span></li>`
      }).join("")}</ul>`
    : `<p class="muted">Nenhum participante registrado.</p>`

  const acoesTable = (acoes: Meeting["actions"]) => acoes.length
    ? `<table>
        <thead><tr><th style="width:44%">Ação</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
        <tbody>${acoes.map(a => `
          <tr>
            <td>${esc(a.description)}</td>
            <td>${esc(a.responsible?.name ?? "—")}</td>
            <td>${a.dueDate ? fmtDate(a.dueDate) : "—"}</td>
            <td>${ACTION_STATUS_LABELS[a.status] ?? a.status}</td>
          </tr>`).join("")}</tbody>
      </table>`
    : `<p class="muted">Nenhuma ação registrada.</p>`

  const assuntos = m.agendaItems.length
    ? m.agendaItems.map((a, i) => `
      <section class="item">
        <h3>${i + 1}. ${esc(a.title)}</h3>
        ${a.description ? `<p class="desc">${esc(a.description)}</p>` : ""}
        ${a.presenter ? `<p class="muted small">Apresentação: ${esc(a.presenter.name)}</p>` : ""}

        <h4>O que foi conversado</h4>
        <div class="rich">${richOrDash(a.discussion)}</div>

        <h4>Decisões</h4>
        ${a.decisions.length
          ? `<ul>${a.decisions.map(d => `<li>${esc(d.description)}</li>`).join("")}</ul>`
          : `<p class="muted">Nenhuma decisão registrada.</p>`}

        <h4>Ações</h4>
        ${acoesTable(a.actions)}
      </section>`).join("")
    : `<p class="muted">Nenhum assunto na pauta.</p>`

  const decisoesGerais = m.decisions.filter(d => !d.agendaItemId)
  const acoesPendentes = m.actions.filter(a => ["A_FAZER", "EM_ANDAMENTO", "AGUARDANDO"].includes(a.status))

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Ata — ${esc(m.title)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1e293b; font-size: 10.5pt; line-height: 1.55; margin: 0; }
  .brand { font-size: 8.5pt; letter-spacing: .12em; text-transform: uppercase; color: #64748b; }
  h1 { font-size: 17pt; margin: 2pt 0 1pt; color: #0f172a; }
  .doctype { font-size: 9pt; color: #2563eb; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
  header { border-bottom: 2pt solid #2563eb; padding-bottom: 8pt; margin-bottom: 12pt; }
  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: .06em; color: #2563eb;
       border-bottom: .6pt solid #e2e8f0; padding-bottom: 3pt; margin: 16pt 0 7pt; }
  h3 { font-size: 11.5pt; margin: 0 0 4pt; color: #0f172a; }
  h4 { font-size: 9pt; text-transform: uppercase; letter-spacing: .05em; color: #475569; margin: 9pt 0 3pt; }
  .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3pt 18pt; margin-top: 7pt; font-size: 9.5pt; }
  .meta div { display: flex; gap: 5pt; }
  .meta .k { color: #64748b; min-width: 74pt; }
  .meta .v { font-weight: 600; }
  .item { margin-bottom: 14pt; padding-bottom: 10pt; border-bottom: .5pt dashed #e2e8f0; page-break-inside: avoid; }
  .item:last-child { border-bottom: none; }
  .desc { margin: 0 0 3pt; color: #334155; }
  table { width: 100%; border-collapse: collapse; margin: 4pt 0; font-size: 9.5pt; }
  th, td { border: .6pt solid #cbd5e1; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em; color: #475569; }
  ul { margin: 3pt 0; padding-left: 15pt; }
  ul.plain { list-style: none; padding-left: 0; }
  ul.plain li { padding: 1.5pt 0; border-bottom: .4pt dotted #e2e8f0; }
  li { margin-bottom: 2pt; }
  .muted { color: #94a3b8; }
  .small { font-size: 9pt; }
  .rich :is(p, ul, ol) { margin: 3pt 0; }
  .rich :is(h1,h2,h3) { font-size: 10.5pt; margin: 5pt 0 2pt; color: #0f172a; border: none; text-transform: none; letter-spacing: normal; }
  .box { background: #f8fafc; border: .6pt solid #e2e8f0; border-radius: 3pt; padding: 7pt 9pt; }
  footer { margin-top: 20pt; padding-top: 7pt; border-top: .6pt solid #e2e8f0;
           font-size: 8.5pt; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <header>
    <div class="brand">NJ Assistant Office</div>
    <div class="doctype">${m.status === "CONCLUIDA" ? "Ata de Reunião" : "Pauta de Reunião"}</div>
    <h1>${esc(m.title)}</h1>
    <div class="meta">
      <div><span class="k">Data</span><span class="v">${fmtDateLong(m.date)}</span></div>
      <div><span class="k">Horário</span><span class="v">${esc(horario)}</span></div>
      <div><span class="k">Local</span><span class="v">${esc(m.location) || "—"}</span></div>
      <div><span class="k">Organizador</span><span class="v">${esc(m.organizer?.name) || "—"}</span></div>
      <div><span class="k">Tipo</span><span class="v">${MEETING_TYPE_LABELS[m.type] ?? esc(m.type)}</span></div>
      <div><span class="k">Categoria</span><span class="v">${esc(m.category) || "—"}</span></div>
    </div>
  </header>

  <h2>Participantes</h2>
  ${participantes}

  ${m.objective ? `<h2>Objetivo</h2><p>${esc(m.objective)}</p>` : ""}

  <h2>Assuntos Tratados</h2>
  ${assuntos}

  <h2>Resumo da Reunião</h2>
  ${m.finalSummary
    ? `<div class="box rich">${m.finalSummary}</div>`
    : `<p class="muted">Resumo final não registrado.</p>`}

  ${decisoesGerais.length ? `
    <h2>Decisões Gerais</h2>
    <ul>${decisoesGerais.map(d => `<li>${esc(d.description)}</li>`).join("")}</ul>` : ""}

  <h2>Plano de Ação</h2>
  ${acoesTable(m.actions)}

  ${acoesPendentes.length ? `
    <h2>Ações Pendentes</h2>
    ${acoesTable(acoesPendentes)}` : ""}

  ${m.observations ? `<h2>Observações</h2><p>${esc(m.observations)}</p>` : ""}

  <footer>
    <span>NJ Assistant Office — documento gerado em ${emitido}</span>
    <span>${m.completedAt ? "Reunião concluída" : "Documento preliminar"}</span>
  </footer>
</body>
</html>`
}

/** Abre a janela de impressão com o layout dedicado. */
export function openMeetingPrint(m: Meeting) {
  const html = buildMeetingPrintHtml(m)
  const win = window.open("", "_blank", "width=920,height=720,scrollbars=yes")
  if (!win) {
    alert("Pop-up bloqueado. Permita pop-ups para imprimir ou gerar o PDF.")
    return
  }
  win.document.write(html)
  win.document.close()
  setTimeout(() => { try { win.print() } catch { /* ignore */ } }, 400)
}
