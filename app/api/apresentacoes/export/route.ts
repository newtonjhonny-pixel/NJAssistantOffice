import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface SlideEl {
  type:     string
  x:        number
  y:        number
  w:        number
  h:        number
  content?: string
  fontSize?: string
  bold?:    boolean
  italic?:  boolean
  align?:   string
  color?:   string
  bg?:      string
  shape?:   string
  opacity?: number
}

interface SlideData {
  id:       string
  bg:       string
  elements: SlideEl[]
}

const FONT_SIZE_MAP: Record<string, number> = {
  xs: 10, sm: 12, base: 14, lg: 18, xl: 24, "2xl": 30, "3xl": 36, "4xl": 48,
}

function hexColor(hex: string): string {
  return hex.replace("#", "").padEnd(6, "0").slice(0, 6).toUpperCase()
}

function bgColor(bg: string): string {
  if (bg.startsWith("#")) return hexColor(bg)
  const match = bg.match(/#([0-9a-fA-F]{6})/)
  return match ? match[1].toUpperCase() : "1E3A5F"
}

export async function POST(req: NextRequest) {
  try {
    const { content, title, type, imageData } = await req.json()

    const PptxGenJS = (await import("pptxgenjs")).default
    const pptx = new PptxGenJS()
    pptx.layout = "LAYOUT_16x9"

    // Team-org or any image: embed captured PNG in a 16:9 slide
    if (type === "teamorg-image" && imageData) {
      const slide = pptx.addSlide()
      slide.background = { color: "FFFFFF" }
      // imageData is a data URL: "data:image/png;base64,..."
      const base64 = (imageData as string).replace(/^data:image\/\w+;base64,/, "")
      slide.addImage({ data: `image/png;base64,${base64}`, x: 0, y: 0, w: "100%", h: "100%", sizing: { type: "contain", w: 10, h: 5.625 } })
    } else if (type === "slides" && content) {
      const parsed = JSON.parse(content) as { slides: SlideData[] }

      for (const slide of parsed.slides) {
        const pSlide = pptx.addSlide()
        pSlide.background = { color: bgColor(slide.bg) }

        for (const el of slide.elements) {
          if (el.type === "shape") {
            pSlide.addShape(el.shape === "circle" ? "ellipse" : "rect", {
              x: `${el.x}%`, y: `${el.y}%`, w: `${el.w}%`, h: `${el.h}%`,
              fill: { color: el.bg ? hexColor(el.bg) : "3B82F6" },
              line: { color: "TRANSPARENT" },
            })
          } else if (["title", "subtitle", "text"].includes(el.type)) {
            pSlide.addText(el.content ?? "", {
              x: `${el.x}%`, y: `${el.y}%`, w: `${el.w}%`, h: `${el.h}%`,
              fontSize: FONT_SIZE_MAP[el.fontSize ?? "xl"] ?? 24,
              bold:     el.bold   ?? false,
              italic:   el.italic ?? false,
              align:    (el.align ?? "left") as "left" | "center" | "right",
              color:    el.color ? hexColor(el.color) : "FFFFFF",
              wrap:     true,
              valign:   "top",
            })
          }
        }
      }
    } else if (type === "project-map" && content) {
      // ── Mapa de Projetos: 1 slide 16:9 ──────────────────────────────────────
      pptx.layout = "LAYOUT_WIDE"  // 13.33" × 7.5"
      const mapData = JSON.parse(content)
      const slide   = pptx.addSlide()
      slide.background = { color: "FFFFFF" }

      const SLIDE_W  = 13.33
      const SLIDE_H  = 7.5
      const MARGIN   = 0.25

      // Faixa de cabeçalho
      slide.addShape("rect" as any, {
        x: 0, y: 0, w: SLIDE_W, h: 0.65,
        fill: { color: "F1F5F9" },
        line: { color: "E2E8F0", width: 1 },
      })
      slide.addText(mapData.title ?? "Mapa de Projetos", {
        x: MARGIN, y: 0.08, w: SLIDE_W - 0.5, h: 0.38,
        fontSize: 20, bold: true, color: "1E293B", valign: "middle", fontFace: "Calibri",
      })
      if (mapData.subtitle) {
        slide.addText(mapData.subtitle, {
          x: MARGIN, y: 0.43, w: SLIDE_W - 0.5, h: 0.2,
          fontSize: 10, color: "64748B", valign: "top", fontFace: "Calibri",
        })
      }

      const projects  = mapData.projects ?? []
      const numProj   = projects.length || 1
      const maxSteps  = Math.max(...projects.map((p: any) => (p.steps ?? []).length), 1)

      const contentX  = MARGIN
      const contentY  = 0.72
      const contentW  = SLIDE_W - MARGIN * 2
      const contentH  = SLIDE_H - contentY - MARGIN * 0.5

      const GAP       = 0.04
      const rowH      = (contentH - GAP * (numProj - 1)) / numProj
      const PROJ_W    = Math.min(1.65, contentW * 0.13)
      const CONN_W    = Math.max(0.18, contentW * 0.02)
      const stepsW    = contentW - PROJ_W - 0.1
      const stepW     = Math.max(0.65, (stepsW - CONN_W * (maxSteps - 1)) / maxSteps)
      const STEP_PAD  = 0.04
      const stepH     = rowH - STEP_PAD * 2

      const PROJ_STATUS_LABEL: Record<string, string> = {
        idea: "Ideia", planned: "Planejado", in_progress: "Em andamento",
        waiting: "Aguardando", done: "Concluido", cancelled: "Cancelado", late: "Atrasado",
      }
      const PROJ_STATUS_COLOR: Record<string, string> = {
        idea: "94A3B8", planned: "3B82F6", in_progress: "F59E0B",
        waiting: "A855F7", done: "10B981", cancelled: "94A3B8", late: "EF4444",
      }
      const STEP_STATUS_BG: Record<string, string> = {
        not_started: "F8FAFC", planned: "EFF6FF", in_progress: "FFFBEB",
        waiting: "FAF5FF", blocked: "FEF2F2", done: "ECFDF5", cancelled: "F1F5F9",
      }
      const STEP_STATUS_BORDER: Record<string, string> = {
        not_started: "E2E8F0", planned: "BFDBFE", in_progress: "FCD34D",
        waiting: "E9D5FF", blocked: "FCA5A5", done: "6EE7B7", cancelled: "E2E8F0",
      }

      const pHex = (h: string) => h.replace("#","").toUpperCase().slice(0,6)
      const calcPct = (p: any) => {
        if (p.progressManual) return p.progress ?? 0
        const steps = p.steps ?? []
        if (!steps.length) return 0
        return Math.round(steps.filter((s: any) => s.status === "done").length / steps.length * 100)
      }

      projects.forEach((proj: any, pi: number) => {
        const rowY   = contentY + pi * (rowH + GAP)
        const pct    = calcPct(proj)
        const ph     = pHex(proj.color ?? "#3b82f6")

        // Fundo da linha
        slide.addShape("roundRect" as any, {
          x: contentX, y: rowY, w: contentW, h: rowH,
          fill: { color: pi % 2 === 0 ? "F8FAFC" : "FFFFFF" },
          line: { color: "E2E8F0", width: 0.5 },
          rectRadius: 0.06,
        })

        // Project card
        const pcX = contentX + 0.04
        const pcY = rowY + STEP_PAD
        const pcW = PROJ_W - 0.06

        slide.addShape("roundRect" as any, {
          x: pcX, y: pcY, w: pcW, h: stepH,
          fill: { color: "FFFFFF" },
          line: { color: ph, width: 1 },
          rectRadius: 0.05,
        })
        slide.addShape("roundRect" as any, {
          x: pcX, y: pcY, w: 0.04, h: stepH,
          fill: { color: ph },
          line: { color: ph, width: 0 },
          rectRadius: 0.02,
        })

        const fs = Math.max(6, Math.round(7.5 * rowH / 0.7))
        slide.addText(proj.code ?? "", {
          x: pcX + 0.08, y: pcY + 0.03, w: pcW - 0.1, h: 0.16,
          fontSize: Math.max(5, fs - 2), bold: true, color: "94A3B8", fontFace: "Calibri",
        })
        slide.addText(proj.name ?? "", {
          x: pcX + 0.08, y: pcY + 0.18, w: pcW - 0.1, h: stepH - 0.38,
          fontSize: fs, bold: true, color: "1E293B", fontFace: "Calibri", wrap: true,
        })
        slide.addText(`${PROJ_STATUS_LABEL[proj.status] ?? proj.status}  ${pct}%`, {
          x: pcX + 0.08, y: pcY + stepH - 0.2, w: pcW - 0.1, h: 0.18,
          fontSize: Math.max(5, fs - 2),
          color: PROJ_STATUS_COLOR[proj.status] ?? "64748B",
          fontFace: "Calibri", valign: "bottom",
        })

        // Steps
        const stepsX = contentX + PROJ_W + 0.06
        const steps  = proj.steps ?? []

        steps.forEach((step: any, si: number) => {
          const sx    = stepsX + si * (stepW + CONN_W)
          const sy    = rowY + STEP_PAD
          const scBg  = STEP_STATUS_BG[step.status]  ?? "F8FAFC"
          const scBdr = STEP_STATUS_BORDER[step.status] ?? "E2E8F0"

          slide.addShape("roundRect" as any, {
            x: sx, y: sy, w: stepW, h: stepH,
            fill: { color: scBg },
            line: { color: scBdr, width: 1 },
            rectRadius: 0.05,
          })

          // Badge INÍCIO/FIM/MARCO
          if (step.nodeType && step.nodeType !== "middle") {
            const bl = step.nodeType === "start" ? "INICIO" : step.nodeType === "end" ? "FIM" : "MARCO"
            const bc = step.nodeType === "milestone" ? "F59E0B" : ph
            slide.addShape("roundRect" as any, {
              x: sx + 0.04, y: sy - 0.01, w: 0.32, h: 0.12,
              fill: { color: bc }, line: { color: bc, width: 0 }, rectRadius: 0.03,
            })
            slide.addText(bl, {
              x: sx + 0.04, y: sy - 0.015, w: 0.32, h: 0.12,
              fontSize: 5, bold: true, color: "FFFFFF", fontFace: "Calibri",
              align: "center", valign: "middle",
            })
          }

          slide.addText([
            { text: `${step.number}. `, options: { bold: true } },
            { text: step.title ?? "",   options: { bold: false } },
          ], {
            x: sx + 0.05, y: sy + 0.04, w: stepW - 0.1, h: stepH - 0.08,
            fontSize: Math.max(5, Math.round(7 * rowH / 0.7)),
            color: "1E293B", fontFace: "Calibri", valign: "top", wrap: true,
          })

          // Conector
          if (si < steps.length - 1) {
            slide.addShape("line" as any, {
              x: sx + stepW + 0.01, y: rowY + rowH / 2, w: CONN_W - 0.02, h: 0,
              line: { color: ph + "88", width: 1.5, endArrowType: "triangle" },
            })
          }
        })
      })

    } else {
      // Fallback: blank slide with title text
      const slide = pptx.addSlide()
      slide.background = { color: "FFFFFF" }
      slide.addText(title ?? "Apresentação", {
        x: "10%", y: "40%", w: "80%", h: "20%",
        fontSize: 36, bold: true, align: "center", color: "1E3A5F",
      })
    }


    const buf = await pptx.write({ outputType: "nodebuffer" }) as Buffer
    const safe = (title ?? "apresentacao").replace(/[^a-zA-Z0-9\s\-_]/g, "").trim()

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${safe}.pptx"`,
      },
    })
  } catch (err: any) {
    console.error("[apresentacoes/export]", err)
    return NextResponse.json({ error: err.message ?? "Erro ao exportar" }, { status: 500 })
  }
}
