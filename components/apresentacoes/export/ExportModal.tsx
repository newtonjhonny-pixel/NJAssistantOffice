"use client"

import { useRef, useState } from "react"
import { X, FileImage, FileText, Presentation, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  exportToPng,
  exportToPdf,
  exportToPptx,
  exportToPptxFromImage,
} from "./exportUtils"

interface Props {
  title:      string
  type:       string
  content:    string | null
  editorRef:  React.RefObject<HTMLElement | null>
  onClose:    () => void
}

type Format = "png" | "pdf" | "pptx"
type Status = "idle" | "loading" | "success" | "error"

const FORMATS: { id: Format; label: string; icon: React.ElementType; desc: string; color: string }[] = [
  {
    id:    "png",
    label: "Imagem PNG",
    icon:  FileImage,
    desc:  "Captura visual do editor em alta resolução (2×)",
    color: "text-green-600",
  },
  {
    id:    "pdf",
    label: "PDF",
    icon:  FileText,
    desc:  "Documento PDF em página A4, pronto para imprimir",
    color: "text-red-600",
  },
  {
    id:    "pptx",
    label: "PowerPoint",
    icon:  Presentation,
    desc:  "Arquivo .pptx editável no PowerPoint ou Google Slides",
    color: "text-blue-600",
  },
]

export function ExportModal({ title, type, content, editorRef, onClose }: Props) {
  const [status,  setStatus]  = useState<Record<Format, Status>>({ png: "idle", pdf: "idle", pptx: "idle" })
  const [error,   setError]   = useState<Partial<Record<Format, string>>>({})

  const safe = title.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() || "apresentacao"

  async function doExport(fmt: Format) {
    setStatus(s => ({ ...s, [fmt]: "loading" }))
    setError(e => ({ ...e, [fmt]: undefined }))
    try {
      const el = editorRef.current
      if (fmt === "png") {
        if (!el) throw new Error("Editor não encontrado")
        await exportToPng(el, safe)
      } else if (fmt === "pdf") {
        if (!el) throw new Error("Editor não encontrado")
        await exportToPdf(el, safe)
      } else {
        // pptx
        if (type === "slides" && content) {
          await exportToPptx(content, safe)
        } else {
          if (!el) throw new Error("Editor não encontrado")
          await exportToPptxFromImage(el, safe)
        }
      }
      setStatus(s => ({ ...s, [fmt]: "success" }))
      setTimeout(() => setStatus(s => ({ ...s, [fmt]: "idle" })), 3000)
    } catch (err: any) {
      setStatus(s => ({ ...s, [fmt]: "error" }))
      setError(e => ({ ...e, [fmt]: err.message ?? "Erro ao exportar" }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">Exportar apresentação</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">{title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format cards */}
        <div className="space-y-3">
          {FORMATS.map(({ id, label, icon: Icon, desc, color }) => {
            const st = status[id]
            return (
              <div
                key={id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  st === "success" ? "border-green-200 bg-green-50"
                    : st === "error" ? "border-red-200 bg-red-50"
                    : "border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-blue-50/30",
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <Icon className={cn("w-5 h-5", color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  {st === "error" && error[id] ? (
                    <p className="text-xs text-red-600 truncate">{error[id]}</p>
                  ) : (
                    <p className="text-xs text-slate-400 truncate">{desc}</p>
                  )}
                </div>
                <button
                  onClick={() => doExport(id)}
                  disabled={st === "loading"}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    st === "success"
                      ? "bg-green-100 text-green-700 cursor-default"
                      : st === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60",
                  )}
                >
                  {st === "loading" && <Loader2 className="w-3 h-3 animate-spin" />}
                  {st === "success" && <CheckCircle2 className="w-3 h-3" />}
                  {st === "error"   && <AlertCircle  className="w-3 h-3" />}
                  {st === "loading" ? "Gerando…"
                    : st === "success" ? "Baixado!"
                    : st === "error"   ? "Tentar novamente"
                    : "Baixar"}
                </button>
              </div>
            )
          })}
        </div>

        {/* Note for non-slides pptx */}
        {type !== "slides" && (
          <p className="mt-4 text-xs text-slate-400 text-center">
            O PowerPoint para {type === "organogram" ? "organogramas" : "fluxogramas"} exporta como imagem incorporada.
          </p>
        )}
      </div>
    </div>
  )
}
