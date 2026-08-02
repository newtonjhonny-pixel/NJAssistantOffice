"use client"

import { useState, useEffect } from "react"
import { Clock, ArrowRight, User, MessageSquare, RefreshCw, Eye, EyeOff, GitCommit } from "lucide-react"
import { cn } from "@/lib/utils"

interface HistoryEntry {
  id: string
  documentId: string
  userName: string | null
  action: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  comment: string | null
  oldWorkflowStatus: string | null
  newWorkflowStatus: string | null
  version: string | null
  createdAt: string
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CRIACAO:   { label: 'Criação',         color: 'text-emerald-700', bg: 'bg-emerald-100' },
  STATUS:    { label: 'Status',          color: 'text-blue-700',    bg: 'bg-blue-100' },
  AVANCO:    { label: 'Avanço',          color: 'text-indigo-700',  bg: 'bg-indigo-100' },
  APROVACAO: { label: 'Aprovação',       color: 'text-emerald-700', bg: 'bg-emerald-100' },
  REJEICAO:  { label: 'Rejeição',        color: 'text-red-700',     bg: 'bg-red-100' },
  EDICAO:    { label: 'Edição',          color: 'text-slate-700',   bg: 'bg-slate-100' },
  VERSAO:    { label: 'Publicação',      color: 'text-violet-700',  bg: 'bg-violet-100' },
  PUBLICACAO:{ label: 'Publicação',      color: 'text-emerald-700', bg: 'bg-emerald-100' },
  OBSOLETO:  { label: 'Obsolescência',   color: 'text-red-700',     bg: 'bg-red-100' },
  CANCELADO: { label: 'Cancelamento',    color: 'text-rose-700',    bg: 'bg-rose-100' },
  LEITURA:   { label: 'Leitura/Aceite',  color: 'text-teal-700',    bg: 'bg-teal-100' },
}

const SNAP_FIELD_LABELS: Record<string, string> = {
  title:            'Título',
  version:          'Versão',
  objective:        'Objetivo',
  description:      'Descrição / Conteúdo',
  risks:            'Riscos',
  responsibilities: 'Responsabilidades',
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function SnapshotPanel({ entry }: { entry: HistoryEntry }) {
  const [open, setOpen] = useState(false)

  let snap: Record<string, unknown> | null = null
  try {
    if (entry.newValue) snap = JSON.parse(entry.newValue)
  } catch { /* not JSON */ }

  if (!snap) return null

  const fields = Object.entries(SNAP_FIELD_LABELS)
    .filter(([key]) => snap![key] != null && snap![key] !== '')

  if (!fields.length) return null

  return (
    <div className="mt-2 pt-2 border-t border-slate-100">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 transition-colors"
      >
        {open ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {open ? 'Ocultar snapshot' : `Ver snapshot (${fields.length} campos)`}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50 divide-y divide-violet-100 overflow-hidden">
          {fields.map(([key, label]) => {
            const raw = snap![key] as string
            let display = raw
            // Se for JSON (riscos, etc.), mostrar resumo
            try {
              const parsed = JSON.parse(raw)
              if (parsed && typeof parsed === 'object') {
                const count = Array.isArray(parsed.riscos) ? parsed.riscos.length : null
                display = count != null ? `${count} risco(s) registrado(s)` : '[Conteúdo estruturado]'
              }
            } catch { /* texto puro */ }

            return (
              <div key={key} className="px-3 py-2">
                <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide">{label}</p>
                <p className="text-xs text-slate-700 mt-0.5 line-clamp-3 whitespace-pre-wrap">{display}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function DocHistoryTab({ docId }: { docId: string }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<string>('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/procedures/${docId}/history`)
      if (res.ok) setEntries(await res.json())
    } catch { /* rede */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [docId])

  const shown = filter ? entries.filter(e => e.action === filter) : entries
  const actionCounts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.action] = (acc[e.action] ?? 0) + 1
    return acc
  }, {})

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
        <Clock className="w-10 h-10 mb-3 opacity-30" />
        <p className="font-medium text-slate-500">Nenhum evento registrado</p>
        <p className="text-xs mt-1">As alterações neste documento aparecerão aqui.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {shown.length} de {entries.length} evento{entries.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro por tipo */}
          <div className="flex gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setFilter('')}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors",
                filter === '' ? "bg-slate-700 text-white border-slate-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
              )}
            >
              Todos
            </button>
            {Object.entries(actionCounts).map(([action, count]) => {
              const cfg = ACTION_CONFIG[action] ?? { label: action, color: 'text-slate-600', bg: 'bg-slate-100' }
              return (
                <button
                  key={action} type="button"
                  onClick={() => setFilter(filter === action ? '' : action)}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors",
                    filter === action ? cn(cfg.bg, cfg.color, 'border-current') : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  )}
                >
                  {cfg.label} ({count})
                </button>
              )
            })}
          </div>
          <button onClick={load} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
            <RefreshCw className="w-3 h-3" /> Atualizar
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />

        <div className="space-y-3">
          {shown.map(entry => {
            const cfg = ACTION_CONFIG[entry.action] ?? { label: entry.action, color: 'text-slate-600', bg: 'bg-slate-100' }
            const isVersionSnap = entry.action === 'VERSAO'
            return (
              <div key={entry.id} className="flex gap-4 relative">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white",
                  cfg.bg
                )}>
                  {isVersionSnap
                    ? <GitCommit className={cn("w-4 h-4", cfg.color)} />
                    : <Clock className={cn("w-4 h-4", cfg.color)} />}
                </div>

                <div className={cn(
                  "flex-1 rounded-xl border p-4 min-w-0",
                  isVersionSnap ? "bg-violet-50 border-violet-200" : "bg-white border-slate-200"
                )}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                      {entry.version && (
                        <span className="text-xs text-slate-400 font-mono">{entry.version}</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{fmt(entry.createdAt)}</span>
                  </div>

                  {(entry.oldWorkflowStatus || entry.newWorkflowStatus) && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {entry.oldWorkflowStatus && (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{entry.oldWorkflowStatus}</span>
                      )}
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      {entry.newWorkflowStatus && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{entry.newWorkflowStatus}</span>
                      )}
                    </div>
                  )}

                  {entry.field && (
                    <div className="mt-2 text-xs text-slate-500">
                      Campo: <span className="font-mono text-slate-700">{entry.field}</span>
                      {entry.oldValue && !isVersionSnap && <> · De: <em>&ldquo;{entry.oldValue}&rdquo;</em></>}
                      {entry.newValue && !isVersionSnap && <> → Para: <em>&ldquo;{entry.newValue}&rdquo;</em></>}
                    </div>
                  )}

                  <div className="mt-2 flex items-start gap-3 flex-wrap text-xs text-slate-400">
                    {entry.userName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {entry.userName}
                      </span>
                    )}
                    {entry.comment && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <MessageSquare className="w-3 h-3" /> {entry.comment}
                      </span>
                    )}
                  </div>

                  {/* Snapshot expandível para entradas VERSAO */}
                  {isVersionSnap && <SnapshotPanel entry={entry} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
