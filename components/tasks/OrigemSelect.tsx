"use client"

import { useState, useEffect, useRef } from "react"
import { X, Plus, Search, Settings } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { OrigemManagementModal } from "@/components/origens/OrigemManagementModal"

export interface TaskOrigin {
  id: string
  name: string
  color: string
  icon: string
  active: boolean
  order: number
  _count?: { tasks: number }
}

interface OrigemSelectProps {
  value: string | null      // originId
  onChange: (id: string | null, name: string | null) => void
  inputClass?: string
}

export function OrigemSelect({ value, onChange, inputClass }: OrigemSelectProps) {
  const [origens, setOrigens]             = useState<TaskOrigin[]>([])
  const [search, setSearch]               = useState("")
  const [open, setOpen]                   = useState(false)
  const [showModal, setShowModal]         = useState(false)
  const [showManagement, setShowManagement] = useState(false)
  const [newName, setNewName]             = useState("")
  const [newColor, setNewColor]           = useState("#6B7280")
  const [newIcon, setNewIcon]             = useState("📌")
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess]     = useState(false)
  const containerRef                      = useRef<HTMLDivElement>(null)

  const selected = origens.find(o => o.id === value) ?? null

  async function loadOrigens() {
    try {
      const r = await fetch("/api/origens")
      const data: TaskOrigin[] = await r.json()
      setOrigens(data.filter(o => o.active))
    } catch {
      // silently ignore
    }
  }

  useEffect(() => { loadOrigens() }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const filtered = origens.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleSelect(o: TaskOrigin) {
    onChange(o.id, o.name)
    setSearch("")
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null, null)
    setSearch("")
  }

  // FIX: função sem parâmetro de evento (não usa <form onSubmit>)
  async function handleSaveNew() {
    if (!newName.trim()) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch("/api/origens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor, icon: newIcon }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao criar origem")
      // Adiciona à lista e seleciona automaticamente
      setOrigens(prev =>
        [...prev, { ...data, active: true }].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      )
      onChange(data.id, data.name)
      setSaveSuccess(true)
      // Fecha o modal após 800ms para o usuário ver o feedback
      setTimeout(() => {
        setShowModal(false)
        setNewName("")
        setNewColor("#6B7280")
        setNewIcon("📌")
        setSaveSuccess(false)
      }, 800)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao criar")
    } finally {
      setSaving(false)
    }
  }

  function handleOpenModal() {
    setNewName("")
    setNewColor("#6B7280")
    setNewIcon("📌")
    setSaveError(null)
    setSaveSuccess(false)
    setShowModal(true)
    setOpen(false)
  }

  const base = inputClass ?? "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* Trigger + botões de ação */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              className={`${base} flex items-center gap-2 text-left cursor-pointer`}
            >
              {selected ? (
                <>
                  <span>{selected.icon}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: selected.color }}
                  />
                  <span className="flex-1 truncate">{selected.name}</span>
                  <span onClick={handleClear} className="ml-auto text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </span>
                </>
              ) : (
                <span className="text-slate-400">Selecionar origem...</span>
              )}
            </button>
          </div>

          {/* Botão: cadastrar nova origem */}
          <button
            type="button"
            title="Cadastrar nova origem"
            onClick={handleOpenModal}
            className="shrink-0 w-10 h-10 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Botão: gerenciar origens */}
          <button
            type="button"
            title="Gerenciar origens"
            onClick={() => setShowManagement(true)}
            className="shrink-0 w-10 h-10 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Pesquisar origem..."
                  className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {value && (
                <button
                  type="button"
                  onClick={() => { onChange(null, null); setOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Remover seleção
                </button>
              )}
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-sm text-slate-400 text-center">
                  Nenhuma origem encontrada.{" "}
                  <button type="button" onClick={handleOpenModal} className="text-blue-600 underline">
                    Criar nova
                  </button>
                </p>
              )}
              {filtered.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleSelect(o)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors ${o.id === value ? "bg-blue-50" : ""}`}
                >
                  <span className="text-base leading-none">{o.icon}</span>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} />
                  <span className={`flex-1 text-left ${o.id === value ? "font-medium text-blue-700" : "text-slate-700"}`}>
                    {o.name}
                  </span>
                  {o.id === value && <span className="text-blue-500 text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal rápido de nova origem — renderizado fora do <div ref> mas FORA do <form> do TaskForm */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Nova Origem</h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* FIX: <div> em vez de <form> para evitar nested forms */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSaveNew() } }}
                  placeholder="Ex: Reunião de Diretoria"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Ícone (emoji)</label>
                  <input
                    value={newIcon}
                    onChange={e => setNewIcon(e.target.value)}
                    placeholder="📌"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Cor</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newColor}
                      onChange={e => setNewColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border border-slate-200 p-0.5"
                    />
                    <span className="text-xs text-slate-500 font-mono">{newColor}</span>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-center gap-2">
                <span className="text-lg">{newIcon || "📌"}</span>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: newColor }} />
                <span className="text-sm font-medium text-slate-700">{newName || "Nome da origem"}</span>
              </div>

              {saveError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  ❌ {saveError}
                </p>
              )}

              {saveSuccess && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  ✅ Origem cadastrada com sucesso.
                </p>
              )}

              <div className="flex gap-2 pt-1">
                {/* FIX: type="button" + onClick — nunca type="submit" */}
                <Button
                  type="button"
                  disabled={saving || saveSuccess || !newName.trim()}
                  onClick={handleSaveNew}
                  className="flex-1"
                >
                  {saving ? "Salvando..." : saveSuccess ? "Salvo ✓" : "Criar e selecionar"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de gerenciamento */}
      {showManagement && (
        <OrigemManagementModal
          onClose={() => setShowManagement(false)}
          onRefresh={async () => {
            await loadOrigens()
          }}
          currentValue={value}
          onSelect={(id, name) => onChange(id, name)}
        />
      )}
    </>
  )
}
