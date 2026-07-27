"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Presentation, Star, StarOff, Pencil, Share2,
  Brain, GitBranch, LayoutTemplate, BarChart2, Clock,
  FileText, FileQuestion, Loader2, History, CheckCircle2, Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { OrgEditor }         from "./organogram/OrgEditor"
import { FlowEditor }        from "./flowchart/FlowEditor"
import { SlideEditor }       from "./slides/SlideEditor"
import { TeamOrgEditor }     from "./teamorg/TeamOrgEditor"
import { AiAssistantPanel }  from "./AiAssistantPanel"
import { ExportModal }       from "./export/ExportModal"
import { VersionPanel }      from "./VersionPanel"
import { LinkToPanel }       from "./LinkToPanel"

interface PresentationDetail {
  id:          string
  title:       string
  description: string | null
  type:        string
  status:      string
  content:     string | null
  thumbnail:   string | null
  favorite:    boolean
  objective:   string | null
  audience:    string | null
  linkedTo:    string | null
  createdAt:   string
  updatedAt:   string
  versions:    { id: string; label: string | null; createdAt: string }[]
  history:     { id: string; action: string; description: string | null; createdAt: string }[]
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  slides:      { label: "Slides",                    icon: Presentation,   color: "text-blue-600",   bg: "bg-blue-50" },
  organogram:  { label: "Organograma",               icon: Share2,         color: "text-purple-600", bg: "bg-purple-50" },
  "team-org":  { label: "Organograma de Equipe",     icon: Brain,          color: "text-indigo-600", bg: "bg-indigo-50" },
  flowchart:   { label: "Fluxograma",                icon: GitBranch,      color: "text-emerald-600",bg: "bg-emerald-50" },
  mindmap:     { label: "Mapa Mental",               icon: Brain,          color: "text-amber-600",  bg: "bg-amber-50" },
  timeline:    { label: "Cronograma",                icon: Clock,          color: "text-cyan-600",   bg: "bg-cyan-50" },
  process:     { label: "Mapa de Processo",          icon: LayoutTemplate, color: "text-orange-600", bg: "bg-orange-50" },
  infographic: { label: "Infográfico",               icon: BarChart2,      color: "text-rose-600",   bg: "bg-rose-50" },
  report:      { label: "Relatório Visual",          icon: FileText,       color: "text-slate-600",  bg: "bg-slate-100" },
}

const STATUS_LABELS: Record<string, string> = {
  draft:    "Rascunho",
  editing:  "Em edição",
  done:     "Concluído",
  archived: "Arquivado",
}

const ACTION_LABELS: Record<string, string> = {
  CRIACAO:       "Criação",
  EDICAO:        "Edição",
  EXPORTACAO:    "Exportação",
  ARQUIVAMENTO:  "Arquivamento",
  RESTAURACAO:   "Restauração",
  FAVORITO:      "Favorito",
}

function fmtDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

export function ApresentacaoDetalheClient({ id }: { id: string }) {
  const router     = useRouter()
  const editorRef  = useRef<HTMLDivElement>(null)
  const [data,        setData]       = useState<PresentationDetail | null>(null)
  const [loading,     setLoading]    = useState(true)
  const [editing,     setEditing]    = useState(false)
  const [title,       setTitle]      = useState("")
  const [saving,      setSaving]     = useState(false)
  const [showExport,  setShowExport] = useState(false)

  async function load() {
    try {
      const res = await fetch(`/api/apresentacoes/${id}`)
      if (!res.ok) { router.push("/apresentacoes"); return }
      const d = await res.json()
      setData(d)
      setTitle(d.title)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function toggleFav() {
    if (!data) return
    const fav = !data.favorite
    setData(d => d ? { ...d, favorite: fav } : d)
    await fetch(`/api/apresentacoes/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ favorite: fav }),
    })
  }

  async function saveTitle() {
    if (!title.trim() || title === data?.title) { setEditing(false); return }
    setSaving(true)
    await fetch(`/api/apresentacoes/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ title, historyNote: "Título atualizado" }),
    })
    setData(d => d ? { ...d, title } : d)
    setSaving(false)
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const cfg  = TYPE_CONFIG[data.type] ?? { label: data.type, icon: FileQuestion, color: "text-slate-500", bg: "bg-slate-50" }
  const Icon = cfg.icon

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.push("/apresentacoes")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Apresentações
      </button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
          <Icon className={cn("w-6 h-6", cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setEditing(false); setTitle(data.title) } }}
                className="flex-1 text-xl font-bold text-slate-800 border-b-2 border-blue-500 bg-transparent focus:outline-none"
              />
              {saving && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-xl font-bold text-slate-800 leading-tight">{data.title}</h1>
              <button
                onClick={() => setEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.color)}>{cfg.label}</span>
            <span className="text-xs text-slate-400">{STATUS_LABELS[data.status] ?? data.status}</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-400">Criado em {fmtDate(data.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(data.type === "slides" || data.type === "organogram" || data.type === "team-org" || data.type === "flowchart" || data.type === "process") && (
            <button
              onClick={() => setShowExport(true)}
              title="Exportar apresentação"
              className="shrink-0 mt-1 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          <button onClick={toggleFav} className="shrink-0 mt-1 text-slate-300 hover:text-amber-400 transition-colors">
            {data.favorite
              ? <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              : <StarOff className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.description && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Descrição</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{data.description}</p>
          </div>
        )}
        {data.objective && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Objetivo</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{data.objective}</p>
          </div>
        )}
        {data.audience && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Público-alvo</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{data.audience}</p>
          </div>
        )}
      </div>

      {/* Editor */}
      {data.type === "team-org" ? (
        <TeamOrgEditor
          key={data.content?.slice(0, 20)}
          editorRef={editorRef}
          initialContent={data.content}
          onSave={async (content) => {
            await fetch(`/api/apresentacoes/${id}`, {
              method:  "PUT",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({ content, status: "editing", historyNote: "Organograma de equipe editado" }),
            })
            setData(d => d ? { ...d, content, status: "editing" } : d)
          }}
        />
      ) : data.type === "organogram" ? (
        <div className="space-y-3">
          <AiAssistantPanel
            presentationId={id}
            type="organogram"
            onApply={(content) => setData(d => d ? { ...d, content } : d)}
          />
          <OrgEditor
            key={data.content}
            editorRef={editorRef}
            initialContent={data.content}
            onSave={async (content) => {
              await fetch(`/api/apresentacoes/${id}`, {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ content, status: "editing", historyNote: "Organograma editado" }),
              })
              setData(d => d ? { ...d, content, status: "editing" } : d)
            }}
          />
        </div>
      ) : data.type === "slides" ? (
        <div className="space-y-3">
          <AiAssistantPanel
            presentationId={id}
            type="slides"
            onApply={(content) => setData(d => d ? { ...d, content } : d)}
          />
          <SlideEditor
            key={data.content}
            editorRef={editorRef}
            initialContent={data.content}
            onSave={async (content) => {
              await fetch(`/api/apresentacoes/${id}`, {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ content, status: "editing", historyNote: "Slides editados" }),
              })
              setData(d => d ? { ...d, content, status: "editing" } : d)
            }}
          />
        </div>
      ) : data.type === "flowchart" || data.type === "process" ? (
        <div className="space-y-3">
          <AiAssistantPanel
            presentationId={id}
            type={data.type}
            isProcess={data.type === "process"}
            onApply={(content) => setData(d => d ? { ...d, content } : d)}
          />
          <FlowEditor
            key={data.content}
            editorRef={editorRef}
            initialContent={data.content}
            isProcess={data.type === "process"}
            onSave={async (content) => {
              await fetch(`/api/apresentacoes/${id}`, {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ content, status: "editing", historyNote: `${cfg.label} editado` }),
              })
              setData(d => d ? { ...d, content, status: "editing" } : d)
            }}
          />
        </div>
      ) : (
        <div className={cn("rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-16 gap-3", cfg.bg)}>
          <Icon className={cn("w-10 h-10 opacity-30", cfg.color)} />
          <p className="text-sm font-medium text-slate-500">Editor de {cfg.label}</p>
          <p className="text-xs text-slate-400">Disponível nas próximas fases de implementação</p>
        </div>
      )}

      {/* Status actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["draft", "editing", "done"] as const).map(s => (
          <button
            key={s}
            onClick={async () => {
              setData(d => d ? { ...d, status: s } : d)
              await fetch(`/api/apresentacoes/${id}`, {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ status: s, historyNote: `Status alterado para ${STATUS_LABELS[s]}` }),
              })
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              data.status === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
            )}
          >
            {data.status === s && <CheckCircle2 className="w-3 h-3" />}
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Export modal */}
      {showExport && (
        <ExportModal
          title={data.title}
          type={data.type}
          content={data.content}
          editorRef={editorRef}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Version & Link panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <VersionPanel
          presentationId={id}
          versions={data.versions}
          onVersionSaved={() => load()}
          onVersionRestored={() => load()}
        />
        <LinkToPanel
          presentationId={id}
          linkedTo={data.linkedTo ?? null}
          onLinked={(v) => setData(d => d ? { ...d, linkedTo: v } : d)}
        />
      </div>

      {/* History */}
      {data.history.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
            <History className="w-4 h-4 text-slate-400" />
            Histórico
          </h3>
          <div className="space-y-2">
            {data.history.map(h => (
              <div key={h.id} className="flex items-start gap-3 text-xs">
                <span className="shrink-0 text-slate-400 mt-0.5">{fmtDate(h.createdAt)}</span>
                <span className="font-medium text-slate-600">{ACTION_LABELS[h.action] ?? h.action}</span>
                {h.description && <span className="text-slate-500">— {h.description}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
