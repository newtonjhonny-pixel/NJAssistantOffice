import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Labels
const PROJ_STATUS_LABEL: Record<string, string> = {
  idea: "Ideia", planned: "Planejado", in_progress: "Em andamento",
  waiting: "Aguardando", done: "Concluído", cancelled: "Cancelado", late: "Atrasado",
}
const STEP_STATUS_LABEL: Record<string, string> = {
  not_started: "Não iniciada", planned: "Planejada", in_progress: "Em andamento",
  waiting: "Aguardando", blocked: "Bloqueada", done: "Concluída", cancelled: "Cancelada",
}
const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa", medium: "Média", high: "Alta", critical: "Crítica",
}
const PROJ_STATUS_COLOR: Record<string, string> = {
  idea: "FF94A3B8", planned: "FF3B82F6", in_progress: "FFF59E0B",
  waiting: "FFA855F7", done: "FF10B981", cancelled: "FF94A3B8", late: "FFEF4444",
}
const STEP_STATUS_TEXT_COLOR: Record<string, string> = {
  not_started: "FF64748B", planned: "FF2563EB", in_progress: "FFD97706",
  waiting: "FF9333EA", blocked: "FFDC2626", done: "FF059669", cancelled: "FF94A3B8",
}

function calcProgress(p: any): number {
  if (p.progressManual) return p.progress ?? 0
  const steps = p.steps ?? []
  if (!steps.length) return 0
  return Math.round(steps.filter((s: any) => s.status === "done").length / steps.length * 100)
}

export async function POST(req: NextRequest) {
  // ── Estilos ───────────────────────────────────────────────────────────────

  const headerFill: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } }
  const headerFont: any = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } }
  const titleFont: any  = { name: "Calibri", size: 14, bold: true, color: { argb: "FF1E293B" } }
  const bodyFont: any   = { name: "Calibri", size: 10, color: { argb: "FF1E293B" } }
  const altFill: any    = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
  const borderThin: any = {
    top:    { style: "thin", color: { argb: "FFE2E8F0" } },
    left:   { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right:  { style: "thin", color: { argb: "FFE2E8F0" } },
  }

  function styleHeader(row: any) {
    row.eachCell((cell: any) => {
      cell.fill      = headerFill
      cell.font      = headerFont
      cell.border    = borderThin
      cell.alignment = { horizontal: "center", vertical: "middle" }
    })
    row.height = 22
  }

  function styleBody(row: any, alt: boolean) {
    row.eachCell((cell: any) => {
      if (alt) cell.fill = altFill
      cell.font      = bodyFont
      cell.border    = borderThin
      cell.alignment = { vertical: "middle", wrapText: true }
    })
    row.height = 18
  }

  try {
    const { content, title } = await req.json()
    const data = JSON.parse(content)

    const ExcelJS = (await import("exceljs")).default
    const wb = new ExcelJS.Workbook()
    wb.creator    = "NJ Assistant"
    wb.lastModifiedBy = "NJ Assistant"
    wb.created    = new Date()
    wb.modified   = new Date()

    // ── ABA 1: RESUMO DOS PROJETOS ────────────────────────────────────────────

    const ws1 = wb.addWorksheet("Resumo dos Projetos")
    ws1.pageSetup.paperSize   = 9
    ws1.pageSetup.orientation = "landscape" as any
    ws1.pageSetup.fitToPage   = true
    ws1.pageSetup.fitToWidth  = 1

    ws1.mergeCells("A1:L1")
    const t1 = ws1.getCell("A1")
    t1.value     = data.title ?? title
    t1.font      = titleFont
    t1.alignment = { horizontal: "center", vertical: "middle" }
    ws1.getRow(1).height = 28

    if (data.subtitle) {
      ws1.mergeCells("A2:L2")
      const s1 = ws1.getCell("A2")
      s1.value     = data.subtitle
      s1.font      = { name: "Calibri", size: 11, color: { argb: "FF64748B" } }
      s1.alignment = { horizontal: "center", vertical: "middle" }
      ws1.getRow(2).height = 18
    }

    ws1.columns = [
      { key: "code",    width: 10 },
      { key: "name",    width: 28 },
      { key: "obj",     width: 40 },
      { key: "resp",    width: 20 },
      { key: "status",  width: 16 },
      { key: "prio",    width: 12 },
      { key: "start",   width: 13 },
      { key: "end",     width: 13 },
      { key: "pct",     width: 12 },
      { key: "steps",   width: 11 },
      { key: "systems", width: 24 },
      { key: "procs",   width: 24 },
    ]

    const ws1Headers = [
      "Código","Projeto","Objetivo","Responsável","Status","Prioridade",
      "Data Inicial","Data Final","% Conclusão","Qtd Etapas","Sistemas Envolvidos","Processos Impactados",
    ]
    ws1.addRow(ws1Headers)
    styleHeader(ws1.lastRow)

    ;(data.projects ?? []).forEach((proj: any, pi: number) => {
      const pct = calcProgress(proj)
      const row = ws1.addRow([
        proj.code,
        proj.name,
        proj.objective,
        proj.responsible,
        PROJ_STATUS_LABEL[proj.status] ?? proj.status,
        PRIORITY_LABEL[proj.priority] ?? proj.priority,
        proj.startDate,
        proj.endDate,
        `${pct}%`,
        (proj.steps ?? []).length,
        proj.systems,
        proj.processes,
      ])
      styleBody(row, pi % 2 === 0)
      // Cor do código
      row.getCell(1).font = {
        name: "Calibri", size: 10, bold: true,
        color: { argb: "FF" + (proj.color ?? "#3B82F6").replace("#", "").toUpperCase().slice(0,6) },
      }
      // Cor do status
      row.getCell(5).font = {
        name: "Calibri", size: 10,
        color: { argb: PROJ_STATUS_COLOR[proj.status] ?? "FF64748B" },
      }
    })

    // ── ABA 2: ETAPAS DOS PROJETOS ─────────────────────────────────────────────

    const ws2 = wb.addWorksheet("Etapas dos Projetos")
    ws2.pageSetup.paperSize   = 9
    ws2.pageSetup.orientation = "landscape" as any
    ws2.pageSetup.fitToPage   = true
    ws2.pageSetup.fitToWidth  = 1

    ws2.columns = [
      { key: "pcode",  width: 11 },
      { key: "pname",  width: 24 },
      { key: "num",    width: 9  },
      { key: "title",  width: 22 },
      { key: "desc",   width: 36 },
      { key: "resp",   width: 18 },
      { key: "status", width: 16 },
      { key: "pct",    width: 12 },
      { key: "start",  width: 13 },
      { key: "end",    width: 13 },
      { key: "actual", width: 15 },
      { key: "deliv",  width: 24 },
      { key: "system", width: 18 },
      { key: "notes",  width: 28 },
    ]

    ws2.addRow([
      "Cód. Projeto","Projeto","Nº Etapa","Etapa","Descrição","Responsável",
      "Status","% Conclusão","Data Inicial","Prazo","Data Conclusão","Entregável","Sistema","Observações",
    ])
    styleHeader(ws2.lastRow)

    let rowIdx = 0
    ;(data.projects ?? []).forEach((proj: any) => {
      ;(proj.steps ?? []).forEach((step: any) => {
        const row = ws2.addRow([
          proj.code,
          proj.name,
          step.number,
          step.title,
          step.description,
          step.responsible,
          STEP_STATUS_LABEL[step.status] ?? step.status,
          `${step.progress ?? 0}%`,
          step.startDate,
          step.endDate,
          step.endDateActual,
          step.deliverable,
          step.system,
          step.notes,
        ])
        styleBody(row, rowIdx % 2 === 0)
        row.getCell(7).font = {
          name: "Calibri", size: 10,
          color: { argb: STEP_STATUS_TEXT_COLOR[step.status] ?? "FF1E293B" },
        }
        rowIdx++
      })
    })

    // ── ABA 3: INDICADORES ────────────────────────────────────────────────────

    const ws3 = wb.addWorksheet("Indicadores")
    ws3.pageSetup.paperSize   = 9
    ws3.pageSetup.orientation = "portrait" as any

    ws3.mergeCells("A1:C1")
    const t3 = ws3.getCell("A1")
    t3.value     = "Indicadores do Portfólio"
    t3.font      = titleFont
    t3.alignment = { horizontal: "center", vertical: "middle" }
    ws3.getRow(1).height = 28

    ws3.mergeCells("A2:C2")
    const s3 = ws3.getCell("A2")
    s3.value     = data.title ?? title
    s3.font      = { name: "Calibri", size: 11, color: { argb: "FF64748B" } }
    s3.alignment = { horizontal: "center", vertical: "middle" }
    ws3.getRow(2).height = 18

    ws3.addRow(["Indicador","Valor","Detalhes"])
    styleHeader(ws3.lastRow)
    ws3.columns = [
      { key: "ind", width: 28 },
      { key: "val", width: 14 },
      { key: "det", width: 36 },
    ]

    const prjs         = data.projects ?? []
    const totalProj    = prjs.length
    const planejados   = prjs.filter((p: any) => p.status === "planned").length
    const emAndamento  = prjs.filter((p: any) => p.status === "in_progress").length
    const concluidos   = prjs.filter((p: any) => p.status === "done").length
    const atrasados    = prjs.filter((p: any) => p.status === "late").length
    const bloqueados   = prjs.filter((p: any) => (p.steps ?? []).some((s: any) => s.status === "blocked")).length
    const avgPct       = totalProj ? Math.round(prjs.reduce((a: number, p: any) => a + calcProgress(p), 0) / totalProj) : 0
    const totalSteps   = prjs.reduce((a: number, p: any) => a + (p.steps ?? []).length, 0)
    const doneSteps    = prjs.reduce((a: number, p: any) => a + (p.steps ?? []).filter((s: any) => s.status === "done").length, 0)

    const pct100 = (n: number, t: number) => t ? `${Math.round(n/t*100)}% do total` : ""

    const indicators = [
      ["Total de projetos",        totalProj,                 ""],
      ["Planejados",               planejados,                pct100(planejados, totalProj)],
      ["Em andamento",             emAndamento,               pct100(emAndamento, totalProj)],
      ["Concluídos",               concluidos,                pct100(concluidos, totalProj)],
      ["Atrasados",                atrasados,                 pct100(atrasados, totalProj)],
      ["Com etapas bloqueadas",    bloqueados,                pct100(bloqueados, totalProj)],
      ["% médio de conclusão",     `${avgPct}%`,              "Média de todos os projetos"],
      ["Total de etapas",          totalSteps,                ""],
      ["Etapas concluídas",        doneSteps,                 pct100(doneSteps, totalSteps)],
      ["Etapas pendentes",         totalSteps - doneSteps,    pct100(totalSteps - doneSteps, totalSteps)],
      ["Gerado em",                new Date().toLocaleDateString("pt-BR"), ""],
    ]

    indicators.forEach(([ind, val, det], i) => {
      const row = ws3.addRow([ind, val, det])
      styleBody(row, i % 2 === 0)
      row.getCell(2).alignment = { horizontal: "center", vertical: "middle" }
    })

    // ── Gerar buffer e retornar ────────────────────────────────────────────────

    const buf  = await wb.xlsx.writeBuffer()
    const safe = (title ?? "mapa-projetos").replace(/[^a-zA-Z0-9\s\-_]/g, "").trim()

    return new NextResponse(buf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safe}.xlsx"`,
      },
    })
  } catch (err: any) {
    console.error("[apresentacoes/export/excel]", err)
    return NextResponse.json({ error: err.message ?? "Erro ao exportar Excel" }, { status: 500 })
  }
}
