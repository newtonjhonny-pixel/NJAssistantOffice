"use client"

import { useState } from "react"
import { Sparkles, Loader2, X, Check, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

const MODES = [
  { id: "melhorar",     label: "Melhorar escrita" },
  { id: "profissional", label: "Deixar mais profissional" },
  { id: "resumir",      label: "Resumir" },
  { id: "topicos",      label: "Organizar em tópicos" },
  { id: "portugues",    label: "Corrigir português" },
  { id: "ata",          label: "Transformar em ata" },
] as const

interface Props {
  /** Texto atual do campo (pode ser HTML do editor). */
  value: string
  /** Chamado somente se o usuário aceitar a sugestão. */
  onAccept: (text: string) => void
  /** Contexto opcional só para a IA entender o texto — nunca é incorporado. */
  context?: string
  /** true quando o valor é HTML (campo de discussão/resumo). */
  isHtml?: boolean
  className?: string
  label?: string
}

/**
 * Botão "Melhorar com IA" com preview obrigatório.
 * O texto original NUNCA é substituído antes do usuário aceitar.
 */
export function AiImproveButton({ value, onAccept, context, isHtml, className, label }: Props) {
  const [open, setOpen]       = useState(false)
  const [mode, setMode]       = useState<string>("melhorar")
  const [loading, setLoading] = useState(false)
  const [suggestion, setSug]  = useState<string | null>(null)
  const [err, setErr]         = useState<string | null>(null)

  const plain = (value ?? "").replace(/<[^>]*>/g, "").trim()
  const disabled = plain.length < 3

  async function run(selectedMode = mode) {
    setLoading(true); setErr(null)
    try {
      const r = await fetch("/api/meetings/ai/improve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, mode: selectedMode, context }),
      })
      const data = await r.json()
      if (!r.ok) { setErr(data.error ?? "Erro ao consultar a IA."); setSug(null); return }
      setSug(data.suggestion)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado.")
    } finally { setLoading(false) }
  }

  function start() {
    setOpen(true); setSug(null); setErr(null)
    run("melhorar")
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={disabled}
        title={disabled ? "Escreva algo antes de usar a IA" : "Melhorar com IA"}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors",
          "text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          className,
        )}
      >
        <Sparkles className="w-3.5 h-3.5" />
        {label ?? "Melhorar com IA"}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <h3 className="text-sm font-semibold text-slate-800">Melhorar com IA</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modos */}
            <div className="px-5 py-2.5 border-b border-slate-100 flex gap-1.5 flex-wrap">
              {MODES.map(m => (
                <button key={m.id}
                  onClick={() => { setMode(m.id); run(m.id) }}
                  disabled={loading}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-lg border transition-colors disabled:opacity-50",
                    mode === m.id
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                  )}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Comparativo */}
            <div className="flex-1 overflow-y-auto p-5">
              {err && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{err}</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Texto original
                  </p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 max-h-72 overflow-y-auto">
                    {isHtml
                      ? <div dangerouslySetInnerHTML={{ __html: value }} />
                      : <p className="whitespace-pre-wrap">{value}</p>}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-violet-600 uppercase tracking-wide mb-1.5">
                    Sugestão da IA
                  </p>
                  <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 text-sm text-slate-800 max-h-72 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center gap-2 text-slate-500 py-6 justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" /> Gerando sugestão…
                      </div>
                    ) : suggestion ? (
                      isHtml
                        ? <div dangerouslySetInnerHTML={{ __html: suggestion }} />
                        : <p className="whitespace-pre-wrap">{suggestion}</p>
                    ) : (
                      <p className="text-slate-400 py-6 text-center">Nenhuma sugestão ainda.</p>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                A IA reescreve apenas a redação. Fatos, nomes, datas, decisões, responsáveis e prazos
                são preservados — nada é inventado.
              </p>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setOpen(false)}
                className="px-3.5 py-1.5 text-sm text-slate-600 hover:text-slate-800">Cancelar</button>
              <button onClick={() => run()} disabled={loading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
              </button>
              <button
                onClick={() => { if (suggestion) { onAccept(suggestion); setOpen(false) } }}
                disabled={!suggestion || loading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40">
                <Check className="w-3.5 h-3.5" /> Usar sugestão
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
