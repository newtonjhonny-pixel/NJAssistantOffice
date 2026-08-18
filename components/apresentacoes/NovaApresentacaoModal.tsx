"use client"

import { useState } from "react"
import {
  X, Presentation, LayoutTemplate, Share2, Brain,
  BarChart2, GitBranch, Clock, FileText, Users, Network, Layers,
} from "lucide-react"

const TIPOS = [
  { value: "slides",        label: "Slides",                    icon: Presentation,  desc: "Apresentação com múltiplos slides",                              color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" },
  { value: "project-map",   label: "Mapa de Projetos",          icon: Layers,        desc: "Apresente vários projetos e suas etapas, do início à conclusão.", color: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100" },
  { value: "organogram",    label: "Organograma",               icon: Share2,        desc: "Estrutura hierárquica da equipe/empresa",                        color: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100" },
  { value: "team-org",      label: "Organograma de Equipe",     icon: Users,         desc: "Segmentos, colaboradores e responsabilidades",                   color: "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100" },
  { value: "process-org",   label: "Organograma de Processos",  icon: Network,       desc: "Colaboradores, funções, atividades e itens integrados",          color: "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100" },
  { value: "flowchart",     label: "Fluxograma",                icon: GitBranch,     desc: "Processos e fluxo de trabalho",                                  color: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" },
  { value: "mindmap",       label: "Mapa Mental",               icon: Brain,         desc: "Organização visual de ideias",                                   color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" },
  { value: "timeline",      label: "Cronograma",                icon: Clock,         desc: "Linha do tempo e planejamento",                                  color: "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100" },
  { value: "process",       label: "Mapa de Processo",          icon: LayoutTemplate,desc: "Mapeamento de processos e procedimentos",                        color: "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100" },
  { value: "infographic",   label: "Infográfico",               icon: BarChart2,     desc: "Dados e informações visualmente",                                color: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100" },
  { value: "report",        label: "Relatório Visual",          icon: FileText,      desc: "Relatório estruturado com dados",                                color: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100" },
]

interface Props {
  onClose: () => void
  onSaved: (id: string) => void
}

export function NovaApresentacaoModal({ onClose, onSaved }: Props) {
  const [step,      setStep]      = useState<"type" | "form">("type")
  const [tipoSel,   setTipoSel]   = useState("")
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState("")
  const [form,      setForm]      = useState({
    title:       "",
    description: "",
    objective:   "",
    audience:    "",
  })

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function selectTipo(value: string) {
    setTipoSel(value)
    setStep("form")
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError("Título é obrigatório"); return }
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/apresentacoes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, type: tipoSel }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? "Erro ao salvar")
        return
      }
      const data = await res.json()
      onSaved(data.id)
    } catch {
      setError("Erro de conexão")
    } finally {
      setSaving(false)
    }
  }

  const tipoInfo = TIPOS.find(t => t.value === tipoSel)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-2 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[94vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-w-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-white p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Presentation className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Nova Apresentação</h2>
              {step === "form" && tipoInfo && (
                <p className="text-xs text-slate-500">{tipoInfo.label}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step === "form" && (
              <button
                onClick={() => setStep("type")}
                className="text-xs text-slate-500 hover:text-blue-600 transition-colors px-2 py-1 rounded-md hover:bg-slate-50"
              >
                ← Trocar tipo
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step 1: selecionar tipo */}
        {step === "type" && (
          <div className="p-4 sm:p-6">
            <p className="text-sm text-slate-500 mb-4">Selecione o tipo de apresentação:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TIPOS.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.value}
                    onClick={() => selectTipo(t.value)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${t.color}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{t.label}</p>
                      <p className="text-xs mt-0.5 opacity-70 leading-snug">{t.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: formulário */}
        {step === "form" && (
          <form onSubmit={submit} className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => setField("title", e.target.value)}
                placeholder="Ex: Apresentação de Resultados Q2 2026"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <textarea
                value={form.description}
                onChange={e => setField("description", e.target.value)}
                placeholder="Breve descrição do conteúdo..."
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Objetivo</label>
              <input
                type="text"
                value={form.objective}
                onChange={e => setField("objective", e.target.value)}
                placeholder="Ex: Apresentar os resultados do semestre à diretoria"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Público-alvo</label>
              <input
                type="text"
                value={form.audience}
                onChange={e => setField("audience", e.target.value)}
                placeholder="Ex: Diretoria, Equipe de RH, Clientes..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {saving ? "Criando..." : "Criar Apresentação"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
