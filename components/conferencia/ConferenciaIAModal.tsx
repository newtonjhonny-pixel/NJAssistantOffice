"use client"

import { useEffect, useRef, useState } from "react"
import { X, Bot, Copy, Check, Printer, RefreshCw, Loader2, AlertCircle, Sparkles, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const ANALYSIS_TYPES = [
  { value: "COMPLETA",             label: "Análise completa",           icon: "🔍" },
  { value: "TEXTO_CORRECAO",       label: "Texto de correção",          icon: "📝" },
  { value: "ORIENTACAO_ANALISTA",  label: "Orientação ao analista",     icon: "🎯" },
  { value: "PARECER_FINAL",        label: "Parecer final",              icon: "📋" },
  { value: "PLANO_PREVENCAO",      label: "Plano de prevenção",         icon: "🛡️" },
  { value: "CHECKLIST_SUGERIDO",   label: "Checklist sugerido",         icon: "✅" },
]

function renderMarkdown(raw: string): string {
  let html = raw
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-slate-800 mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-teal-700 mt-6 mb-2 border-b border-teal-100 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-slate-900 mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-800">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-teal-700 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/^---$/gm, '<hr class="border-slate-200 my-4" />')
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 text-sm text-slate-700 leading-relaxed list-disc list-inside">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-sm text-slate-700 leading-relaxed list-decimal list-inside">$1</li>')
    .replace(/(🟢[^\n]+)/g, '<span class="inline-flex items-center gap-1 bg-green-50 text-green-800 border border-green-200 rounded-lg px-2.5 py-1 text-sm font-medium">$1</span>')
    .replace(/(🟡[^\n]+)/g, '<span class="inline-flex items-center gap-1 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg px-2.5 py-1 text-sm font-medium">$1</span>')
    .replace(/(🔴[^\n]+)/g, '<span class="inline-flex items-center gap-1 bg-red-50 text-red-800 border border-red-200 rounded-lg px-2.5 py-1 text-sm font-medium">$1</span>')
    .replace(/\n\n/g, '</p><p class="text-sm text-slate-700 leading-relaxed my-2">')
    .replace(/\n/g, '<br />')
  return `<p class="text-sm text-slate-700 leading-relaxed">${html}</p>`
}

interface Props {
  conferenceId: string
  conferenceTitle: string
  initialType?: string
  onClose: () => void
}

export function ConferenciaIAModal({ conferenceId, conferenceTitle, initialType = "COMPLETA", onClose }: Props) {
  const [analysisType, setAnalysisType] = useState(initialType)
  const [content,   setContent]   = useState("")
  const [aiPowered, setAiPowered] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState("")
  const [copied,    setCopied]    = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  async function runAnalysis(type = analysisType) {
    setLoading(true); setError(""); setContent("")
    try {
      const res = await fetch(`/api/conferencia/${conferenceId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisType: type }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? "Erro ao gerar análise."); return
      }
      const data = await res.json()
      setContent(data.content); setAiPowered(data.aiPowered)
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { runAnalysis() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function copy() {
    await navigator.clipboard.writeText(content)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function print() {
    const w = window.open("", "_blank", "width=900,height=700")
    if (!w) return
    const typeLabel = ANALYSIS_TYPES.find(t => t.value === analysisType)?.label ?? analysisType
    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${typeLabel} — ${conferenceTitle}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:40px auto;color:#1e293b;line-height:1.6}h1{font-size:22px;border-bottom:2px solid #0d9488;padding-bottom:8px;color:#134e4a}h2{font-size:16px;color:#0f766e;margin-top:24px;border-bottom:1px solid #ccfbf1;padding-bottom:4px}p,li{font-size:14px;color:#334155}li{margin-left:20px}strong{color:#1e293b}hr{border:none;border-top:1px solid #e2e8f0;margin:12px 0}.footer{margin-top:40px;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}@media print{body{margin:20px}}</style>
</head><body><h1>${typeLabel}</h1><p><strong>Conferência:</strong> ${conferenceTitle}<br/><strong>Gerado em:</strong> ${new Date().toLocaleString("pt-BR")}<br/><strong>Modo:</strong> ${aiPowered ? "OpenAI GPT" : "Análise local"}</p><hr/><div>${renderMarkdown(content)}</div><div class="footer">NJ Assistant Office — Módulo Conferência</div></body></html>`)
    w.document.close(); w.focus(); setTimeout(() => w.print(), 400)
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-gradient-to-r from-teal-600 to-emerald-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Análise com IA — Coordenador Administrativo</h2>
              <p className="text-xs text-teal-200 truncate max-w-xs">{conferenceTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && !error && content && (
              <>
                <button onClick={copy} className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-all">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copiado!" : "Copiar"}
                </button>
                <button onClick={print} className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-all">
                  <Printer className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={() => runAnalysis()} className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-all">
                  <RefreshCw className="w-3.5 h-3.5" /> Atualizar
                </button>
              </>
            )}
            <button onClick={onClose} className="text-white/70 hover:text-white ml-1"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* AI badge */}
        {!loading && !error && content && (
          <div className={cn("flex items-center gap-2 px-6 py-2 text-xs shrink-0 border-b",
            aiPowered ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100")}>
            <Sparkles className="w-3.5 h-3.5" />
            {aiPowered ? "Análise gerada por Inteligência Artificial (OpenAI GPT)" : "Análise gerada localmente — configure OPENAI_API_KEY para IA real"}
          </div>
        )}

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — type selector */}
          <aside className="w-48 shrink-0 border-r border-slate-100 bg-slate-50 overflow-y-auto py-3 hidden lg:block">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 mb-2">Tipo de análise</p>
            {ANALYSIS_TYPES.map(t => (
              <button key={t.value}
                onClick={() => { setAnalysisType(t.value); runAnalysis(t.value) }}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2",
                  analysisType === t.value
                    ? "bg-teal-50 text-teal-700 font-semibold border-r-2 border-teal-500"
                    : "text-slate-600 hover:text-teal-700 hover:bg-teal-50/50"
                )}
              >
                <span>{t.icon}</span>
                <span className="truncate">{t.label}</span>
                {analysisType === t.value && <ChevronRight className="w-3 h-3 ml-auto shrink-0" />}
              </button>
            ))}
          </aside>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-teal-400" />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">Gerando análise…</p>
                  <p className="text-xs text-slate-400 mt-1">O Coordenador está revisando os dados</p>
                </div>
              </div>
            )}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center h-full py-16 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-red-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Erro na análise</p>
                <p className="text-xs text-slate-500 max-w-xs text-center">{error}</p>
                <button onClick={() => runAnalysis()} className="flex items-center gap-2 text-sm text-teal-600 border border-teal-200 hover:bg-teal-50 rounded-lg px-4 py-2 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                </button>
              </div>
            )}
            {!loading && !error && content && (
              <div ref={contentRef} className="px-8 py-6 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
            )}
          </div>
        </div>

        {/* Footer */}
        {!loading && !error && content && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
            <p className="text-xs text-slate-400">{new Date().toLocaleString("pt-BR")} — NJ Assistant Office</p>
            <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors">Fechar</button>
          </div>
        )}
      </div>
    </div>
  )
}
