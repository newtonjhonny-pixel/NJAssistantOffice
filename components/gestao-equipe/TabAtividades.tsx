"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import {
  Plus, Edit2, Trash2, X, Search, ChevronDown, ChevronUp,
  CheckSquare, Square, Printer, FileSpreadsheet, FileText,
  ToggleLeft, ToggleRight, BookOpen, Users, FileDown, Copy,
  GripVertical, Tag, ListChecks, Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { generateMemberPDF, generateAllMembersPDF, safeFilename } from "@/lib/pdf/actividadesPDF"
import { generateActivityDefinitionPDF } from "@/lib/pdf/activityDefinitionPDF"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member { id: string; name: string; role: string; sector?: string | null; unit?: string | null }

interface ActivityCategory {
  id: string; name: string; description?: string | null; department?: string | null
  color: string; icon: string; active: boolean; order: number
  _count?: { activities: number }
}

interface ActivityItem {
  id: string; activityId: string; title: string; description?: string | null
  order: number; required: boolean; defaultResponsible?: string | null
  defaultDays?: number | null; observation?: string | null; active: boolean
}

interface ActivityTemplate {
  id: string; name: string; description?: string | null
  category?: string | null; categoryId?: string | null
  actCategory?: ActivityCategory | null
  department?: string | null; active: boolean; order: number; observations?: string | null
  items: ActivityItem[]
  _count?: { memberLinks: number }
}

interface MemberActivityItemLink {
  id: string; linkId: string; itemId: string; observation?: string | null; includedAt: string
  item: ActivityItem
}

interface MemberActivityLink {
  id: string; memberId: string; activityTemplateId: string; observation?: string | null; includedAt: string
  member: { id: string; name: string; role: string; sector?: string | null; unit?: string | null }
  activityTemplate: ActivityTemplate
  itemLinks: MemberActivityItemLink[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s?: string | null) {
  if (!s) return "—"
  const part = typeof s === "string" ? s.slice(0, 10) : new Date(s).toISOString().slice(0, 10)
  const [y, m, d] = part.split("-")
  return y && m && d ? `${d}/${m}/${y}` : "—"
}
function todayISO() { return new Date().toISOString().slice(0, 10) }

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", colorClass)}>{label}</span>
}

function Modal({ title, onClose, children, wide, extraWide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; extraWide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={cn("flex max-h-[94vh] w-full flex-col rounded-xl bg-white shadow-xl",
        extraWide ? "sm:max-w-5xl" : wide ? "sm:max-w-3xl" : "sm:max-w-2xl")}>
        <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 sm:px-6">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const IC = "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"

// ─── Sub-aba: Categorias ──────────────────────────────────────────────────────

function TabCategorias() {
  const [items, setItems] = useState<ActivityCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ActivityCategory | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [filterActive, setFilterActive] = useState("")
  const [error, setError] = useState("")
  const [form, setForm] = useState({ name: "", description: "", department: "", color: "#6B7280", icon: "📋", active: true, order: 0 })

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filterActive !== "") p.set("active", filterActive)
    if (search) p.set("search", search)
    const r = await fetch(`/api/gestao-equipe/activity-categories?${p}`)
    setItems(await r.json())
    setLoading(false)
  }, [filterActive, search])

  useEffect(() => { const t = setTimeout(fetch_, 300); return () => clearTimeout(t) }, [fetch_])

  function openNew() {
    setEditing(null); setError("")
    setForm({ name: "", description: "", department: "", color: "#6B7280", icon: "📋", active: true, order: 0 })
    setShowForm(true)
  }
  function openEdit(c: ActivityCategory) {
    setEditing(c); setError("")
    setForm({ name: c.name, description: c.description || "", department: c.department || "", color: c.color, icon: c.icon, active: c.active, order: c.order })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const url = editing ? `/api/gestao-equipe/activity-categories/${editing.id}` : "/api/gestao-equipe/activity-categories"
      const r = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      const data = await r.json()
      if (!r.ok) { setError(data.error || "Erro ao salvar"); return }
      setShowForm(false); fetch_()
    } finally { setSaving(false) }
  }

  async function handleToggle(c: ActivityCategory) {
    await fetch(`/api/gestao-equipe/activity-categories/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !c.active }),
    })
    fetch_()
  }

  async function handleDelete(c: ActivityCategory) {
    if (!confirm(`Excluir categoria "${c.name}"?`)) return
    const r = await fetch(`/api/gestao-equipe/activity-categories/${c.id}`, { method: "DELETE" })
    if (!r.ok) { alert((await r.json()).error); return }
    fetch_()
  }

  const ICONS = ["📋", "📁", "👥", "💰", "🗓️", "📊", "✅", "🏢", "📝", "⚖️", "🔧", "🎯", "📌", "🔔", "💼", "🌐"]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar categoria..." className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
        </div>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Ativas e inativas</option>
          <option value="true">Somente ativas</option>
          <option value="false">Somente inativas</option>
        </select>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Nova categoria</Button>
      </div>

      {loading ? <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>
        : items.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            <Tag className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            Nenhuma categoria cadastrada.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(c => (
              <Card key={c.id} className={cn(!c.active && "opacity-60")}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800">{c.name}</span>
                        <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ background: c.color }} />
                        {!c.active && <Badge label="Inativa" colorClass="bg-slate-100 text-slate-500" />}
                        {(c._count?.activities ?? 0) > 0 && (
                          <Badge label={`${c._count!.activities} atividade(s)`} colorClass="bg-blue-50 text-blue-700" />
                        )}
                      </div>
                      {c.description && <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>}
                      {c.department && <p className="text-xs text-slate-400">Depto: {c.department}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => handleToggle(c)} className="text-slate-400 hover:text-blue-600" title={c.active ? "Desativar" : "Ativar"}>
                        {c.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(c)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {showForm && (
        <Modal title={editing ? "Editar Categoria" : "Nova Categoria"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <Field label="Nome" required>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={IC} placeholder="Ex: Admissão" />
            </Field>
            <Field label="Descrição">
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={IC} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Departamento">
                <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className={IC} placeholder="Ex: DP" />
              </Field>
              <Field label="Ordem">
                <input type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))} className={IC} min={0} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cor">
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border border-slate-200" />
                  <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className={cn(IC, "flex-1")} placeholder="#6B7280" />
                </div>
              </Field>
              <Field label="Status">
                <select value={form.active ? "true" : "false"} onChange={e => setForm(f => ({ ...f, active: e.target.value === "true" }))} className={IC}>
                  <option value="true">Ativa</option>
                  <option value="false">Inativa</option>
                </select>
              </Field>
            </div>
            <Field label="Ícone">
              <div className="flex flex-wrap gap-2">
                {ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icon: ic }))}
                    className={cn("text-xl p-1.5 rounded border transition-all", form.icon === ic ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-400")}>
                    {ic}
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Sub-aba: Cadastro de Atividades ─────────────────────────────────────────

function TabCadastroAtividades() {
  const [items, setItems] = useState<ActivityTemplate[]>([])
  const [categories, setCategories] = useState<ActivityCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ActivityTemplate | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("")
  const [filterActive, setFilterActive] = useState("")
  const [error, setError] = useState("")
  const [showQuickCat, setShowQuickCat] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name: "", description: "", categoryId: "", department: "",
    active: true, order: 0, observations: "",
  })
  // Items dentro da atividade
  const [formItems, setFormItems] = useState<Partial<ActivityItem>[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filterActive !== "") p.set("active", filterActive)
    if (filterCat) p.set("categoryId", filterCat)
    if (search) p.set("search", search)
    const [tplRes, catRes] = await Promise.all([
      fetch(`/api/gestao-equipe/activity-templates?${p}`),
      fetch("/api/gestao-equipe/activity-categories?active=true"),
    ])
    setItems(await tplRes.json())
    setCategories(await catRes.json())
    setLoading(false)
  }, [filterActive, filterCat, search])

  useEffect(() => { const t = setTimeout(fetchData, 300); return () => clearTimeout(t) }, [fetchData])

  function openNew() {
    setEditing(null); setError("")
    setForm({ name: "", description: "", categoryId: "", department: "", active: true, order: 0, observations: "" })
    setFormItems([])
    setShowForm(true)
  }

  function openEdit(t: ActivityTemplate) {
    setEditing(t); setError("")
    setForm({
      name: t.name, description: t.description || "", categoryId: t.categoryId || "",
      department: t.department || "", active: t.active, order: t.order, observations: t.observations || "",
    })
    setFormItems(t.items.map(it => ({ ...it })))
    setShowForm(true)
  }

  function addItem() {
    setFormItems(prev => [...prev, {
      title: "", description: "", order: prev.length, required: true,
      defaultResponsible: "", defaultDays: undefined, observation: "", active: true,
    }])
  }

  function removeItem(idx: number) { setFormItems(prev => prev.filter((_, i) => i !== idx)) }

  function duplicateItem(idx: number) {
    setFormItems(prev => {
      const copy = { ...prev[idx], title: `${prev[idx].title} (cópia)`, id: undefined }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next.map((it, i) => ({ ...it, order: i }))
    })
  }

  // Drag-and-drop reorder
  function onDragStart(idx: number) { setDragIdx(idx) }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setFormItems(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(idx, 0, moved)
      return next.map((it, i) => ({ ...it, order: i }))
    })
    setDragIdx(idx)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId || null,
        items: formItems.map((it, i) => ({ ...it, order: i })),
      }

      if (editing) {
        // Atualizar template
        const r = await fetch(`/api/gestao-equipe/activity-templates/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        })
        const data = await r.json()
        if (!r.ok) { setError(data.error || "Erro ao salvar"); return }

        // Sincronizar itens: criar novos, atualizar existentes, deletar removidos
        const existingIds = new Set(editing.items.map(it => it.id))
        const newItemIds = new Set(formItems.filter(it => it.id).map(it => it.id))

        // Deletar removidos
        for (const existId of Array.from(existingIds)) {
          if (!newItemIds.has(existId)) {
            await fetch(`/api/gestao-equipe/activity-items/${existId}`, { method: "DELETE" })
              .catch(() => null) // ignora se vinculado (fica inativo)
          }
        }

        // Criar/atualizar
        for (let i = 0; i < formItems.length; i++) {
          const it = formItems[i]
          if (it.id && existingIds.has(it.id)) {
            await fetch(`/api/gestao-equipe/activity-items/${it.id}`, {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...it, order: i }),
            })
          } else if (!it.id) {
            await fetch("/api/gestao-equipe/activity-items", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...it, activityId: editing.id, order: i }),
            })
          }
        }
      } else {
        // Criar template com itens em uma única chamada
        const r = await fetch("/api/gestao-equipe/activity-templates", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        })
        const data = await r.json()
        if (!r.ok) { setError(data.error || "Erro ao salvar"); return }
      }

      setShowForm(false); fetchData()
    } finally { setSaving(false) }
  }

  async function handleDuplicate(id: string) {
    await fetch(`/api/gestao-equipe/activity-templates/${id}`, { method: "POST" })
    fetchData()
  }

  async function handleToggle(t: ActivityTemplate) {
    await fetch(`/api/gestao-equipe/activity-templates/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !t.active }),
    })
    fetchData()
  }

  async function handleDelete(t: ActivityTemplate) {
    if (!confirm(`Excluir "${t.name}"?`)) return
    const r = await fetch(`/api/gestao-equipe/activity-templates/${t.id}`, { method: "DELETE" })
    if (!r.ok) { alert((await r.json()).error); return }
    fetchData()
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Quick-add category inline
  async function handleQuickCat(name: string) {
    const r = await fetch("/api/gestao-equipe/activity-categories", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, active: true, order: 0 }),
    })
    if (r.ok) {
      const cat = await r.json()
      setCategories(prev => [...prev, cat])
      setForm(f => ({ ...f, categoryId: cat.id }))
      setShowQuickCat(false)
    }
  }

  // ── Exportações por atividade ───────────────────────────────────────────────

  function esc(s: string) { return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") }

  function buildActivityHTML(t: ActivityTemplate, title: string) {
    const catName = t.actCategory?.name || t.category || ""
    const itemRows = t.items.map((it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${esc(it.title)}</strong></td>
        <td>${esc(it.description || "—")}</td>
        <td style="text-align:center;color:${it.required?"#166534":"#64748b"}">${it.required?"Sim":"Não"}</td>
        <td>${esc(it.defaultResponsible || "—")}</td>
        <td style="text-align:center">${it.defaultDays ? it.defaultDays + "d" : "—"}</td>
        <td style="color:#92400e;font-style:italic">${esc(it.observation || "—")}</td>
        <td style="text-align:center;color:${it.active?"#166534":"#64748b"}">${it.active?"Ativo":"Inativo"}</td>
      </tr>`).join("")

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;padding:24px}
h1{text-align:center;font-size:16px;text-transform:uppercase;margin-bottom:4px}
.sub{text-align:center;font-size:11px;color:#64748b;margin-bottom:20px}
.section{margin-bottom:16px}.label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.value{font-size:13px;color:#0f172a;font-weight:600}
.desc{font-size:12px;color:#475569;margin-top:8px;line-height:1.5}
table{width:100%;border-collapse:collapse;margin-top:12px;font-size:11px}
th{background:#1e293b;color:#fff;padding:6px 8px;text-align:left}
td{border:1px solid #e2e8f0;padding:6px 8px;vertical-align:top}
tr:nth-child(even) td{background:#f8fafc}
@page{size:A4 landscape;margin:16mm}@media print{a::after{content:none!important}}</style></head>
<body>
<h1>Relatório da Atividade</h1>
<div class="sub">Gerado em: ${fmtDate(todayISO())}</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
  <div class="section"><div class="label">Nome</div><div class="value">${esc(t.name)}</div></div>
  <div class="section"><div class="label">Categoria</div><div class="value">${esc(catName || "—")}</div></div>
  <div class="section"><div class="label">Departamento</div><div class="value">${esc(t.department || "—")}</div></div>
  <div class="section"><div class="label">Status</div><div class="value">${t.active?"Ativo":"Inativo"}</div></div>
  <div class="section"><div class="label">Itens</div><div class="value">${t.items.length}</div></div>
  <div class="section"><div class="label">Colaboradores</div><div class="value">${t._count?.memberLinks ?? 0}</div></div>
</div>
${t.description ? `<div class="section"><div class="label">Descrição</div><div class="desc">${esc(t.description)}</div></div>` : ""}
${t.observations ? `<div class="section"><div class="label">Observações</div><div class="desc" style="color:#92400e;font-style:italic">${esc(t.observations)}</div></div>` : ""}
${t.items.length > 0 ? `
<div style="margin-top:20px;page-break-before:auto">
<div class="label">Etapas / Itens da Atividade (${t.items.length})</div>
<table>
  <thead><tr><th style="width:32px">Nº</th><th>Item</th><th>Descrição</th><th style="width:56px">Obrig.</th><th>Responsável</th><th style="width:52px">Prazo</th><th>Observação</th><th style="width:56px">Status</th></tr></thead>
  <tbody>${itemRows}</tbody>
</table></div>` : ""}
</body></html>`
  }

  async function exportActivityPDF(t: ActivityTemplate) {
    await generateActivityDefinitionPDF(t as any)
  }

  function printActivity(t: ActivityTemplate) {
    const html = buildActivityHTML(t, `Atividade — ${t.name}`)
    const w = window.open("", "_blank", "width=1000,height=700")
    if (!w) return
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  function exportActivityWord(t: ActivityTemplate) {
    const html = buildActivityHTML(t, `Atividade — ${t.name}`)
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
    a.download = `Atividade_${safeFilename(t.name)}_${todayISO()}.doc`; a.click()
  }

  function exportActivityExcel(t: ActivityTemplate) {
    const catName = t.actCategory?.name || t.category || ""
    const summaryRows = [
      ["Campo", "Valor"],
      ["Nome", t.name],
      ["Categoria", catName || "—"],
      ["Departamento", t.department || "—"],
      ["Descrição", t.description || "—"],
      ["Status", t.active ? "Ativo" : "Inativo"],
      ["Ordem", String(t.order)],
      ["Observações", t.observations || "—"],
      ["Qtd. itens", String(t.items.length)],
      ["Qtd. colaboradores", String(t._count?.memberLinks ?? 0)],
    ]

    const itemHeader = ["Nº", "Item", "Descrição", "Obrigatório", "Responsável padrão", "Prazo (dias)", "Observação", "Status"]
    const itemRows = t.items.map((it, i) => [
      String(i + 1), it.title, it.description || "", it.required ? "Sim" : "Não",
      it.defaultResponsible || "", it.defaultDays ? String(it.defaultDays) : "", it.observation || "", it.active ? "Ativo" : "Inativo",
    ])

    const toCSV = (rows: string[][]) => rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(";")).join("\n")
    const csv = toCSV(summaryRows) + "\n\n" + toCSV([itemHeader, ...itemRows])
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
    a.download = `Atividade_${safeFilename(t.name)}_${todayISO()}.csv`; a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar atividade..." className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Todas as categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Ativas e inativas</option>
          <option value="true">Somente ativas</option>
          <option value="false">Somente inativas</option>
        </select>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Nova atividade</Button>
      </div>

      {loading ? <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>
        : items.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            Nenhuma atividade cadastrada.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(t => {
              const isOpen = expanded.has(t.id)
              return (
                <Card key={t.id} className={cn(!t.active && "opacity-60")}>
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleExpand(t.id)} className="mt-0.5 text-slate-400 hover:text-slate-600 shrink-0">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {t.actCategory && (
                            <span className="text-sm" title={t.actCategory.name}>{t.actCategory.icon}</span>
                          )}
                          <span className="font-medium text-slate-800">{t.name}</span>
                          {t.actCategory && (
                            <Badge label={t.actCategory.name} colorClass="bg-blue-50 text-blue-700" />
                          )}
                          {!t.active && <Badge label="Inativa" colorClass="bg-slate-100 text-slate-500" />}
                          <Badge label={`${t.items.length} item(s)`} colorClass="bg-slate-100 text-slate-600" />
                          {(t._count?.memberLinks ?? 0) > 0 && (
                            <Badge label={`${t._count!.memberLinks} colaborador(es)`} colorClass="bg-emerald-50 text-emerald-700" />
                          )}
                        </div>
                        {t.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleToggle(t)} title={t.active ? "Desativar" : "Ativar"}>
                          {t.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                        </button>
                        <button onClick={() => handleDuplicate(t.id)} className="text-slate-400 hover:text-purple-600" title="Duplicar"><Copy className="w-4 h-4" /></button>
                        <span className="w-px h-4 bg-slate-200 mx-0.5" />
                        <button onClick={() => printActivity(t)} className="text-slate-400 hover:text-slate-700" title="Imprimir atividade"><Printer className="w-4 h-4" /></button>
                        <button onClick={() => exportActivityPDF(t)} className="text-slate-400 hover:text-red-600" title="Exportar PDF"><FileDown className="w-4 h-4" /></button>
                        <button onClick={() => exportActivityExcel(t)} className="text-slate-400 hover:text-green-600" title="Exportar Excel"><FileSpreadsheet className="w-4 h-4" /></button>
                        <button onClick={() => exportActivityWord(t)} className="text-slate-400 hover:text-blue-700" title="Exportar Word"><FileText className="w-4 h-4" /></button>
                        <span className="w-px h-4 bg-slate-200 mx-0.5" />
                        <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-blue-600" title="Editar"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(t)} className="text-slate-400 hover:text-red-500" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    {isOpen && t.items.length > 0 && (
                      <div className="mt-3 border-t border-slate-100 pt-3 space-y-1.5 ml-7">
                        {t.items.map((it, i) => (
                          <div key={it.id} className={cn("flex items-start gap-2 p-2 rounded-lg bg-slate-50", !it.active && "opacity-50")}>
                            <span className="text-xs text-slate-400 font-mono w-5 shrink-0 mt-0.5">{i + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm font-medium text-slate-800", it.required && "after:content-['*'] after:text-red-400 after:ml-0.5")}>{it.title}</p>
                              {it.description && <p className="text-xs text-slate-500 mt-0.5">{it.description}</p>}
                              {it.defaultResponsible && <p className="text-xs text-slate-400">Resp: {it.defaultResponsible}</p>}
                              {it.defaultDays && <p className="text-xs text-slate-400">Prazo: {it.defaultDays}d</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {isOpen && t.items.length === 0 && (
                      <p className="ml-7 mt-2 text-xs text-slate-400 italic">Nenhum item cadastrado.</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

      {/* Formulário de atividade */}
      {showForm && (
        <Modal title={editing ? "Editar Atividade" : "Nova Atividade"} onClose={() => setShowForm(false)} extraWide>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            {/* Dados principais */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dados da atividade</p>
              <Field label="Nome da atividade" required>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={IC} placeholder="Ex: Processo de Admissão" />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Categoria">
                  <div className="flex gap-2">
                    <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} className={cn(IC, "flex-1")}>
                      <option value="">Sem categoria</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowQuickCat(true)}
                      className="px-2.5 py-1 border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors" title="Nova categoria">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {showQuickCat && (
                    <div className="mt-2 flex gap-2">
                      <input id="qcat" placeholder="Nome da nova categoria..." className={cn(IC, "flex-1")} onKeyDown={e => {
                        if (e.key === "Enter") { e.preventDefault(); handleQuickCat((e.target as HTMLInputElement).value) }
                      }} />
                      <Button type="button" onClick={() => {
                        const v = (document.getElementById("qcat") as HTMLInputElement)?.value
                        if (v) handleQuickCat(v)
                      }}>Criar</Button>
                      <Button type="button" variant="outline" onClick={() => setShowQuickCat(false)}>×</Button>
                    </div>
                  )}
                </Field>
                <Field label="Departamento">
                  <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className={IC} placeholder="Ex: Departamento Pessoal" />
                </Field>
              </div>
              <Field label="Descrição geral">
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={IC} placeholder="Conjunto de procedimentos..." />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Ordem"><input type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))} className={IC} min={0} /></Field>
                <Field label="Status">
                  <select value={form.active ? "true" : "false"} onChange={e => setForm(f => ({ ...f, active: e.target.value === "true" }))} className={IC}>
                    <option value="true">Ativa</option>
                    <option value="false">Inativa</option>
                  </select>
                </Field>
              </div>
              <Field label="Observações">
                <textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} rows={2} className={IC} />
              </Field>
            </div>

            {/* Itens/etapas */}
            <div className="p-4 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-blue-500" />
                  Etapas / Itens da Atividade ({formItems.length})
                </p>
                <Button type="button" variant="outline" onClick={addItem}><Plus className="w-3.5 h-3.5 mr-1" /> Adicionar item</Button>
              </div>

              {formItems.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4 italic">Nenhum item ainda. Clique em &quot;Adicionar item&quot; para incluir etapas.</p>
              )}

              <div className="space-y-2">
                {formItems.map((it, idx) => (
                  <div key={idx} draggable
                    onDragStart={() => onDragStart(idx)}
                    onDragOver={e => onDragOver(e, idx)}
                    className="flex gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 group">
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                      <span className="text-xs text-slate-400 font-mono">{idx + 1}</span>
                      <GripVertical className="w-4 h-4 text-slate-300 cursor-grab group-hover:text-slate-400" />
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <input
                        value={it.title || ""} onChange={e => setFormItems(prev => prev.map((p, i) => i === idx ? { ...p, title: e.target.value } : p))}
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg font-medium" placeholder={`Título do item ${idx + 1} *`}
                      />
                      <textarea
                        value={it.description || ""} onChange={e => setFormItems(prev => prev.map((p, i) => i === idx ? { ...p, description: e.target.value } : p))}
                        rows={2} className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg resize-none" placeholder="Descrição detalhada do item..."
                      />
                      <div className="flex flex-wrap gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                          <input type="checkbox" checked={it.required !== false} onChange={e => setFormItems(prev => prev.map((p, i) => i === idx ? { ...p, required: e.target.checked } : p))} />
                          Obrigatório
                        </label>
                        <input value={it.defaultResponsible || ""} onChange={e => setFormItems(prev => prev.map((p, i) => i === idx ? { ...p, defaultResponsible: e.target.value } : p))}
                          className="px-2 py-1 text-xs border border-slate-200 rounded" placeholder="Responsável padrão" />
                        <input type="number" value={it.defaultDays ?? ""} onChange={e => setFormItems(prev => prev.map((p, i) => i === idx ? { ...p, defaultDays: e.target.value ? Number(e.target.value) : undefined } : p))}
                          className="w-24 px-2 py-1 text-xs border border-slate-200 rounded" placeholder="Prazo (dias)" min={0} />
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                          <input type="checkbox" checked={it.active !== false} onChange={e => setFormItems(prev => prev.map((p, i) => i === idx ? { ...p, active: e.target.checked } : p))} />
                          Ativo
                        </label>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button type="button" onClick={() => duplicateItem(idx)} className="p-1 text-slate-400 hover:text-purple-600" title="Duplicar"><Copy className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-red-500" title="Remover"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar atividade"}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); openNew() }}>Salvar e criar outra</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Sub-aba: Atividades dos Colaboradores ────────────────────────────────────

function TabColaboradoresAtividades({ members }: { members: Member[] }) {
  const [links, setLinks] = useState<MemberActivityLink[]>([])
  const [templates, setTemplates] = useState<ActivityTemplate[]>([])
  const [categories, setCategories] = useState<ActivityCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState<MemberActivityLink | null>(null)
  const [showDetailModal, setShowDetailModal] = useState<MemberActivityLink | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [filterMember, setFilterMember] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [searchMember, setSearchMember] = useState("")

  // Add form
  const [addForm, setAddForm] = useState({
    memberId: "", includedAt: todayISO(), observations: "",
    selectedItems: new Map<string, Set<string>>(), // templateId → Set<itemId>
    catFilter: "", searchTpl: "",
  })
  const [addResult, setAddResult] = useState<{ skipped: string[] } | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filterMember) p.set("memberId", filterMember)
    if (filterCategory) p.set("categoryId", filterCategory)
    if (searchMember) p.set("search", searchMember)
    const [linksRes, tplRes, catRes] = await Promise.all([
      fetch(`/api/gestao-equipe/member-activities?${p}`),
      fetch("/api/gestao-equipe/activity-templates?active=true"),
      fetch("/api/gestao-equipe/activity-categories?active=true"),
    ])
    setLinks(await linksRes.json())
    setTemplates(await tplRes.json())
    setCategories(await catRes.json())
    setLoading(false)
  }, [filterMember, filterCategory, searchMember])

  useEffect(() => { const t = setTimeout(fetchAll, 300); return () => clearTimeout(t) }, [fetchAll])

  const grouped = links.reduce<Record<string, { member: MemberActivityLink["member"]; links: MemberActivityLink[] }>>((acc, l) => {
    if (!acc[l.memberId]) acc[l.memberId] = { member: l.member, links: [] }
    acc[l.memberId].links.push(l)
    return acc
  }, {})

  function toggleExpand(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function openAdd(presetMemberId?: string) {
    setAddForm({
      memberId: presetMemberId || "", includedAt: todayISO(), observations: "",
      selectedItems: new Map(), catFilter: "", searchTpl: "",
    })
    setAddResult(null)
    setShowAddModal(true)
  }

  function toggleAllItems(templateId: string, items: ActivityItem[]) {
    setAddForm(f => {
      const next = new Map(f.selectedItems)
      const cur = next.get(templateId)
      if (cur && cur.size === items.filter(i => i.active).length) {
        next.delete(templateId) // deselect all
      } else {
        next.set(templateId, new Set(items.filter(i => i.active).map(i => i.id)))
      }
      return { ...f, selectedItems: next }
    })
  }

  function toggleItem(templateId: string, itemId: string) {
    setAddForm(f => {
      const next = new Map(f.selectedItems)
      const cur = next.get(templateId) ?? new Set<string>()
      const updated = new Set(cur)
      if (updated.has(itemId)) {
        updated.delete(itemId)
        if (updated.size === 0) next.delete(templateId)
        else next.set(templateId, updated)
      } else {
        updated.add(itemId)
        next.set(templateId, updated)
      }
      return { ...f, selectedItems: next }
    })
  }

  function toggleTemplate(templateId: string, items: ActivityItem[]) {
    setAddForm(f => {
      const next = new Map(f.selectedItems)
      if (next.has(templateId)) {
        next.delete(templateId)
      } else {
        next.set(templateId, new Set(items.filter(i => i.active).map(i => i.id)))
      }
      return { ...f, selectedItems: next }
    })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.memberId) { alert("Selecione o colaborador"); return }
    if (addForm.selectedItems.size === 0) { alert("Selecione ao menos uma atividade"); return }
    setSaving(true)
    try {
      const activityTemplateIds = Array.from(addForm.selectedItems.keys())
      // 1. Vincular atividades principais
      const r = await fetch("/api/gestao-equipe/member-activities", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: addForm.memberId, activityTemplateIds,
          includedAt: addForm.includedAt, observations: addForm.observations || null,
        }),
      })
      const data = await r.json()

      // 2. Para cada atividade vinculada, vincular os itens selecionados
      const allLinks: MemberActivityLink[] = await fetch(`/api/gestao-equipe/member-activities?memberId=${addForm.memberId}`).then(r => r.json())

      for (const [tplId, itemIds] of Array.from(addForm.selectedItems.entries())) {
        if (itemIds.size === 0) continue
        const link = allLinks.find(l => l.activityTemplateId === tplId)
        if (!link) continue
        await fetch("/api/gestao-equipe/member-activity-items", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkId: link.id, itemIds: Array.from(itemIds), includedAt: addForm.includedAt }),
        })
      }

      if (data.skippedCount > 0) setAddResult({ skipped: data.skipped })
      else setShowAddModal(false)
      fetchAll()
    } finally { setSaving(false) }
  }

  async function handleRemoveLink(id: string) {
    if (!confirm("Remover esta atividade do colaborador?")) return
    await fetch(`/api/gestao-equipe/member-activities/${id}`, { method: "DELETE" })
    fetchAll()
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!showEditModal) return
    setSaving(true)
    try {
      await fetch(`/api/gestao-equipe/member-activities/${showEditModal.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observation: showEditModal.observation, includedAt: showEditModal.includedAt }),
      })
      setShowEditModal(null); fetchAll()
    } finally { setSaving(false) }
  }

  // Filtered templates for add modal
  const filteredTemplates = templates.filter(t => {
    if (addForm.catFilter && t.categoryId !== addForm.catFilter) return false
    if (addForm.searchTpl && !t.name.toLowerCase().includes(addForm.searchTpl.toLowerCase())) return false
    return true
  })

  // ── Reports ──────────────────────────────────────────────────────────────────

  function esc_(s: string | null | undefined) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }

  function buildPrintHTML(grps: { member: MemberActivityLink["member"]; links: MemberActivityLink[] }[], title: string) {
    const date = fmtDate(todayISO())

    const sections = grps.map(g => {
      const totalItems = g.links.reduce((s, l) => s + Math.max(l.itemLinks.length, l.activityTemplate.items.length), 0)

      const actSections = g.links.map((l, lIdx) => {
        const catName = l.activityTemplate.actCategory?.name || l.activityTemplate.category || ""
        const itemsToShow = l.itemLinks.length > 0 ? l.itemLinks.map(il => il.item) : l.activityTemplate.items

        const itemRows = itemsToShow.map((it, i) => {
          const obs = l.itemLinks.length > 0 ? (l.itemLinks.find(il => il.itemId === it.id)?.observation || "") : ""
          return `<div style="margin:5px 0 5px 0;padding:8px 10px;background:#f8fafc;border-left:3px solid #cbd5e1;border-radius:0 4px 4px 0">
            <div style="font-size:12px;font-weight:700;color:#1e293b">${i + 1}. ${esc_(it.title)}</div>
            ${it.description ? `<div style="font-size:11px;color:#475569;margin-top:3px;line-height:1.45">${esc_(it.description)}</div>` : ""}
            ${obs ? `<div style="font-size:11px;color:#92400e;margin-top:3px;font-style:italic">Obs. específica: ${esc_(obs)}</div>` : ""}
          </div>`
        }).join("")

        return `<div style="margin-bottom:14px;page-break-inside:avoid;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
          <div style="background:#f1f5f9;padding:8px 12px;border-bottom:1px solid #e2e8f0">
            ${catName ? `<div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:1px;margin-bottom:2px">${esc_(catName)}</div>` : ""}
            <div style="font-size:13px;font-weight:700;color:#0f172a">${lIdx + 1}. ${esc_(l.activityTemplate.name)}</div>
            ${l.activityTemplate.description ? `<div style="font-size:11px;color:#475569;margin-top:3px">${esc_(l.activityTemplate.description)}</div>` : ""}
          </div>
          <div style="padding:10px 12px">
            ${l.observation ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:4px;padding:7px 10px;margin-bottom:8px;font-size:11px;color:#92400e;font-style:italic"><strong>Observação do colaborador:</strong> ${esc_(l.observation)}</div>` : ""}
            <div style="font-size:11px;color:#64748b;margin-bottom:6px">Incluído em: <strong>${fmtDate(l.includedAt)}</strong>${itemsToShow.length > 0 ? ` &nbsp;·&nbsp; ${itemsToShow.length} item(s)` : ""}</div>
            ${itemsToShow.length > 0 ? `<div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:1px;margin-bottom:4px">Etapas / Itens</div>${itemRows}` : ""}
          </div>
        </div>`
      }).join("")

      return `<div style="margin-bottom:32px">
        <div style="background:#0f172a;color:#fff;border-radius:6px;padding:10px 14px;margin-bottom:12px">
          <div style="font-size:14px;font-weight:700">${esc_(g.member.name)}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px">${esc_([g.member.role, g.member.sector, g.member.unit].filter(Boolean).join(" · "))}</div>
          <div style="font-size:10px;color:#64748b;margin-top:3px">${g.links.length} atividade(s) &nbsp;·&nbsp; ${totalItems} item(s)</div>
        </div>
        ${actSections}
      </div>`
    }).join("")

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc_(title)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;padding:24px;max-width:900px;margin:0 auto}
.title{text-align:center;font-size:16px;font-weight:700;text-transform:uppercase;margin-bottom:4px;letter-spacing:1px}
.date{text-align:center;font-size:11px;color:#64748b;margin-bottom:24px}
@page{size:A4;margin:16mm}@media print{a::after{content:none!important}body{padding:0;max-width:none}}</style>
</head><body>
<div class="title">${esc_(title)}</div>
<div class="date">Gerado em: ${date}</div>
${sections}
</body></html>`
  }

  function openPrint(html: string) {
    const w = window.open("", "_blank", "width=900,height=700")
    if (!w) return
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  function printMember(mid: string) {
    const g = grouped[mid]; if (!g) return
    openPrint(buildPrintHTML([g], `RELATÓRIO DE ATIVIDADES — ${g.member.name.toUpperCase()}`))
  }
  function printAll() { openPrint(buildPrintHTML(Object.values(grouped), "RELATÓRIO GERAL DE ATIVIDADES")) }

  async function exportPDF(mid?: string) {
    if (mid) {
      const g = grouped[mid]; if (!g) return
      await generateMemberPDF(g.member, g.links as any)
    } else {
      await generateAllMembersPDF(Object.values(grouped) as any)
    }
  }

  function exportExcel(mid?: string) {
    const rows = mid ? (grouped[mid]?.links ?? []) : links
    const header = ["Colaborador", "Cargo", "Departamento", "Categoria", "Atividade", "Item", "Descrição do Item", "Observação", "Data inclusão"]
    const csvRows: string[][] = []
    rows.forEach(l => {
      const itemsToExport = l.itemLinks.length > 0 ? l.itemLinks.map(il => il.item) : l.activityTemplate.items
      if (itemsToExport.length === 0) {
        csvRows.push([l.member.name, l.member.role, l.member.sector || "", l.activityTemplate.actCategory?.name || l.activityTemplate.category || "", l.activityTemplate.name, "", "", l.observation || "", fmtDate(l.includedAt)])
      } else {
        itemsToExport.forEach(it => {
          csvRows.push([l.member.name, l.member.role, l.member.sector || "", l.activityTemplate.actCategory?.name || l.activityTemplate.category || "", l.activityTemplate.name, it.title, it.description || "", l.observation || "", fmtDate(l.includedAt)])
        })
      }
    })
    const csv = [header, ...csvRows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
    a.download = `atividades${mid ? `-${grouped[mid]?.member.name.replace(/\s+/g, "_")}` : ""}.csv`; a.click()
  }

  function exportWord(mid?: string) {
    const grps = mid ? [grouped[mid]] : Object.values(grouped)
    const html = buildPrintHTML(grps as any, "RELATÓRIO DE ATIVIDADES")
    const blob = new Blob([html], { type: "application/msword" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
    a.download = `atividades${mid ? `-${grouped[mid]?.member.name.replace(/\s+/g, "_")}` : ""}.doc`; a.click()
  }

  return (
    <div className="space-y-4">
      {/* Filtros e ações */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchMember} onChange={e => setSearchMember(e.target.value)} placeholder="Buscar colaborador ou atividade..." className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
        </div>
        <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Todos os colaboradores</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Todas as categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <Button onClick={() => openAdd()}><Plus className="w-4 h-4 mr-1" /> Adicionar atividades</Button>
        <Button variant="outline" onClick={printAll} title="Imprimir"><Printer className="w-4 h-4 mr-1" /> Imprimir geral</Button>
        <Button variant="outline" onClick={() => exportPDF()} title="PDF"><FileDown className="w-4 h-4 mr-1" /> PDF</Button>
        <Button variant="outline" onClick={() => exportExcel()} title="Excel"><FileSpreadsheet className="w-4 h-4 mr-1" /> Excel</Button>
        <Button variant="outline" onClick={() => exportWord()} title="Word"><FileText className="w-4 h-4 mr-1" /> Word</Button>
      </div>

      {loading ? <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>
        : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            Nenhuma atividade vinculada.
          </div>
        ) : (
          <div className="space-y-3">
            {Object.values(grouped).map(({ member, links: mLinks }) => {
              const isOpen = expanded.has(member.id)
              return (
                <Card key={member.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleExpand(member.id)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-slate-800">{member.name}</p>
                            <span className="text-xs text-slate-500">{member.role}</span>
                            {member.sector && <span className="text-xs text-slate-400">· {member.sector}</span>}
                            <Badge label={`${mLinks.length} atividade(s)`} colorClass="bg-orange-50 text-orange-700" />
                          </div>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openAdd(member.id)} className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Adicionar atividades"><Plus className="w-4 h-4" /></button>
                        <button onClick={() => printMember(member.id)} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Imprimir"><Printer className="w-4 h-4" /></button>
                        <button onClick={() => exportPDF(member.id)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50" title="Exportar atividades em PDF"><FileDown className="w-4 h-4" /></button>
                        <button onClick={() => exportExcel(member.id)} className="p-1.5 rounded text-slate-400 hover:text-green-600 hover:bg-green-50" title="Excel"><FileSpreadsheet className="w-4 h-4" /></button>
                        <button onClick={() => exportWord(member.id)} className="p-1.5 rounded text-slate-400 hover:text-blue-700 hover:bg-blue-50" title="Word"><FileText className="w-4 h-4" /></button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-3 border-t border-slate-100 pt-3 space-y-3">
                        {mLinks.map(link => {
                          const catName = link.activityTemplate.actCategory?.name || link.activityTemplate.category || ""
                          const itemsToShow = link.itemLinks.length > 0 ? link.itemLinks.map(il => il.item) : link.activityTemplate.items
                          return (
                            <div key={link.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  {catName && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{catName}</p>}
                                  <button onClick={() => setShowDetailModal(link)} className="text-left hover:text-blue-600">
                                    <p className="font-semibold text-sm text-slate-800">{link.activityTemplate.name}</p>
                                  </button>
                                  {link.activityTemplate.description && (
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{link.activityTemplate.description}</p>
                                  )}
                                  {link.observation && <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-0.5 mt-1 italic">💬 {link.observation}</p>}
                                  <p className="text-xs text-slate-400 mt-1">Incluído em: {fmtDate(link.includedAt)}</p>

                                  {itemsToShow.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {itemsToShow.map((it, i) => (
                                        <div key={it.id} className="flex items-start gap-1.5 text-xs text-slate-600">
                                          <span className="text-slate-400 font-mono shrink-0">{i + 1}.</span>
                                          <div>
                                            <span className="font-medium">{it.title}</span>
                                            {it.description && <span className="text-slate-400"> — {it.description}</span>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => setShowEditModal({ ...link })} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleRemoveLink(link.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

      {/* Modal adicionar atividades */}
      {showAddModal && (
        <Modal title="Adicionar Atividades ao Colaborador" onClose={() => setShowAddModal(false)} extraWide>
          <form onSubmit={handleAdd} className="space-y-4">
            {addResult && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
                <strong>Já vinculadas (ignoradas):</strong> {addResult.skipped.join(", ")}
                <button type="button" onClick={() => setShowAddModal(false)} className="ml-3 underline text-xs">Fechar</button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Colaborador" required>
                <select required value={addForm.memberId} onChange={e => setAddForm(f => ({ ...f, memberId: e.target.value }))} className={IC}>
                  <option value="">Selecione...</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
                </select>
              </Field>
              <Field label="Data de cadastro">
                <input type="date" value={addForm.includedAt} onChange={e => setAddForm(f => ({ ...f, includedAt: e.target.value }))} className={IC} />
              </Field>
            </div>
            <Field label="Observação geral (opcional)">
              <input value={addForm.observations} onChange={e => setAddForm(f => ({ ...f, observations: e.target.value }))} className={IC} placeholder="Aplicada a todas as atividades selecionadas..." />
            </Field>

            {/* Seletor hierárquico */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Atividades e Itens <span className="text-red-500">*</span></label>
                <span className="text-xs text-slate-500">{Array.from(addForm.selectedItems.keys()).length} atividade(s) selecionada(s)</span>
              </div>
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input value={addForm.searchTpl} onChange={e => setAddForm(f => ({ ...f, searchTpl: e.target.value }))} placeholder="Buscar atividade..." className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
                <select value={addForm.catFilter} onChange={e => setAddForm(f => ({ ...f, catFilter: e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 rounded-lg">
                  <option value="">Todas as categorias</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                {filteredTemplates.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-6">Nenhuma atividade</p>
                ) : filteredTemplates.map(t => {
                  const selItems = addForm.selectedItems.get(t.id) ?? new Set<string>()
                  const activeItems = t.items.filter(i => i.active)
                  const tplSelected = addForm.selectedItems.has(t.id)
                  return (
                    <div key={t.id} className="border-b border-slate-100 last:border-0">
                      {/* Linha da atividade principal */}
                      <div onClick={() => toggleTemplate(t.id, t.items)}
                        className={cn("w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors cursor-pointer", tplSelected && "bg-blue-50")}>
                        {tplSelected ? <CheckSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" /> : <Square className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {t.actCategory && <span className="text-sm">{t.actCategory.icon}</span>}
                            <span className={cn("text-sm font-semibold", tplSelected ? "text-blue-800" : "text-slate-800")}>{t.name}</span>
                            {activeItems.length > 0 && <Badge label={`${activeItems.length} item(s)`} colorClass="bg-slate-100 text-slate-500" />}
                          </div>
                          {t.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.description}</p>}
                        </div>
                        {activeItems.length > 0 && (
                          <button type="button" onClick={ev => { ev.stopPropagation(); toggleAllItems(t.id, t.items) }}
                            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-200 rounded whitespace-nowrap shrink-0">
                            {selItems.size === activeItems.length ? "Desmarcar todos" : "Marcar todos"}
                          </button>
                        )}
                      </div>
                      {/* Itens da atividade */}
                      {tplSelected && activeItems.length > 0 && (
                        <div className="bg-slate-50 border-t border-slate-100 px-4 pb-2 pt-1 space-y-1">
                          {activeItems.map(it => {
                            const isSel = selItems.has(it.id)
                            return (
                              <button key={it.id} type="button" onClick={() => toggleItem(t.id, it.id)}
                                className={cn("w-full flex items-start gap-2 px-3 py-1.5 rounded-lg text-left transition-colors text-xs", isSel ? "bg-blue-100 text-blue-800" : "hover:bg-slate-100 text-slate-600")}>
                                {isSel ? <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" /> : <Square className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />}
                                <div>
                                  <span className="font-medium">{it.title}</span>
                                  {it.description && <span className="text-slate-400 ml-1">— {it.description.slice(0, 60)}{it.description.length > 60 ? "…" : ""}</span>}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving || addForm.selectedItems.size === 0}>
                {saving ? "Salvando..." : `Vincular ${addForm.selectedItems.size > 0 ? addForm.selectedItems.size : ""} atividade(s)`}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal editar observação */}
      {showEditModal && (
        <Modal title="Editar observação e data" onClose={() => setShowEditModal(null)}>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <p className="text-sm font-medium text-slate-800">{showEditModal.activityTemplate.name}</p>
            <Field label="Data de inclusão">
              <input type="date" value={showEditModal.includedAt} onChange={e => setShowEditModal(m => m ? { ...m, includedAt: e.target.value } : m)} className={IC} />
            </Field>
            <Field label="Observação">
              <textarea value={showEditModal.observation || ""} onChange={e => setShowEditModal(m => m ? { ...m, observation: e.target.value } : m)} rows={3} className={IC} />
            </Field>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(null)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal detalhe */}
      {showDetailModal && (
        <Modal title="Detalhes da Atividade" onClose={() => setShowDetailModal(null)} wide>
          <div className="space-y-4">
            {showDetailModal.activityTemplate.actCategory && (
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {showDetailModal.activityTemplate.actCategory.icon} {showDetailModal.activityTemplate.actCategory.name}
              </p>
            )}
            <div>
              <p className="text-base font-bold text-slate-800">{showDetailModal.activityTemplate.name}</p>
              {showDetailModal.activityTemplate.description && (
                <p className="text-sm text-slate-600 mt-1">{showDetailModal.activityTemplate.description}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-slate-400 font-semibold uppercase mb-1">Colaborador</p><p>{showDetailModal.member.name}</p></div>
              <div><p className="text-xs text-slate-400 font-semibold uppercase mb-1">Incluído em</p><p>{fmtDate(showDetailModal.includedAt)}</p></div>
            </div>
            {showDetailModal.observation && (
              <div className="bg-amber-50 rounded-lg px-3 py-2 text-sm text-amber-800">
                <p className="text-xs font-semibold text-amber-600 mb-1">Observação</p>
                {showDetailModal.observation}
              </div>
            )}
            {/* Itens */}
            {showDetailModal.activityTemplate.items.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Etapas / Itens ({showDetailModal.activityTemplate.items.length})</p>
                <div className="space-y-2">
                  {showDetailModal.activityTemplate.items.map((it, i) => (
                    <div key={it.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-sm font-medium text-slate-800">{i + 1}. {it.title}</p>
                      {it.description && <p className="text-xs text-slate-500 mt-0.5">{it.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function TabAtividades({ members }: { members: Member[] }) {
  const [subTab, setSubTab] = useState<"colaboradores" | "cadastro" | "categorias">("colaboradores")

  const tabs = [
    { id: "colaboradores" as const, label: "Atividades dos Colaboradores", icon: Users },
    { id: "cadastro" as const, label: "Cadastro de Atividades", icon: Layers },
    { id: "categorias" as const, label: "Categorias", icon: Tag },
  ]

  return (
    <div className="space-y-4">
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              subTab === id ? "border-orange-500 text-orange-700" : "border-transparent text-slate-500 hover:text-slate-700")}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      {subTab === "colaboradores" && <TabColaboradoresAtividades members={members} />}
      {subTab === "cadastro" && <TabCadastroAtividades />}
      {subTab === "categorias" && <TabCategorias />}
    </div>
  )
}
