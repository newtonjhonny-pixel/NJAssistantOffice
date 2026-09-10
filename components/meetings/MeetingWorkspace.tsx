"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Loader2, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight,
  Printer, Copy, CheckCircle2, RotateCcw, Play, Maximize2, Minimize2,
  UserPlus, X, Gavel, ListTodo, ListOrdered, ClipboardCheck, History as HistoryIcon,
  Settings2, Users, Check, AlertCircle, ExternalLink, Save,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RichTextEditor } from "@/components/shared/RichTextEditor"
import { AiImproveButton } from "./AiImproveButton"
import { openMeetingPrint } from "./meetingPrint"
import { useAutosave, saveLabel } from "./useAutosave"
import {
  Meeting, AgendaItem, TeamMemberLite, HistoryEntry, fmtDate,
  MEETING_TYPE_LABELS, MEETING_STATUS_LABELS, MEETING_STATUS_COLORS,
  AGENDA_STATUS_LABELS, AGENDA_STATUS_COLORS,
  ACTION_STATUS_LABELS, ACTION_STATUS_COLORS,
  PRIORITY_LABELS, PRIORITY_COLORS, ATTENDANCE_LABELS,
} from "./types"

type Tab = "geral" | "pauta" | "decisoes" | "acoes" | "ata" | "historico"

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "geral",     label: "Geral",         icon: Settings2 },
  { id: "pauta",     label: "Pauta",         icon: ListOrdered },
  { id: "decisoes",  label: "Decisões",      icon: Gavel },
  { id: "acoes",     label: "Plano de Ação", icon: ListTodo },
  { id: "ata",       label: "Ata / Resumo",  icon: ClipboardCheck },
  { id: "historico", label: "Histórico",     icon: HistoryIcon },
]

const inputCls = "px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
const labelCls = "block text-xs font-medium text-slate-600 mb-1"

// ─── Componente principal ────────────────────────────────────────────────────

export function MeetingWorkspace({ meetingId }: { meetingId: string }) {
  const router = useRouter()
  const [m, setM]             = useState<Meeting | null>(null)
  const [members, setMembers] = useState<TeamMemberLite[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNF]     = useState(false)
  const [tab, setTab]         = useState<Tab>("pauta")
  const [focus, setFocus]     = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [busy, setBusy]       = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/meetings/${meetingId}`)
      if (!r.ok) { setNF(true); return }
      const d = await r.json()
      if (!d?.id) { setNF(true); return }
      setM(d)
    } catch { setNF(true) }
    finally { setLoading(false) }
  }, [meetingId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch("/api/gestao-equipe/members").then(r => r.json())
      .then(d => setMembers(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab !== "historico") return
    fetch(`/api/meetings/${meetingId}/history`).then(r => r.json())
      .then(d => setHistory(Array.isArray(d) ? d : [])).catch(() => {})
  }, [tab, meetingId, m?.updatedAt])

  // ── Autosave dos campos da reunião ──
  const saveMeeting = useCallback(async (payload: Record<string, unknown>) => {
    const r = await fetch(`/api/meetings/${meetingId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!r.ok) return false
    setM(await r.json())
    return true
  }, [meetingId])

  const autosave = useAutosave(saveMeeting)

  // ── Chamadas pontuais (criar/remover) ──
  const api = useCallback(async (path: string, init?: RequestInit) => {
    setBusy(true)
    try {
      const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) { alert(data.error ?? "Operação falhou."); return null }
      return data
    } finally { setBusy(false) }
  }, [])

  const refresh = useCallback(async () => { await load() }, [load])

  function leave() {
    if (autosave.isDirty && !confirm("Existem alterações ainda não salvas. Sair mesmo assim?")) return
    router.push("/anotacoes?tab=reunioes")
  }

  if (loading) return <div className="h-full flex items-center justify-center text-slate-400"><Loader2 className="w-7 h-7 animate-spin" /></div>
  if (notFound || !m) return (
    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
      <AlertCircle className="w-10 h-10 opacity-30" />
      <p className="font-medium text-slate-600">Reunião não encontrada.</p>
      <button onClick={() => router.push("/anotacoes?tab=reunioes")}
        className="text-sm text-blue-600 hover:underline">Voltar para a lista</button>
    </div>
  )

  const concluida = m.status === "CONCLUIDA"
  const pendentes = m.actions.filter(a => ["A_FAZER", "EM_ANDAMENTO", "AGUARDANDO"].includes(a.status))

  return (
    <div className={cn(
      "flex flex-col bg-slate-50 min-h-0",
      // Modo Foco: cobre a interface inteira sem alterar o layout global.
      focus ? "fixed inset-0 z-50" : "h-full",
    )}>
      {/* ── CABEÇALHO ── */}
      <header className="bg-white border-b border-slate-200 shrink-0">
        <div className="px-5 py-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <button onClick={leave}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Pautas de Reuniões
              </button>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-slate-800 truncate">{m.title}</h1>
                <span className={cn("text-[11px] rounded-full px-2 py-0.5 font-medium", MEETING_STATUS_COLORS[m.status])}>
                  {MEETING_STATUS_LABELS[m.status] ?? m.status}
                </span>
                <span className={cn(
                  "text-[11px] flex items-center gap-1",
                  autosave.state === "error" ? "text-red-600"
                    : autosave.state === "dirty" ? "text-amber-600" : "text-slate-400",
                )}>
                  {autosave.state === "saving" && <Loader2 className="w-3 h-3 animate-spin" />}
                  {autosave.state === "saved" && <Check className="w-3 h-3" />}
                  {saveLabel(autosave.state, autosave.savedAt)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {fmtDate(m.date)}
                {m.startTime && ` · ${m.startTime}${m.endTime ? `–${m.endTime}` : ""}`}
                {` · ${MEETING_TYPE_LABELS[m.type] ?? m.type}`}
                {m.location && ` · ${m.location}`}
                {m.organizer && ` · Organizador: ${m.organizer.name}`}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {m.status !== "EM_ANDAMENTO" && !concluida && (
                <button disabled={busy}
                  onClick={async () => { if (await api(`/api/meetings/${meetingId}`, { method: "PATCH", body: JSON.stringify({ status: "EM_ANDAMENTO" }) })) { await refresh(); setTab("pauta"); setFocus(true) } }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Play className="w-3.5 h-3.5" /> Iniciar Reunião
                </button>
              )}
              <button onClick={() => autosave.flush()} disabled={!autosave.isDirty}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40">
                <Save className="w-3.5 h-3.5" /> Salvar
              </button>
              <button
                onClick={async () => {
                  // Garante que o documento use os dados já persistidos: descarrega
                  // o autosave pendente e relê a reunião antes de montar o PDF.
                  await autosave.flush()
                  const fresh = await fetch(`/api/meetings/${meetingId}`).then(r => r.ok ? r.json() : null)
                  openMeetingPrint(fresh ?? m)
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
                <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
              </button>
              <button disabled={busy}
                onClick={async () => {
                  if (!confirm(`Duplicar "${m.title}"?\n\nParticipantes e estrutura da pauta são copiados. Discussões, decisões e ações NÃO são.`)) return
                  const d = await api(`/api/meetings/${meetingId}/duplicate`, {
                    method: "POST", body: JSON.stringify({ carryPendingActions: pendentes.length > 0 }),
                  })
                  if (d?.id) router.push(`/anotacoes/reunioes/${d.id}`)
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 disabled:opacity-50">
                <Copy className="w-3.5 h-3.5" /> Duplicar
              </button>
              {concluida ? (
                <button disabled={busy}
                  onClick={async () => { if (await api(`/api/meetings/${meetingId}/complete`, { method: "DELETE" })) refresh() }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50">
                  <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                </button>
              ) : (
                <button disabled={busy}
                  onClick={async () => {
                    await autosave.flush()
                    const r = await api(`/api/meetings/${meetingId}/complete`, {
                      method: "POST", body: JSON.stringify({ completedBy: "Newton" }),
                    })
                    if (r) {
                      const s = r.summary
                      alert(`Reunião concluída.\n\n${s.agendaItems} assunto(s)\n${s.decisions} decisão/ões\n${s.actions} ação/ões (${s.actionsDone} concluída(s), ${s.actionsPending} pendente(s))\n\nAs ações pendentes continuam registradas.`)
                      refresh()
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Concluir Reunião
                </button>
              )}
              <button onClick={() => setFocus(f => !f)} title={focus ? "Sair do modo foco" : "Modo foco"}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                {focus ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Participantes em chips */}
          <ParticipantChips m={m} members={members} api={api} refresh={refresh} busy={busy} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 overflow-x-auto">
          {TABS.map(t => {
            const count =
              t.id === "pauta"    ? m.agendaItems.length :
              t.id === "decisoes" ? m.decisions.length :
              t.id === "acoes"    ? m.actions.length : undefined
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                  tab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700",
                )}>
                <t.icon className="w-4 h-4" /> {t.label}
                {count !== undefined && count > 0 && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5">{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      {/* ── CONTEÚDO ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-6">
          {tab === "geral"     && <GeralTab m={m} members={members} push={autosave.push} />}
          {tab === "pauta"     && <PautaTab m={m} members={members} meetingId={meetingId} api={api} refresh={refresh} busy={busy} />}
          {tab === "decisoes"  && <DecisoesTab m={m} meetingId={meetingId} api={api} refresh={refresh} busy={busy} />}
          {tab === "acoes"     && <AcoesTab m={m} members={members} meetingId={meetingId} api={api} refresh={refresh} busy={busy} />}
          {tab === "ata"       && <AtaTab m={m} meetingId={meetingId} push={autosave.push} api={api} refresh={refresh} />}
          {tab === "historico" && <HistoricoTab history={history} />}
        </div>
      </div>
    </div>
  )
}

// ─── Chips de participantes ──────────────────────────────────────────────────

function ParticipantChips({ m, members, api, refresh, busy }: {
  m: Meeting; members: TeamMemberLite[]
  api: (p: string, i?: RequestInit) => Promise<Record<string, unknown> | null>
  refresh: () => Promise<void>; busy: boolean
}) {
  const [open, setOpen] = useState(false)
  const jaIn = new Set(m.participants.map(p => p.teamMemberId).filter(Boolean))
  const disponiveis = members.filter(x => !jaIn.has(x.id))

  return (
    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
      <Users className="w-3.5 h-3.5 text-slate-400" />
      {m.participants.length === 0 && <span className="text-xs text-slate-400">Nenhum participante</span>}
      {m.participants.map(p => (
        <span key={p.id}
          className="group flex items-center gap-1.5 bg-slate-100 rounded-full pl-1 pr-2 py-0.5 text-xs text-slate-700">
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-semibold">
            {(p.teamMember?.name ?? p.externalName ?? "?").slice(0, 2).toUpperCase()}
          </span>
          {p.teamMember?.name ?? p.externalName}
          {!p.teamMemberId && <span className="text-[9px] text-amber-600">ext</span>}
          <button disabled={busy} title="Remover"
            onClick={async () => { if (await api(`/api/meetings/${m.id}/participants/${p.id}`, { method: "DELETE" })) await refresh() }}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <div className="relative">
        <button onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-dashed border-blue-300 rounded-full px-2 py-0.5">
          <UserPlus className="w-3 h-3" /> Participante
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-64 max-h-72 overflow-y-auto">
              {disponiveis.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">Todos já foram adicionados.</p>}
              {disponiveis.map(x => (
                <button key={x.id} disabled={busy}
                  onClick={async () => { if (await api(`/api/meetings/${m.id}/participants`, { method: "POST", body: JSON.stringify({ teamMemberId: x.id }) })) { setOpen(false); await refresh() } }}
                  className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                  {x.name}{x.role ? <span className="text-xs text-slate-400"> — {x.role}</span> : null}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={async () => {
                    const nome = prompt("Nome do participante externo:")
                    if (!nome?.trim()) return
                    if (await api(`/api/meetings/${m.id}/participants`, { method: "POST", body: JSON.stringify({ externalName: nome.trim() }) })) { setOpen(false); await refresh() }
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">
                  + Participante externo…
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── ABA GERAL ───────────────────────────────────────────────────────────────

function GeralTab({ m, members, push }: {
  m: Meeting; members: TeamMemberLite[]; push: (p: Record<string, unknown>) => void
}) {
  const [f, setF] = useState({
    title: m.title, objective: m.objective ?? "", type: m.type, category: m.category ?? "",
    date: m.date, startTime: m.startTime ?? "", endTime: m.endTime ?? "",
    location: m.location ?? "", meetingUrl: m.meetingUrl ?? "",
    organizerId: m.organizerId ?? "", status: m.status, observations: m.observations ?? "",
  })

  const set = (k: string, v: string) => {
    setF(p => ({ ...p, [k]: v }))
    push({ [k]: v === "" ? null : v })
  }

  return (
    <div className="max-w-4xl space-y-5">
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Dados da reunião</h2>

        <div>
          <label className={labelCls}>Título</label>
          <input value={f.title} onChange={e => set("title", e.target.value)} className={cn(inputCls, "w-full text-base font-medium")} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls + " mb-0"}>Objetivo</label>
            <AiImproveButton value={f.objective} onAccept={t => set("objective", t)} context={`Reunião: ${f.title}`} />
          </div>
          <textarea value={f.objective} onChange={e => set("objective", e.target.value)} rows={4}
            placeholder="O que se pretende alcançar nesta reunião…" className={cn(inputCls, "w-full resize-y min-h-[110px]")} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Tipo</label>
            <select value={f.type} onChange={e => set("type", e.target.value)} className={cn(inputCls, "w-full bg-white")}>
              {Object.entries(MEETING_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={f.status} onChange={e => set("status", e.target.value)} className={cn(inputCls, "w-full bg-white")}>
              {Object.entries(MEETING_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Data</label>
            <input type="date" value={f.date} onChange={e => set("date", e.target.value)} className={cn(inputCls, "w-full")} />
          </div>
          <div>
            <label className={labelCls}>Categoria</label>
            <input value={f.category} onChange={e => set("category", e.target.value)} placeholder="Ex: DP" className={cn(inputCls, "w-full")} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Início</label>
            <input type="time" value={f.startTime} onChange={e => set("startTime", e.target.value)} className={cn(inputCls, "w-full")} />
          </div>
          <div>
            <label className={labelCls}>Término</label>
            <input type="time" value={f.endTime} onChange={e => set("endTime", e.target.value)} className={cn(inputCls, "w-full")} />
          </div>
          <div>
            <label className={labelCls}>Local</label>
            <input value={f.location} onChange={e => set("location", e.target.value)} className={cn(inputCls, "w-full")} />
          </div>
          <div>
            <label className={labelCls}>Organizador</label>
            <select value={f.organizerId} onChange={e => set("organizerId", e.target.value)} className={cn(inputCls, "w-full bg-white")}>
              <option value="">—</option>
              {members.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Link da reunião</label>
          <input value={f.meetingUrl} onChange={e => set("meetingUrl", e.target.value)} placeholder="https://…" className={cn(inputCls, "w-full")} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls + " mb-0"}>Observações</label>
            <AiImproveButton value={f.observations} onAccept={t => set("observations", t)} />
          </div>
          <textarea value={f.observations} onChange={e => set("observations", e.target.value)} rows={5}
            className={cn(inputCls, "w-full resize-y min-h-[130px]")} />
        </div>
      </section>
    </div>
  )
}

// ─── ABA PAUTA ───────────────────────────────────────────────────────────────

function PautaTab({ m, members, meetingId, api, refresh, busy }: {
  m: Meeting; members: TeamMemberLite[]; meetingId: string
  api: (p: string, i?: RequestInit) => Promise<Record<string, unknown> | null>
  refresh: () => Promise<void>; busy: boolean
}) {
  const [novo, setNovo] = useState("")
  const [aberto, setAberto] = useState<Set<string>>(() => new Set(m.agendaItems.slice(0, 1).map(a => a.id)))

  const toggle = (id: string) => setAberto(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  async function addItem() {
    if (!novo.trim()) return
    const r = await api(`/api/meetings/${meetingId}/agenda`, { method: "POST", body: JSON.stringify({ title: novo.trim() }) })
    if (r) {
      setNovo(""); await refresh()
      setAberto(s => { const n = new Set(s); n.add(r.id as string); return n })
    }
  }

  async function move(item: AgendaItem, dir: -1 | 1) {
    const idx = m.agendaItems.findIndex(a => a.id === item.id)
    const alvo = idx + dir
    if (alvo < 0 || alvo >= m.agendaItems.length) return
    const arr = [...m.agendaItems]
    ;[arr[idx], arr[alvo]] = [arr[alvo], arr[idx]]
    await api(`/api/meetings/${meetingId}/agenda`, {
      method: "PUT", body: JSON.stringify({ order: arr.map((a, i) => ({ id: a.id, order: i + 1 })) }),
    })
    await refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-semibold text-slate-800">Pauta da Reunião</h2>
        <div className="flex gap-2 flex-1 max-w-xl">
          <input value={novo} onChange={e => setNovo(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()}
            placeholder="Título do assunto…" className={cn(inputCls, "flex-1")} />
          <button onClick={addItem} disabled={!novo.trim() || busy}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Adicionar Assunto
          </button>
        </div>
      </div>

      {m.agendaItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
          <ListOrdered className="w-10 h-10 mb-3 opacity-30" />
          <p className="font-semibold text-slate-500">Nenhum assunto na pauta</p>
          <p className="text-sm mt-1">Adicione o primeiro assunto no campo acima.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {m.agendaItems.map(item => (
            <AgendaCard key={item.id} item={item} m={m} members={members} meetingId={meetingId}
              expanded={aberto.has(item.id)} onToggle={() => toggle(item.id)}
              onMove={move} api={api} refresh={refresh} busy={busy} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Card de assunto (accordion grande) ──────────────────────────────────────

function AgendaCard({ item, m, members, meetingId, expanded, onToggle, onMove, api, refresh, busy }: {
  item: AgendaItem; m: Meeting; members: TeamMemberLite[]; meetingId: string
  expanded: boolean; onToggle: () => void
  onMove: (i: AgendaItem, d: -1 | 1) => Promise<void>
  api: (p: string, i?: RequestInit) => Promise<Record<string, unknown> | null>
  refresh: () => Promise<void>; busy: boolean
}) {
  const [titulo, setTitulo]     = useState(item.title)
  const [descricao, setDesc]    = useState(item.description ?? "")
  const [discussao, setDisc]    = useState(item.discussion ?? "")
  const [novaDecisao, setND]    = useState("")
  const [novaAcao, setNA]       = useState({ description: "", responsibleId: "", dueDate: "", priority: "NORMAL" })

  useEffect(() => { setTitulo(item.title); setDesc(item.description ?? ""); setDisc(item.discussion ?? "") },
    [item.id, item.title, item.description, item.discussion])

  const saveItem = useCallback(async (payload: Record<string, unknown>) => {
    const r = await fetch(`/api/meetings/${meetingId}/agenda/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    })
    // Mantém o estado do workspace em dia — sem isso, imprimir ou concluir
    // logo após digitar usaria dados defasados.
    if (r.ok) await refresh()
    return r.ok
  }, [meetingId, item.id, refresh])

  const auto = useAutosave(saveItem)

  return (
    <article className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Cabeçalho do card */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <button onClick={onToggle} className="p-1 text-slate-400 hover:text-slate-600 shrink-0">
          <ChevronRight className={cn("w-4 h-4 transition-transform", expanded && "rotate-90")} />
        </button>
        <span className="text-sm font-mono text-slate-400 shrink-0">{item.order}.</span>
        <input value={titulo}
          onChange={e => { setTitulo(e.target.value); auto.push({ title: e.target.value }) }}
          className="flex-1 min-w-0 text-base font-semibold text-slate-800 bg-transparent border-0 outline-none focus:bg-slate-50 rounded px-1 py-0.5" />

        <div className="flex items-center gap-1.5 shrink-0">
          {auto.state !== "idle" && (
            <span className={cn("text-[10px]", auto.state === "error" ? "text-red-600" : auto.state === "dirty" ? "text-amber-600" : "text-slate-400")}>
              {saveLabel(auto.state, auto.savedAt)}
            </span>
          )}
          <span className={cn("text-[10px] rounded px-1.5 py-0.5", AGENDA_STATUS_COLORS[item.status])}>
            {AGENDA_STATUS_LABELS[item.status]}
          </span>
          {item.decisions.length > 0 && <span className="text-[10px] text-slate-400">{item.decisions.length} dec.</span>}
          {item.actions.length > 0 && <span className="text-[10px] text-slate-400">{item.actions.length} ações</span>}
          <button onClick={() => onMove(item, -1)} disabled={busy} title="Mover para cima"
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button onClick={() => onMove(item, 1)} disabled={busy} title="Mover para baixo"
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"><ChevronDown className="w-3.5 h-3.5" /></button>
          <button disabled={busy} title="Remover assunto"
            onClick={async () => {
              if (!confirm(`Remover "${item.title}"?\n\nAs decisões e ações deste assunto também serão removidas.`)) return
              if (await api(`/api/meetings/${meetingId}/agenda/${item.id}`, { method: "DELETE" })) await refresh()
            }}
            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {expanded && (
        <div className="p-5 space-y-5">
          {/* Metadados */}
          <div className="flex items-center gap-2 flex-wrap">
            <select value={item.status} disabled={busy}
              onChange={async e => { await api(`/api/meetings/${meetingId}/agenda/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: e.target.value }) }); await refresh() }}
              className={cn(inputCls, "text-xs py-1 bg-white")}>
              {Object.entries(AGENDA_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={item.priority} disabled={busy}
              onChange={async e => { await api(`/api/meetings/${meetingId}/agenda/${item.id}`, { method: "PATCH", body: JSON.stringify({ priority: e.target.value }) }); await refresh() }}
              className={cn(inputCls, "text-xs py-1 bg-white")}>
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={item.presenterId ?? ""} disabled={busy}
              onChange={async e => { await api(`/api/meetings/${meetingId}/agenda/${item.id}`, { method: "PATCH", body: JSON.stringify({ presenterId: e.target.value || null }) }); await refresh() }}
              className={cn(inputCls, "text-xs py-1 bg-white")}>
              <option value="">Apresentador…</option>
              {members.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>

          {/* Descrição */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Descrição</h4>
              <AiImproveButton value={descricao} onAccept={t => { setDesc(t); auto.push({ description: t }) }} context={`Assunto: ${titulo}`} />
            </div>
            <textarea value={descricao}
              onChange={e => { setDesc(e.target.value); auto.push({ description: e.target.value }) }}
              placeholder="Contexto do assunto…" rows={4}
              className={cn(inputCls, "w-full resize-y min-h-[110px]")} />
          </section>

          {/* O que foi conversado — área principal */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">O que foi conversado</h4>
              <AiImproveButton value={discussao} isHtml onAccept={t => { setDisc(t); auto.push({ discussion: t }) }} context={`Assunto: ${titulo}`} />
            </div>
            <RichTextEditor value={discussao}
              onChange={v => { setDisc(v); auto.push({ discussion: v }) }}
              placeholder="Registre o que foi discutido…" minHeight={260} />
          </section>

          {/* Decisões */}
          <section>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Gavel className="w-3.5 h-3.5" /> Decisões
            </h4>
            <div className="space-y-1.5 mb-2">
              {item.decisions.length === 0 && <p className="text-xs text-slate-400">Nenhuma decisão registrada.</p>}
              {item.decisions.map(d => (
                <div key={d.id} className="flex items-start gap-2 bg-emerald-50/60 border border-emerald-200 rounded-lg px-3 py-2">
                  <Gavel className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="flex-1 text-sm text-slate-700">{d.description}</p>
                  <button disabled={busy}
                    onClick={async () => { if (await api(`/api/meetings/${meetingId}/decisions/${d.id}`, { method: "DELETE" })) await refresh() }}
                    className="text-slate-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={novaDecisao} onChange={e => setND(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === "Enter" && novaDecisao.trim()) {
                    if (await api(`/api/meetings/${meetingId}/decisions`, { method: "POST", body: JSON.stringify({ description: novaDecisao.trim(), agendaItemId: item.id }) })) { setND(""); await refresh() }
                  }
                }}
                placeholder="Nova decisão…" className={cn(inputCls, "flex-1")} />
              <button disabled={!novaDecisao.trim() || busy}
                onClick={async () => { if (await api(`/api/meetings/${meetingId}/decisions`, { method: "POST", body: JSON.stringify({ description: novaDecisao.trim(), agendaItemId: item.id }) })) { setND(""); await refresh() } }}
                className="px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 text-sm font-medium">
                Adicionar
              </button>
            </div>
          </section>

          {/* Ações */}
          <section>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5" /> O que será feito
            </h4>
            <div className="space-y-1.5 mb-2">
              {item.actions.length === 0 && <p className="text-xs text-slate-400">Nenhuma ação definida.</p>}
              {item.actions.map(a => (
                <ActionRow key={a.id} a={a} meetingId={meetingId} api={api} refresh={refresh} busy={busy} />
              ))}
            </div>
            <div className="grid grid-cols-12 gap-2">
              <input value={novaAcao.description} onChange={e => setNA(v => ({ ...v, description: e.target.value }))}
                placeholder="Descrição da ação…" className={cn(inputCls, "col-span-12 md:col-span-5")} />
              <select value={novaAcao.responsibleId} onChange={e => setNA(v => ({ ...v, responsibleId: e.target.value }))}
                className={cn(inputCls, "col-span-5 md:col-span-3 text-xs bg-white")}>
                <option value="">Responsável…</option>
                {members.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <input type="date" value={novaAcao.dueDate} onChange={e => setNA(v => ({ ...v, dueDate: e.target.value }))}
                className={cn(inputCls, "col-span-4 md:col-span-2 text-xs")} />
              <select value={novaAcao.priority} onChange={e => setNA(v => ({ ...v, priority: e.target.value }))}
                className={cn(inputCls, "col-span-3 md:col-span-1 text-xs bg-white")}>
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button disabled={!novaAcao.description.trim() || busy}
                onClick={async () => {
                  const r = await api(`/api/meetings/${meetingId}/actions`, {
                    method: "POST",
                    body: JSON.stringify({ ...novaAcao, agendaItemId: item.id, responsibleId: novaAcao.responsibleId || null, dueDate: novaAcao.dueDate || null }),
                  })
                  if (r) { setNA({ description: "", responsibleId: "", dueDate: "", priority: "NORMAL" }); await refresh() }
                }}
                className="col-span-12 md:col-span-1 px-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 text-xs font-medium">
                Add
              </button>
            </div>
          </section>
        </div>
      )}
    </article>
  )
}

// ─── Linha de ação ───────────────────────────────────────────────────────────

function ActionRow({ a, meetingId, api, refresh, busy }: {
  a: Meeting["actions"][number]; meetingId: string
  api: (p: string, i?: RequestInit) => Promise<Record<string, unknown> | null>
  refresh: () => Promise<void>; busy: boolean
}) {
  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">{a.description}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-slate-500">
          {a.responsible && <span>👤 {a.responsible.name}</span>}
          {a.dueDate && <span>📅 {fmtDate(a.dueDate)}</span>}
          <span className={cn("rounded px-1.5", PRIORITY_COLORS[a.priority])}>{PRIORITY_LABELS[a.priority]}</span>
          {a.task && <span className="flex items-center gap-1 text-blue-600"><ExternalLink className="w-3 h-3" />tarefa criada</span>}
        </div>
      </div>
      <select value={a.status} disabled={busy}
        onChange={async e => { await api(`/api/meetings/${meetingId}/actions/${a.id}`, { method: "PATCH", body: JSON.stringify({ status: e.target.value }) }); await refresh() }}
        className={cn("text-[11px] rounded-lg border-0 py-1 px-1.5 font-medium", ACTION_STATUS_COLORS[a.status])}>
        {Object.entries(ACTION_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {!a.taskId && (
        <button disabled={busy} title="Criar tarefa a partir desta ação"
          onClick={async () => {
            if (!confirm("Criar uma tarefa a partir desta ação?")) return
            if (await api(`/api/meetings/${meetingId}/actions/${a.id}/task`, { method: "POST", body: JSON.stringify({ status: "PENDENTE" }) })) await refresh()
          }}
          className="text-[10px] px-2 py-1 text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 whitespace-nowrap">
          Criar tarefa
        </button>
      )}
      <button disabled={busy}
        onClick={async () => { if (confirm("Remover esta ação?") && await api(`/api/meetings/${meetingId}/actions/${a.id}`, { method: "DELETE" })) await refresh() }}
        className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  )
}

// ─── ABA DECISÕES ────────────────────────────────────────────────────────────

function DecisoesTab({ m, meetingId, api, refresh, busy }: {
  m: Meeting; meetingId: string
  api: (p: string, i?: RequestInit) => Promise<Record<string, unknown> | null>
  refresh: () => Promise<void>; busy: boolean
}) {
  const [nova, setNova] = useState("")
  const porAssunto = useMemo(() => {
    const map = new Map<string, string>()
    m.agendaItems.forEach(a => map.set(a.id, `${a.order}. ${a.title}`))
    return map
  }, [m.agendaItems])

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Decisões Tomadas ({m.decisions.length})</h2>

      {m.decisions.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma decisão registrada. Elas aparecem aqui conforme forem sendo lançadas nos assuntos da pauta.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <th className="py-2.5 px-4 font-semibold">Assunto</th>
                <th className="py-2.5 px-4 font-semibold w-1/2">Decisão</th>
                <th className="py-2.5 px-4 font-semibold">Data</th>
                <th className="py-2.5 px-4 font-semibold">Registrado por</th>
                <th className="py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {m.decisions.map(d => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 px-4 text-xs text-slate-500">{d.agendaItemId ? porAssunto.get(d.agendaItemId) ?? "—" : "Geral"}</td>
                  <td className="py-2.5 px-4 text-slate-700">{d.description}</td>
                  <td className="py-2.5 px-4 text-xs text-slate-500">{new Date(d.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="py-2.5 px-4 text-xs text-slate-500">{d.createdBy ?? "—"}</td>
                  <td className="py-2.5 px-4 text-right">
                    <button disabled={busy}
                      onClick={async () => { if (await api(`/api/meetings/${meetingId}/decisions/${d.id}`, { method: "DELETE" })) await refresh() }}
                      className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2 max-w-3xl">
        <input value={nova} onChange={e => setNova(e.target.value)}
          placeholder="Decisão geral da reunião (sem assunto específico)…" className={cn(inputCls, "flex-1")} />
        <button disabled={!nova.trim() || busy}
          onClick={async () => { if (await api(`/api/meetings/${meetingId}/decisions`, { method: "POST", body: JSON.stringify({ description: nova.trim() }) })) { setNova(""); await refresh() } }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 text-sm font-medium">
          Adicionar
        </button>
      </div>
    </div>
  )
}

// ─── ABA PLANO DE AÇÃO ───────────────────────────────────────────────────────

function AcoesTab({ m, members, meetingId, api, refresh, busy }: {
  m: Meeting; members: TeamMemberLite[]; meetingId: string
  api: (p: string, i?: RequestInit) => Promise<Record<string, unknown> | null>
  refresh: () => Promise<void>; busy: boolean
}) {
  const patch = async (id: string, body: Record<string, unknown>) => {
    await api(`/api/meetings/${meetingId}/actions/${id}`, { method: "PATCH", body: JSON.stringify(body) })
    await refresh()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Plano de Ação ({m.actions.length})</h2>

      {m.actions.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma ação registrada. Elas são consolidadas aqui a partir dos assuntos da pauta.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <th className="py-2.5 px-4 font-semibold w-1/3">Ação</th>
                <th className="py-2.5 px-4 font-semibold">Assunto de origem</th>
                <th className="py-2.5 px-4 font-semibold">Responsável</th>
                <th className="py-2.5 px-4 font-semibold">Prazo</th>
                <th className="py-2.5 px-4 font-semibold">Prioridade</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold">Tarefa</th>
              </tr>
            </thead>
            <tbody>
              {m.actions.map(a => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 px-4 text-slate-700">{a.description}</td>
                  <td className="py-2 px-4 text-xs text-slate-500">{a.agendaItem ? `${a.agendaItem.order}. ${a.agendaItem.title}` : "Geral"}</td>
                  <td className="py-2 px-4">
                    <select value={a.responsibleId ?? ""} disabled={busy}
                      onChange={e => patch(a.id, { responsibleId: e.target.value || null })}
                      className={cn(inputCls, "text-xs py-1 bg-white w-full")}>
                      <option value="">—</option>
                      {members.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-4">
                    <input type="date" value={a.dueDate ?? ""} disabled={busy}
                      onChange={e => patch(a.id, { dueDate: e.target.value || null })}
                      className={cn(inputCls, "text-xs py-1")} />
                  </td>
                  <td className="py-2 px-4">
                    <select value={a.priority} disabled={busy}
                      onChange={e => patch(a.id, { priority: e.target.value })}
                      className={cn("text-[11px] rounded-lg border-0 py-1 px-1.5 font-medium", PRIORITY_COLORS[a.priority])}>
                      {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-4">
                    <select value={a.status} disabled={busy}
                      onChange={e => patch(a.id, { status: e.target.value })}
                      className={cn("text-[11px] rounded-lg border-0 py-1 px-1.5 font-medium", ACTION_STATUS_COLORS[a.status])}>
                      {Object.entries(ACTION_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-4 text-xs">
                    {a.task ? (
                      <span className="text-blue-600 flex items-center gap-1"><ExternalLink className="w-3 h-3" />criada</span>
                    ) : (
                      <button disabled={busy}
                        onClick={async () => {
                          if (!confirm("Criar uma tarefa a partir desta ação?")) return
                          if (await api(`/api/meetings/${meetingId}/actions/${a.id}/task`, { method: "POST", body: JSON.stringify({ status: "PENDENTE" }) })) await refresh()
                        }}
                        className="text-[10px] px-2 py-1 text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100">
                        Criar tarefa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── ABA ATA / RESUMO ────────────────────────────────────────────────────────

function AtaTab({ m, meetingId, push, api, refresh }: {
  m: Meeting; meetingId: string
  push: (p: Record<string, unknown>) => void
  api: (p: string, i?: RequestInit) => Promise<Record<string, unknown> | null>
  refresh: () => Promise<void>
}) {
  const [summary, setSummary] = useState(m.finalSummary ?? "")
  const [ataLoading, setAta]  = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => { setSummary(m.finalSummary ?? "") }, [m.finalSummary])

  const done = m.actions.filter(a => a.status === "CONCLUIDA").length
  const pend = m.actions.filter(a => ["A_FAZER", "EM_ANDAMENTO", "AGUARDANDO"].includes(a.status)).length

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { l: "Assuntos", v: m.agendaItems.length },
          { l: "Decisões", v: m.decisions.length },
          { l: "Ações", v: m.actions.length },
          { l: "Concluídas", v: done },
          { l: "Pendentes", v: pend },
        ].map(s => (
          <div key={s.l} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-center">
            <p className="text-xl font-semibold text-slate-800">{s.v}</p>
            <p className="text-[11px] text-slate-500">{s.l}</p>
          </div>
        ))}
      </div>

      {m.completedAt && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm text-emerald-800">
          Concluída em {new Date(m.completedAt).toLocaleString("pt-BR")}{m.completedBy && ` por ${m.completedBy}`}.
        </div>
      )}

      {/* Espelho dos dados registrados */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Conteúdo registrado</h3>
        {m.objective && (
          <div><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Objetivo</p>
            <p className="text-sm text-slate-700">{m.objective}</p></div>
        )}
        <div><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Participantes</p>
          <p className="text-sm text-slate-700">
            {m.participants.length ? m.participants.map(p => p.teamMember?.name ?? p.externalName).join(", ") : "—"}
          </p></div>
        <div><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Assuntos</p>
          {m.agendaItems.length ? (
            <ol className="text-sm text-slate-700 list-decimal pl-5 space-y-0.5">
              {m.agendaItems.map(a => <li key={a.id}>{a.title}</li>)}
            </ol>
          ) : <p className="text-sm text-slate-400">—</p>}
        </div>
      </section>

      {/* Resumo final */}
      <section>
        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Resumo final</h3>
          <div className="flex items-center gap-1.5">
            <button disabled={ataLoading}
              onClick={async () => {
                setAta(true)
                try {
                  const r = await fetch(`/api/meetings/${meetingId}/ai/ata`, { method: "POST" })
                  const d = await r.json()
                  if (!r.ok) { alert(d.error ?? "Erro ao organizar a ata."); return }
                  setPreview(d.suggestion)
                } finally { setAta(false) }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 disabled:opacity-50">
              {ataLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardCheck className="w-3.5 h-3.5" />}
              Organizar Ata com IA
            </button>
            <AiImproveButton value={summary} isHtml onAccept={t => { setSummary(t); push({ finalSummary: t }) }} />
          </div>
        </div>
        <RichTextEditor value={summary}
          onChange={v => { setSummary(v); push({ finalSummary: v }) }}
          placeholder="Resumo final da reunião…" minHeight={280} />
      </section>

      {/* Preview da ata gerada — só aplica se o usuário aceitar */}
      {preview !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Ata organizada pela IA</h3>
              <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Resumo atual</p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm max-h-80 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: summary || "<p class='text-slate-400'>Vazio.</p>" }} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-violet-600 uppercase mb-1.5">Sugestão da IA</p>
                  <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 text-sm max-h-80 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: preview }} />
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                A IA apenas reorganiza os dados já registrados. Nada é inventado.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setPreview(null)} className="px-3.5 py-1.5 text-sm text-slate-600 hover:text-slate-800">Cancelar</button>
              <button onClick={() => { setSummary(preview); push({ finalSummary: preview }); setPreview(null) }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700">
                <Check className="w-3.5 h-3.5" /> Usar sugestão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ABA HISTÓRICO ───────────────────────────────────────────────────────────

function HistoricoTab({ history }: { history: HistoryEntry[] }) {
  return (
    <div className="max-w-4xl">
      <h2 className="text-base font-semibold text-slate-800 mb-3">Histórico ({history.length})</h2>
      {history.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum evento registrado.</p>
      ) : (
        <div className="space-y-1.5">
          {history.map(h => (
            <div key={h.id} className="flex items-start gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700">{h.title}</p>
                {h.description && <p className="text-xs text-slate-500 mt-0.5">{h.description}</p>}
              </div>
              <span className="text-[11px] text-slate-400 shrink-0">
                {new Date(h.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
