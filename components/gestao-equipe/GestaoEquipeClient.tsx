"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import {
  Users, MessageSquare, Navigation, Umbrella, BookOpen,
  Activity, BookMarked, LayoutDashboard, Plus, Edit2, Trash2,
  Sparkles, X, ChevronDown, AlertTriangle, CheckCircle,
  Clock, Calendar, RefreshCw, Search, Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string; name: string; role: string; sector?: string | null
  unit?: string | null; email?: string | null; phone?: string | null
  joinedAt?: string | null; status: string; observations?: string | null
  _count?: { feedbacks: number; directions: number; vacations: number; trainings: number; activities: number }
}
interface Feedback {
  id: string; memberId: string; feedbackDate: string; type: string
  observedSituation?: string | null; positivePoints?: string | null
  improvementPoints?: string | null; orientationGiven?: string | null
  agreedAction?: string | null; nextFollowUp?: string | null
  observations?: string | null; aiGenerated: boolean; aiContent?: string | null
  member: { id: string; name: string; role: string }
}
interface Direction {
  id: string; memberId: string; title: string; description?: string | null
  dueDate?: string | null; priority: string; complexity: string
  expectedResult?: string | null; aiOrientation?: string | null; status: string
  member: { id: string; name: string; role: string }
}
interface Vacation {
  id: string; memberId: string; acquisitivePeriod?: string | null
  availableDays?: number | null; startDate?: string | null; returnDate?: string | null
  status: string; substitute?: string | null; observations?: string | null
  member: { id: string; name: string; role: string; sector?: string | null }
}
interface Training {
  id: string; memberId: string; topic: string; objective?: string | null
  plannedDate?: string | null; completedDate?: string | null; status: string
  responsible?: string | null; expectedResult?: string | null
  evaluation?: string | null; observations?: string | null; aiPlan?: string | null
  member: { id: string; name: string; role: string }
}
interface TeamActivity {
  id: string; memberId: string; title: string; description?: string | null
  receivedAt?: string | null; dueDate?: string | null; priority: string
  status: string; statusObservation?: string | null
  expectedResult?: string | null; deliveredResult?: string | null
  coordinatorRating?: string | null
  member: { id: string; name: string; role: string }
}
interface Guideline {
  id: string; title: string; category: string; description?: string | null
  reason?: string | null; practicalUse?: string | null; responsible?: string | null
  status: string; observations?: string | null; aiGenerated: boolean; aiContent?: string | null
}
interface Summary {
  counts: {
    totalMembers: number; activeMembers: number; totalFeedbacks: number
    totalDirections: number; totalVacations: number; totalTrainings: number
    totalActivities: number; totalGuidelines: number; pendingActivities: number
  }
  alerts: {
    upcomingVacations: Array<{ id: string; startDate?: string; member: { name: string } }>
    onVacation: Array<{ id: string; returnDate?: string; member: { name: string } }>
    overdueActivities: Array<{ id: string; title: string; dueDate?: string; member: { name: string } }>
    vacationConflicts: Array<{ id: string; startDate?: string; member: { name: string } }>
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MEMBER_STATUS: Record<string, { label: string; color: string }> = {
  ATIVO:    { label: "Ativo",    color: "bg-green-100 text-green-700" },
  AFASTADO: { label: "Afastado", color: "bg-yellow-100 text-yellow-700" },
  FERIAS:   { label: "Férias",   color: "bg-blue-100 text-blue-700" },
  INATIVO:  { label: "Inativo",  color: "bg-slate-100 text-slate-600" },
}
const PRIORITY_COLORS: Record<string, string> = {
  BAIXA: "bg-slate-100 text-slate-600",
  MEDIA: "bg-blue-100 text-blue-700",
  ALTA: "bg-orange-100 text-orange-700",
  URGENTE: "bg-red-100 text-red-700",
}
const PRIORITY_LABELS: Record<string, string> = {
  BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", URGENTE: "Urgente",
}
const FEEDBACK_TYPES: Record<string, string> = {
  POSITIVO: "Positivo", MELHORIA: "Melhoria", ALINHAMENTO: "Alinhamento",
  DESENVOLVIMENTO: "Desenvolvimento", RECONHECIMENTO: "Reconhecimento",
  CORRECAO_CONDUTA: "Correção de Conduta", ADVERTENCIA_VERBAL: "Advertência Verbal",
}
const DIRECTION_STATUS: Record<string, { label: string; color: string }> = {
  PLANEJADA:          { label: "Planejada",           color: "bg-slate-100 text-slate-600" },
  DIRECIONADA:        { label: "Direcionada",          color: "bg-blue-100 text-blue-700" },
  EM_EXECUCAO:        { label: "Em Execução",          color: "bg-indigo-100 text-indigo-700" },
  AGUARDANDO_RETORNO: { label: "Aguardando Retorno",  color: "bg-yellow-100 text-yellow-700" },
  CONCLUIDA:          { label: "Concluída",            color: "bg-green-100 text-green-700" },
  CANCELADA:          { label: "Cancelada",            color: "bg-red-100 text-red-700" },
}
const ACTIVITY_STATUS: Record<string, { label: string; color: string }> = {
  PENDENTE:           { label: "Pendente",            color: "bg-slate-100 text-slate-600" },
  EM_ANDAMENTO:       { label: "Em Andamento",        color: "bg-blue-100 text-blue-700" },
  AGUARDANDO_RETORNO: { label: "Aguardando Retorno", color: "bg-yellow-100 text-yellow-700" },
  CONCLUIDA:          { label: "Concluída",           color: "bg-green-100 text-green-700" },
  CANCELADA:          { label: "Cancelada",           color: "bg-red-100 text-red-700" },
}
const VACATION_STATUS: Record<string, { label: string; color: string }> = {
  A_PROGRAMAR: { label: "A Programar", color: "bg-slate-100 text-slate-600" },
  PROGRAMADA:  { label: "Programada",  color: "bg-blue-100 text-blue-700" },
  EM_FERIAS:   { label: "Em Férias",   color: "bg-green-100 text-green-700" },
  RETORNOU:    { label: "Retornou",    color: "bg-teal-100 text-teal-700" },
  CANCELADA:   { label: "Cancelada",   color: "bg-red-100 text-red-700" },
}
const TRAINING_STATUS: Record<string, { label: string; color: string }> = {
  PLANEJADO:    { label: "Planejado",    color: "bg-slate-100 text-slate-600" },
  EM_ANDAMENTO: { label: "Em Andamento", color: "bg-blue-100 text-blue-700" },
  CONCLUIDO:    { label: "Concluído",    color: "bg-green-100 text-green-700" },
  CANCELADO:    { label: "Cancelado",    color: "bg-red-100 text-red-700" },
}
const GUIDELINE_CATEGORIES: Record<string, string> = {
  PROCESSO: "Processo", PRAZO: "Prazo", ATENDIMENTO: "Atendimento",
  COMUNICACAO: "Comunicação", CONFERENCIA: "Conferência", FINANCEIRO: "Financeiro",
  DEPARTAMENTO_PESSOAL: "Depto. Pessoal", CONDUTA: "Conduta",
  QUALIDADE: "Qualidade", OUTROS: "Outros",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", colorClass)}>{label}</span>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">{children}</div>
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

const inputClass = "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
const selectClass = inputClass

function fmtDate(s?: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("pt-BR")
}

function fmtDateTime(s?: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function MemberSelect({ members, value, onChange, required }: { members: Member[]; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={selectClass} required={required}>
      <option value="">Selecione o colaborador...</option>
      {members.map(m => (
        <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
      ))}
    </select>
  )
}

// ─── Tab: Visão Geral ─────────────────────────────────────────────────────────

function TabVisaoGeral({ summary, onTabSwitch }: { summary: Summary | null; onTabSwitch: (tab: string) => void }) {
  if (!summary) return <div className="text-slate-400 text-sm py-8 text-center">Carregando...</div>

  const { counts, alerts } = summary
  const cards = [
    { label: "Colaboradores", value: counts.activeMembers, sub: `${counts.totalMembers} total`, tab: "equipe", color: "from-blue-500 to-blue-600", icon: Users },
    { label: "Feedbacks",     value: counts.totalFeedbacks, sub: "registrados", tab: "feedbacks", color: "from-purple-500 to-purple-600", icon: MessageSquare },
    { label: "Direcionamentos", value: counts.totalDirections, sub: "em aberto", tab: "direcionamento", color: "from-indigo-500 to-indigo-600", icon: Navigation },
    { label: "Férias Ativas", value: counts.totalVacations, sub: "programadas/em curso", tab: "ferias", color: "from-sky-500 to-sky-600", icon: Umbrella },
    { label: "Treinamentos",  value: counts.totalTrainings, sub: "em andamento", tab: "treinamentos", color: "from-teal-500 to-teal-600", icon: BookOpen },
    { label: "Atividades",    value: counts.totalActivities, sub: `${counts.pendingActivities} pendentes`, tab: "atividades", color: "from-orange-500 to-orange-600", icon: Activity },
    { label: "Diretrizes",    value: counts.totalGuidelines, sub: "ativas", tab: "diretrizes", color: "from-emerald-500 to-emerald-600", icon: BookMarked },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <button key={c.tab} onClick={() => onTabSwitch(c.tab)}
            className="text-left rounded-xl overflow-hidden shadow-sm border border-white/20 hover:shadow-md transition-all group"
          >
            <div className={cn("bg-gradient-to-br p-4 text-white", c.color)}>
              <div className="flex items-center justify-between mb-2">
                <c.icon className="w-5 h-5 opacity-80" />
                <span className="text-2xl font-bold">{c.value}</span>
              </div>
              <p className="text-sm font-medium">{c.label}</p>
              <p className="text-xs opacity-70">{c.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {alerts.onVacation.length > 0 && (
          <Card>
            <CardContent>
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Umbrella className="w-4 h-4 text-blue-500" /> Em Férias Agora
              </h4>
              <div className="space-y-2">
                {alerts.onVacation.map(v => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{v.member.name}</span>
                    <span className="text-slate-500 text-xs">Retorna: {fmtDate(v.returnDate)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {alerts.upcomingVacations.length > 0 && (
          <Card>
            <CardContent>
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-500" /> Férias Próximas (30 dias)
              </h4>
              <div className="space-y-2">
                {alerts.upcomingVacations.map(v => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{v.member.name}</span>
                    <span className="text-slate-500 text-xs">Início: {fmtDate(v.startDate)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {alerts.overdueActivities.length > 0 && (
          <Card>
            <CardContent>
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Atividades Atrasadas
              </h4>
              <div className="space-y-2">
                {alerts.overdueActivities.map(a => (
                  <div key={a.id} className="text-sm">
                    <p className="font-medium text-slate-700">{a.title}</p>
                    <p className="text-xs text-slate-500">{a.member.name} — Prazo: {fmtDate(a.dueDate)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {alerts.vacationConflicts.length > 0 && (
          <Card>
            <CardContent>
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" /> Férias em 7 Dias
              </h4>
              <div className="space-y-2">
                {alerts.vacationConflicts.map(v => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{v.member.name}</span>
                    <span className="text-slate-500 text-xs">{fmtDate(v.startDate)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {alerts.onVacation.length === 0 && alerts.upcomingVacations.length === 0 &&
          alerts.overdueActivities.length === 0 && alerts.vacationConflicts.length === 0 && (
          <div className="col-span-2 text-center py-8 text-slate-400 text-sm">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
            Nenhum alerta no momento. Equipe operando normalmente.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Equipe ──────────────────────────────────────────────────────────────

function TabEquipe({ members, onRefresh }: { members: Member[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [form, setForm] = useState({
    name: "", role: "", sector: "", unit: "", email: "", phone: "",
    joinedAt: "", status: "ATIVO", observations: "",
  })

  function openNew() {
    setEditing(null)
    setForm({ name: "", role: "", sector: "", unit: "", email: "", phone: "", joinedAt: "", status: "ATIVO", observations: "" })
    setShowForm(true)
  }
  function openEdit(m: Member) {
    setEditing(m)
    setForm({
      name: m.name, role: m.role, sector: m.sector || "", unit: m.unit || "",
      email: m.email || "", phone: m.phone || "",
      joinedAt: m.joinedAt ? m.joinedAt.split("T")[0] : "",
      status: m.status, observations: m.observations || "",
    })
    setShowForm(true)
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const url = editing ? `/api/gestao-equipe/members/${editing.id}` : "/api/gestao-equipe/members"
      await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, joinedAt: form.joinedAt || null }) })
      setShowForm(false); onRefresh()
    } finally { setSaving(false) }
  }
  async function handleDelete(id: string) {
    if (!confirm("Remover colaborador? Todos os dados vinculados serão excluídos.")) return
    await fetch(`/api/gestao-equipe/members/${id}`, { method: "DELETE" })
    onRefresh()
  }

  const filtered = members.filter(m => {
    if (filterStatus && m.status !== filterStatus) return false
    if (search) {
      const s = search.toLowerCase()
      return m.name.toLowerCase().includes(s) || m.role.toLowerCase().includes(s) || (m.sector || "").toLowerCase().includes(s)
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar colaborador..." className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400">
          <option value="">Todos os status</option>
          {Object.entries(MEMBER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(m => (
          <Card key={m.id}>
            <CardContent>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{m.name}</p>
                  <p className="text-sm text-slate-500 truncate">{m.role}</p>
                  {m.sector && <p className="text-xs text-slate-400">{m.sector}</p>}
                </div>
                <Badge label={MEMBER_STATUS[m.status]?.label ?? m.status} colorClass={MEMBER_STATUS[m.status]?.color ?? "bg-slate-100 text-slate-600"} />
              </div>
              {m.email && <p className="text-xs text-slate-500 mb-1">✉ {m.email}</p>}
              {m.phone && <p className="text-xs text-slate-500 mb-1">📱 {m.phone}</p>}
              {m.joinedAt && <p className="text-xs text-slate-400 mb-3">Desde {fmtDate(m.joinedAt)}</p>}
              {m._count && (
                <div className="flex gap-3 text-xs text-slate-500 border-t pt-3 mt-2">
                  <span>💬 {m._count.feedbacks}</span>
                  <span>🎯 {m._count.directions}</span>
                  <span>📋 {m._count.activities}</span>
                  <span>📚 {m._count.trainings}</span>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(m)} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(m.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-400 text-sm">Nenhum colaborador encontrado.</div>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? "Editar Colaborador" : "Novo Colaborador"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome" required><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="Nome completo" /></Field>
              <Field label="Cargo / Função" required><input required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputClass} placeholder="Ex: Analista de DP" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Setor"><input value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} className={inputClass} placeholder="Depto. Pessoal, Financeiro..." /></Field>
              <Field label="Unidade"><input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={inputClass} placeholder="Filial, unidade..." /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="E-mail"><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} /></Field>
              <Field label="Telefone"><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Data de Admissão"><input type="date" value={form.joinedAt} onChange={e => setForm(f => ({ ...f, joinedAt: e.target.value }))} className={inputClass} /></Field>
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={selectClass}>
                  {Object.entries(MEMBER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Observações"><textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} rows={2} className={inputClass} /></Field>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Cadastrar"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Tab: Feedbacks ───────────────────────────────────────────────────────────

function TabFeedbacks({ members }: { members: Member[] }) {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Feedback | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [filterMember, setFilterMember] = useState("")
  const [filterType, setFilterType] = useState("")
  const [form, setForm] = useState({
    memberId: "", feedbackDate: new Date().toISOString().split("T")[0], type: "POSITIVO",
    observedSituation: "", positivePoints: "", improvementPoints: "",
    orientationGiven: "", agreedAction: "", nextFollowUp: "", observations: "",
    aiContent: "", aiContext: "",
  })

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterMember) params.set("memberId", filterMember)
    if (filterType) params.set("type", filterType)
    const res = await fetch(`/api/gestao-equipe/feedbacks?${params}`)
    setItems(await res.json())
    setLoading(false)
  }, [filterMember, filterType])

  useEffect(() => { fetch_() }, [fetch_])

  function openNew() {
    setEditing(null)
    setForm({ memberId: "", feedbackDate: new Date().toISOString().split("T")[0], type: "POSITIVO", observedSituation: "", positivePoints: "", improvementPoints: "", orientationGiven: "", agreedAction: "", nextFollowUp: "", observations: "", aiContent: "", aiContext: "" })
    setShowForm(true)
  }
  function openEdit(fb: Feedback) {
    setEditing(fb)
    setForm({
      memberId: fb.memberId,
      feedbackDate: fb.feedbackDate.split("T")[0],
      type: fb.type,
      observedSituation: fb.observedSituation || "",
      positivePoints: fb.positivePoints || "",
      improvementPoints: fb.improvementPoints || "",
      orientationGiven: fb.orientationGiven || "",
      agreedAction: fb.agreedAction || "",
      nextFollowUp: fb.nextFollowUp ? fb.nextFollowUp.split("T")[0] : "",
      observations: fb.observations || "",
      aiContent: fb.aiContent || "",
      aiContext: "",
    })
    setShowForm(true)
  }

  async function handleGenerate() {
    if (!form.memberId || !form.aiContext) { alert("Selecione o colaborador e informe o contexto/situação observada."); return }
    setGenerating(true)
    try {
      const res = await fetch("/api/gestao-equipe/feedbacks/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: form.memberId, type: form.type, context: form.aiContext }),
      })
      const data = await res.json()
      setForm(f => ({ ...f, aiContent: data.content }))
    } finally { setGenerating(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const url = editing ? `/api/gestao-equipe/feedbacks/${editing.id}` : "/api/gestao-equipe/feedbacks"
      await fetch(url, {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, nextFollowUp: form.nextFollowUp || null, aiGenerated: !!form.aiContent }),
      })
      setShowForm(false); fetch_()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover feedback?")) return
    await fetch(`/api/gestao-equipe/feedbacks/${id}`, { method: "DELETE" })
    fetch_()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400">
          <option value="">Todos os colaboradores</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400">
          <option value="">Todos os tipos</option>
          {Object.entries(FEEDBACK_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </div>

      {loading ? <div className="text-slate-400 text-sm text-center py-8">Carregando...</div> : (
        <div className="space-y-3">
          {items.map(fb => (
            <Card key={fb.id}>
              <CardContent>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-800">{fb.member.name}</p>
                    <p className="text-xs text-slate-500">{fb.member.role} · {fmtDate(fb.feedbackDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={FEEDBACK_TYPES[fb.type] ?? fb.type} colorClass="bg-purple-100 text-purple-700" />
                    {fb.aiGenerated && <Badge label="IA" colorClass="bg-blue-100 text-blue-700" />}
                    <button onClick={() => openEdit(fb)} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(fb.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {fb.observedSituation && <p className="text-sm text-slate-600 line-clamp-2">{fb.observedSituation}</p>}
                {fb.aiContent && <p className="text-xs text-slate-400 mt-1 line-clamp-2 italic">{fb.aiContent}</p>}
                {fb.agreedAction && <p className="text-xs text-blue-600 mt-1">✓ Ação acordada: {fb.agreedAction}</p>}
                {fb.nextFollowUp && <p className="text-xs text-orange-600 mt-1">📅 Acompanhamento: {fmtDate(fb.nextFollowUp)}</p>}
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Nenhum feedback registrado.</div>}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Editar Feedback" : "Novo Feedback"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Colaborador" required>
                <MemberSelect members={members} value={form.memberId} onChange={v => setForm(f => ({ ...f, memberId: v }))} required />
              </Field>
              <Field label="Tipo" required>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={selectClass}>
                  {Object.entries(FEEDBACK_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Data do Feedback">
              <input type="date" value={form.feedbackDate} onChange={e => setForm(f => ({ ...f, feedbackDate: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Situação Observada">
              <textarea value={form.observedSituation} onChange={e => setForm(f => ({ ...f, observedSituation: e.target.value }))} rows={2} className={inputClass} placeholder="Descreva o que foi observado..." />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Pontos Positivos"><textarea value={form.positivePoints} onChange={e => setForm(f => ({ ...f, positivePoints: e.target.value }))} rows={2} className={inputClass} /></Field>
              <Field label="Pontos de Melhoria"><textarea value={form.improvementPoints} onChange={e => setForm(f => ({ ...f, improvementPoints: e.target.value }))} rows={2} className={inputClass} /></Field>
            </div>
            <Field label="Orientação Dada"><textarea value={form.orientationGiven} onChange={e => setForm(f => ({ ...f, orientationGiven: e.target.value }))} rows={2} className={inputClass} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ação Acordada"><input value={form.agreedAction} onChange={e => setForm(f => ({ ...f, agreedAction: e.target.value }))} className={inputClass} /></Field>
              <Field label="Próximo Acompanhamento"><input type="date" value={form.nextFollowUp} onChange={e => setForm(f => ({ ...f, nextFollowUp: e.target.value }))} className={inputClass} /></Field>
            </div>

            {/* Bloco IA */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-blue-800 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Gerar com Inteligência Artificial</p>
              <Field label="Contexto para a IA">
                <textarea value={form.aiContext} onChange={e => setForm(f => ({ ...f, aiContext: e.target.value }))} rows={2} className={inputClass} placeholder="Descreva a situação para a IA gerar o feedback..." />
              </Field>
              <Button type="button" variant="outline" onClick={handleGenerate} disabled={generating}>
                <Sparkles className="w-4 h-4 mr-1" /> {generating ? "Gerando..." : "Gerar Feedback com IA"}
              </Button>
              {form.aiContent && (
                <div className="bg-white border border-blue-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{form.aiContent}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Registrar"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Tab: Direcionamento ──────────────────────────────────────────────────────

function TabDirecionamento({ members }: { members: Member[] }) {
  const [items, setItems] = useState<Direction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Direction | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [filterMember, setFilterMember] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [form, setForm] = useState({
    memberId: "", title: "", description: "", dueDate: "",
    priority: "MEDIA", complexity: "SIMPLES", expectedResult: "",
    aiOrientation: "", status: "PLANEJADA",
  })

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterMember) params.set("memberId", filterMember)
    if (filterStatus) params.set("status", filterStatus)
    const res = await fetch(`/api/gestao-equipe/directions?${params}`)
    setItems(await res.json())
    setLoading(false)
  }, [filterMember, filterStatus])

  useEffect(() => { fetch_() }, [fetch_])

  function openNew() {
    setEditing(null)
    setForm({ memberId: "", title: "", description: "", dueDate: "", priority: "MEDIA", complexity: "SIMPLES", expectedResult: "", aiOrientation: "", status: "PLANEJADA" })
    setShowForm(true)
  }
  function openEdit(d: Direction) {
    setEditing(d)
    setForm({ memberId: d.memberId, title: d.title, description: d.description || "", dueDate: d.dueDate ? d.dueDate.split("T")[0] : "", priority: d.priority, complexity: d.complexity, expectedResult: d.expectedResult || "", aiOrientation: d.aiOrientation || "", status: d.status })
    setShowForm(true)
  }

  async function handleGenerate() {
    if (!form.memberId || !form.title) { alert("Selecione o colaborador e informe o título."); return }
    setGenerating(true)
    try {
      const res = await fetch("/api/gestao-equipe/directions/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: form.memberId, title: form.title, description: form.description, priority: form.priority, complexity: form.complexity }),
      })
      const data = await res.json()
      setForm(f => ({ ...f, aiOrientation: data.content }))
    } finally { setGenerating(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const url = editing ? `/api/gestao-equipe/directions/${editing.id}` : "/api/gestao-equipe/directions"
      await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, dueDate: form.dueDate || null }) })
      setShowForm(false); fetch_()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover direcionamento?")) return
    await fetch(`/api/gestao-equipe/directions/${id}`, { method: "DELETE" })
    fetch_()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Todos os colaboradores</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Todos os status</option>
          {Object.entries(DIRECTION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </div>

      {loading ? <div className="text-slate-400 text-sm text-center py-8">Carregando...</div> : (
        <div className="space-y-3">
          {items.map(d => (
            <Card key={d.id}>
              <CardContent>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800">{d.title}</p>
                    <p className="text-xs text-slate-500">{d.member.name} · {d.member.role}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge label={PRIORITY_LABELS[d.priority] ?? d.priority} colorClass={PRIORITY_COLORS[d.priority]} />
                    <Badge label={DIRECTION_STATUS[d.status]?.label ?? d.status} colorClass={DIRECTION_STATUS[d.status]?.color ?? "bg-slate-100 text-slate-600"} />
                    <button onClick={() => openEdit(d)} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(d.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {d.description && <p className="text-sm text-slate-600 line-clamp-2">{d.description}</p>}
                {d.aiOrientation && <p className="text-xs text-slate-400 mt-1 line-clamp-2 italic">🤖 {d.aiOrientation.substring(0, 120)}...</p>}
                {d.dueDate && <p className="text-xs text-slate-500 mt-1">📅 Prazo: {fmtDate(d.dueDate)}</p>}
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Nenhum direcionamento registrado.</div>}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Editar Direcionamento" : "Novo Direcionamento"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Colaborador" required>
              <MemberSelect members={members} value={form.memberId} onChange={v => setForm(f => ({ ...f, memberId: v }))} required />
            </Field>
            <Field label="Título" required><input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} /></Field>
            <Field label="Descrição"><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inputClass} /></Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Prioridade">
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={selectClass}>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Complexidade">
                <select value={form.complexity} onChange={e => setForm(f => ({ ...f, complexity: e.target.value }))} className={selectClass}>
                  <option value="SIMPLES">Simples</option><option value="MEDIA">Média</option><option value="COMPLEXA">Complexa</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={selectClass}>
                  {Object.entries(DIRECTION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Prazo"><input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className={inputClass} /></Field>
            <Field label="Resultado Esperado"><textarea value={form.expectedResult} onChange={e => setForm(f => ({ ...f, expectedResult: e.target.value }))} rows={2} className={inputClass} /></Field>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-blue-800 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Orientação com IA</p>
              <Button type="button" variant="outline" onClick={handleGenerate} disabled={generating}>
                <Sparkles className="w-4 h-4 mr-1" /> {generating ? "Gerando..." : "Gerar Orientação com IA"}
              </Button>
              {form.aiOrientation && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Orientação gerada (editável):</label>
                  <textarea value={form.aiOrientation} onChange={e => setForm(f => ({ ...f, aiOrientation: e.target.value }))} rows={4} className={inputClass} />
                </div>
              )}
            </div>

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

// ─── Tab: Férias ──────────────────────────────────────────────────────────────

function TabFerias({ members }: { members: Member[] }) {
  const [items, setItems] = useState<Vacation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Vacation | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterMember, setFilterMember] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [form, setForm] = useState({
    memberId: "", acquisitivePeriod: "", availableDays: "", startDate: "",
    returnDate: "", status: "A_PROGRAMAR", substitute: "", observations: "",
  })

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterMember) params.set("memberId", filterMember)
    if (filterStatus) params.set("status", filterStatus)
    const res = await fetch(`/api/gestao-equipe/vacations?${params}`)
    setItems(await res.json())
    setLoading(false)
  }, [filterMember, filterStatus])

  useEffect(() => { fetch_() }, [fetch_])

  function openNew() {
    setEditing(null)
    setForm({ memberId: "", acquisitivePeriod: "", availableDays: "", startDate: "", returnDate: "", status: "A_PROGRAMAR", substitute: "", observations: "" })
    setShowForm(true)
  }
  function openEdit(v: Vacation) {
    setEditing(v)
    setForm({
      memberId: v.memberId, acquisitivePeriod: v.acquisitivePeriod || "",
      availableDays: v.availableDays?.toString() || "",
      startDate: v.startDate ? v.startDate.split("T")[0] : "",
      returnDate: v.returnDate ? v.returnDate.split("T")[0] : "",
      status: v.status, substitute: v.substitute || "", observations: v.observations || "",
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const url = editing ? `/api/gestao-equipe/vacations/${editing.id}` : "/api/gestao-equipe/vacations"
      await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, startDate: form.startDate || null, returnDate: form.returnDate || null, availableDays: form.availableDays ? Number(form.availableDays) : null }) })
      setShowForm(false); fetch_()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover registro de férias?")) return
    await fetch(`/api/gestao-equipe/vacations/${id}`, { method: "DELETE" })
    fetch_()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Todos os colaboradores</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Todos os status</option>
          {Object.entries(VACATION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </div>

      {loading ? <div className="text-slate-400 text-sm text-center py-8">Carregando...</div> : (
        <div className="space-y-3">
          {items.map(v => (
            <Card key={v.id}>
              <CardContent>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-800">{v.member.name}</p>
                    <p className="text-xs text-slate-500">{v.member.role}{v.member.sector && ` · ${v.member.sector}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={VACATION_STATUS[v.status]?.label ?? v.status} colorClass={VACATION_STATUS[v.status]?.color ?? "bg-slate-100 text-slate-600"} />
                    <button onClick={() => openEdit(v)} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(v.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs text-slate-500">
                  {v.acquisitivePeriod && <span>Período: {v.acquisitivePeriod}</span>}
                  {v.availableDays && <span>Dias: {v.availableDays}</span>}
                  {v.startDate && <span>Início: {fmtDate(v.startDate)}</span>}
                  {v.returnDate && <span>Retorno: {fmtDate(v.returnDate)}</span>}
                  {v.substitute && <span>Substituto: {v.substitute}</span>}
                </div>
                {v.observations && <p className="text-xs text-slate-400 mt-1">{v.observations}</p>}
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Nenhum registro de férias.</div>}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Editar Férias" : "Registrar Férias"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Colaborador" required>
              <MemberSelect members={members} value={form.memberId} onChange={v => setForm(f => ({ ...f, memberId: v }))} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Período Aquisitivo"><input value={form.acquisitivePeriod} onChange={e => setForm(f => ({ ...f, acquisitivePeriod: e.target.value }))} className={inputClass} placeholder="Ex: 2024/2025" /></Field>
              <Field label="Dias Disponíveis"><input type="number" value={form.availableDays} onChange={e => setForm(f => ({ ...f, availableDays: e.target.value }))} className={inputClass} placeholder="30" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Início"><input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputClass} /></Field>
              <Field label="Retorno"><input type="date" value={form.returnDate} onChange={e => setForm(f => ({ ...f, returnDate: e.target.value }))} className={inputClass} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={selectClass}>
                  {Object.entries(VACATION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Substituto"><input value={form.substitute} onChange={e => setForm(f => ({ ...f, substitute: e.target.value }))} className={inputClass} /></Field>
            </div>
            <Field label="Observações"><textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} rows={2} className={inputClass} /></Field>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Registrar"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Tab: Treinamentos ────────────────────────────────────────────────────────

function TabTreinamentos({ members }: { members: Member[] }) {
  const [items, setItems] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Training | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [filterMember, setFilterMember] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [form, setForm] = useState({
    memberId: "", topic: "", objective: "", plannedDate: "", completedDate: "",
    status: "PLANEJADO", responsible: "", expectedResult: "", evaluation: "", observations: "", aiPlan: "",
  })

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterMember) params.set("memberId", filterMember)
    if (filterStatus) params.set("status", filterStatus)
    const res = await fetch(`/api/gestao-equipe/trainings?${params}`)
    setItems(await res.json())
    setLoading(false)
  }, [filterMember, filterStatus])

  useEffect(() => { fetch_() }, [fetch_])

  function openNew() {
    setEditing(null)
    setForm({ memberId: "", topic: "", objective: "", plannedDate: "", completedDate: "", status: "PLANEJADO", responsible: "", expectedResult: "", evaluation: "", observations: "", aiPlan: "" })
    setShowForm(true)
  }
  function openEdit(t: Training) {
    setEditing(t)
    setForm({
      memberId: t.memberId, topic: t.topic, objective: t.objective || "",
      plannedDate: t.plannedDate ? t.plannedDate.split("T")[0] : "",
      completedDate: t.completedDate ? t.completedDate.split("T")[0] : "",
      status: t.status, responsible: t.responsible || "", expectedResult: t.expectedResult || "",
      evaluation: t.evaluation || "", observations: t.observations || "", aiPlan: t.aiPlan || "",
    })
    setShowForm(true)
  }

  async function handleGenerate() {
    if (!form.memberId || !form.topic) { alert("Selecione o colaborador e informe o tema."); return }
    setGenerating(true)
    try {
      const res = await fetch("/api/gestao-equipe/trainings/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: form.memberId, topic: form.topic, objective: form.objective }),
      })
      const data = await res.json()
      setForm(f => ({ ...f, aiPlan: data.content }))
    } finally { setGenerating(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const url = editing ? `/api/gestao-equipe/trainings/${editing.id}` : "/api/gestao-equipe/trainings"
      await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, plannedDate: form.plannedDate || null, completedDate: form.completedDate || null }) })
      setShowForm(false); fetch_()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover treinamento?")) return
    await fetch(`/api/gestao-equipe/trainings/${id}`, { method: "DELETE" })
    fetch_()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Todos os colaboradores</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Todos os status</option>
          {Object.entries(TRAINING_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </div>

      {loading ? <div className="text-slate-400 text-sm text-center py-8">Carregando...</div> : (
        <div className="space-y-3">
          {items.map(t => (
            <Card key={t.id}>
              <CardContent>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-800">{t.topic}</p>
                    <p className="text-xs text-slate-500">{t.member.name} · {t.member.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={TRAINING_STATUS[t.status]?.label ?? t.status} colorClass={TRAINING_STATUS[t.status]?.color ?? "bg-slate-100 text-slate-600"} />
                    <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {t.objective && <p className="text-sm text-slate-600 line-clamp-2">{t.objective}</p>}
                {t.aiPlan && <p className="text-xs text-slate-400 mt-1 line-clamp-2 italic">🤖 {t.aiPlan.substring(0, 120)}...</p>}
                <div className="text-xs text-slate-500 mt-2 flex gap-4">
                  {t.plannedDate && <span>📅 Previsto: {fmtDate(t.plannedDate)}</span>}
                  {t.completedDate && <span>✓ Concluído: {fmtDate(t.completedDate)}</span>}
                  {t.responsible && <span>👤 {t.responsible}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Nenhum treinamento registrado.</div>}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Editar Treinamento" : "Novo Treinamento"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Colaborador" required>
              <MemberSelect members={members} value={form.memberId} onChange={v => setForm(f => ({ ...f, memberId: v }))} required />
            </Field>
            <Field label="Tema do Treinamento" required><input required value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} className={inputClass} /></Field>
            <Field label="Objetivo"><textarea value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} rows={2} className={inputClass} /></Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={selectClass}>
                  {Object.entries(TRAINING_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Previsto p/"><input type="date" value={form.plannedDate} onChange={e => setForm(f => ({ ...f, plannedDate: e.target.value }))} className={inputClass} /></Field>
              <Field label="Concluído em"><input type="date" value={form.completedDate} onChange={e => setForm(f => ({ ...f, completedDate: e.target.value }))} className={inputClass} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Responsável"><input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} className={inputClass} /></Field>
              <Field label="Resultado Esperado"><input value={form.expectedResult} onChange={e => setForm(f => ({ ...f, expectedResult: e.target.value }))} className={inputClass} /></Field>
            </div>
            <Field label="Avaliação"><textarea value={form.evaluation} onChange={e => setForm(f => ({ ...f, evaluation: e.target.value }))} rows={2} className={inputClass} /></Field>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-blue-800 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Plano de Treinamento com IA</p>
              <Button type="button" variant="outline" onClick={handleGenerate} disabled={generating}>
                <Sparkles className="w-4 h-4 mr-1" /> {generating ? "Gerando..." : "Gerar Plano com IA"}
              </Button>
              {form.aiPlan && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Plano gerado (editável):</label>
                  <textarea value={form.aiPlan} onChange={e => setForm(f => ({ ...f, aiPlan: e.target.value }))} rows={5} className={inputClass} />
                </div>
              )}
            </div>

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

// ─── Tab: Atividades ──────────────────────────────────────────────────────────

function TabAtividades({ members }: { members: Member[] }) {
  const [items, setItems] = useState<TeamActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState<TeamActivity | null>(null)
  const [editing, setEditing] = useState<TeamActivity | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterMember, setFilterMember] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [statusForm, setStatusForm] = useState({ status: "", statusObservation: "" })
  const [form, setForm] = useState({
    memberId: "", title: "", description: "", receivedAt: "", dueDate: "",
    priority: "MEDIA", status: "PENDENTE", statusObservation: "", expectedResult: "",
  })

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterMember) params.set("memberId", filterMember)
    if (filterStatus) params.set("status", filterStatus)
    const res = await fetch(`/api/gestao-equipe/activities?${params}`)
    setItems(await res.json())
    setLoading(false)
  }, [filterMember, filterStatus])

  useEffect(() => { fetch_() }, [fetch_])

  function openNew() {
    setEditing(null)
    setForm({ memberId: "", title: "", description: "", receivedAt: "", dueDate: "", priority: "MEDIA", status: "PENDENTE", statusObservation: "", expectedResult: "" })
    setShowForm(true)
  }
  function openEdit(a: TeamActivity) {
    setEditing(a)
    setForm({
      memberId: a.memberId, title: a.title, description: a.description || "",
      receivedAt: a.receivedAt ? a.receivedAt.split("T")[0] : "",
      dueDate: a.dueDate ? a.dueDate.split("T")[0] : "",
      priority: a.priority, status: a.status, statusObservation: a.statusObservation || "",
      expectedResult: a.expectedResult || "",
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const url = editing ? `/api/gestao-equipe/activities/${editing.id}` : "/api/gestao-equipe/activities"
      await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, receivedAt: form.receivedAt || null, dueDate: form.dueDate || null }) })
      setShowForm(false); fetch_()
    } finally { setSaving(false) }
  }

  async function handleStatusChange() {
    if (!showStatusModal) return
    if (!statusForm.status) { alert("Selecione o novo status."); return }
    if (!statusForm.statusObservation.trim()) { alert("A observação é obrigatória ao alterar o status."); return }
    setSaving(true)
    try {
      await fetch(`/api/gestao-equipe/activities/${showStatusModal.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusForm.status, statusObservation: statusForm.statusObservation }),
      })
      setShowStatusModal(null); fetch_()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover atividade?")) return
    await fetch(`/api/gestao-equipe/activities/${id}`, { method: "DELETE" })
    fetch_()
  }

  function isOverdue(a: TeamActivity) {
    return a.dueDate && new Date(a.dueDate) < new Date() && !["CONCLUIDA", "CANCELADA"].includes(a.status)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Todos os colaboradores</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Todos os status</option>
          {Object.entries(ACTIVITY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </div>

      {loading ? <div className="text-slate-400 text-sm text-center py-8">Carregando...</div> : (
        <div className="space-y-3">
          {items.map(a => (
            <Card key={a.id} className={cn(isOverdue(a) ? "border-red-200 bg-red-50/30" : "")}>
              <CardContent>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{a.title}</p>
                      {isOverdue(a) && <Badge label="ATRASADA" colorClass="bg-red-100 text-red-700" />}
                    </div>
                    <p className="text-xs text-slate-500">{a.member.name} · {a.member.role}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge label={PRIORITY_LABELS[a.priority] ?? a.priority} colorClass={PRIORITY_COLORS[a.priority]} />
                    <Badge label={ACTIVITY_STATUS[a.status]?.label ?? a.status} colorClass={ACTIVITY_STATUS[a.status]?.color ?? "bg-slate-100 text-slate-600"} />
                    <button onClick={() => { setShowStatusModal(a); setStatusForm({ status: "", statusObservation: "" }) }} className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <button onClick={() => openEdit(a)} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(a.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {a.description && <p className="text-sm text-slate-600 line-clamp-2">{a.description}</p>}
                {a.statusObservation && <p className="text-xs text-blue-600 mt-1 italic">💬 {a.statusObservation}</p>}
                <div className="text-xs text-slate-500 mt-2 flex gap-4">
                  {a.receivedAt && <span>Recebida: {fmtDate(a.receivedAt)}</span>}
                  {a.dueDate && <span className={cn(isOverdue(a) ? "text-red-600 font-medium" : "")}>Prazo: {fmtDate(a.dueDate)}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Nenhuma atividade registrada.</div>}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Editar Atividade" : "Nova Atividade"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Colaborador" required>
              <MemberSelect members={members} value={form.memberId} onChange={v => setForm(f => ({ ...f, memberId: v }))} required />
            </Field>
            <Field label="Título" required><input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} /></Field>
            <Field label="Descrição"><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inputClass} /></Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Prioridade">
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={selectClass}>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Recebida em"><input type="date" value={form.receivedAt} onChange={e => setForm(f => ({ ...f, receivedAt: e.target.value }))} className={inputClass} /></Field>
              <Field label="Prazo"><input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className={inputClass} /></Field>
            </div>
            <Field label="Resultado Esperado"><textarea value={form.expectedResult} onChange={e => setForm(f => ({ ...f, expectedResult: e.target.value }))} rows={2} className={inputClass} /></Field>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Para alterar o status use o botão <strong>↺</strong> na lista — exige observação obrigatória.</p>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {showStatusModal && (
        <Modal title={`Alterar Status — ${showStatusModal.title}`} onClose={() => setShowStatusModal(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Status atual:</span>
              <Badge label={ACTIVITY_STATUS[showStatusModal.status]?.label ?? showStatusModal.status} colorClass={ACTIVITY_STATUS[showStatusModal.status]?.color ?? "bg-slate-100 text-slate-600"} />
            </div>
            <Field label="Novo Status" required>
              <select value={statusForm.status} onChange={e => setStatusForm(f => ({ ...f, status: e.target.value }))} className={selectClass} required>
                <option value="">Selecione o novo status...</option>
                {Object.entries(ACTIVITY_STATUS).filter(([k]) => k !== showStatusModal.status).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Observação (obrigatória)" required>
              <textarea required value={statusForm.statusObservation} onChange={e => setStatusForm(f => ({ ...f, statusObservation: e.target.value }))} rows={3} className={inputClass} placeholder="Descreva o motivo da mudança de status, o que foi realizado ou o que está impedindo..." />
            </Field>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleStatusChange} disabled={saving}>{saving ? "Salvando..." : "Alterar Status"}</Button>
              <Button variant="outline" onClick={() => setShowStatusModal(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Tab: Diretrizes ──────────────────────────────────────────────────────────

function TabDiretrizes() {
  const [items, setItems] = useState<Guideline[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Guideline | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterStatus, setFilterStatus] = useState("ATIVA")
  const [form, setForm] = useState({
    title: "", category: "PROCESSO", description: "", reason: "", practicalUse: "",
    responsible: "", status: "ATIVA", observations: "", aiContent: "",
  })

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterCategory) params.set("category", filterCategory)
    if (filterStatus) params.set("status", filterStatus)
    if (search) params.set("search", search)
    const res = await fetch(`/api/gestao-equipe/guidelines?${params}`)
    setItems(await res.json())
    setLoading(false)
  }, [filterCategory, filterStatus, search])

  useEffect(() => {
    const t = setTimeout(fetch_, 300)
    return () => clearTimeout(t)
  }, [fetch_])

  function openNew() {
    setEditing(null)
    setForm({ title: "", category: "PROCESSO", description: "", reason: "", practicalUse: "", responsible: "", status: "ATIVA", observations: "", aiContent: "" })
    setShowForm(true)
  }
  function openEdit(g: Guideline) {
    setEditing(g)
    setForm({ title: g.title, category: g.category, description: g.description || "", reason: g.reason || "", practicalUse: g.practicalUse || "", responsible: g.responsible || "", status: g.status, observations: g.observations || "", aiContent: g.aiContent || "" })
    setShowForm(true)
  }

  async function handleGenerate() {
    if (!form.title || !form.category || !form.reason) { alert("Preencha título, categoria e motivo antes de gerar."); return }
    setGenerating(true)
    try {
      const res = await fetch("/api/gestao-equipe/guidelines/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, category: form.category, reason: form.reason }),
      })
      const data = await res.json()
      setForm(f => ({ ...f, aiContent: data.content }))
    } finally { setGenerating(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const url = editing ? `/api/gestao-equipe/guidelines/${editing.id}` : "/api/gestao-equipe/guidelines"
      await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, aiGenerated: !!form.aiContent }) })
      setShowForm(false); fetch_()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover diretriz?")) return
    await fetch(`/api/gestao-equipe/guidelines/${id}`, { method: "DELETE" })
    fetch_()
  }

  const GUIDELINE_STATUS: Record<string, { label: string; color: string }> = {
    ATIVA:      { label: "Ativa",       color: "bg-green-100 text-green-700" },
    EM_REVISAO: { label: "Em Revisão",  color: "bg-yellow-100 text-yellow-700" },
    INATIVA:    { label: "Inativa",     color: "bg-slate-100 text-slate-600" },
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar diretriz..." className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Todas as categorias</option>
          {Object.entries(GUIDELINE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
          <option value="">Todos os status</option>
          <option value="ATIVA">Ativas</option>
          <option value="EM_REVISAO">Em Revisão</option>
          <option value="INATIVA">Inativas</option>
        </select>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Nova</Button>
      </div>

      {loading ? <div className="text-slate-400 text-sm text-center py-8">Carregando...</div> : (
        <div className="space-y-3">
          {items.map(g => (
            <Card key={g.id}>
              <CardContent>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800">{g.title}</p>
                    <p className="text-xs text-slate-500">{GUIDELINE_CATEGORIES[g.category] ?? g.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={GUIDELINE_STATUS[g.status]?.label ?? g.status} colorClass={GUIDELINE_STATUS[g.status]?.color ?? "bg-slate-100 text-slate-600"} />
                    {g.aiGenerated && <Badge label="IA" colorClass="bg-blue-100 text-blue-700" />}
                    <button onClick={() => openEdit(g)} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(g.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {g.description && <p className="text-sm text-slate-600 line-clamp-2">{g.description}</p>}
                {g.aiContent && <p className="text-xs text-slate-400 mt-1 line-clamp-2 italic">{g.aiContent.substring(0, 120)}...</p>}
                {g.reason && <p className="text-xs text-slate-500 mt-1">Motivo: {g.reason}</p>}
                {g.responsible && <p className="text-xs text-slate-500">👤 {g.responsible}</p>}
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Nenhuma diretriz encontrada.</div>}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Editar Diretriz" : "Nova Diretriz"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Título" required><input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Categoria" required>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={selectClass}>
                  {Object.entries(GUIDELINE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={selectClass}>
                  <option value="ATIVA">Ativa</option>
                  <option value="EM_REVISAO">Em Revisão</option>
                  <option value="INATIVA">Inativa</option>
                </select>
              </Field>
            </div>
            <Field label="Motivo / Contexto"><textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} className={inputClass} placeholder="Por que esta diretriz existe?" /></Field>
            <Field label="Descrição"><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inputClass} /></Field>
            <Field label="Aplicação Prática"><textarea value={form.practicalUse} onChange={e => setForm(f => ({ ...f, practicalUse: e.target.value }))} rows={2} className={inputClass} placeholder="Exemplos práticos de uso..." /></Field>
            <Field label="Responsável pela Fiscalização"><input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} className={inputClass} /></Field>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-blue-800 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Gerar Diretriz com IA</p>
              <Button type="button" variant="outline" onClick={handleGenerate} disabled={generating}>
                <Sparkles className="w-4 h-4 mr-1" /> {generating ? "Gerando..." : "Gerar com IA"}
              </Button>
              {form.aiContent && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Conteúdo gerado (editável):</label>
                  <textarea value={form.aiContent} onChange={e => setForm(f => ({ ...f, aiContent: e.target.value }))} rows={5} className={inputClass} />
                </div>
              )}
            </div>

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

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = [
  { id: "visao-geral",    label: "Visão Geral",   icon: LayoutDashboard },
  { id: "equipe",         label: "Equipe",         icon: Users },
  { id: "feedbacks",      label: "Feedbacks",      icon: MessageSquare },
  { id: "direcionamento", label: "Direcionamento", icon: Navigation },
  { id: "ferias",         label: "Férias",         icon: Umbrella },
  { id: "treinamentos",   label: "Treinamentos",   icon: BookOpen },
  { id: "atividades",     label: "Atividades",     icon: Activity },
  { id: "diretrizes",     label: "Diretrizes",     icon: BookMarked },
]

export function GestaoEquipeClient() {
  const [activeTab, setActiveTab] = useState("visao-geral")
  const [members, setMembers] = useState<Member[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)

  async function loadMembers() {
    const res = await fetch("/api/gestao-equipe/members")
    setMembers(await res.json())
  }
  async function loadSummary() {
    const res = await fetch("/api/gestao-equipe/summary")
    setSummary(await res.json())
  }

  useEffect(() => {
    loadMembers()
    loadSummary()
  }, [])

  function handleTabSwitch(tab: string) {
    setActiveTab(tab)
  }

  function onMembersRefresh() {
    loadMembers()
    loadSummary()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Equipe</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {members.filter(m => m.status === "ATIVO").length} colaboradores ativos
          </p>
        </div>
        <button onClick={() => { loadMembers(); loadSummary() }} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-3 py-2 border border-slate-200 rounded-lg transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === "visao-geral"    && <TabVisaoGeral summary={summary} onTabSwitch={handleTabSwitch} />}
        {activeTab === "equipe"         && <TabEquipe members={members} onRefresh={onMembersRefresh} />}
        {activeTab === "feedbacks"      && <TabFeedbacks members={members} />}
        {activeTab === "direcionamento" && <TabDirecionamento members={members} />}
        {activeTab === "ferias"         && <TabFerias members={members} />}
        {activeTab === "treinamentos"   && <TabTreinamentos members={members} />}
        {activeTab === "atividades"     && <TabAtividades members={members} />}
        {activeTab === "diretrizes"     && <TabDiretrizes />}
      </div>
    </div>
  )
}
