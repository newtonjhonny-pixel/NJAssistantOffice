"use client"

import { useEffect, useRef, useState } from "react"
import {
  X, Bot, RefreshCw, Copy, Check, Printer, AlertCircle,
  Loader2, Sparkles, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(raw: string): string {
  let html = raw
    // Escape HTML entities first (security)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-slate-800 mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-indigo-700 mt-6 mb-2 flex items-center gap-1.5 border-b border-indigo-100 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-slate-900 mt-4 mb-2">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-800">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-slate-200 my-4" />')
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 text-sm text-slate-700 leading-relaxed list-disc list-inside">$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-sm text-slate-700 leading-relaxed list-decimal list-inside">$1</li>')
    // Emoji health indicators — make them pop
    .replace(/(🟢[^\n]+)/g, '<span class="inline-flex items-center gap-1 bg-green-50 text-green-800 border border-green-200 rounded-lg px-2.5 py-1 text-sm font-medium">$1</span>')
    .replace(/(🟡[^\n]+)/g, '<span class="inline-flex items-center gap-1 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg px-2.5 py-1 text-sm font-medium">$1</span>')
    .replace(/(🔴[^\n]+)/g, '<span class="inline-flex items-center gap-1 bg-red-50 text-red-800 border border-red-200 rounded-lg px-2.5 py-1 text-sm font-medium">$1</span>')
    // Paragraphs — blank line between blocks
    .replace(/\n\n/g, '</p><p class="text-sm text-slate-700 leading-relaxed my-2">')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br />')

  return `<p class="text-sm text-slate-700 leading-relaxed">${html}</p>`
}

// ─── Section navigator ────────────────────────────────────────────────────────

const SECTIONS = [
  "Resumo Executivo",
  "Saúde do Projeto",
  "Riscos Encontrados",
  "Gargalos",
  "Top 5 Prioridades",
  "Avaliação do Cronograma",
  "Sugestões de Melhoria",
  "Indicadores",
  "Parecer do Coordenador",
  "Plano de Ação",
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string
  projectName: string
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjetoIAModal({ projectId, projectName, onClose }: Props) {
  const [content,   setContent]   = useState("")
  const [aiPowered, setAiPowered] = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState("")
  const [copied,    setCopied]    = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  async function runAnalysis() {
    setLoading(true)
    setError("")
    setContent("")
    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`, { method: "POST" })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? "Erro ao analisar o projeto.")
        return
      }
      const data = await res.json()
      setContent(data.content)
      setAiPowered(data.aiPowered)
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { runAnalysis() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function copyReport() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function printReport() {
    const printWindow = window.open("", "_blank", "width=900,height=700")
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Análise IA — ${projectName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; color: #1e293b; line-height: 1.6; }
          h1 { font-size: 24px; border-bottom: 2px solid #6366f1; padding-bottom: 8px; color: #312e81; }
          h2 { font-size: 16px; color: #4338ca; margin-top: 28px; border-bottom: 1px solid #e0e7ff; padding-bottom: 4px; }
          h3 { font-size: 14px; color: #1e293b; margin-top: 16px; }
          p, li { font-size: 14px; color: #334155; }
          li { margin-left: 20px; }
          strong { color: #1e293b; }
          hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
          .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>🤖 Análise de Projeto — IA</h1>
        <p><strong>Projeto:</strong> ${projectName}<br/>
        <strong>Gerado em:</strong> ${new Date().toLocaleString("pt-BR")}<br/>
        <strong>Modo:</strong> ${aiPowered ? "OpenAI GPT" : "Análise local"}</p>
        <hr/>
        <div>${renderMarkdown(content)}</div>
        <div class="footer">Relatório gerado pelo NJ Assistant Office — Módulo Projetos</div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 500)
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-gradient-to-r from-indigo-600 to-violet-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Análise com IA — Gerente de Projetos</h2>
              <p className="text-xs text-indigo-200 truncate max-w-xs">{projectName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && !error && (
              <>
                <button
                  onClick={copyReport}
                  className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copiado!" : "Copiar"}
                </button>
                <button
                  onClick={printReport}
                  className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Exportar PDF
                </button>
                <button
                  onClick={runAnalysis}
                  className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Atualizar
                </button>
              </>
            )}
            <button onClick={onClose} className="text-white/70 hover:text-white ml-1 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI badge */}
        {!loading && !error && (
          <div className={cn(
            "flex items-center gap-2 px-6 py-2 text-xs shrink-0 border-b",
            aiPowered
              ? "bg-violet-50 text-violet-700 border-violet-100"
              : "bg-amber-50 text-amber-700 border-amber-100",
          )}>
            <Sparkles className="w-3.5 h-3.5" />
            {aiPowered
              ? "Análise gerada por Inteligência Artificial (OpenAI GPT)"
              : "Análise gerada localmente — configure OPENAI_API_KEY para análise com IA real"}
          </div>
        )}

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Side nav — section shortcuts */}
          {!loading && !error && (
            <aside className="w-48 shrink-0 border-r border-slate-100 bg-slate-50 overflow-y-auto py-3 hidden lg:block">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 mb-2">Seções</p>
              {SECTIONS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => {
                    const headings = contentRef.current?.querySelectorAll("h2")
                    headings?.[i]?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }}
                  className="w-full text-left text-xs text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                  <span className="truncate">{i + 1}. {s}</span>
                </button>
              ))}
            </aside>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">Analisando projeto…</p>
                  <p className="text-xs text-slate-400 mt-1">O Gerente de Projetos está revisando todos os dados</p>
                </div>
                <div className="flex flex-col items-center gap-1.5 mt-2">
                  {["Verificando etapas e tarefas…", "Identificando riscos e gargalos…", "Elaborando plano de ação…"].map((msg, i) => (
                    <p key={i} className="text-xs text-slate-400 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-indigo-300 inline-block" /> {msg}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center h-full py-16 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-red-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">Erro na análise</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">{error}</p>
                </div>
                <button
                  onClick={runAnalysis}
                  className="flex items-center gap-2 text-sm text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-lg px-4 py-2 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                </button>
              </div>
            )}

            {/* Report */}
            {!loading && !error && content && (
              <div
                ref={contentRef}
                className="px-8 py-6 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
            <p className="text-xs text-slate-400">
              {new Date().toLocaleString("pt-BR")} — NJ Assistant Office
            </p>
            <button
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
