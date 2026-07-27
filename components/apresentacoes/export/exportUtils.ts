"use client"

// ─── PNG export ───────────────────────────────────────────────────────────────

export async function exportToPng(element: HTMLElement, filename: string): Promise<void> {
  const { toPng } = await import("html-to-image")
  const dataUrl = await toPng(element, { cacheBust: true, pixelRatio: 2 })
  const link = document.createElement("a")
  link.download = `${filename}.png`
  link.href = dataUrl
  link.click()
}

// ─── PDF export ───────────────────────────────────────────────────────────────

export async function exportToPdf(element: HTMLElement, filename: string): Promise<void> {
  const { toPng } = await import("html-to-image")
  const { jsPDF } = await import("jspdf")

  const dataUrl = await toPng(element, { cacheBust: true, pixelRatio: 2 })
  const img = new Image()
  img.src = dataUrl
  await new Promise<void>(res => { img.onload = () => res() })

  const isLandscape = img.width > img.height
  const pdf = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: "a4" })

  const pageW   = pdf.internal.pageSize.getWidth()
  const pageH   = pdf.internal.pageSize.getHeight()
  const margin  = 10
  const maxW    = pageW - margin * 2
  const maxH    = pageH - margin * 2
  const ratio   = Math.min(maxW / img.width, maxH / img.height)
  const drawW   = img.width  * ratio
  const drawH   = img.height * ratio
  const offsetX = margin + (maxW - drawW) / 2
  const offsetY = margin + (maxH - drawH) / 2

  pdf.addImage(dataUrl, "PNG", offsetX, offsetY, drawW, drawH)
  pdf.save(`${filename}.pdf`)
}

// ─── PPTX via server-side API ─────────────────────────────────────────────────

export async function exportToPptx(content: string, title: string): Promise<void> {
  const res = await fetch("/api/apresentacoes/export", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ content, title, type: "slides" }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }))
    throw new Error(err.error ?? "Falha ao gerar PPTX")
  }
  const blob   = await res.blob()
  const url    = URL.createObjectURL(blob)
  const link   = document.createElement("a")
  const safe   = title.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() || "apresentacao"
  link.download = `${safe}.pptx`
  link.href     = url
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ─── PPTX from image (organogram / flowchart) via server ─────────────────────

export async function exportToPptxFromImage(element: HTMLElement, filename: string): Promise<void> {
  // For non-slides types: capture as PNG then embed in a PPTX slide via API
  // We send a simplified payload and the server creates a title slide
  const res = await fetch("/api/apresentacoes/export", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ title: filename, type: "image" }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }))
    throw new Error(err.error ?? "Falha ao gerar PPTX")
  }
  const blob    = await res.blob()
  const url     = URL.createObjectURL(blob)
  const link    = document.createElement("a")
  const safe    = filename.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() || "apresentacao"
  link.download = `${safe}.pptx`
  link.href     = url
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
