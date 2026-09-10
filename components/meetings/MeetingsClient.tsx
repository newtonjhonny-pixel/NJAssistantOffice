"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CalendarClock, Plus, Loader2, Search, X, Users, Clock, MapPin,
  AlertCircle, Filter, Archive,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  MeetingListItem, TeamMemberLite, fmtDate,
  MEETING_TYPE_LABELS, MEETING_STATUS_LABELS, MEETING_STATUS_COLORS,
} from "./types"

const FILTERS = [
  { id: "todas",      label: "Todas" },
  { id: "proximas",   label: "Próximas" },
  { id: "hoje",       label: "Hoje" },
  { id: "realizadas", label: "Realizadas" },
  { id: "com-acoes",  label: "Com ações pendentes" },
  { id: "concluidas", label: "Concluídas" },
  { id: "arquivadas", label: "Arquivadas" },
] as const

// ─── Modal: Nova Reunião ─────────────────────────────────────────────────────

function NovaReuniaoModal({
  members, onClose, onCreated,
}: {
  members: TeamMemberLite[]
  onClose: () => void
  onCreated: (m: MeetingListItem) => void
}) {
  const hoje = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    title: "", type: "EQUIPE", objective: "", date: hoje,
    startTime: "", endTime: "", location: "", meetingUrl: "",
    organizerId: "", category: "", status: "AGENDADA",
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.title.trim()) { setErr("Informe o título da reunião."); return }
    setSaving(true); setErr(null)
    try {
      const r = await fetch("/api/meetings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startTime: form.startTime || null,
          endTime:   form.endTime   || null,
          organizerId: form.organizerId || null,
        }),
      })
      const data = await r.json()
      if (!r.ok) { setErr(data.error ?? "Erro ao criar reunião."); return }
      onCreated(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado.")
    } finally { setSaving(false) }
  }

  const field = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-800">Nova Reunião</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          {err && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{err}</div>}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Título <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => set("title", e.target.value)} autoFocus
              placeholder="Reunião Semanal — Administração de Pessoal" className={field} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
              <select value={form.type} onChange={e => set("type", e.target.value)} className={cn(field, "bg-white")}>
                {Object.entries(MEETING_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} className={cn(field, "bg-white")}>
                {["RASCUNHO","AGENDADA","EM_ANDAMENTO"].map(v => <option key={v} value={v}>{MEETING_STATUS_LABELS[v]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Objetivo</label>
            <textarea value={form.objective} onChange={e => set("objective", e.target.value)} rows={2}
              placeholder="O que se pretende alcançar nesta reunião…" className={cn(field, "resize-none")} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data <span className="text-red-500">*</span></label>
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)} className={field} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Início</label>
              <input type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)} className={field} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Término</label>
              <input type="time" value={form.endTime} onChange={e => set("endTime", e.target.value)} className={field} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Local</label>
              <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Sala de reuniões" className={field} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Organizador</label>
              <select value={form.organizerId} onChange={e => set("organizerId", e.target.value)} className={cn(field, "bg-white")}>
                <option value="">—</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Link da reunião</label>
              <input value={form.meetingUrl} onChange={e => set("meetingUrl", e.target.value)} placeholder="https://…" className={field} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Categoria</label>
              <input value={form.category} onChange={e => set("category", e.target.value)} placeholder="Ex: Departamento Pessoal" className={field} />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancelar</button>
          <button onClick={save} disabled={saving || !form.title.trim()}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Criar Reunião
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card da lista ───────────────────────────────────────────────────────────

function MeetingCard({ m, onClick }: { m: MeetingListItem; onClick: () => void }) {
  const nomes = m.participants
    .map(p => p.teamMember?.name ?? p.externalName)
    .filter(Boolean) as string[]

  return (
    <button onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <span className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">{m.title}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {m.pendingActions > 0 && (
            <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium">
              <AlertCircle className="w-3 h-3" />{m.pendingActions} pendente{m.pendingActions !== 1 ? "s" : ""}
            </span>
          )}
          <span className={cn("text-[10px] rounded-full px-2 py-0.5 font-medium", MEETING_STATUS_COLORS[m.status])}>
            {MEETING_STATUS_LABELS[m.status] ?? m.status}
          </span>
        </div>
      </div>

      {m.objective && <p className="text-xs text-slate-500 mb-2 line-clamp-1">{m.objective}</p>}

      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />{fmtDate(m.date)}</span>
        {m.startTime && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{m.startTime}{m.endTime ? `–${m.endTime}` : ""}</span>}
        {m.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3.5 h-3.5" />{m.location}</span>}
        <span className="text-slate-400">{MEETING_TYPE_LABELS[m.type] ?? m.type}</span>
        {nomes.length > 0 && (
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{nomes.length} participante{nomes.length !== 1 ? "s" : ""}</span>
        )}
        {m._count?.agendaItems > 0 && <span className="text-slate-400">{m._count.agendaItems} assunto(s)</span>}
      </div>
    </button>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export function MeetingsClient() {
  const router = useRouter()
  const [meetings, setMeetings] = useState<MeetingListItem[]>([])
  const [members, setMembers]   = useState<TeamMemberLite[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<string>("todas")
  const [q, setQ]               = useState("")
  const [participantId, setParticipantId] = useState("")
  const [responsibleId, setResponsibleId] = useState("")
  const [from, setFrom]         = useState("")
  const [to, setTo]             = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [showNova, setShowNova] = useState(false)

  /** Toda abertura de reunião leva ao workspace em tela cheia. */
  const abrir = useCallback((id: string) => {
    router.push(`/anotacoes/reunioes/${id}`)
  }, [router])

  const loadMeetings = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ filter })
      if (q.trim())      qs.set("q", q.trim())
      if (participantId) qs.set("participantId", participantId)
      if (responsibleId) qs.set("responsibleId", responsibleId)
      if (from)          qs.set("from", from)
      if (to)            qs.set("to", to)
      const rows = await fetch(`/api/meetings?${qs}`).then(r => r.json())
      setMeetings(Array.isArray(rows) ? rows : [])
    } catch { setMeetings([]) }
    finally { setLoading(false) }
  }, [filter, q, participantId, responsibleId, from, to])

  useEffect(() => { loadMeetings() }, [loadMeetings])

  useEffect(() => {
    fetch("/api/gestao-equipe/members")
      .then(r => r.json())
      .then(d => setMembers(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  const counts = useMemo(() => ({
    total: meetings.length,
    pend:  meetings.reduce((s, m) => s + (m.pendingActions ?? 0), 0),
  }), [meetings])

  const clearFilters = () => {
    setQ(""); setParticipantId(""); setResponsibleId(""); setFrom(""); setTo("")
  }
  const hasFilters = !!(q || participantId || responsibleId || from || to)

  return (
    <div className="flex h-full min-h-0 bg-slate-50">
      {/* ── COLUNA ESQUERDA ── */}
      <aside className="w-[272px] shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-3 border-b border-slate-100">
          <button onClick={() => setShowNova(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Nova Reunião
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cn(
                "w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2",
                filter === f.id ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-50",
              )}>
              {f.id === "arquivadas" && <Archive className="w-3.5 h-3.5" />}
              {f.label}
            </button>
          ))}

          <div className="mt-3 pt-3 border-t border-slate-100 px-3">
            <button onClick={() => setShowFilters(v => !v)}
              className="w-full flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 py-1">
              <Filter className="w-3.5 h-3.5" /> Filtros avançados
            </button>

            {showFilters && (
              <div className="mt-2 space-y-2">
                <select value={participantId} onChange={e => setParticipantId(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white">
                  <option value="">Participante…</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select value={responsibleId} onChange={e => setResponsibleId(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white">
                  <option value="">Responsável por ação…</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-1.5">
                  <input type="date" value={from} onChange={e => setFrom(e.target.value)} title="De"
                    className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
                  <input type="date" value={to} onChange={e => setTo(e.target.value)} title="Até"
                    className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
                </div>
                {hasFilters && (
                  <button onClick={clearFilters} className="w-full text-xs text-slate-500 hover:text-slate-700 py-1">
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>

        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          {counts.total} reunião/ões
          {counts.pend > 0 && <> · <span className="text-amber-600 font-medium">{counts.pend} pendente(s)</span></>}
        </div>
      </aside>

      {/* ── LISTA (ocupa todo o restante — sem terceira coluna) ── */}
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 bg-white">
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar reunião…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-2.5 max-w-5xl">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />)}
            </div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400">
              <CalendarClock className="w-11 h-11 mb-3 opacity-30" />
              <p className="font-semibold text-slate-500">Nenhuma reunião encontrada</p>
              <p className="text-sm mt-1">
                {hasFilters || filter !== "todas" ? "Ajuste os filtros ou crie uma nova." : "Crie a primeira reunião da equipe."}
              </p>
              <button onClick={() => setShowNova(true)}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm">
                <Plus className="w-4 h-4" /> Nova Reunião
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-w-5xl">
              {meetings.map(m => (
                <MeetingCard key={m.id} m={m} onClick={() => abrir(m.id)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showNova && (
        <NovaReuniaoModal
          members={members}
          onClose={() => setShowNova(false)}
          onCreated={m => { setShowNova(false); abrir(m.id) }}
        />
      )}
    </div>
  )
}
