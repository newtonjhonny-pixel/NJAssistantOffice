// ─── Slide data model ──────────────────────────────────────────────────────────

export type ElementType = "title" | "text" | "subtitle" | "shape" | "image"
export type ShapeType   = "rect" | "circle" | "arrow"
export type TextAlign   = "left" | "center" | "right"
export type FontSize    = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl"

export interface SlideElement {
  id:        string
  type:      ElementType
  x:         number     // % 0-100
  y:         number     // % 0-100
  w:         number     // % 0-100
  h:         number     // % 0-100
  content?:  string
  fontSize?: FontSize
  bold?:     boolean
  italic?:   boolean
  align?:    TextAlign
  color?:    string
  bg?:       string
  shape?:    ShapeType
  opacity?:  number
}

export interface Slide {
  id:         string
  bg:         string    // CSS color or gradient
  elements:   SlideElement[]
}

export interface SlideContent {
  slides: Slide[]
}

// ─── Theme presets ─────────────────────────────────────────────────────────────

export const BG_PRESETS = [
  { label: "Branco",       value: "#ffffff" },
  { label: "Claro",        value: "#f8fafc" },
  { label: "Azul escuro",  value: "#1e3a5f" },
  { label: "Grafite",      value: "#1e293b" },
  { label: "Azul royal",   value: "#1d4ed8" },
  { label: "Verde",        value: "#14532d" },
  { label: "Degradê azul", value: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)" },
  { label: "Degradê cinza",value: "linear-gradient(135deg,#1e293b 0%,#475569 100%)" },
]

export const FONT_SIZES: { label: string; value: FontSize; px: number }[] = [
  { label: "10px", value: "xs",   px: 10 },
  { label: "12px", value: "sm",   px: 12 },
  { label: "14px", value: "base", px: 14 },
  { label: "18px", value: "lg",   px: 18 },
  { label: "24px", value: "xl",   px: 24 },
  { label: "30px", value: "2xl",  px: 30 },
  { label: "36px", value: "3xl",  px: 36 },
  { label: "48px", value: "4xl",  px: 48 },
]

export function fontSizePx(fs?: FontSize): number {
  return FONT_SIZES.find(f => f.value === fs)?.px ?? 18
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

export function makeSlide(bg = "#1e3a5f"): Slide {
  const id = makeId()
  return {
    id,
    bg,
    elements: [
      {
        id:       makeId(),
        type:     "title",
        x:        8, y: 30, w: 84, h: 18,
        content:  "Título do Slide",
        fontSize: "3xl",
        bold:     true,
        align:    "center",
        color:    bg.startsWith("#1") ? "#ffffff" : "#1e293b",
      },
      {
        id:       makeId(),
        type:     "subtitle",
        x:        15, y: 52, w: 70, h: 10,
        content:  "Subtítulo ou descrição",
        fontSize: "lg",
        align:    "center",
        color:    bg.startsWith("#1") ? "#93c5fd" : "#64748b",
      },
    ],
  }
}

export function defaultContent(): SlideContent {
  return {
    slides: [
      makeSlide("#1e3a5f"),
      {
        id: makeId(),
        bg: "#f8fafc",
        elements: [
          {
            id:       makeId(),
            type:     "title",
            x:        5, y: 8, w: 90, h: 15,
            content:  "Agenda",
            fontSize: "3xl",
            bold:     true,
            align:    "left",
            color:    "#1e293b",
          },
          {
            id:       makeId(),
            type:     "text",
            x:        8, y: 28, w: 84, h: 55,
            content:  "• Item 1\n• Item 2\n• Item 3\n• Item 4",
            fontSize: "xl",
            align:    "left",
            color:    "#334155",
          },
        ],
      },
    ],
  }
}
