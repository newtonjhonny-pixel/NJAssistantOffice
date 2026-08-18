"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X, Building2, Loader2, Plus, Edit2, Trash2, Save, ChevronDown,
  Database, Settings, Users, History, MapPin, AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import TabOperacionalComponent from "./TabOperacional"

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface CompanyDetail {
  id: string; code: string | null; name: string; tradeName: string | null
  cnpj: string | null; segment: string | null; observations: string | null
  active: boolean; establishmentType: string | null; parentCompanyId: string | null
  parentName: string | null; parentCode: string | null
  zipCode: string | null; street: string | null; number: string | null
  complement: string | null; neighborhood: string | null; city: string | null
  state: string | null; country: string | null
  laborUnionCount: number | null; cctCount: number | null
  establishmentCount: number | null; filialCount: number | null
  laborBaseDate: string | null; complexityGeneral: string | null; situacao: string | null
  branches: { id: string; code: string | null; name: string; active: boolean }[]
}


interface CompanySystem {
  id: string; systemName: string; systemType: string | null; vendor: string | null
  version: string | null; isActive: boolean; observations: string | null
}

interface CompanyProcessConfig {
  id: string; processType: string; volume: number | null
  automationLevel: string | null; avgTimeMinutes: number | null
  isCritical: boolean; observations: string | null
}

interface TeamLink {
  id: string; memberId: string; memberName: string; memberRole_: string | null
  memberStatus: string | null
  memberRole: string | null; startDate: string | null; endDate: string | null
  linkStatus: string | null; participationPct: number | null
  estimatedMonthlyHours: number
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const COMPLEXITY_LABELS: Record<string, string> = {
  BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', MUITO_ALTA: 'Muito Alta',
}
const COMPLEXITY_COLORS: Record<string, string> = {
  BAIXA: 'bg-green-50 text-green-700 border-green-200',
  MEDIA: 'bg-amber-50 text-amber-700 border-amber-200',
  ALTA: 'bg-orange-50 text-orange-700 border-orange-200',
  MUITO_ALTA: 'bg-red-50 text-red-700 border-red-200',
}
const AUTOMATION_LABELS: Record<string, string> = {
  ALTO: 'Alto', MEDIO: 'Médio', BAIXO: 'Baixo', MANUAL: 'Manual',
}
const PROCESS_LABELS: Record<string, string> = {
  FOLHA: 'Folha', ADMISSAO: 'Admissão', RESCISAO: 'Rescisão', FERIAS: 'Férias',
  BENEFICIOS: 'Benefícios', ENCARGOS: 'Encargos', PONTO: 'Ponto',
  ESOCIAL: 'eSocial', FGTS: 'FGTS', DCTFWEB: 'DCTFWeb', OUTROS: 'Outros',
}
const SYSTEM_TYPE_LABELS: Record<string, string> = {
  FOLHA: 'Folha', PONTO: 'Ponto', ERP: 'ERP', BPO: 'BPO', OUTROS: 'Outros',
}
const MEMBER_ROLES: Record<string, string> = {
  RESPONSAVEL: 'Responsável', APOIO: 'Apoio', CONFERENCIA: 'Conferência',
  APROVACAO: 'Aprovação', ADMISSAO: 'Admissão', PONTO: 'Ponto', FOLHA: 'Folha',
  FERIAS: 'Férias', RESCISAO: 'Rescisão', BENEFICIOS: 'Benefícios',
  ENCARGOS: 'Encargos', ATENDIMENTO: 'Atendimento', OUTRO: 'Outro',
}

function formatCnpj(v: string) {
  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}
function fmtDate(v: string | null) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('pt-BR')
}

function Badge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border font-medium", className)}>
      {label}
    </span>
  )
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <div className="text-sm font-medium text-slate-700">{children}</div>
    </div>
  )
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

type TabId = 'identificacao' | 'operacional' | 'processos' | 'sistemas' | 'equipe' | 'historico'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'identificacao', label: 'Identificação', icon: Building2 },
  { id: 'operacional',   label: 'Dados Operacionais', icon: Database },
  { id: 'processos',     label: 'Processos', icon: Settings },
  { id: 'sistemas',      label: 'Sistemas', icon: Database },
  { id: 'equipe',        label: 'Equipe Responsável', icon: Users },
  { id: 'historico',     label: 'Histórico', icon: History },
]

// ─── TAB: IDENTIFICAÇÃO ──────────────────────────────────────────────────────

function TabIdentificacao({ company }: { company: CompanyDetail }) {
  const addr = [
    company.street, company.number, company.complement,
    company.neighborhood, company.city, company.state,
  ].filter(Boolean).join(', ')

  return (
    <div className="space-y-6">
      {/* Dados básicos */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Dados Básicos</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Código">{company.code ?? '—'}</Field>
          <Field label="Tipo">{company.establishmentType === 'FILIAL' ? 'Filial' : 'Matriz'}</Field>
          <Field label="Status">
            <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium",
              company.active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200")}>
              {company.active ? 'Ativa' : 'Inativa'}
            </span>
          </Field>
          <Field label="Razão Social" span>{company.name}</Field>
          {company.tradeName && <Field label="Nome Fantasia" span>{company.tradeName}</Field>}
          <Field label="CNPJ">{company.cnpj ? formatCnpj(company.cnpj) : '—'}</Field>
          <Field label="Segmento">{company.segment ?? '—'}</Field>
          <Field label="Situação">{company.situacao ?? 'ATIVA'}</Field>
        </div>
      </div>

      {/* Endereço */}
      {addr && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Endereço
          </p>
          <p className="text-sm text-slate-700">{addr}</p>
          {company.zipCode && <p className="text-xs text-slate-400 mt-0.5">CEP: {company.zipCode}</p>}
        </div>
      )}

      {/* Referência à Matriz */}
      {company.parentName && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Empresa Matriz</p>
          <p className="text-sm text-slate-700">
            {company.parentCode ? `${company.parentCode} – ` : ''}{company.parentName}
          </p>
        </div>
      )}

      {/* Filiais (só para matriz) */}
      {company.branches.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Filiais ({company.branches.length})
          </p>
          <div className="space-y-1.5">
            {company.branches.map(b => (
              <div key={b.id} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {b.code ?? '—'}
                </span>
                <span className="flex-1 text-slate-700">{b.name}</span>
                <span className={cn("text-xs px-1.5 py-0.5 rounded-full border",
                  b.active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-400 border-slate-200")}>
                  {b.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observações */}
      {company.observations && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Observações</p>
          <p className="text-sm text-slate-600">{company.observations}</p>
        </div>
      )}
    </div>
  )
}

// ─── TAB: DADOS OPERACIONAIS ─────────────────────────────────────────────────
// Implementado em TabOperacional.tsx — importado acima como TabOperacionalComponent

function TabOperacional({ companyId }: { companyId: string }) {
  return <TabOperacionalComponent companyId={companyId} />
}

// ─── TAB: PROCESSOS ──────────────────────────────────────────────────────────

function TabProcessos({ companyId }: { companyId: string }) {
  const [procs, setProcs] = useState<CompanyProcessConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editType, setEditType] = useState<string | null>(null)

  const emptyForm = {
    processType: '', volume: '', automationLevel: '', avgTimeMinutes: '', isCritical: false, observations: '',
  }
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/gestao-equipe/companies/${companyId}/processes`)
    if (res.ok) setProcs(await res.json())
    setLoading(false)
  }, [companyId])

  useEffect(() => { load() }, [load])

  function openEdit(p: CompanyProcessConfig) {
    setEditType(p.processType)
    setForm({
      processType: p.processType, volume: p.volume?.toString() ?? '',
      automationLevel: p.automationLevel ?? '', avgTimeMinutes: p.avgTimeMinutes?.toString() ?? '',
      isCritical: p.isCritical, observations: p.observations ?? '',
    })
    setShowForm(true)
    setError(null)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        processType: form.processType,
        volume: form.volume ? parseFloat(form.volume) : null,
        automationLevel: form.automationLevel || null,
        avgTimeMinutes: form.avgTimeMinutes ? parseFloat(form.avgTimeMinutes) : null,
        isCritical: form.isCritical,
        observations: form.observations || null,
      }
      const res = await fetch(`/api/gestao-equipe/companies/${companyId}/processes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar processo.')
      setShowForm(false)
      setEditType(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally { setSaving(false) }
  }

  async function remove(processType: string) {
    if (!confirm(`Remover processo ${PROCESS_LABELS[processType] ?? processType}?`)) return
    await fetch(`/api/gestao-equipe/companies/${companyId}/processes?processType=${processType}`, { method: 'DELETE' })
    await load()
  }

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const selectClass = `${inputClass} bg-white`

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>

  const usedTypes = procs.map(p => p.processType)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Configuração de Processos</p>
        <button onClick={() => { setEditType(null); setForm(emptyForm); setShowForm(true); setError(null) }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Adicionar processo
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">{editType ? `Editar: ${PROCESS_LABELS[editType] ?? editType}` : 'Novo processo'}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {!editType && (
              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-slate-500 block mb-1">Tipo de processo *</label>
                <select value={form.processType} onChange={e => setForm(p => ({ ...p, processType: e.target.value }))} className={selectClass}>
                  <option value="">Selecionar...</option>
                  {Object.entries(PROCESS_LABELS)
                    .filter(([k]) => !usedTypes.includes(k))
                    .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Volume/mês</label>
              <input type="number" min="0" step="0.1" value={form.volume}
                onChange={e => setForm(p => ({ ...p, volume: e.target.value }))} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Automação</label>
              <select value={form.automationLevel} onChange={e => setForm(p => ({ ...p, automationLevel: e.target.value }))} className={selectClass}>
                <option value="">Não informado</option>
                {Object.entries(AUTOMATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Tempo médio (min)</label>
              <input type="number" min="0" step="1" value={form.avgTimeMinutes}
                onChange={e => setForm(p => ({ ...p, avgTimeMinutes: e.target.value }))} className={inputClass} placeholder="0" />
            </div>
            <div className="sm:col-span-3 flex items-center gap-2">
              <input type="checkbox" id="isCritical" checked={form.isCritical}
                onChange={e => setForm(p => ({ ...p, isCritical: e.target.checked }))} className="w-4 h-4 accent-red-600" />
              <label htmlFor="isCritical" className="text-xs font-medium text-red-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Processo crítico (sem substituto)
              </label>
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs font-medium text-slate-500 block mb-1">Observações</label>
              <input value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))}
                className={inputClass} placeholder="Observações..." />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setShowForm(false); setEditType(null) }} className="text-xs text-slate-500 px-3 py-2 rounded-lg border border-slate-200">Cancelar</button>
            <button onClick={save} disabled={saving || (!editType && !form.processType)}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
            </button>
          </div>
        </div>
      )}

      {procs.length === 0 && !showForm ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Nenhum processo configurado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {procs.map(p => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800">{PROCESS_LABELS[p.processType] ?? p.processType}</span>
                  {p.isCritical && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                      <AlertTriangle className="w-2.5 h-2.5" /> Crítico
                    </span>
                  )}
                  {p.automationLevel && (
                    <Badge label={AUTOMATION_LABELS[p.automationLevel] ?? p.automationLevel}
                      className="bg-slate-100 text-slate-600 border-slate-200" />
                  )}
                </div>
                <div className="flex gap-3 text-xs text-slate-400 mt-1">
                  {p.volume != null && <span>{p.volume} mov/mês</span>}
                  {p.avgTimeMinutes != null && <span>{p.avgTimeMinutes} min/exec</span>}
                  {p.observations && <span>{p.observations}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-blue-600 transition-colors p-1">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(p.processType)} className="text-slate-400 hover:text-red-600 transition-colors p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TAB: SISTEMAS ───────────────────────────────────────────────────────────

function TabSistemas({ companyId }: { companyId: string }) {
  const [systems, setSystems] = useState<CompanySystem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emptyForm = { systemName: '', systemType: '', vendor: '', version: '', isActive: true, observations: '' }
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/gestao-equipe/companies/${companyId}/systems`)
    if (res.ok) setSystems(await res.json())
    setLoading(false)
  }, [companyId])

  useEffect(() => { load() }, [load])

  function openNew() { setEditId(null); setForm(emptyForm); setShowForm(true); setError(null) }
  function openEdit(s: CompanySystem) {
    setEditId(s.id)
    setForm({ systemName: s.systemName, systemType: s.systemType ?? '', vendor: s.vendor ?? '',
      version: s.version ?? '', isActive: s.isActive, observations: s.observations ?? '' })
    setShowForm(true); setError(null)
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      let res: Response
      if (editId) {
        res = await fetch(`/api/gestao-equipe/companies/${companyId}/systems/${editId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        res = await fetch(`/api/gestao-equipe/companies/${companyId}/systems`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.')
      setShowForm(false); await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao salvar.') }
    finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Remover sistema?')) return
    await fetch(`/api/gestao-equipe/companies/${companyId}/systems/${id}`, { method: 'DELETE' })
    await load()
  }

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const selectClass = `${inputClass} bg-white`

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Sistemas Utilizados</p>
        <button onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Novo sistema
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">{editId ? 'Editar sistema' : 'Novo sistema'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500 block mb-1">Nome do sistema *</label>
              <input value={form.systemName} onChange={e => setForm(p => ({ ...p, systemName: e.target.value }))}
                className={inputClass} placeholder="ex: METADADOS, SISMONACO, SECULLUM..." />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Tipo</label>
              <select value={form.systemType} onChange={e => setForm(p => ({ ...p, systemType: e.target.value }))} className={selectClass}>
                <option value="">Não informado</option>
                {Object.entries(SYSTEM_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Fornecedor</label>
              <input value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))}
                className={inputClass} placeholder="ex: Totvs, Senior..." />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Versão</label>
              <input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
                className={inputClass} placeholder="ex: 12.1.x" />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="sysActive" checked={form.isActive}
                onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="sysActive" className="text-xs font-medium text-slate-600">Sistema em uso</label>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500 block mb-1">Observações</label>
              <input value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))}
                className={inputClass} placeholder="Observações..." />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="text-xs text-slate-500 px-3 py-2 rounded-lg border border-slate-200">Cancelar</button>
            <button onClick={save} disabled={saving || !form.systemName.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
            </button>
          </div>
        </div>
      )}

      {systems.length === 0 && !showForm ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Nenhum sistema cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {systems.map(s => (
            <div key={s.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
              <div className={cn("w-2 h-2 rounded-full shrink-0", s.isActive ? "bg-green-500" : "bg-slate-300")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{s.systemName}</span>
                  {s.systemType && (
                    <Badge label={SYSTEM_TYPE_LABELS[s.systemType] ?? s.systemType}
                      className="bg-slate-100 text-slate-600 border-slate-200" />
                  )}
                  {!s.isActive && <Badge label="Inativo" className="bg-slate-50 text-slate-400 border-slate-200" />}
                </div>
                <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                  {s.vendor && <span>{s.vendor}</span>}
                  {s.version && <span>v{s.version}</span>}
                  {s.observations && <span>{s.observations}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(s)} className="text-slate-400 hover:text-blue-600 transition-colors p-1">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(s.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TAB: EQUIPE RESPONSÁVEL ─────────────────────────────────────────────────

function TabEquipe({ companyId }: { companyId: string }) {
  const [data, setData] = useState<{ company: any; team: TeamLink[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/gestao-equipe/companies/${companyId}/team`)
      .then(r => r.json())
      .then(d => { if (d && Array.isArray(d.team)) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
  if (!data) return <div className="text-sm text-red-600 py-4">Não foi possível carregar a equipe.</div>

  const { team = [] } = data
  if (!team.length) return (
    <div className="text-center py-12 text-slate-400 text-sm">
      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p>Nenhum colaborador vinculado a esta empresa.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-700">{team.length} colaborador(es) vinculado(s)</p>
      {team.map(l => (
        <div key={l.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {l.memberName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-800">{l.memberName}</p>
              {l.memberRole && (
                <Badge label={MEMBER_ROLES[l.memberRole] ?? l.memberRole}
                  className="bg-blue-50 text-blue-700 border-blue-100" />
              )}
              {l.linkStatus && l.linkStatus !== 'ATIVO' && (
                <Badge label={l.linkStatus}
                  className="bg-slate-100 text-slate-500 border-slate-200" />
              )}
            </div>
            <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
              {l.memberRole_ && <span>{l.memberRole_}</span>}
              {l.estimatedMonthlyHours > 0 && <span>{l.estimatedMonthlyHours}h/mês estimadas</span>}
              {l.participationPct != null && <span>{l.participationPct}% dedicação</span>}
              {l.startDate && <span>Desde {fmtDate(l.startDate)}</span>}
              {l.endDate && <span>Até {fmtDate(l.endDate)}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── TAB: HISTÓRICO ──────────────────────────────────────────────────────────

function TabHistorico({ company }: { company: CompanyDetail }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><p className="text-slate-400">ID Empresa</p><p className="font-mono text-slate-600 text-[10px] break-all">{company.id}</p></div>
          <div><p className="text-slate-400">Status</p><p className="font-medium text-slate-700">{company.active ? 'Ativa' : 'Inativa'}</p></div>
        </div>
        <p className="text-xs text-slate-400 mt-3">Histórico detalhado de alterações será implementado na próxima fase.</p>
      </div>
    </div>
  )
}

// ─── MODAL PRINCIPAL ─────────────────────────────────────────────────────────

interface Props {
  companyId: string
  onClose: () => void
}

export default function CompanyDetailModal({ companyId, onClose }: Props) {
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('identificacao')

  useEffect(() => {
    fetch(`/api/gestao-equipe/companies/${companyId}`)
      .then(r => r.json())
      .then(setCompany)
      .finally(() => setLoading(false))
  }, [companyId])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl my-8">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
            ) : (
              <>
                <h2 className="text-base font-bold text-slate-900 truncate">
                  {company?.code ? `${company.code} – ` : ''}{company?.name ?? 'Empresa'}
                </h2>
                {company?.tradeName && <p className="text-xs text-slate-400">{company.tradeName}</p>}
              </>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs nav */}
        <div className="flex gap-0.5 px-6 pt-3 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-t-lg border-b-2 transition-colors whitespace-nowrap",
                  activeTab === t.id
                    ? "border-blue-600 text-blue-700 bg-blue-50"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : !company ? (
            <div className="text-center py-12 text-red-600 text-sm">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              Não foi possível carregar os dados da empresa.
            </div>
          ) : (
            <>
              {activeTab === 'identificacao' && <TabIdentificacao company={company} />}
              {activeTab === 'operacional'   && <TabOperacional companyId={companyId} />}
              {activeTab === 'processos'     && <TabProcessos companyId={companyId} />}
              {activeTab === 'sistemas'      && <TabSistemas companyId={companyId} />}
              {activeTab === 'equipe'        && <TabEquipe companyId={companyId} />}
              {activeTab === 'historico'     && <TabHistorico company={company} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
