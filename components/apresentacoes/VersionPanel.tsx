"use client"

import { useState } from "react"
import { History, Plus, RotateCcw, Loader2, ChevronDown, ChevronUp, Tag } from "lucide-react"
import { cn } from "@/lib/utils"

interface Version {
  id:        string
  label:     string | null
  createdAt: string
}

interface Props {
  presentationId: string
  versions:       Version[]
  onVersionSaved:    () => void
  onVersionRestored: () => void
}

function fmtDate(s: string) {
  const d = new Date(s)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
    " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

export function VersionPanel({ presentationId, versions: initial, onVersionSaved, onVersionRestored }: Props) {
  const [open,       setOpen]       = useState(false)
  const [versions,   setVersions]   = useState<Version[]>(initial)
  const [label,      setLabel]      = useState("")
  const [saving,     setSaving]     = useState(false)
  const [restoring,  setRestoring]  = useState<string | null>(null)
  const [saved,      setSaved]      = useState(false)

  async function saveVersion() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/apresentacoes/${presentationId}/versions`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ label }),
      })
      if (res.ok) {
        const v = await res.json()
        setVersions(vs => [v, ...vs])
        setLabel("")
        setSaved(true)
        onVersionSaved()
        setTimeout(() => setSaved(false), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  async function restore(v: Version) {
    if (restoring) return
    if (!confirm(`Restaurar para "${v.label ?? "versão sem título"}"? O conteúdo atual será substituído.`)) return
    setRestoring(v.id)
    try {
      const res = await fetch(`/api/apresentacoes/${presentationId}/versions/${v.id}/restore`, { method: "POST" })
      if (res.ok) onVersionRestored()
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <History className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="flex-1 text-sm font-semibold text-slate-700">
          Versões
          {versions.length > 0 && (
            <span className="ml-2 text-xs font-normal text-slate-400">({versions.length} salva{versions.length !== 1 ? "s" : ""})</span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 space-y-4">
          {/* Save version form */}
          <div className="pt-3 space-y-2">
            <p className="text-xs text-slate-500">Salve um snapshot do estado atual para poder restaurar depois.</p>
            <div className="flex gap-2">
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Nome da versão (ex: v1.0, antes da reunião…)"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={saveVersion}
                disabled={saving}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
                  saved
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60",
                )}
              >
                {saving
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : saved
                  ? "Salvo!"
                  : <><Plus className="w-3 h-3" />Salvar versão</>
                }
              </button>
            </div>
          </div>

          {/* Versions list */}
          {versions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">Nenhuma versão salva ainda.</p>
          ) : (
            <div className="space-y-2">
              {versions.map(v => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:border-slate-200 transition-all group"
                >
                  <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">
                      {v.label ?? "Versão sem título"}
                    </p>
                    <p className="text-[10px] text-slate-400">{fmtDate(v.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => restore(v)}
                    disabled={!!restoring}
                    title="Restaurar esta versão"
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-200 text-slate-600 hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-40"
                  >
                    {restoring === v.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <RotateCcw className="w-3 h-3" />
                    }
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
