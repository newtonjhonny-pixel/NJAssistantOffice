"use client"

import { useCallback, useEffect, useState } from "react"
import {
  GitBranch, Plus, Link2, MoreHorizontal, Loader2,
  Copy, Archive, Unlink, ExternalLink, Pencil, Check, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProcessFlowchartEditor, type ProcessFlowchartRecord } from "./ProcessFlowchartEditor"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ProcessRecord {
  id: string
  code: string | null
  name: string
  department: string | null
  category: string | null
}

// Reutiliza tipo exportado de ProcessFlowchartEditor
type FlowchartRecord = ProcessFlowchartRecord

// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  OPERACIONAL: "Operacional",
  BPMN: "BPMN",
  AS_IS: "AS-IS",
  TO_BE: "TO-BE",
  SIMPLIFICADO: "Simplificado",
}
const TYPE_COLORS: Record<string, string> = {
  OPERACIONAL: "bg-blue-100 text-blue-700",
  BPMN: "bg-violet-100 text-violet-700",
  AS_IS: "bg-amber-100 text-amber-700",
  TO_BE: "bg-emerald-100 text-emerald-700",
  SIMPLIFICADO: "bg-slate-100 text-slate-600",
}
const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  EM_REVISAO: "Em revisão",
  APROVADO: "Aprovado",
  ARQUIVADO: "Arquivado",
}
const STATUS_COLORS: Record<string, string> = {
  RASCUNHO: "bg-slate-100 text-slate-400",
  EM_REVISAO: "bg-amber-100 text-amber-600",
  APROVADO: "bg-emerald-100 text-emerald-700",
  ARQUIVADO: "bg-red-100 text-red-500",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function hasContent(fc: FlowchartRecord): boolean {
  if (!fc.content) return false
  try {
    const p = JSON.parse(fc.content)
    return (p.nodes?.length ?? 0) > 0
  } catch { return false }
}

// ─── Modal: Novo Fluxograma ───────────────────────────────────────────────────

interface NovoModalProps {
  processId: string
  onClose: () => void
  onCreated: (fc: FlowchartRecord) => void
}

function NovoFluxogramaModal({ processId, onClose, onCreated }: NovoModalProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState("OPERACIONAL")
  const [description, setDescription] = useState("")
  const [version, setVersion] = useState("1.0")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) { setErr("Nome é obrigatório."); return }
    setSaving(true); setErr(null)
    try {
      const r = await fetch(`/api/processes/${processId}/flowcharts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, description: description.trim() || null, version }),
      })
      const data = await r.json()
      if (!r.ok) { setErr(data.error ?? "Erro ao criar."); return }
      onCreated(data)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-800">Novo Fluxograma</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {err && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{err}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nome <span className="text-red-500">*</span></label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Processo de Compras — Visão Atual"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              onKeyDown={e => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
            >
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Objetivo do fluxograma…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Versão</label>
            <input
              value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder="1.0"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Criar Fluxograma
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card de fluxograma ───────────────────────────────────────────────────────

interface CardProps {
  fc: FlowchartRecord
  onOpen: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
}

function FlowchartCard({ fc, onOpen, onDuplicate, onArchive, onDelete }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const withContent = hasContent(fc)

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-3 hover:shadow-md hover:border-blue-200 transition-all group">
      {/* Ícone tipo */}
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs",
        TYPE_COLORS[fc.type]?.split(' ')[0] ?? "bg-slate-100"
      )}>
        <GitBranch className="w-4 h-4" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
            {fc.name}
          </span>
          <span className={cn("text-xs rounded-full px-2 py-0.5 font-medium shrink-0", TYPE_COLORS[fc.type] ?? "bg-slate-100 text-slate-600")}>
            {TYPE_LABELS[fc.type] ?? fc.type}
          </span>
          <span className={cn("text-xs rounded-full px-2 py-0.5 font-medium shrink-0", STATUS_COLORS[fc.status] ?? "bg-slate-100 text-slate-500")}>
            {STATUS_LABELS[fc.status] ?? fc.status}
          </span>
          {fc.version && <span className="text-xs text-slate-400 shrink-0">v{fc.version}</span>}
          {withContent
            ? <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium shrink-0">com diagrama</span>
            : <span className="text-xs bg-slate-100 text-slate-400 rounded-full px-2 py-0.5 shrink-0">sem diagrama</span>
          }
        </div>
        {fc.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{fc.description}</p>}
        <p className="text-xs text-slate-400 mt-0.5">Atualizado {formatDate(fc.updatedAt)}</p>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onOpen}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Abrir
        </button>

        {/* Menu contextual */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-48 text-sm">
                <button
                  onClick={() => { setMenuOpen(false); onDuplicate() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-violet-500" />
                  {fc.type === "AS_IS" ? "Duplicar → TO-BE" : "Duplicar"}
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onArchive() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-500" />
                  {fc.status === "ARQUIVADO" ? "Restaurar" : "Arquivar"}
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => { setMenuOpen(false); onDelete() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TabFluxogramas() {
  const [processes, setProcesses]       = useState<ProcessRecord[]>([])
  const [selected, setSelected]         = useState("")
  const [flowcharts, setFlowcharts]     = useState<FlowchartRecord[]>([])
  const [loadingProc, setLoadingProc]   = useState(true)
  const [loadingFc, setLoadingFc]       = useState(false)
  const [openFcId, setOpenFcId]         = useState<string | null>(null)
  const [showNovo, setShowNovo]         = useState(false)

  // Carrega lista de processos
  useEffect(() => {
    fetch("/api/processes")
      .then(r => r.json())
      .then(data => setProcesses(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingProc(false))
  }, [])

  const loadFlowcharts = useCallback(async (pid: string) => {
    if (!pid) { setFlowcharts([]); return }
    setLoadingFc(true)
    try {
      const rows = await fetch(`/api/processes/${pid}/flowcharts`).then(r => r.json())
      setFlowcharts(Array.isArray(rows) ? rows : [])
    } catch { setFlowcharts([]) }
    finally { setLoadingFc(false) }
  }, [])

  function handleSelectProcess(pid: string) {
    setSelected(pid)
    setOpenFcId(null)
    loadFlowcharts(pid)
  }

  async function handleDuplicate(fc: FlowchartRecord) {
    const isAsIs = fc.type === "AS_IS"
    const msg = isAsIs
      ? `Duplicar "${fc.name}" como TO-BE?\n\nUma cópia será criada com o mesmo conteúdo e tipo TO-BE.`
      : `Criar uma cópia de "${fc.name}"?`
    if (!window.confirm(msg)) return
    try {
      const r = await fetch(`/api/processes/${selected}/flowcharts/${fc.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!r.ok) { alert("Erro ao duplicar."); return }
      const novo = await r.json()
      setFlowcharts(prev => [...prev, novo])
    } catch { alert("Erro ao duplicar.") }
  }

  async function handleArchive(fc: FlowchartRecord) {
    const newStatus = fc.status === "ARQUIVADO" ? "RASCUNHO" : "ARQUIVADO"
    const r = await fetch(`/api/processes/${selected}/flowcharts/${fc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!r.ok) { alert("Erro ao atualizar status."); return }
    const updated = await r.json()
    setFlowcharts(prev => prev.map(f => f.id === fc.id ? updated : f))
  }

  async function handleDelete(fc: FlowchartRecord) {
    if (!window.confirm(`Excluir "${fc.name}"?\n\nEsta ação não pode ser desfeita.`)) return
    const r = await fetch(`/api/processes/${selected}/flowcharts/${fc.id}`, { method: "DELETE" })
    if (!r.ok) { alert("Erro ao excluir."); return }
    setFlowcharts(prev => prev.filter(f => f.id !== fc.id))
  }

  const selectedProcess = processes.find(p => p.id === selected)

  // Modo editor: fluxograma aberto
  if (openFcId && selected) {
    return (
      <ProcessFlowchartEditor
        flowchartId={openFcId}
        processId={selected}
        onBack={() => { setOpenFcId(null); loadFlowcharts(selected) }}
        onDuplicated={novo => {
          setFlowcharts(prev => [...prev, novo])
          // Abre o duplicado
          setOpenFcId(novo.id)
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Seletor de processo */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 shrink-0">
          <GitBranch className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">Processo:</span>
        </div>
        {loadingProc ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        ) : processes.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum processo cadastrado. Crie em <strong>Cadastro de Processos</strong>.</p>
        ) : (
          <select
            value={selected}
            onChange={e => handleSelectProcess(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
          >
            <option value="">Selecione um processo…</option>
            {processes.map(p => (
              <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ''}{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Lista de fluxogramas */}
      {selected && (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Fluxogramas de <span className="text-slate-700">{selectedProcess?.name}</span>
            </p>
            <button
              onClick={() => setShowNovo(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Fluxograma
            </button>
          </div>

          {loadingFc ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : flowcharts.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
              <GitBranch className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-semibold text-slate-500 text-base">Nenhum fluxograma criado</p>
              <p className="text-sm mt-1 mb-5 text-slate-400">
                Crie o primeiro fluxograma diretamente vinculado a este processo.
              </p>
              <button
                onClick={() => setShowNovo(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Criar primeiro fluxograma
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {flowcharts.map(fc => (
                <FlowchartCard
                  key={fc.id}
                  fc={fc}
                  onOpen={() => setOpenFcId(fc.id)}
                  onDuplicate={() => handleDuplicate(fc)}
                  onArchive={() => handleArchive(fc)}
                  onDelete={() => handleDelete(fc)}
                />
              ))}
            </div>
          )}

          {/* Legenda de tipos */}
          {flowcharts.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <span key={v} className={cn("text-xs rounded-full px-2.5 py-0.5 font-medium", TYPE_COLORS[v])}>
                  {l}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal novo fluxograma */}
      {showNovo && selected && (
        <NovoFluxogramaModal
          processId={selected}
          onClose={() => setShowNovo(false)}
          onCreated={fc => {
            setFlowcharts(prev => [...prev, fc])
            setShowNovo(false)
            // Abre o editor imediatamente
            setOpenFcId(fc.id)
          }}
        />
      )}
    </div>
  )
}
