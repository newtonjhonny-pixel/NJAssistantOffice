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
