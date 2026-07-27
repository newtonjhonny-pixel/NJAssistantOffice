"use client"

import { useState } from "react"
import { Sparkles, ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  presentationId: string
  type: string
  isProcess?: boolean
  onApply: (content: string) => void
}

const PLACEHOLDER: Record<string, string> = {
  organogram: "Ex: Estrutura de uma empresa de TI com CEO, CTO, Gerentes e times de Desenvolvimento, QA e DevOps",
  flowchart:  "Ex: Fluxo de aprovação de documentos: solicitação → análise → aprovação ou recusa → notificação",
  process:    "Ex: Processo de onboarding de novos funcionários: da contratação até a integração na equipe",
  slides:     "Ex: Apresentação de resultados Q2 2026 para diretoria: crescimento de receita, novos clientes, metas",
}

const LABEL: Record<string, string> = {
  organogram: "organograma",
  flowchart:  "fluxograma",
  process:    "mapa de processo",
  slides:     "apresentação de slides",
}

export function AiAssistantPanel({ presentationId, type, isProcess, onApply }: Props) {
  const [open,    setOpen]    = useState(false)
  const [prompt,  setPrompt]  = useState("")
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function generate() {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch("/api/apresentacoes/ai", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ prompt, type, isProcess }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Erro ao gerar")
        return
      }
      onApply(data.content)
      setSuccess(true)
      setPrompt("")
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  const label = LABEL[type] ?? type

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/50 overflow-hidden">
      {/* Header — toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-purple-50 transition-colors"
      >
        <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
        <span className="flex-1 text-sm font-medium text-purple-800">Gerar com IA</span>
        <span className="text-xs text-purple-500 mr-1">
          {open ? "ocultar" : "expandir"}
        </span>
        {open
          ? <ChevronUp   className="w-4 h-4 text-purple-500" />
          : <ChevronDown className="w-4 h-4 text-purple-500" />
        }
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-purple-100">
          <p className="text-xs text-purple-600 pt-3">
            Descreva o {label} que você quer criar e a IA gerará a estrutura automaticamente.
          </p>

          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={PLACEHOLDER[type] ?? `Descreva o ${label}…`}
            rows={3}
            disabled={loading}
            className="w-full resize-none rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-60 transition-all"
          />

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Estrutura gerada e aplicada! Você pode editar livremente.
            </div>
          )}

          <button
            onClick={generate}
            disabled={!prompt.trim() || loading}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "bg-purple-600 hover:bg-purple-700 text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Gerando…</>
              : <><Sparkles className="w-3.5 h-3.5" />Gerar {label}</>
            }
          </button>

          <p className="text-[10px] text-purple-400">
            ⚠ A estrutura gerada substituirá o conteúdo atual. Salve antes se quiser preservar.
          </p>
        </div>
      )}
    </div>
  )
}
