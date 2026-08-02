"use client"

import { useState, useEffect, useCallback } from "react"
import { BookOpen, CheckCircle, Plus, Loader2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeituraEntry {
  id: string
  userName: string
  comment: string | null
  createdAt: string
  version: string | null
}

interface AceiteEntry {
  id: string
  approverName: string | null
  status: string     // PENDENTE | APROVADO | REJEITADO
  decision: string | null
  comment: string | null
  decidedAt: string | null
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  } catch { return iso }
}

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"

// ─── Main component ───────────────────────────────────────────────────────────

export function DocLeituraAceite({ docId, docVersion }: { docId: string; docVersion: string }) {
  // ── Leitura state ──
  const [leituras,      setLeituras]      = useState<LeituraEntry[]>([])
  const [loadingL,      setLoadingL]      = useState(true)
  const [addingL,       setAddingL]       = useState(false)
  const [savingL,       setSavingL]       = useState(false)
  const [leitorNome,    setLeitorNome]    = useState("")
  const [leitorObs,     setLeitorObs]     = useState("")

  // ── Aceite state ──
  const [aceites,       setAceites]       = useState<AceiteEntry[]>([])
  const [loadingA,      setLoadingA]      = useState(true)
  const [addingA,       setAddingA]       = useState(false)
  const [savingA,       setSavingA]       = useState(false)
  const [aceiteNome,    setAceiteNome]    = useState("")
  const [aceiteObs,     setAceiteObs]     = useState("")
  const [updatingId,    setUpdatingId]    = useState<string | null>(null)

  const loadLeituras = useCallback(async () => {
    setLoadingL(true)
    try {
      const res = await fetch(`/api/procedures/${docId}/history`)
      if (!res.ok) throw new Error()
      const rows: LeituraEntry[] = await res.json()
      setLeituras(rows.filter((r: LeituraEntry) => r.userName && (r as unknown as Record<string,string>).action === "LEITURA"))
    } catch { setLeituras([]) }
    finally   { setLoadingL(false) }
  }, [docId])

  const loadAceites = useCallback(async () => {
    setLoadingA(true)
    try {
      const res = await fetch(`/api/procedures/${docId}/approvals`)
      if (!res.ok) throw new Error()
      const rows: AceiteEntry[] = await res.json()
      setAceites(rows.filter((r: AceiteEntry) => (r as unknown as Record<string,string>).role === "ACEITE"))
    } catch { setAceites([]) }
    finally   { setLoadingA(false) }
  }, [docId])

  useEffect(() => { loadLeituras(); loadAceites() }, [loadLeituras, loadAceites])

  // ── Registrar leitura ──
  async function submitLeitura() {
    if (!leitorNome.trim()) return
    setSavingL(true)
    try {
      await fetch(`/api/procedures/${docId}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:   "LEITURA",
          userName: leitorNome.trim(),
          comment:  leitorObs.trim() || null,
          version:  docVersion,
        }),
      })
      setLeitorNome(""); setLeitorObs(""); setAddingL(false)
      await loadLeituras()
    } catch (err) { console.error("[DocLeituraAceite.leitura]", err) }
    finally        { setSavingL(false) }
  }

  // ── Registrar aceite ──
  async function submitAceite() {
    if (!aceiteNome.trim()) return
    setSavingA(true)
    try {
      await fetch(`/api/procedures/${docId}/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role:         "ACEITE",
          approverName: aceiteNome.trim(),
          status:       "PENDENTE",
          comment:      aceiteObs.trim() || null,
          step:         0,
        }),
      })
      setAceiteNome(""); setAceiteObs(""); setAddingA(false)
      await loadAceites()
    } catch (err) { console.error("[DocLeituraAceite.aceite]", err) }
    finally        { setSavingA(false) }
  }

  // ── Confirmar aceite ──
  async function confirmarAceite(id: string) {
    setUpdatingId(id)
    try {
      // A tabela não tem PATCH na API de approvals; usamos uma nova entrada de aceite confirmado
      // e marcamos via POST com decision=APROVADO
      await fetch(`/api/procedures/${docId}/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role:         "ACEITE_CONFIRMADO",
          approverName: aceites.find(a => a.id === id)?.approverName ?? "—",
          status:       "APROVADO",
          decision:     "APROVADO",
          step:         0,
        }),
      })
      // Remove pendente e recarrega
      await loadAceites()
    } catch (err) { console.error("[DocLeituraAceite.confirmarAceite]", err) }
    finally        { setUpdatingId(null) }
  }

  return (
    <div className="space-y-8">
      {/* ═══ REGISTRO DE LEITURA ═══ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Registro de Leitura</p>
              <p className="text-xs text-slate-500">Confirme que leu e compreendeu este documento</p>
            </div>
          </div>
          <button onClick={() => setAddingL(true)} type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors">
            <Plus className="w-3.5 h-3.5" /> Registrar Leitura
          </button>
        </div>

        {addingL && (
          <div className="border border-sky-200 rounded-xl p-4 space-y-3 bg-sky-50/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome *</label>
                <input value={leitorNome} onChange={e => setLeitorNome(e.target.value)}
                  placeholder="Nome do colaborador" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Observação</label>
                <input value={leitorObs} onChange={e => setLeitorObs(e.target.value)}
                  placeholder="Dúvidas, comentários…" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setAddingL(false); setLeitorNome(""); setLeitorObs("") }}
                type="button" className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={submitLeitura} disabled={savingL || !leitorNome.trim()} type="button"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold disabled:opacity-60">
                {savingL ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
                {savingL ? "Salvando…" : "Confirmar Leitura"}
              </button>
            </div>
          </div>
        )}

        {loadingL ? (
          <div className="flex items-center justify-center py-6 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Carregando…</span>
          </div>
        ) : leituras.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-6">
            Nenhum registro de leitura ainda.
          </p>
        ) : (
          <div className="space-y-1.5">
            {leituras.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                <CheckCircle className="w-4 h-4 text-sky-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-700">{l.userName}</span>
                  {l.comment && <span className="text-xs text-slate-400 ml-2">— {l.comment}</span>}
                </div>
                {l.version && (
                  <span className="text-xs text-slate-400 shrink-0 font-mono">{l.version}</span>
                )}
                <span className="text-xs text-slate-400 shrink-0">{fmtDate(l.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══ ACEITE DIGITAL ═══ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Aceite Digital</p>
              <p className="text-xs text-slate-500">Solicitações de aceite formal ao conteúdo do documento</p>
            </div>
          </div>
          <button onClick={() => setAddingA(true)} type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors">
            <Plus className="w-3.5 h-3.5" /> Solicitar Aceite
          </button>
        </div>

        {addingA && (
          <div className="border border-emerald-200 rounded-xl p-4 space-y-3 bg-emerald-50/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome *</label>
                <input value={aceiteNome} onChange={e => setAceiteNome(e.target.value)}
                  placeholder="Nome do responsável pelo aceite" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Observação</label>
                <input value={aceiteObs} onChange={e => setAceiteObs(e.target.value)}
                  placeholder="Condições, ressalvas…" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setAddingA(false); setAceiteNome(""); setAceiteObs("") }}
                type="button" className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={submitAceite} disabled={savingA || !aceiteNome.trim()} type="button"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60">
                {savingA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {savingA ? "Salvando…" : "Criar Solicitação"}
              </button>
            </div>
          </div>
        )}

        {loadingA ? (
          <div className="flex items-center justify-center py-6 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Carregando…</span>
          </div>
        ) : aceites.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-6">
            Nenhuma solicitação de aceite registrada.
          </p>
        ) : (
          <div className="space-y-2">
            {aceites.map(a => {
              const isAprovado = a.status === "APROVADO" || a.decision === "APROVADO"
              return (
                <div key={a.id} className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
                  isAprovado
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-200 bg-white",
                )}>
                  {isAprovado
                    ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <Clock className="w-4 h-4 text-amber-400 shrink-0" />}

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-700">
                      {a.approverName ?? "—"}
                    </span>
                    {a.comment && (
                      <span className="text-xs text-slate-400 ml-2">— {a.comment}</span>
                    )}
                  </div>

                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full shrink-0",
                    isAprovado
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700",
                  )}>
                    {isAprovado ? "Aceito" : "Pendente"}
                  </span>

                  {a.decidedAt && (
                    <span className="text-xs text-slate-400 shrink-0">{fmtDate(a.decidedAt)}</span>
                  )}

                  {!isAprovado && (
                    <button onClick={() => confirmarAceite(a.id)}
                      disabled={updatingId === a.id} type="button"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60 shrink-0">
                      {updatingId === a.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <CheckCircle className="w-3 h-3" />}
                      Confirmar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
