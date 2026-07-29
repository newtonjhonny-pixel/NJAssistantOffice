"use client"

import type { Rect } from "@xyflow/react"
import { getViewportForBounds } from "@xyflow/react"
import { toPng, toJpeg } from "html-to-image"
import { jsPDF } from "jspdf"

export type DiagramExportFormat = "16:9" | "a4-landscape" | "a3-landscape" | "a4-portrait"

function safeFile(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/, "")
}

function todayISO() { return new Date().toISOString().slice(0, 10) }

// Captura o viewport do React Flow posicionado para mostrar todo o diagrama.
// `bounds` deve ser obtido via useReactFlow().getNodesBounds(nodes) no componente.
async function captureViewport(
  container: HTMLElement,
  bounds:    Rect,
  format:    "png" | "jpeg",
  imgW:      number,
  imgH:      number,
  bg:        string,
): Promise<string> {
  const viewportEl = container.querySelector(".react-flow__viewport") as HTMLElement | null
  if (!viewportEl) throw new Error("react-flow__viewport não encontrado")

  const { x, y, zoom } = getViewportForBounds(bounds, imgW, imgH, 0.5, 2, 40)

  const fn = format === "png" ? toPng : toJpeg
  return fn(viewportEl, {
    backgroundColor: bg,
    width:  imgW,
    height: imgH,
    style: {
      width:     `${imgW}px`,
      height:    `${imgH}px`,
      transform: `translate(${x}px, ${y}px) scale(${zoom})`,
    },
  })
}

export async function exportDiagramToPng(
  container: HTMLElement,
  bounds:    Rect,
  title:     string,
) {
  const dataUrl = await captureViewport(container, bounds, "png", 1920, 1080, "#ffffff")
  const a = document.createElement("a")
  a.download = `${safeFile(title)}_${todayISO()}.png`
  a.href = dataUrl
  a.click()
}

export async function exportDiagramToJpeg(
  container: HTMLElement,
  bounds:    Rect,
  title:     string,
) {
  const dataUrl = await captureViewport(container, bounds, "jpeg", 1920, 1080, "#ffffff")
  const a = document.createElement("a")
  a.download = `${safeFile(title)}_${todayISO()}.jpg`
  a.href = dataUrl
  a.click()
}

export async function exportDiagramToPdf(
  container: HTMLElement,
  bounds:    Rect,
  title:     string,
  pdfFormat: DiagramExportFormat = "a4-landscape",
) {
  type Dim = [imgW: number, imgH: number, pageW: number, pageH: number]
  const DIM: Record<DiagramExportFormat, Dim> = {
    "16:9":         [1920, 1080, 297, 167.0625],
    "a4-landscape": [2480, 1754, 297, 210],
    "a3-landscape": [3508, 2480, 420, 297],
    "a4-portrait":  [1754, 2480, 210, 297],
  }
  const [imgW, imgH, pageW, pageH] = DIM[pdfFormat]
  const isLandscape = pageW > pageH

  const dataUrl = await captureViewport(container, bounds, "png", imgW, imgH, "#ffffff")

  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit:        "mm",
    format:      pdfFormat === "a3-landscape" ? "a3" : "a4",
  })

  const margin = 8
  const maxW = pageW - margin * 2
  const maxH = pageH - margin * 2
  const r  = Math.min(maxW / imgW, maxH / imgH)
  const dw = imgW * r
  const dh = imgH * r
  pdf.addImage(dataUrl, "PNG", margin + (maxW - dw) / 2, margin + (maxH - dh) / 2, dw, dh)
  pdf.save(`${safeFile(title)}_${todayISO()}.pdf`)
}

export async function printDiagram(
  container: HTMLElement,
  bounds:    Rect,
  title:     string,
) {
  const dataUrl = await captureViewport(container, bounds, "png", 2480, 1754, "#ffffff")
  const w = window.open("", "_blank")
  if (!w) return
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>*{margin:0;padding:0}body{background:#fff}img{max-width:100%;height:auto;display:block}
@media print{body{margin:0}}</style>
</head><body><img src="${dataUrl}"/></body></html>`)
  w.document.close()
  setTimeout(() => { w.print(); w.close() }, 600)
}
