"use client"

import { useState, useEffect, useCallback } from "react"
import { TabCargos } from "./TabCargos"
import { TabAtividades } from "./TabAtividades"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import {
  Users, MessageSquare, Navigation, Umbrella, BookOpen,
  Activity, BookMarked, Briefcase, LayoutDashboard, Plus, Edit2, Trash2,
  Sparkles, X, ChevronDown, AlertTriangle, CheckCircle,
  Clock, Calendar, RefreshCw, Search, Filter, Eye, Building2, Save, Loader2 as Spin, BarChart2, FileDown,
} from "lucide-react"
import { TeamMemberProfileModal } from "./perfil/TeamMemberProfileModal"
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
  id: string; memberId: string
  // legacy
  branch?: string | null
  acquisitivePeriod?: string | null
  // new fields
  companyName?: string | null
  acquisitionStartDate?: string | null
  acquisitionEndDate?: string | null
  concessionStartDate?: string | null
  concessionEndDate?: string | null
  availableDays?: number | null
  vacationDays?: number | null
  hasBonus: boolean
  bonusDays?: number | null
  startDate?: string | null
  endDate?: string | null
  returnDate?: string | null
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
    totalCargos?: number; totalProcedimentos?: number
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex max-h-[94vh] w-full flex-col rounded-xl bg-white shadow-xl sm:max-w-2xl">
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

const inputClass = "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
const selectClass = inputClass

function fmtDate(s?: string | null) {
  if (!s) return "—"
  // Fatia "YYYY-MM-DD" diretamente para evitar conversão UTC→local (off-by-one no fuso Brasil)
  const part = typeof s === "string" ? s.slice(0, 10) : new Date(s).toISOString().slice(0, 10)
  const [y, m, d] = part.split("-")
  if (y && m && d) return `${d}/${m}/${y}`
  return "—"
}

function fmtDateTime(s?: string | null) {
  if (!s) return "—"
  const part = typeof s === "string" ? s.slice(0, 10) : new Date(s).toISOString().slice(0, 10)
  const [y, m, d] = part.split("-")
  if (y && m && d) return `${d}/${m}/${y}`
  return "—"
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
    { label: "Diretrizes",         value: counts.totalGuidelines, sub: "ativas",                    tab: "diretrizes",    color: "from-emerald-500 to-emerald-600", icon: BookMarked    },
    { label: "Descrição de Cargos", value: counts.totalCargos ?? 0, sub: "cargos cadastrados",        tab: "cargos",        color: "from-rose-500 to-rose-600",     icon: Briefcase     },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="text-center py-8 text-slate-400 text-sm lg:col-span-2">
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
  const [profileId, setProfileId] = useState<string | null>(null)
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
                <button onClick={() => setProfileId(m.id)} title="Ver perfil completo" className="text-slate-400 hover:text-indigo-600"><Eye className="w-4 h-4" /></button>
                <button onClick={() => openEdit(m)} title="Editar" className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(m.id)} title="Excluir" className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-400 text-sm">Nenhum colaborador encontrado.</div>
        )}
      </div>

      <TeamMemberProfileModal
        memberId={profileId}
        onClose={() => setProfileId(null)}
        onEdit={(id) => {
          setProfileId(null)
          const m = members.find(x => x.id === id)
          if (m) openEdit(m)
        }}
      />

      {showForm && (
        <Modal title={editing ? "Editar Colaborador" : "Novo Colaborador"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nome" required><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="Nome completo" /></Field>
              <Field label="Cargo / Função" required><input required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputClass} placeholder="Ex: Analista de DP" /></Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Setor"><input value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} className={inputClass} placeholder="Depto. Pessoal, Financeiro..." /></Field>
              <Field label="Unidade"><input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={inputClass} placeholder="Filial, unidade..." /></Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="E-mail"><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} /></Field>
              <Field label="Telefone"><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} /></Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Pontos Positivos"><textarea value={form.positivePoints} onChange={e => setForm(f => ({ ...f, positivePoints: e.target.value }))} rows={2} className={inputClass} /></Field>
              <Field label="Pontos de Melhoria"><textarea value={form.improvementPoints} onChange={e => setForm(f => ({ ...f, improvementPoints: e.target.value }))} rows={2} className={inputClass} /></Field>
            </div>
            <Field label="Orientação Dada"><textarea value={form.orientationGiven} onChange={e => setForm(f => ({ ...f, orientationGiven: e.target.value }))} rows={2} className={inputClass} /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

const MONTHS = [
  { v: "01", l: "Janeiro" }, { v: "02", l: "Fevereiro" }, { v: "03", l: "Março" },
  { v: "04", l: "Abril"   }, { v: "05", l: "Maio"      }, { v: "06", l: "Junho" },
  { v: "07", l: "Julho"   }, { v: "08", l: "Agosto"    }, { v: "09", l: "Setembro" },
  { v: "10", l: "Outubro" }, { v: "11", l: "Novembro"  }, { v: "12", l: "Dezembro" },
]

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

// helpers
function fmtPeriod(start?: string | null, end?: string | null): string {
  if (!start && !end) return "—"
  return `${fmtDate(start)} a ${fmtDate(end)}`
}

const STATUS_PT: Record<string, string> = {
  A_PROGRAMAR: "A Programar", PROGRAMADA: "Programada",
  EM_FERIAS: "Em Férias", RETORNOU: "Retornou", CANCELADA: "Cancelada",
}

function buildVacationPdf(items: Vacation[], filters: Record<string, string>): string {
  const emitDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  const emitTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const filterDesc = [
    filters.company  && `Empresa: ${filters.company}`,
    filters.month    && `Mês: ${MONTHS.find(m => m.v === filters.month)?.l ?? filters.month}`,
    filters.year     && `Ano: ${filters.year}`,
    filters.status   && `Status: ${STATUS_PT[filters.status] ?? filters.status}`,
    filters.hasBonus === "SIM" && "Com abono pecuniário",
    filters.hasBonus === "NAO" && "Sem abono pecuniário",
  ].filter(Boolean).join(" | ")

  const rows = items.map(v => `
    <tr>
      <td>${v.member.name}</td>
      <td>${v.member.role}</td>
      <td>${v.companyName ?? "—"}</td>
      <td>${fmtPeriod(v.acquisitionStartDate, v.acquisitionEndDate)}</td>
      <td>${fmtPeriod(v.concessionStartDate, v.concessionEndDate)}</td>
      <td style="text-align:center">${v.availableDays ?? "—"}</td>
      <td style="text-align:center">${v.vacationDays ?? "—"}</td>
      <td style="text-align:center">${v.hasBonus ? `Sim — ${v.bonusDays ?? 10}d` : "Não"}</td>
      <td>${fmtDate(v.startDate)}</td>
      <td>${fmtDate(v.endDate)}</td>
      <td>${fmtDate(v.returnDate)}</td>
      <td>${v.substitute ?? "—"}</td>
      <td>${STATUS_PT[v.status] ?? v.status}</td>
    </tr>`).join("")

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Controle de Férias da Equipe</title>
<style>
  @page { size: A4 landscape; margin: 10mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 8pt; color: #1e293b; background: #fff; }
  .header { border-bottom: 2.5pt solid #2563eb; padding-bottom: 8pt; margin-bottom: 10pt; }
  .title { font-size: 15pt; font-weight: 700; color: #1e3a8a; }
  .subtitle { font-size: 9pt; color: #475569; margin-top: 3pt; }
  .filter-row { font-size: 8pt; color: #64748b; margin-top: 4pt; }
  table { width: 100%; border-collapse: collapse; margin-top: 6pt; }
  thead tr { background: #1e3a8a; color: #fff; }
  thead th { padding: 5pt 3pt; font-size: 7pt; text-align: left; font-weight: 600; white-space: nowrap; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody td { padding: 3pt 3pt; font-size: 7.5pt; border-bottom: 0.5pt solid #e2e8f0; }
  .footer { margin-top: 10pt; border-top: 0.5pt solid #e2e8f0; padding-top: 5pt; font-size: 7.5pt; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<div class="header">
  <div class="title">Controle de Férias da Equipe</div>
  <div class="subtitle">Total de registros: ${items.length} | Emissão: ${emitDate} às ${emitTime}</div>
  ${filterDesc ? `<div class="filter-row">Filtros aplicados: ${filterDesc}</div>` : ""}
</div>
<table>
  <thead>
    <tr>
      <th>Colaborador</th><th>Cargo</th><th>Empresa</th>
      <th>Período Aquisitivo</th><th>Período Concessivo</th>
      <th>Direito</th><th>Férias</th><th>Abono</th>
      <th>Início</th><th>Fim</th><th>Retorno</th><th>Substituto</th><th>Status</th>
    </tr>
  </thead>
  <tbody>${rows || '<tr><td colspan="13" style="text-align:center;padding:12pt;color:#94a3b8">Nenhum registro.</td></tr>'}</tbody>
</table>
<div class="footer">
  <span>Emitido em ${emitDate} às ${emitTime}</span>
  <span>Controle de Férias — Uso Interno</span>
</div>
</body></html>`
}

function exportExcel(items: Vacation[]) {
  const headers = [
    "Colaborador","Cargo","Empresa",
    "P. Aquisitivo Início","P. Aquisitivo Fim",
    "P. Concessivo Início","P. Concessivo Fim",
    "Dias de Direito","Dias de Férias","Abono","Dias de Abono",
    "Início Férias","Fim Férias","Retorno","Substituto","Status","Observações",
  ]
  const rows = items.map(v => [
    v.member.name, v.member.role, v.companyName ?? "",
    fmtDate(v.acquisitionStartDate), fmtDate(v.acquisitionEndDate),
    fmtDate(v.concessionStartDate),  fmtDate(v.concessionEndDate),
    String(v.availableDays ?? ""), String(v.vacationDays ?? ""),
    v.hasBonus ? "Sim" : "Não", v.hasBonus ? String(v.bonusDays ?? 10) : "",
    fmtDate(v.startDate), fmtDate(v.endDate), fmtDate(v.returnDate),
    v.substitute ?? "", STATUS_PT[v.status] ?? v.status, v.observations ?? "",
  ])
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel'>
<head><meta charset="UTF-8"><style>td{mso-number-format:"@"}</style></head>
<body><table><thead><tr>${headers.map(h => `<th><b>${h}</b></th>`).join("")}</tr></thead>
<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table></body></html>`
  const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href = url; a.download = `ferias_${new Date().toISOString().slice(0,10)}.xls`
  a.click(); URL.revokeObjectURL(url)
}

function exportWord(items: Vacation[]) {
  const headers = [
    "Colaborador","Cargo","Empresa","Período Aquisitivo","Período Concessivo",
    "Direito","Férias","Abono","Início","Fim","Retorno","Substituto","Status",
  ]
  const rows = items.map(v => [
    v.member.name, v.member.role, v.companyName ?? "—",
    fmtPeriod(v.acquisitionStartDate, v.acquisitionEndDate),
    fmtPeriod(v.concessionStartDate,  v.concessionEndDate),
    String(v.availableDays ?? "—"), String(v.vacationDays ?? "—"),
    v.hasBonus ? `Sim — ${v.bonusDays ?? 10}d` : "Não",
    fmtDate(v.startDate), fmtDate(v.endDate), fmtDate(v.returnDate),
    v.substitute ?? "—", STATUS_PT[v.status] ?? v.status,
  ])
  const emitDate = new Date().toLocaleDateString("pt-BR")
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;font-size:10pt}
  h1{font-size:16pt;color:#1e3a8a;margin-bottom:4pt}
  p.sub{font-size:9pt;color:#475569;margin-bottom:10pt}
  table{border-collapse:collapse;width:100%}
  th{background:#1e3a8a;color:#fff;padding:5pt 4pt;font-size:8pt;text-align:left;border:0.5pt solid #1e3a8a}
  td{padding:4pt;font-size:8.5pt;border:0.5pt solid #cbd5e1}
  tr:nth-child(even) td{background:#f8fafc}
</style></head>
<body>
<h1>Controle de Férias da Equipe</h1>
<p class="sub">Total: ${items.length} registros | Emissão: ${emitDate}</p>
<table>
  <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table>
</body></html>`
  const blob = new Blob(["﻿" + html], { type: "application/msword;charset=utf-8" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href = url; a.download = `ferias_${new Date().toISOString().slice(0,10)}.doc`
  a.click(); URL.revokeObjectURL(url)
}

function TabFerias({ members }: { members: Member[] }) {
  const [items,       setItems]       = useState<Vacation[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editing,     setEditing]     = useState<Vacation | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [formError,   setFormError]   = useState("")
  const [formSuccess, setFormSuccess] = useState("")

  // Filters
  const [filterMember,  setFilterMember]  = useState("")
  const [filterCompany, setFilterCompany] = useState("")
  const [filterStatus,  setFilterStatus]  = useState("")
  const [filterMonth,   setFilterMonth]   = useState("")
  const [filterYear,    setFilterYear]    = useState("")
  const [filterBonus,   setFilterBonus]   = useState("")

  const emptyForm = {
    memberId: "",
    companyName: "",
    acquisitionStartDate: "", acquisitionEndDate: "",
    concessionStartDate:  "", concessionEndDate:  "",
    availableDays: "30", vacationDays: "30",
    hasBonus: false, bonusDays: "10",
    startDate: "", endDate: "", returnDate: "",
    status: "A_PROGRAMAR", substitute: "", observations: "",
  }
  const [form, setForm] = useState(emptyForm)

  // Auto-calculate endDate and returnDate from startDate + vacationDays
  useEffect(() => {
    if (form.startDate && form.vacationDays && Number(form.vacationDays) > 0) {
      const end = addDays(form.startDate, Number(form.vacationDays) - 1)
      const ret = addDays(form.startDate, Number(form.vacationDays))
      setForm(f => ({ ...f, endDate: end, returnDate: f.returnDate || ret }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.startDate, form.vacationDays])

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filterMember)  p.set("memberId",  filterMember)
    if (filterStatus)  p.set("status",    filterStatus)
    if (filterCompany) p.set("company",   filterCompany)
    if (filterMonth)   p.set("month",     filterMonth)
    if (filterYear)    p.set("year",      filterYear)
    if (filterBonus)   p.set("hasBonus",  filterBonus)
    const res = await fetch(`/api/gestao-equipe/vacations?${p}`)
    setItems(await res.json())
    setLoading(false)
  }, [filterMember, filterStatus, filterCompany, filterMonth, filterYear, filterBonus])

  useEffect(() => { fetch_() }, [fetch_])

  function openNew() {
    setEditing(null); setFormError(""); setFormSuccess(""); setForm(emptyForm); setShowForm(true)
  }
  function openEdit(v: Vacation) {
    setEditing(v); setFormError(""); setFormSuccess("")
    setForm({
      memberId:             v.memberId,
      companyName:          v.companyName          ?? "",
      acquisitionStartDate: v.acquisitionStartDate ? v.acquisitionStartDate.split("T")[0] : "",
      acquisitionEndDate:   v.acquisitionEndDate   ? v.acquisitionEndDate.split("T")[0]   : "",
      concessionStartDate:  v.concessionStartDate  ? v.concessionStartDate.split("T")[0]  : "",
      concessionEndDate:    v.concessionEndDate     ? v.concessionEndDate.split("T")[0]    : "",
      availableDays:        v.availableDays?.toString() ?? "30",
      vacationDays:         v.vacationDays?.toString()  ?? "30",
      hasBonus:             v.hasBonus,
      bonusDays:            v.bonusDays?.toString()     ?? "10",
      startDate:            v.startDate  ? v.startDate.split("T")[0]  : "",
      endDate:              v.endDate    ? v.endDate.split("T")[0]    : "",
      returnDate:           v.returnDate ? v.returnDate.split("T")[0] : "",
      status:               v.status,
      substitute:           v.substitute   ?? "",
      observations:         v.observations ?? "",
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError(""); setFormSuccess("")

    // Client-side validation
    if (!form.memberId)                  { setFormError("Selecione o colaborador."); return }
    if (!form.companyName.trim())        { setFormError("Empresa é obrigatória."); return }
    if (!form.acquisitionStartDate)      { setFormError("Início do período aquisitivo é obrigatório."); return }
    if (!form.acquisitionEndDate)        { setFormError("Fim do período aquisitivo é obrigatório."); return }
    if (!form.concessionStartDate)       { setFormError("Início do período concessivo é obrigatório."); return }
    if (!form.concessionEndDate)         { setFormError("Fim do período concessivo é obrigatório."); return }
    if (!form.availableDays)             { setFormError("Dias de direito é obrigatório."); return }
    if (!form.vacationDays)              { setFormError("Dias de férias gozadas é obrigatório."); return }
    if (!form.startDate)                 { setFormError("Início das férias é obrigatório."); return }
    if (!form.endDate)                   { setFormError("Fim das férias é obrigatório."); return }
    if (!form.returnDate)                { setFormError("Retorno ao trabalho é obrigatório."); return }

    const dir = Number(form.availableDays) || 0
    const vac = Number(form.vacationDays)  || 0
    const bon = form.hasBonus ? (Number(form.bonusDays) || 10) : 0
    if (vac + bon > dir) {
      setFormError(`Dias de férias (${vac}) + abono (${bon}) não podem exceder os dias de direito (${dir}).`); return
    }

    setSaving(true)
    try {
      const url    = editing ? `/api/gestao-equipe/vacations/${editing.id}` : "/api/gestao-equipe/vacations"
      const method = editing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId:             form.memberId,
          companyName:          form.companyName.trim(),
          acquisitionStartDate: form.acquisitionStartDate || null,
          acquisitionEndDate:   form.acquisitionEndDate   || null,
          concessionStartDate:  form.concessionStartDate  || null,
          concessionEndDate:    form.concessionEndDate    || null,
          availableDays:        Number(form.availableDays),
          vacationDays:         Number(form.vacationDays),
          hasBonus:             form.hasBonus,
          bonusDays:            form.hasBonus ? (Number(form.bonusDays) || 10) : null,
          startDate:            form.startDate  || null,
          endDate:              form.endDate    || null,
          returnDate:           form.returnDate || null,
          status:               form.status,
          substitute:           form.substitute   || null,
          observations:         form.observations || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || "Não foi possível registrar as férias. Verifique os campos obrigatórios.")
        return
      }
      setFormSuccess(editing ? "Férias atualizada com sucesso." : "Férias registrada com sucesso.")
      setTimeout(() => { setShowForm(false); fetch_() }, 1200)
    } catch {
      setFormError("Não foi possível registrar as férias. Verifique os campos obrigatórios.")
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover registro de férias?")) return
    await fetch(`/api/gestao-equipe/vacations/${id}`, { method: "DELETE" })
    fetch_()
  }

  function printPdf() {
    const html = buildVacationPdf(items, { company: filterCompany, month: filterMonth, year: filterYear, status: filterStatus, hasBonus: filterBonus })
    const win  = window.open("", "_blank", "width=1100,height=700,scrollbars=yes")
    if (!win) { alert("Popup bloqueado. Permita pop-ups para exportar o PDF."); return }
    win.document.write(html); win.document.close()
    setTimeout(() => { try { win.print() } catch { /* ignore */ } }, 500)
  }

  const activeFilters = [filterMember, filterCompany, filterStatus, filterMonth, filterYear, filterBonus].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Controle de Férias</span>
          <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{items.length} registro{items.length !== 1 ? "s" : ""}</span>
          {activeFilters > 0 && (
            <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
              {activeFilters} filtro{activeFilters > 1 ? "s" : ""} ativo{activeFilters > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={printPdf} className="flex items-center gap-1.5 text-xs border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg px-3 py-1.5 transition-colors">
            🖨️ Imprimir / PDF
          </button>
          <button onClick={() => exportExcel(items)} className="flex items-center gap-1.5 text-xs border border-green-200 hover:border-green-400 text-green-700 bg-green-50 rounded-lg px-3 py-1.5 transition-colors">
            📊 Excel
          </button>
          <button onClick={() => exportWord(items)} className="flex items-center gap-1.5 text-xs border border-blue-200 hover:border-blue-400 text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 transition-colors">
            📄 Word
          </button>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white">
            <option value="">Todos os colaboradores</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input value={filterCompany} onChange={e => setFilterCompany(e.target.value)} placeholder="Empresa..."
            className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white">
            <option value="">Todos os status</option>
            {Object.entries(VACATION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white">
            <option value="">Mês de início</option>
            {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          <input value={filterYear} onChange={e => setFilterYear(e.target.value)} placeholder="Ano (ex: 2026)"
            className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white" type="number" />
          <select value={filterBonus} onChange={e => setFilterBonus(e.target.value)} className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white">
            <option value="">Abono: todos</option>
            <option value="SIM">Com abono</option>
            <option value="NAO">Sem abono</option>
          </select>
          {activeFilters > 0 && (
            <button onClick={() => { setFilterMember(""); setFilterCompany(""); setFilterStatus(""); setFilterMonth(""); setFilterYear(""); setFilterBonus("") }}
              className="px-2.5 py-2 text-xs border border-red-200 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
              ✕ Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="text-slate-400 text-sm text-center py-8">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          <Umbrella className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p>Nenhum registro de férias{activeFilters > 0 ? " para os filtros aplicados" : ""}.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-700 text-white">
                {["Colaborador","Cargo","Empresa","P. Aquisitivo","P. Concessivo","Direito","Férias","Abono","Início","Fim","Retorno","Substituto","Status",""].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((v, idx) => {
                const st = VACATION_STATUS[v.status]
                return (
                  <tr key={v.id} className={cn("border-b border-slate-100 hover:bg-slate-50 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                    <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{v.member.name}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{v.member.role}</td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{v.companyName ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-[10px]">{fmtPeriod(v.acquisitionStartDate, v.acquisitionEndDate)}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-[10px]">{fmtPeriod(v.concessionStartDate, v.concessionEndDate)}</td>
                    <td className="px-3 py-2.5 text-center text-slate-600">{v.availableDays ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center text-slate-600">{v.vacationDays ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {v.hasBonus
                        ? <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 text-[10px] font-medium">Sim — {v.bonusDays ?? 10}d</span>
                        : <span className="text-slate-300">Não</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{fmtDate(v.startDate)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{fmtDate(v.endDate)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{fmtDate(v.returnDate)}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{v.substitute ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", st?.color ?? "bg-slate-100 text-slate-600")}>
                        {st?.label ?? v.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(v)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(v.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <Modal title={editing ? "Editar Férias" : "Registrar Férias"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: colaborador + empresa */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Colaborador" required>
                <MemberSelect members={members} value={form.memberId} onChange={v => setForm(f => ({ ...f, memberId: v }))} required />
              </Field>
              <Field label="Empresa" required>
                <input
                  value={form.companyName}
                  onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                  className={inputClass} placeholder="Nome da empresa..."
                  required
                />
              </Field>
            </div>

            {/* Row 2: período aquisitivo */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Período Aquisitivo — Início" required>
                <input type="date" value={form.acquisitionStartDate}
                  onChange={e => setForm(f => ({ ...f, acquisitionStartDate: e.target.value }))}
                  className={inputClass} required />
              </Field>
              <Field label="Período Aquisitivo — Fim" required>
                <input type="date" value={form.acquisitionEndDate}
                  onChange={e => setForm(f => ({ ...f, acquisitionEndDate: e.target.value }))}
                  className={inputClass} required />
              </Field>
            </div>

            {/* Row 3: período concessivo */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Período Concessivo — Início" required>
                <input type="date" value={form.concessionStartDate}
                  onChange={e => setForm(f => ({ ...f, concessionStartDate: e.target.value }))}
                  className={inputClass} required />
              </Field>
              <Field label="Período Concessivo — Fim" required>
                <input type="date" value={form.concessionEndDate}
                  onChange={e => setForm(f => ({ ...f, concessionEndDate: e.target.value }))}
                  className={inputClass} required />
              </Field>
            </div>

            {/* Row 4: dias de direito + dias de férias */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Dias de Direito" required>
                <input type="number" min="1" max="30" value={form.availableDays}
                  onChange={e => setForm(f => ({ ...f, availableDays: e.target.value }))}
                  className={inputClass} placeholder="30" required />
              </Field>
              <Field label="Dias de Férias Gozadas" required>
                <input type="number" min="1" max="30" value={form.vacationDays}
                  onChange={e => setForm(f => ({ ...f, vacationDays: e.target.value }))}
                  className={inputClass} placeholder="Ex: 20" required />
              </Field>
            </div>

            {/* Row 5: abono */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Abono Pecuniário (vendeu 10 dias?)">
                <select value={form.hasBonus ? "SIM" : "NAO"}
                  onChange={e => setForm(f => ({ ...f, hasBonus: e.target.value === "SIM", bonusDays: e.target.value === "SIM" ? "10" : "" }))}
                  className={selectClass}>
                  <option value="NAO">Não</option>
                  <option value="SIM">Sim</option>
                </select>
              </Field>
              {form.hasBonus && (
                <Field label="Dias de Abono">
                  <input type="number" min="1" max="10" value={form.bonusDays}
                    onChange={e => setForm(f => ({ ...f, bonusDays: e.target.value }))}
                    className={inputClass} placeholder="10" />
                </Field>
              )}
            </div>

            {/* Validation info */}
            {form.availableDays && form.vacationDays && (
              <div className={cn("text-xs rounded-lg px-3 py-2",
                (Number(form.vacationDays) + (form.hasBonus ? Number(form.bonusDays || 10) : 0)) > Number(form.availableDays)
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-green-50 text-green-700 border border-green-200"
              )}>
                {(() => {
                  const dir = Number(form.availableDays)
                  const vac = Number(form.vacationDays)
                  const bon = form.hasBonus ? Number(form.bonusDays || 10) : 0
                  const total = vac + bon
                  return total > dir
                    ? `⚠️ Férias (${vac}) + abono (${bon}) = ${total} dias excede os ${dir} dias de direito.`
                    : `✓ Férias: ${vac}d${bon > 0 ? ` + Abono: ${bon}d` : ""} = ${total}/${dir} dias de direito.`
                })()}
              </div>
            )}

            {/* Row 6: datas de início/fim/retorno */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Início das Férias" required>
                <input type="date" value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className={inputClass} required />
              </Field>
              <Field label="Fim das Férias" required>
                <input type="date" value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className={inputClass} required />
                <p className="text-[10px] text-slate-400 mt-1">Calculado automaticamente. Edite se necessário.</p>
              </Field>
              <Field label="Retorno ao Trabalho" required>
                <input type="date" value={form.returnDate}
                  onChange={e => setForm(f => ({ ...f, returnDate: e.target.value }))}
                  className={inputClass} required />
              </Field>
            </div>

            {/* Status + substituto */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={selectClass}>
                  {Object.entries(VACATION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Substituto">
                <input value={form.substitute} onChange={e => setForm(f => ({ ...f, substitute: e.target.value }))}
                  className={inputClass} placeholder="Nome do substituto..." />
              </Field>
            </div>

            <Field label="Observações">
              <textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
                rows={2} className={inputClass} />
            </Field>

            {formSuccess && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-sm text-green-700">
                ✓ {formSuccess}
              </div>
            )}

            {formError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                {formError}
              </div>
            )}

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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={selectClass}>
                  {Object.entries(TRAINING_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Previsto p/"><input type="date" value={form.plannedDate} onChange={e => setForm(f => ({ ...f, plannedDate: e.target.value }))} className={inputClass} /></Field>
              <Field label="Concluído em"><input type="date" value={form.completedDate} onChange={e => setForm(f => ({ ...f, completedDate: e.target.value }))} className={inputClass} /></Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

// ─── Tab: Empresas ────────────────────────────────────────────────────────────

interface Company { id: string; name: string; cnpj?: string | null; segment?: string | null; observations?: string | null; active: boolean }

function onlyCnpjDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 14)
}

function formatCnpj(value: string) {
  const digits = onlyCnpjDigits(value)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function isValidOptionalCnpj(value: string) {
  const digits = onlyCnpjDigits(value)
  return digits.length === 0 || digits.length === 14
}

function TabEmpresas() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ name: '', cnpj: '', segment: '', observations: '' })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/gestao-equipe/companies')
    if (res.ok) setCompanies(await res.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openNew() { setEditing(null); setFormError(''); setForm({ name: '', cnpj: '', segment: '', observations: '' }); setShowForm(true) }
  function openEdit(c: Company) { setEditing(c); setFormError(''); setForm({ name: c.name, cnpj: formatCnpj(c.cnpj ?? ''), segment: c.segment ?? '', observations: c.observations ?? '' }); setShowForm(true) }

  async function save() {
    if (!form.name.trim()) return
    if (!isValidOptionalCnpj(form.cnpj)) {
      setFormError('Informe um CNPJ válido com 14 dígitos.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload = { ...form, cnpj: onlyCnpjDigits(form.cnpj) || null }
      let res: Response
      if (editing) {
        res = await fetch(`/api/gestao-equipe/companies/${editing.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/gestao-equipe/companies', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Erro ao salvar empresa')
      }
      setShowForm(false); await load()
    } catch (e: any) {
      setFormError(e.message ?? 'Erro ao salvar empresa')
    } finally { setSaving(false) }
  }

  async function toggleActive(c: Company) {
    await fetch(`/api/gestao-equipe/companies/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active }),
    })
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{companies.length} empresa(s) cadastrada(s)</p>
        <button onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nova empresa
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">{editing ? 'Editar empresa' : 'Nova empresa'}</p>
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-500 block mb-1">Nome *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className={inputClass} placeholder="Nome da empresa" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">CNPJ</label>
              <input
                value={form.cnpj}
                onChange={e => { setFormError(''); setForm(p => ({ ...p, cnpj: formatCnpj(e.target.value) })) }}
                className={inputClass}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                maxLength={18}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Segmento</label>
              <input value={form.segment} onChange={e => setForm(p => ({ ...p, segment: e.target.value }))}
                className={inputClass} placeholder="Comércio, Indústria, Serviços..." />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-500 block mb-1">Observações</label>
              <input value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))}
                className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg border border-slate-200">Cancelar</button>
            <button onClick={save} disabled={saving || !form.name.trim() || !isValidOptionalCnpj(form.cnpj)}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? <Spin className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {editing ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spin className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : companies.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Nenhuma empresa cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map(c => (
            <div key={c.id} className={cn("rounded-xl border bg-white p-4", c.active ? "border-slate-200" : "border-slate-100 opacity-60")}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-blue-600 p-1 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {c.cnpj && <p className="text-xs text-slate-400 mb-1">CNPJ: {formatCnpj(c.cnpj)}</p>}
              {c.segment && <span className="inline-block text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{c.segment}</span>}
              <button onClick={() => toggleActive(c)}
                className={cn("mt-3 text-xs px-2 py-1 rounded-full border transition-colors",
                  c.active ? "text-green-600 bg-green-50 border-green-200 hover:bg-green-100" : "text-slate-400 bg-slate-50 border-slate-200 hover:bg-slate-100")}>
                {c.active ? 'Ativa' : 'Inativa'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Dimensionamento ─────────────────────────────────────────────────────

const DIM_BAND: Record<string, { bar: string; bg: string; border: string; text: string; label: string }> = {
  green:    { bar: 'bg-green-500',  bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  label: 'Disponível'        },
  blue:     { bar: 'bg-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   label: 'Equilibrado'       },
  yellow:   { bar: 'bg-amber-400',  bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  label: 'Atenção'           },
  orange:   { bar: 'bg-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'Sobrecarga'        },
  critical: { bar: 'bg-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    label: 'Sobrecarga Crítica'},
}

interface DimMember {
  id: string; name: string; role: string; sector: string | null
  companyCount: number; totalHeadcount: number; totalProcesses: number
  totalScore: number; capacityPct: number; band: string; bandLabel: string
  linkBreakdown: { companyId: string; companyName: string; score: number }[]
}
interface DimResult {
  config: {
    weightEmployee: number; weightCompany: number; weightProcess: number
    weightVolume: number; weightComplexity: number; weightManual: number; weightCritical: number
    capacityRef: number; bandGreen: number; bandBlue: number; bandYellow: number; bandOrange: number
  }
  summary: {
    totalMembers: number; totalHeadcount: number; avgCapacity: number
    bandCounts: Record<string, number>
  }
  members: DimMember[]
}

function TabDimensionamento() {
  const [data, setData] = useState<DimResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showConfig, setShowConfig] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [configForm, setConfigForm] = useState<Record<string, string>>({})
  const [aiContent, setAiContent] = useState<string | null>(null)
  const [aiPowered, setAiPowered] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [showAI, setShowAI] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/gestao-equipe/dimensionamento')
    if (res.ok) {
      const d: DimResult = await res.json()
      setData(d)
      setConfigForm({
        weightEmployee: d.config.weightEmployee.toString(),
        weightCompany: d.config.weightCompany.toString(),
        weightProcess: d.config.weightProcess.toString(),
        weightVolume: d.config.weightVolume.toString(),
        weightComplexity: d.config.weightComplexity.toString(),
        weightManual: d.config.weightManual.toString(),
        weightCritical: d.config.weightCritical.toString(),
        capacityRef: d.config.capacityRef.toString(),
        bandGreen: d.config.bandGreen.toString(),
        bandBlue: d.config.bandBlue.toString(),
        bandYellow: d.config.bandYellow.toString(),
        bandOrange: d.config.bandOrange.toString(),
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function analyzeAI() {
    if (!data) return
    setAiLoading(true)
    setShowAI(true)
    const res = await fetch('/api/gestao-equipe/dimensionamento/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: data.summary, members: data.members, config: data.config }),
    })
    if (res.ok) {
      const r = await res.json()
      setAiContent(r.content)
      setAiPowered(r.aiPowered)
    } else {
      setAiContent('Erro ao gerar análise.')
    }
    setAiLoading(false)
  }

  function downloadReport(format: 'xlsx' | 'pdf') {
    const a = document.createElement('a')
    a.href = `/api/gestao-equipe/dimensionamento/report?format=${format}`
    a.download = `dimensionamento.${format}`
    a.click()
  }

  async function saveConfig() {
    setSavingConfig(true)
    const payload = Object.fromEntries(
      Object.entries(configForm).map(([k, v]) => [k, parseFloat(v) || 0])
    )
    await fetch('/api/gestao-equipe/capacity-config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setShowConfig(false)
    await load()
    setSavingConfig(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Spin className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )
  if (!data) return <p className="text-sm text-slate-400 text-center py-12">Erro ao carregar dados.</p>

  const { summary, members, config } = data
  const bandOrder = ['green', 'blue', 'yellow', 'orange', 'critical'] as const

  return (
    <div className="space-y-6">
      {/* Resumo da equipe */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{summary.totalMembers}</p>
          <p className="text-xs text-slate-400 mt-0.5">Colaboradores</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-slate-700">{summary.totalHeadcount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Total Empregados</p>
        </div>
        <div className={cn("rounded-xl border p-4 text-center",
          summary.avgCapacity <= config.bandGreen  ? "bg-green-50 border-green-200" :
          summary.avgCapacity <= config.bandBlue   ? "bg-blue-50 border-blue-200" :
          summary.avgCapacity <= config.bandYellow ? "bg-amber-50 border-amber-200" :
          summary.avgCapacity <= config.bandOrange ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200"
        )}>
          <p className="text-2xl font-bold text-slate-700">{summary.avgCapacity}%</p>
          <p className="text-xs text-slate-400 mt-0.5">Capacidade Média</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400 mb-2">Distribuição</p>
          <div className="space-y-1">
            {bandOrder.map(b => {
              const count = summary.bandCounts[b] ?? 0
              if (count === 0) return null
              const c = DIM_BAND[b]
              return (
                <div key={b} className="flex items-center gap-1.5 text-xs">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", c.bar)} />
                  <span className="text-slate-500 truncate">{c.label}</span>
                  <span className={cn("ml-auto font-semibold", c.text)}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Header + Config */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-semibold text-slate-700">Colaboradores — Análise de Capacidade</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Recalcular
          </button>
          <button onClick={() => setShowConfig(v => !v)}
            className="inline-flex items-center gap-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-3.5 h-3.5" /> {showConfig ? 'Fechar config' : 'Configurar pesos'}
          </button>
          <button onClick={analyzeAI} disabled={aiLoading}
            className="inline-flex items-center gap-1 text-xs bg-purple-600 text-white rounded-lg px-2.5 py-1.5 hover:bg-purple-700 disabled:opacity-60 transition-colors">
            {aiLoading ? <Spin className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Analisar com IA
          </button>
          <div className="relative group">
            <button className="inline-flex items-center gap-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors">
              <FileDown className="w-3.5 h-3.5" /> Exportar <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 hidden group-hover:block min-w-[130px]">
              <button onClick={() => downloadReport('xlsx')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2 rounded-t-lg">
                <span className="text-green-600">⊞</span> Excel (.xlsx)
              </button>
              <button onClick={() => downloadReport('pdf')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2 rounded-b-lg border-t border-slate-100">
                <span className="text-red-500">⊟</span> PDF (.pdf)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-4">
          <p className="text-sm font-semibold text-slate-700">Configuração dos Pesos e Faixas</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { key: 'weightEmployee',   label: 'Peso: Empregado'  },
              { key: 'weightCompany',    label: 'Peso: Empresa'    },
              { key: 'weightProcess',    label: 'Peso: Processo'   },
              { key: 'weightVolume',     label: 'Peso: Volume'     },
              { key: 'weightComplexity', label: 'Peso: Complexidade'},
              { key: 'weightManual',     label: 'Bônus: Manual'    },
              { key: 'weightCritical',   label: 'Bônus: Crítico'   },
              { key: 'capacityRef',      label: 'Referência (pts)' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
                <input type="number" step="0.1" min="0"
                  value={configForm[f.key] ?? ''}
                  onChange={e => setConfigForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className={inputClass} />
              </div>
            ))}
          </div>
          <p className="text-xs font-medium text-slate-500 pt-1">Faixas (%) — limite superior de cada faixa</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { key: 'bandGreen',  label: '🟢 Disponível até'    },
              { key: 'bandBlue',   label: '🔵 Equilibrado até'   },
              { key: 'bandYellow', label: '🟡 Atenção até'       },
              { key: 'bandOrange', label: '🟠 Sobrecarga até'    },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
                <input type="number" step="1" min="0"
                  value={configForm[f.key] ?? ''}
                  onChange={e => setConfigForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className={inputClass} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowConfig(false)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg border border-slate-200">Cancelar</button>
            <button onClick={saveConfig} disabled={savingConfig}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {savingConfig ? <Spin className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar e Recalcular
            </button>
          </div>
        </div>
      )}

      {/* AI Analysis Panel */}
      {showAI && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-purple-200 bg-purple-50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-800">Análise de Dimensionamento</span>
              {!aiLoading && (
                <span className={cn("text-xs px-2 py-0.5 rounded-full", aiPowered ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500")}>
                  {aiPowered ? '✨ IA' : 'Modelo padrão'}
                </span>
              )}
            </div>
            <button onClick={() => setShowAI(false)} className="text-purple-400 hover:text-purple-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-4 py-4 text-sm text-slate-700 leading-relaxed max-h-[480px] overflow-y-auto">
            {aiLoading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Spin className="w-4 h-4 animate-spin" /> Gerando análise...
              </div>
            ) : aiContent ? (
              <div className="whitespace-pre-wrap font-mono text-xs leading-5"
                dangerouslySetInnerHTML={{ __html: aiContent.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
            ) : null}
          </div>
        </div>
      )}

      {/* Members list */}
      {members.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Nenhum colaborador ativo com carteira de empresas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map(m => {
            const c = DIM_BAND[m.band] ?? DIM_BAND.green
            const isExp = expanded[m.id]
            const barW = Math.min((m.capacityPct / (config.bandOrange * 1.1)) * 100, 100)
            return (
              <div key={m.id} className={cn("rounded-xl border bg-white overflow-hidden", c.border)}>
                <button className="w-full text-left px-4 py-3 flex items-center gap-4"
                  onClick={() => setExpanded(p => ({ ...p, [m.id]: !p[m.id] }))}>
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {m.name.charAt(0)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p>
                      <span className={cn("text-sm font-bold shrink-0", c.text)}>{m.capacityPct}%</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1.5">{m.role}{m.sector ? ` · ${m.sector}` : ''}</p>
                    {/* Bar */}
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className={cn("h-1.5 rounded-full transition-all", c.bar)} style={{ width: `${barW}%` }} />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span className={cn("font-medium", c.text)}>{m.bandLabel}</span>
                      <span>{m.companyCount} empresa(s)</span>
                      <span>{m.totalHeadcount} empregado(s)</span>
                      {m.totalProcesses > 0 && <span>{m.totalProcesses} processo(s)</span>}
                    </div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-slate-300 shrink-0 transition-transform", isExp && "rotate-180")} />
                </button>

                {isExp && m.linkBreakdown.length > 0 && (
                  <div className={cn("px-4 pb-3 pt-1 border-t", c.border, c.bg)}>
                    <p className="text-xs font-medium text-slate-400 mb-2">Contribuição por empresa (score)</p>
                    <div className="space-y-1.5">
                      {m.linkBreakdown.map(l => {
                        const pct = m.totalScore > 0 ? (l.score / m.totalScore) * 100 : 0
                        return (
                          <div key={l.companyId} className="flex items-center gap-2 text-xs">
                            <span className="truncate flex-1 text-slate-600">{l.companyName}</span>
                            <div className="w-24 h-1.5 rounded-full bg-slate-200 overflow-hidden shrink-0">
                              <div className={cn("h-1.5 rounded-full", c.bar)} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-slate-500 w-12 text-right shrink-0">{l.score} pts</span>
                          </div>
                        )
                      })}
                      <div className="flex items-center gap-2 text-xs pt-1 border-t border-slate-200 mt-1">
                        <span className="font-medium text-slate-500 flex-1">Total</span>
                        <span className={cn("font-bold", c.text)}>{m.totalScore} pts</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 text-center pt-2">
        Análise indicativa. A decisão final deve considerar calendário, complexidade qualitativa e organização interna.
      </p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = [
  { id: "visao-geral",       label: "Visão Geral",         icon: LayoutDashboard },
  { id: "equipe",            label: "Equipe",              icon: Users           },
  { id: "feedbacks",         label: "Feedbacks",           icon: MessageSquare   },
  { id: "direcionamento",    label: "Direcionamento",      icon: Navigation      },
  { id: "ferias",            label: "Férias",              icon: Umbrella        },
  { id: "treinamentos",      label: "Treinamentos",        icon: BookOpen        },
  { id: "atividades",        label: "Atividades",          icon: Activity        },
  { id: "diretrizes",        label: "Diretrizes",          icon: BookMarked      },
  { id: "cargos",            label: "Descrição de Cargos", icon: Briefcase       },
  { id: "empresas",          label: "Empresas",            icon: Building2       },
  { id: "dimensionamento",   label: "Dimensionamento",     icon: BarChart2       },
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                "flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
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
        {activeTab === "cargos"         && <TabCargos />}
        {activeTab === "empresas"        && <TabEmpresas />}
        {activeTab === "dimensionamento" && <TabDimensionamento />}
      </div>
    </div>
  )
}
