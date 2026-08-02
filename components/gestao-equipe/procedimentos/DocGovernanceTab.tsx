"use client"

import { useState, useEffect } from "react"
import { Save, Loader2, CheckCircle2, ArrowRight, X, RotateCcw, Send } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

// ─── Workflow ─────────────────────────────────────────────────────────────────

const WORKFLOW_STATES: { id: string; label: string; color: string; bg: string }[] = [
  { id: 'RASCUNHO',              label: 'Rascunho',                color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200' },
  { id: 'EM_ELABORACAO',         label: 'Em Elaboração',           color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200' },
  { id: 'EM_REVISAO_TECNICA',    label: 'Revisão Técnica',         color: 'text-indigo-700',bg: 'bg-indigo-50 border-indigo-200' },
  { id: 'EM_REVISAO_QUALIDADE',  label: 'Revisão de Qualidade',    color: 'text-violet-700',bg: 'bg-violet-50 border-violet-200' },
  { id: 'EM_APROVACAO',          label: 'Em Aprovação',            color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  { id: 'VIGENTE',               label: 'Vigente',                 color: 'text-emerald-700',bg:'bg-emerald-50 border-emerald-200' },
  { id: 'EM_REVISAO',            label: 'Em Revisão',              color: 'text-orange-700',bg: 'bg-orange-50 border-orange-200' },
  { id: 'OBSOLETO',              label: 'Obsoleto',                color: 'text-red-700',   bg: 'bg-red-50 border-red-200' },
  { id: 'CANCELADO',             label: 'Cancelado',               color: 'text-rose-700',  bg: 'bg-rose-50 border-rose-200' },
]

const APPROVAL_LEVELS = ['Gestor Imediato', 'Coordenador', 'Gerente', 'Diretor', 'Comitê', 'CEO']

export interface GovernanceDoc {
  id: string; type: string; title: string; version?: string | null
  workflowStatus?: string | null; status?: string
  elaboratedBy?: string | null; technicalReviewer?: string | null
  qualityReviewer?: string | null; legalReviewer?: string | null
  approver?: string | null; processOwner?: string | null
  publicationResponsible?: string | null; substitute?: string | null
  approvalCommittee?: string | null; approvalLevel?: string | null
  approvalDeadline?: string | null; reviewer?: string | null
}

// ─── Campos auxiliares ────────────────────────────────────────────────────────

function GInput({ label, value, onChange, placeholder = '', hint }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      />
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <span className={cn("text-slate-400 transition-transform text-xs", open ? "rotate-180" : "")}>▾</span>
      </button>
      {open && <div className="px-5 pb-5 space-y-3 border-t border-slate-100">{children}</div>}
    </div>
  )
}

// ─── Painel de Workflow ───────────────────────────────────────────────────────

function WorkflowPanel({ docId, docTitle, currentStatus, onStatusChanged }: {
  docId: string; docTitle: string; currentStatus: string
  onStatusChanged: (newStatus: string) => void
}) {
  const [workflow, setWorkflow]     = useState<{ next: string | null; nextLabel: string | null; canAdvance: boolean; canReject: boolean } | null>(null)
  const [advancing, setAdvancing]   = useState(false)
  const [rejecting, setRejecting]   = useState(false)
  const [comment, setComment]       = useState('')
  const [userName, setUserName]     = useState('')
  const [showModal, setShowModal]   = useState<'advance' | 'reject' | null>(null)

  useEffect(() => {
    fetch(`/api/procedures/${docId}/workflow`)
      .then(r => r.json())
      .then(setWorkflow)
      .catch(() => {})
  }, [docId, currentStatus])

  async function doAction(action: 'advance' | 'reject') {
    const setter = action === 'advance' ? setAdvancing : setRejecting
    setter(true)
    try {
      const res = await fetch(`/api/procedures/${docId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:   action === 'reject' ? 'REJEITAR' : undefined,
          comment,
          userName: userName || 'Usuário',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onStatusChanged(data.current)
        setShowModal(null)
        setComment('')
      }
    } catch (err) {
      console.error('[workflow]', err)
      alert('Erro ao alterar status.')
    } finally {
      setter(false)
    }
  }

  const current = WORKFLOW_STATES.find(s => s.id === currentStatus) ?? WORKFLOW_STATES[0]

  // índice para mostrar progresso
  const mainFlow = ['RASCUNHO', 'EM_ELABORACAO', 'EM_REVISAO_TECNICA', 'EM_REVISAO_QUALIDADE', 'EM_APROVACAO', 'VIGENTE']
  const currentIdx = mainFlow.indexOf(currentStatus)

  return (
    <div className="space-y-4">
      {/* Status atual */}
      <div className={cn("rounded-xl border p-4 flex items-center gap-3", current.bg)}>
        <div className={cn("w-3 h-3 rounded-full", current.color.replace('text-', 'bg-').replace('-700', '-500'))} />
        <div>
          <p className="text-xs text-slate-500 font-medium">Status Atual</p>
          <p className={cn("text-base font-bold", current.color)}>{current.label}</p>
        </div>
      </div>

      {/* Barra de progresso do fluxo principal */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-1 min-w-max">
          {mainFlow.map((s, i) => {
            const st  = WORKFLOW_STATES.find(w => w.id === s)!
            const done = i < currentIdx
            const curr = i === currentIdx
            return (
              <div key={s} className="flex items-center">
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border",
                  done ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  curr ? cn(st.bg, st.color) :
                  'bg-white text-slate-400 border-slate-200'
                )}>
                  {done && <CheckCircle2 className="w-3 h-3" />}
                  {st.label}
                </div>
                {i < mainFlow.length - 1 && (
                  <ArrowRight className={cn("w-3 h-3 mx-0.5", done || curr ? 'text-slate-400' : 'text-slate-200')} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Botões de ação */}
      {workflow && (
        <div className="flex gap-2 flex-wrap">
          {workflow.canAdvance && (
            <Button onClick={() => setShowModal('advance')}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="w-4 h-4 mr-1.5" />
              {workflow.nextLabel ?? 'Avançar'}
            </Button>
          )}
          {workflow.canReject && (
            <Button variant="outline" onClick={() => setShowModal('reject')}
              className="border-red-200 text-red-600 hover:bg-red-50">
              <RotateCcw className="w-4 h-4 mr-1.5" /> Rejeitar / Devolver
            </Button>
          )}
        </div>
      )}

      {/* Modal de confirmação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">
                {showModal === 'advance' ? (workflow?.nextLabel ?? 'Avançar Status') : 'Rejeitar / Devolver'}
              </h3>
              <button onClick={() => setShowModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500">
              {showModal === 'advance'
                ? `O documento "${docTitle}" será movido para: ${WORKFLOW_STATES.find(s => s.id === workflow?.next)?.label ?? '...'}`
                : `O documento "${docTitle}" será devolvido ao estágio Rascunho.`}
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Seu nome</label>
              <input value={userName} onChange={e => setUserName(e.target.value)}
                placeholder="Nome do responsável pela ação"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Comentário {showModal === 'reject' ? '*' : '(opcional)'}</label>
              <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Ex: Revisado e aprovado sem alterações / Retornado por falta de objetivo"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(null)}>Cancelar</Button>
              <Button
                onClick={() => doAction(showModal)}
                disabled={advancing || rejecting || (showModal === 'reject' && !comment.trim())}
                className={showModal === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
              >
                {(advancing || rejecting) ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab Principal ─────────────────────────────────────────────────────────────

export function DocGovernanceTab({
  doc,
  onSaved,
}: {
  doc: GovernanceDoc
  onSaved: (updated: GovernanceDoc) => void
}) {
  const [form, setForm] = useState({
    elaboratedBy:           doc.elaboratedBy            ?? '',
    technicalReviewer:      doc.technicalReviewer       ?? '',
    qualityReviewer:        doc.qualityReviewer         ?? '',
    legalReviewer:          doc.legalReviewer           ?? '',
    approver:               doc.approver                ?? '',
    processOwner:           doc.processOwner            ?? '',
    publicationResponsible: doc.publicationResponsible  ?? '',
    substitute:             doc.substitute              ?? '',
    approvalCommittee:      doc.approvalCommittee       ?? '',
    approvalLevel:          doc.approvalLevel           ?? '',
    approvalDeadline:       doc.approvalDeadline        ?? '',
  })
  const [currentStatus, setCurrentStatus] = useState(doc.workflowStatus ?? 'RASCUNHO')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  function set(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/procedures/${doc.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, workflowStatus: currentStatus }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const updated = await res.json()
      setSaved(true); setTimeout(() => setSaved(false), 2500)
      onSaved(updated)
    } catch (err) {
      console.error('[DocGovernanceTab.save]', err)
      alert('Erro ao salvar. Tente novamente.')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {/* Fluxo de Aprovação */}
      <Section title="1. Fluxo de Aprovação do Documento">
        <div className="mt-3">
          <WorkflowPanel
            docId={doc.id}
            docTitle={doc.title}
            currentStatus={currentStatus}
            onStatusChanged={setCurrentStatus}
          />
        </div>
      </Section>

      {/* Responsáveis */}
      <Section title="2. Responsáveis">
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <GInput label="Elaborado por" value={form.elaboratedBy} onChange={v => set('elaboratedBy', v)}
            placeholder="Nome do elaborador" hint="Quem criou o documento" />
          <GInput label="Revisor Técnico" value={form.technicalReviewer} onChange={v => set('technicalReviewer', v)}
            placeholder="Nome do revisor técnico" />
          <GInput label="Revisor de Qualidade" value={form.qualityReviewer} onChange={v => set('qualityReviewer', v)}
            placeholder="Nome do revisor de qualidade" />
          <GInput label="Revisor Jurídico" value={form.legalReviewer} onChange={v => set('legalReviewer', v)}
            placeholder="Nome do revisor jurídico" />
          <GInput label="Aprovador" value={form.approver} onChange={v => set('approver', v)}
            placeholder="Nome do aprovador final" hint="Assina a publicação" />
          <GInput label="Dono do Processo" value={form.processOwner} onChange={v => set('processOwner', v)}
            placeholder="Responsável pelo processo" />
          <GInput label="Responsável pela Publicação" value={form.publicationResponsible} onChange={v => set('publicationResponsible', v)}
            placeholder="Quem publica o documento" />
          <GInput label="Substituto" value={form.substitute} onChange={v => set('substitute', v)}
            placeholder="Responsável em caso de ausência" />
        </div>
      </Section>

      {/* Configurações de Aprovação */}
      <Section title="3. Configurações de Aprovação">
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <GInput label="Comitê Aprovador" value={form.approvalCommittee} onChange={v => set('approvalCommittee', v)}
            placeholder="Nome do comitê, quando aplicável" />
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nível de Aprovação</label>
            <select value={form.approvalLevel} onChange={e => set('approvalLevel', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
              <option value="">— Selecione —</option>
              {APPROVAL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Prazo para Aprovação</label>
            <input type="date" value={form.approvalDeadline} onChange={e => set('approvalDeadline', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Salvando…</>
            : saved
              ? <><CheckCircle2 className="w-4 h-4 mr-1 text-emerald-400" />Salvo!</>
              : <><Save className="w-4 h-4 mr-1" />Salvar Governança</>}
        </Button>
      </div>
    </div>
  )
}
