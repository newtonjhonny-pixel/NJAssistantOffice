"use client"

import React, { useCallback, useRef, useState } from "react"
import { X } from "lucide-react"
import {
  TeamOrgContent, TeamOrgSegment, TeamOrgCollaborator, TeamOrgResponsibility,
  parseTeamOrg, makeOrgId, ORG_COLORS, DEFAULT_LIBRARY,
} from "./teamOrgTypes"
import { TeamOrgToolbar }   from "./TeamOrgToolbar"
import { TeamOrgColumn }    from "./TeamOrgColumn"
import { TeamOrgEditPanel } from "./TeamOrgEditPanel"
import { TeamOrgLibrary }   from "./TeamOrgLibrary"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  initialContent: string | null
  onSave:         (content: string) => Promise<void>
  editorRef?:     React.RefObject<HTMLDivElement | null>
}

// ─── Export helpers (standalone, no React) ────────────────────────────────────

async function buildExportClone(sourceEl: HTMLElement): Promise<{ wrapper: HTMLDivElement; clone: HTMLElement }> {
  const clone = sourceEl.cloneNode(true) as HTMLElement

  // Remove all scrolling constraints on the root clone
  clone.style.overflow   = "visible"
  clone.style.width      = "max-content"
  clone.style.height     = "auto"
  clone.style.background = "#ffffff"
  clone.style.flexShrink = "0"

  // Remove elements explicitly marked for export-hide
  clone.querySelectorAll("[data-export-hide]").forEach(el => el.remove())

  // Remove overflow/maxHeight from scrollable column containers
  clone.querySelectorAll<HTMLElement>("[data-col-scroll]").forEach(el => {
    el.style.maxHeight = "none"
    el.style.overflow  = "visible"
    el.style.height    = "auto"
  })

  // Remove selection rings / hover shadows from cards
  clone.querySelectorAll<HTMLElement>(".ring-2").forEach(el => {
    el.classList.remove("ring-2", "ring-blue-200", "shadow-md", "border-blue-400")
    el.classList.add("border-slate-200")
    el.style.boxShadow = "none"
    el.style.outline   = "none"
  })

  // Off-screen wrapper so it doesn't affect page layout
  const wrapper = document.createElement("div")
  wrapper.style.cssText = [
    "position:absolute",
    "left:-99999px",
    "top:0",
    "z-index:-1",
    "pointer-events:none",
    "background:white",
  ].join(";")
  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  // Two frames for layout to settle
  await new Promise<void>(r => { requestAnimationFrame(() => { requestAnimationFrame(() => r()) }) })

  return { wrapper, clone }
}

async function captureToDataUrl(el: HTMLElement): Promise<string> {
  const { toPng } = await import("html-to-image")
  return toPng(el, { cacheBust: true, pixelRatio: 2 })
}

async function scaleToSlide(rawDataUrl: string, srcW: number, srcH: number): Promise<string> {
  // Scale captured image onto a 1920×1080 white canvas
  const W = 1920, H = 1080
  const img = new Image()
  img.src = rawDataUrl
  await new Promise<void>(r => { img.onload = () => r() })

  const offscreen = document.createElement("canvas")
  offscreen.width  = W
  offscreen.height = H
  const ctx = offscreen.getContext("2d")!
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, W, H)

  const scale  = Math.min(W / srcW, H / srcH)
  const drawW  = srcW * scale
  const drawH  = srcH * scale
  const ox     = Math.round((W - drawW) / 2)
  const oy     = Math.round((H - drawH) / 2)
  ctx.drawImage(img, ox, oy, drawW, drawH)

  return offscreen.toDataURL("image/png")
}

async function downloadPng(dataUrl: string, name: string): Promise<void> {
  const link = document.createElement("a")
  link.download = `${name}.png`
  link.href     = dataUrl
  link.click()
}

async function downloadPdf(rawDataUrl: string, srcW: number, srcH: number, name: string): Promise<void> {
  const { jsPDF } = await import("jspdf")
  // 16:9 PowerPoint widescreen: 338.67 × 190.5 mm
  const pdf    = new jsPDF({ orientation: "landscape", unit: "mm", format: [338.67, 190.5] })
  const pW     = pdf.internal.pageSize.getWidth()
  const pH     = pdf.internal.pageSize.getHeight()
  const margin = 10
  const maxW   = pW - margin * 2
  const maxH   = pH - margin * 2
  const ratio  = Math.min(maxW / srcW, maxH / srcH)
  const drawW  = srcW * ratio
  const drawH  = srcH * ratio
  const offsetX = margin + (maxW - drawW) / 2
  const offsetY = margin + (maxH - drawH) / 2

  pdf.addImage(rawDataUrl, "PNG", offsetX, offsetY, drawW, drawH)
  pdf.save(`${name}.pdf`)
}

async function downloadPptx(slideDataUrl: string, name: string): Promise<void> {
  const res = await fetch("/api/apresentacoes/export", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ title: name, type: "teamorg-image", imageData: slideDataUrl }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }))
    throw new Error(err.error ?? "Falha ao gerar PPTX")
  }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.download = `${name}.pptx`
  link.href     = url
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ─── Canvas content — shared between edit view and preview ───────────────────

interface CanvasContentProps {
  content:           TeamOrgContent
  activeSegments:    TeamOrgSegment[]
  collabsForSeg:     (segId: string) => TeamOrgCollaborator[]
  selectedCollabId:  string | null
  selectedSegId:     string | null
  exportMode:        boolean
  onDeselect?:       () => void
  onSelectSegment?:  (id: string) => void
  onSelectCollab?:   (id: string) => void
  onAddCollab?:      (segId: string) => void
  onDeleteCollab?:   (id: string) => void
  onDuplicateCollab?:(id: string) => void
  onReorder?:        (segId: string, cols: TeamOrgCollaborator[]) => void
  onDeleteSegment?:  (id: string) => void
}

function CanvasContent({
  content, activeSegments, collabsForSeg,
  selectedCollabId, selectedSegId, exportMode,
  onDeselect, onSelectSegment, onSelectCollab,
  onAddCollab, onDeleteCollab, onDuplicateCollab, onReorder, onDeleteSegment,
}: CanvasContentProps) {
  return (
    <>
      {/* Title bar */}
      <div className="px-8 pt-6 pb-3">
        <h1 className="text-lg font-black text-slate-800 tracking-widest uppercase text-center">
          {content.title}
        </h1>
        <div className="h-0.5 bg-slate-300 mt-3 rounded-full" />
      </div>

      {/* Columns */}
      <div
        className="flex gap-5 px-8 pb-8 pt-2"
        style={{ minWidth: "max-content" }}
        onClick={exportMode ? undefined : e => e.stopPropagation()}
      >
        {activeSegments.map(seg => (
          <TeamOrgColumn
            key={seg.id}
            segment={seg}
            collaborators={collabsForSeg(seg.id)}
            library={content.library}
            selectedCollabId={exportMode ? null : selectedCollabId}
            selectedSegmentId={exportMode ? null : selectedSegId}
            exportMode={exportMode}
            onSelectSegment={() => onSelectSegment?.(seg.id)}
            onSelectCollab={id => onSelectCollab?.(id)}
            onAddCollab={segId => onAddCollab?.(segId)}
            onDeleteCollab={id => onDeleteCollab?.(id)}
            onDuplicateCollab={id => onDuplicateCollab?.(id)}
            onReorder={(segId, cols) => onReorder?.(segId, cols)}
            onDeleteSegment={() => onDeleteSegment?.(seg.id)}
          />
        ))}

        {activeSegments.length === 0 && !exportMode && (
          <div className="flex flex-col items-center justify-center w-72 h-48 rounded-xl border-2 border-dashed border-slate-300 text-slate-400">
            <p className="text-sm font-medium">Nenhum segmento</p>
            <p className="text-xs mt-1">Clique em "+ Segmento" para começar</p>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export function TeamOrgEditor({ initialContent, onSave, editorRef }: Props) {
  const [content,          setContent]          = useState<TeamOrgContent>(() => parseTeamOrg(initialContent))
  const [selectedSegId,    setSelectedSegId]    = useState<string | null>(null)
  const [selectedCollabId, setSelectedCollabId] = useState<string | null>(null)
  const [showLibrary,      setShowLibrary]      = useState(false)
  const [showExportMenu,   setShowExportMenu]   = useState(false)
  const [showPreview,      setShowPreview]      = useState(false)
  const [exporting,        setExporting]        = useState(false)
  const [saving,           setSaving]           = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  function update(patch: Partial<TeamOrgContent>) {
    setContent(c => ({ ...c, ...patch }))
  }

  const deselect = useCallback(() => {
    setSelectedSegId(null)
    setSelectedCollabId(null)
  }, [])

  const activeSegments = content.segments
    .filter(s => s.active)
    .sort((a, b) => a.order - b.order)

  function collabsForSeg(segId: string) {
    return content.collaborators
      .filter(c => c.segmentId === segId && c.active)
      .sort((a, b) => a.order - b.order)
  }

  // ── Segment operations ───────────────────────────────────────────────────────

  function addSegment() {
    const nextColor = ORG_COLORS[content.segments.length % ORG_COLORS.length].value
    const seg: TeamOrgSegment = {
      id:     makeOrgId(),
      name:   `Segmento ${content.segments.length + 1}`,
      color:  nextColor,
      order:  content.segments.length,
      active: true,
    }
    update({ segments: [...content.segments, seg] })
    setSelectedSegId(seg.id)
    setSelectedCollabId(null)
  }

  function updateSegment(id: string, patch: Partial<TeamOrgSegment>) {
    update({ segments: content.segments.map(s => s.id === id ? { ...s, ...patch } : s) })
  }

  function deleteSegment(id: string) {
    if (!confirm("Excluir segmento e todos os colaboradores desta coluna?")) return
    update({
      segments:      content.segments.filter(s => s.id !== id),
      collaborators: content.collaborators.filter(c => c.segmentId !== id),
    })
    if (selectedSegId === id) deselect()
  }

  // ── Collaborator operations ──────────────────────────────────────────────────

  function addCollab(segmentId: string) {
    const existing = collabsForSeg(segmentId)
    const col: TeamOrgCollaborator = {
      id:                makeOrgId(),
      segmentId,
      name:              "Novo Colaborador",
      role:              "Cargo",
      unit:              "",
      companiesCount:    1,
      responsibilityIds: [],
      order:             existing.length,
      active:            true,
    }
    update({ collaborators: [...content.collaborators, col] })
    setSelectedCollabId(col.id)
    setSelectedSegId(null)
  }

  function updateCollab(id: string, patch: Partial<TeamOrgCollaborator>) {
    update({ collaborators: content.collaborators.map(c => c.id === id ? { ...c, ...patch } : c) })
  }

  function deleteCollab(id: string) {
    update({ collaborators: content.collaborators.filter(c => c.id !== id) })
    if (selectedCollabId === id) deselect()
  }

  function duplicateCollab(id: string) {
    const src = content.collaborators.find(c => c.id === id)
    if (!src) return
    const copy: TeamOrgCollaborator = {
      ...src,
      id:    makeOrgId(),
      name:  `${src.name} (cópia)`,
      order: src.order + 0.5,
    }
    update({ collaborators: [...content.collaborators, copy] })
    setSelectedCollabId(copy.id)
    setSelectedSegId(null)
  }

  function reorderCollabs(segId: string, reordered: TeamOrgCollaborator[]) {
    const others = content.collaborators.filter(c => c.segmentId !== segId)
    update({ collaborators: [...others, ...reordered] })
  }

  function updateLibrary(lib: TeamOrgResponsibility[]) {
    update({ library: lib })
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  async function handleExport(fmt: "png" | "pdf" | "pptx") {
    setShowExportMenu(false)
    setExporting(true)
    deselect()

    const name = content.title.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() || "organograma"

    try {
      // Wait for deselect to re-render (clears blue rings)
      await new Promise<void>(r => { requestAnimationFrame(() => { requestAnimationFrame(() => r()) }) })

      const sourceEl = canvasRef.current
      if (!sourceEl) return

      const { wrapper, clone } = await buildExportClone(sourceEl)
      const srcW = clone.offsetWidth  || clone.scrollWidth
      const srcH = clone.offsetHeight || clone.scrollHeight

      const rawDataUrl = await captureToDataUrl(clone)
      document.body.removeChild(wrapper)

      if (fmt === "png") {
        const slideDataUrl = await scaleToSlide(rawDataUrl, srcW, srcH)
        await downloadPng(slideDataUrl, name)
      } else if (fmt === "pdf") {
        await downloadPdf(rawDataUrl, srcW, srcH, name)
      } else {
        const slideDataUrl = await scaleToSlide(rawDataUrl, srcW, srcH)
        await downloadPptx(slideDataUrl, name)
      }
    } catch (err) {
      console.error("[TeamOrgEditor] export error:", err)
      alert("Erro ao exportar. Tente novamente.")
    } finally {
      setExporting(false)
    }
  }

  // ── Print ─────────────────────────────────────────────────────────────────────

  function handlePrint() {
    window.print()
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    try { await onSave(JSON.stringify(content)) }
    finally { setSaving(false) }
  }

  const hasPanel = !!(selectedSegId || selectedCollabId)

  return (
    <>
      {/* Print CSS — injected inline so it's always available */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .org-print-area, .org-print-area * { visibility: visible !important; }
          .org-print-area {
            position: fixed !important;
            inset: 0 !important;
            overflow: visible !important;
            background: white !important;
            padding: 20px !important;
          }
          .org-print-area [data-col-scroll] {
            max-height: none !important;
            overflow: visible !important;
          }
          .org-print-area [data-export-hide] { display: none !important; }
          @page { size: landscape; margin: 0; }
        }
      `}</style>

      <div
        ref={editorRef as React.RefObject<HTMLDivElement>}
        className="org-print-area flex flex-col rounded-xl border border-slate-200 overflow-hidden bg-white"
        style={{ minHeight: 700 }}
      >
        <TeamOrgToolbar
          title={content.title}
          saving={saving}
          exporting={exporting}
          onTitleChange={v => update({ title: v })}
          onAddSegment={addSegment}
          onOpenLibrary={() => setShowLibrary(true)}
          onExport={() => setShowExportMenu(v => !v)}
          onPreview={() => setShowPreview(true)}
          onSave={handleSave}
        />

        {/* Export dropdown */}
        {showExportMenu && (
          <div className="relative">
            <div className="absolute right-2 top-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden w-44">
              <button onClick={() => handleExport("png")} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                Imagem PNG (1920×1080)
              </button>
              <button onClick={() => handleExport("pdf")} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                PDF 16:9
              </button>
              <button onClick={() => handleExport("pptx")} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                PowerPoint (.pptx)
              </button>
              <div className="border-t border-slate-100" />
              <button onClick={handlePrint} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                Imprimir
              </button>
            </div>
            <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Canvas — slide-like white background, horizontal scroll for editing */}
          <div
            ref={canvasRef}
            className="flex-1 overflow-auto bg-slate-200"
            onClick={deselect}
          >
            {/* Slide frame — white background with shadow */}
            <div
              className="m-4 bg-white shadow-xl rounded-sm"
              style={{ minWidth: "max-content", minHeight: 580 }}
            >
              <CanvasContent
                content={content}
                activeSegments={activeSegments}
                collabsForSeg={collabsForSeg}
                selectedCollabId={selectedCollabId}
                selectedSegId={selectedSegId}
                exportMode={false}
                onDeselect={deselect}
                onSelectSegment={id => { setSelectedSegId(id); setSelectedCollabId(null) }}
                onSelectCollab={id => { setSelectedCollabId(id); setSelectedSegId(null) }}
                onAddCollab={addCollab}
                onDeleteCollab={deleteCollab}
                onDuplicateCollab={duplicateCollab}
                onReorder={reorderCollabs}
                onDeleteSegment={deleteSegment}
              />
            </div>
          </div>

          {/* Edit panel */}
          {hasPanel && (
            <TeamOrgEditPanel
              selectedSegmentId={selectedSegId}
              selectedCollabId={selectedCollabId}
              segments={content.segments}
              collaborators={content.collaborators}
              library={content.library}
              onUpdateSegment={updateSegment}
              onUpdateCollab={updateCollab}
              onDeselect={deselect}
            />
          )}
        </div>

        {/* Library modal */}
        {showLibrary && (
          <TeamOrgLibrary
            library={content.library}
            onChange={updateLibrary}
            onClose={() => setShowLibrary(false)}
          />
        )}
      </div>

      {/* Preview modal — 16:9 full-screen, no controls */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6">
          {/* Header */}
          <div className="flex items-center justify-between w-full max-w-5xl mb-3">
            <p className="text-white/70 text-xs font-medium tracking-wide uppercase">
              Visualização — {content.title}
            </p>
            <button
              onClick={() => setShowPreview(false)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 16:9 slide frame */}
          <div
            className="bg-white shadow-2xl w-full max-w-5xl overflow-auto"
            style={{ aspectRatio: "16/9" }}
          >
            <CanvasContent
              content={content}
              activeSegments={activeSegments}
              collabsForSeg={collabsForSeg}
              selectedCollabId={null}
              selectedSegId={null}
              exportMode={true}
            />
          </div>

          <p className="text-white/40 text-[10px] mt-3">
            Proporção 16:9 · Pressione Esc para fechar
          </p>
        </div>
      )}
    </>
  )
}
