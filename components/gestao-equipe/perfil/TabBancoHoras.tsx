"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Clock, Plus, RefreshCw, Download, ChevronDown, AlertTriangle,
  CheckCircle2, Loader2, X, FileDown, Settings, Trash2, TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

interface HBEntry {
  id: string; entryDate: string; competence: string; type: string
  creditMinutes: number; debitMinutes: number; creditFmt: string; debitFmt: string
  responsible: string | null; observations: string | null; status: string; createdAt: string
}

interface HBCompetence {
  competence: string; creditMinutes: number; debitMinutes: number
  adjustMinutes: number; expiredMinutes: number; balanceMinutes: number
  balanceFmt: string; compensateFrom: string; compensateTo: string
  daysLeft: number; situation: string
}

interface HBSummary {
  totalCreditMinutes: number; totalDebitMinutes: number; totalExpiredMinutes: number
  balanceMinutes: number; balanceFmt: string; situation: string
  nextExpiry: { competence: string; compensateTo: string; daysLeft: number; balanceMinutes: number } | null
}

interface HBConfig {
  compensationDays: number; alertDaysBeforeExp: number
  maxCreditHours: number | null; negativeBalance: boolean; observations: string | null
}

interface HBChartItem { month: string; credit: number; debit: number; balance: number }

interface HBData {
  summary: HBSummary; competences: HBCompetence[]; entries: HBEntry[]
  config: HBConfig; chartData: HBChartItem[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  LANCAMENTO: 'Lançamento', COMPENSACAO: 'Compensação',
  AJUSTE: 'Ajuste', VENCIMENTO: 'Vencimento', IMPORTACAO: 'Importação',
}
const SIT_CONFIG: Record<string, { label: string; icon: string; cls: string }> = {
  REGULAR:  { label: 'Regular',  icon: '🟢', cls: 'bg-green-50  text-green-700  border-green-200'  },
  ATENCAO:  { label: 'Atenção',  icon: '🟡', cls: 'bg-amber-50  text-amber-700  border-amber-200'  },
  VENCIDO:  { label: 'Vencido',  icon: '🔴', cls: 'bg-red-50    text-red-700    border-red-200'    },
  NEGATIVO: { label: 'Negativo', icon: '🔴', cls: 'bg-red-50    text-red-700    border-red-200'    },
  ZERADO:   { label: 'Zerado',   icon: '⚪', cls: 'bg-slate-50  text-slate-500  border-slate-200'  },
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function monthLabel(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${months[parseInt(m)-1]}/${y.slice(2)}`
}

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
const labelCls = "block text-xs text-slate-500 mb-1"

// ─── Inline bar chart ─────────────────────────────────────────────────────────

function ChartBar({ data }: { data: HBChartItem[] }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.credit, d.debit)), 1)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5" /> Evolução Mensal
      </p>
      <div className="flex items-end gap-1 h-28 overflow-x-auto pb-1">
        {data.map(d => {
          const cH = Math.round((d.credit / maxVal) * 80)
          const dH = Math.round((d.debit  / maxVal) * 80)
          return (
            <div key={d.month} className="flex flex-col items-center gap-0.5 min-w-[32px]">
              <div className="flex items-end gap-0.5 h-20">
                {d.credit > 0  && <div title={`Crédito: ${Math.round(d.credit/60)}h`}  className="w-3 bg-blue-400  rounded-t"    style={{ height: cH + 'px' }} />}
                {d.debit  > 0  && <div title={`Débito: ${Math.round(d.debit/60)}h`}    className="w-3 bg-orange-400 rounded-t"   style={{ height: dH + 'px' }} />}
                {d.credit === 0 && d.debit === 0 && <div className="w-3 bg-slate-100 rounded-t" style={{ height: '4px' }} />}
              </div>
              <p className="text-[9px] text-slate-400 rotate-45 origin-left mt-2 whitespace-nowrap">{monthLabel(d.month)}</p>
            </div>
          )
        })}
      </div>
      <div className="flex gap-4 mt-6 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Crédito</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Débito/Comp.</span>
      </div>
    </div>
  )
}

// ─── Entry form ───────────────────────────────────────────────────────────────

interface EntryFormProps {
  memberId: string
  onSaved: () => void
  onCancel: () => void
  initial?: Partial<HBEntry>
}

function EntryForm({ memberId, onSaved, onCancel, initial }: EntryFormProps) {
  const isEdit = Boolean(initial?.id)
  const [form, setForm] = useState({
    entryDate:     initial?.entryDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    competence:    initial?.competence ?? new Date().toISOString().slice(0, 7),
    type:          initial?.type ?? 'LANCAMENTO',
    creditH:       initial ? String(Math.floor(initial.creditMinutes! / 60)) : '0',
    creditM:       initial ? String(initial.creditMinutes! % 60)             : '0',
    debitH:        initial ? String(Math.floor(initial.debitMinutes! / 60))  : '0',
    debitM:        initial ? String(initial.debitMinutes! % 60)              : '0',
    responsible:   initial?.responsible ?? '',
    observations:  initial?.observations ?? '',
  })
  const [saving, setSaving] = useState(false)

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  async function submit() {
    setSaving(true)
    const creditMinutes = parseInt(form.creditH || '0') * 60 + parseInt(form.creditM || '0')
    const debitMinutes  = parseInt(form.debitH  || '0') * 60 + parseInt(form.debitM  || '0')
    const payload = {
      entryDate: form.entryDate, competence: form.competence, type: form.type,
      creditMinutes, debitMinutes,
      responsible: form.responsible || null, observations: form.observations || null,
    }
    const url = isEdit
      ? `/api/gestao-equipe/members/${memberId}/banco-horas/${initial!.id}`
      : `/api/gestao-equipe/members/${memberId}/banco-horas`
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    if (res.ok) onSaved()
  }

  const showCredit = ['LANCAMENTO', 'IMPORTACAO', 'AJUSTE'].includes(form.type)
  const showDebit  = ['COMPENSACAO', 'VENCIMENTO', 'AJUSTE'].includes(form.type)

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-4">
      <p className="text-sm font-semibold text-slate-700">{isEdit ? 'Editar Lançamento' : 'Novo Lançamento'}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Tipo *</label>
          <select value={form.type} onChange={f('type')} className={inputCls}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Data *</label>
          <input type="date" value={form.entryDate} onChange={f('entryDate')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Competência (AAAA-MM) *</label>
          <input type="month" value={form.competence} onChange={f('competence')} className={inputCls} />
        </div>
        {showCredit && (
          <>
            <div>
              <label className={labelCls}>Crédito — Horas</label>
              <input type="number" min="0" value={form.creditH} onChange={f('creditH')} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Crédito — Minutos</label>
              <input type="number" min="0" max="59" value={form.creditM} onChange={f('creditM')} className={inputCls} placeholder="0" />
            </div>
          </>
        )}
        {showDebit && (
          <>
            <div>
              <label className={labelCls}>Débito — Horas</label>
              <input type="number" min="0" value={form.debitH} onChange={f('debitH')} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Débito — Minutos</label>
              <input type="number" min="0" max="59" value={form.debitM} onChange={f('debitM')} className={inputCls} placeholder="0" />
            </div>
          </>
        )}
        <div>
          <label className={labelCls}>Responsável</label>
          <input type="text" value={form.responsible} onChange={f('responsible')} className={inputCls} placeholder="Nome" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Observações</label>
        <textarea value={form.observations} onChange={f('observations')} rows={2} className={inputCls} placeholder="Opcional" />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg border border-slate-200">Cancelar</button>
        <button onClick={submit} disabled={saving}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {isEdit ? 'Salvar' : 'Registrar'}
        </button>
      </div>
    </div>
  )
}

// ─── Config form ──────────────────────────────────────────────────────────────

function ConfigForm({ memberId, config, onSaved, onCancel }: { memberId: string; config: HBConfig; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    compensationDays:   String(config.compensationDays),
    alertDaysBeforeExp: String(config.alertDaysBeforeExp),
    maxCreditHours:     config.maxCreditHours != null ? String(config.maxCreditHours) : '',
    negativeBalance:    config.negativeBalance,
    observations:       config.observations ?? '',
  })
  const [saving, setSaving] = useState(false)
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  async function submit() {
    setSaving(true)
    await fetch(`/api/gestao-equipe/members/${memberId}/banco-horas/config`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compensationDays:   parseInt(form.compensationDays)   || 180,
        alertDaysBeforeExp: parseInt(form.alertDaysBeforeExp) || 30,
        maxCreditHours:     form.maxCreditHours ? parseInt(form.maxCreditHours) : null,
        negativeBalance:    form.negativeBalance,
        observations:       form.observations || null,
      }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
      <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Settings className="w-4 h-4" /> Configuração</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Prazo de compensação (dias)</label>
          <input type="number" min="1" value={form.compensationDays} onChange={f('compensationDays')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Alertar (dias antes)</label>
          <input type="number" min="1" value={form.alertDaysBeforeExp} onChange={f('alertDaysBeforeExp')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Limite crédito (horas)</label>
          <input type="number" min="0" value={form.maxCreditHours} onChange={f('maxCreditHours')} className={inputCls} placeholder="Sem limite" />
        </div>
        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer mt-4">
            <input type="checkbox" checked={form.negativeBalance} onChange={e => setForm(p => ({ ...p, negativeBalance: e.target.checked }))} />
            Permite saldo negativo
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg border border-slate-200">Cancelar</button>
        <button onClick={submit} disabled={saving}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Salvar
        </button>
      </div>
    </div>
  )
}

// ─── Main tab component ───────────────────────────────────────────────────────

export function TabBancoHoras({ memberId, onChanged }: { memberId: string; onChanged?: () => void }) {
  const [data, setData]                   = useState<HBData | null>(null)
  const [loading, setLoading]             = useState(true)
  const [showForm, setShowForm]           = useState(false)
  const [editEntry, setEditEntry]         = useState<HBEntry | null>(null)
  const [showConfig, setShowConfig]       = useState(false)
  const [activeSection, setActiveSection] = useState<'competences' | 'entries'>('competences')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/gestao-equipe/members/${memberId}/banco-horas`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [memberId])

  useEffect(() => { load() }, [load])

  async function deleteEntry(id: string) {
    if (!confirm('Estornar este lançamento?')) return
    await fetch(`/api/gestao-equipe/members/${memberId}/banco-horas/${id}`, { method: 'DELETE' })
    load()
    onChanged?.()
  }

  function downloadReport(format: 'xlsx' | 'pdf') {
    const a = document.createElement('a')
    a.href = `/api/gestao-equipe/members/${memberId}/banco-horas/report?format=${format}`
    a.download = `banco-horas.${format}`
    a.click()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  const { summary, competences, entries, config, chartData } = data!

  const sit = SIT_CONFIG[summary.situation] ?? SIT_CONFIG.REGULAR
  const balanceNeg = summary.balanceMinutes < 0
  const balanceCls = balanceNeg ? 'text-red-600' : summary.balanceMinutes === 0 ? 'text-slate-400' : 'text-green-600'

  // Alerts
  const alerts: { type: 'error' | 'warn' | 'info'; msg: string }[] = []
  if (summary.balanceMinutes < 0) alerts.push({ type: 'error', msg: 'Saldo negativo — colaborador deve horas.' })
  if (summary.totalExpiredMinutes > 0) alerts.push({ type: 'error', msg: `${Math.round(summary.totalExpiredMinutes/60)}h vencidas sem compensação.` })
  if (summary.nextExpiry && summary.nextExpiry.daysLeft <= config.alertDaysBeforeExp && summary.nextExpiry.daysLeft > 0)
    alerts.push({ type: 'warn', msg: `Competência ${summary.nextExpiry.competence} vence em ${summary.nextExpiry.daysLeft} dias (${new Date(summary.nextExpiry.compensateTo).toLocaleDateString('pt-BR')}).` })
  if (config.maxCreditHours && summary.totalCreditMinutes / 60 > config.maxCreditHours)
    alerts.push({ type: 'warn', msg: `Saldo de créditos (${Math.round(summary.totalCreditMinutes/60)}h) excede o limite configurado (${config.maxCreditHours}h).` })

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <Clock className="w-4 h-4" /> Banco de Horas
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={load}
            className="inline-flex items-center gap-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-500 hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
          <button onClick={() => setShowConfig(v => !v)}
            className="inline-flex items-center gap-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors">
            <Settings className="w-3.5 h-3.5" /> Config.
          </button>
          <button onClick={() => { setEditEntry(null); setShowForm(v => !v) }}
            className="inline-flex items-center gap-1 text-xs bg-blue-600 text-white rounded-lg px-2.5 py-1.5 hover:bg-blue-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Lançar
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

      {/* Config form */}
      {showConfig && (
        <ConfigForm memberId={memberId} config={config} onSaved={() => { setShowConfig(false); load() }} onCancel={() => setShowConfig(false)} />
      )}

      {/* Entry form */}
      {(showForm && !editEntry) && (
        <EntryForm memberId={memberId} onSaved={() => { setShowForm(false); load(); onChanged?.() }} onCancel={() => setShowForm(false)} />
      )}
      {editEntry && (
        <EntryForm memberId={memberId} initial={editEntry} onSaved={() => { setEditEntry(null); load(); onChanged?.() }} onCancel={() => setEditEntry(null)} />
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map((a, i) => (
            <div key={i} className={cn("flex items-start gap-2 rounded-lg px-3 py-2 text-xs border",
              a.type === 'error' ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <p className={cn("text-xl font-bold", balanceCls)}>{summary.balanceFmt}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Saldo Atual</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <p className="text-xl font-bold text-blue-600">
            {summary.totalCreditMinutes ? `${Math.floor(summary.totalCreditMinutes/60)}h${summary.totalCreditMinutes%60>0?String(summary.totalCreditMinutes%60).padStart(2,'0'):''}` : '0h'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Total Créditos</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <p className="text-xl font-bold text-orange-500">
            {summary.totalDebitMinutes ? `${Math.floor(summary.totalDebitMinutes/60)}h${summary.totalDebitMinutes%60>0?String(summary.totalDebitMinutes%60).padStart(2,'0'):''}` : '0h'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Horas Compensadas</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <p className={cn("text-xl font-bold", summary.totalExpiredMinutes > 0 ? "text-red-600" : "text-slate-400")}>
            {summary.totalExpiredMinutes ? `${Math.floor(summary.totalExpiredMinutes/60)}h` : '0h'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Horas Vencidas</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          {summary.nextExpiry ? (
            <>
              <p className="text-sm font-bold text-slate-700">{new Date(summary.nextExpiry.compensateTo).toLocaleDateString('pt-BR')}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{summary.nextExpiry.daysLeft > 0 ? `em ${summary.nextExpiry.daysLeft} dias` : 'Vencido'}</p>
              <p className="text-[10px] text-slate-300">Próx. vencimento</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-300">—</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Próx. vencimento</p>
            </>
          )}
        </div>
        <div className={cn("rounded-xl border p-3 text-center", sit.cls)}>
          <p className="text-base font-bold">{sit.icon} {sit.label}</p>
          <p className="text-[11px] mt-0.5 opacity-70">Situação</p>
        </div>
      </div>

      {/* Chart */}
      <ChartBar data={chartData} />

      {/* Section selector */}
      <div className="flex border-b border-slate-200">
        {(['competences','entries'] as const).map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={cn("px-4 py-2 text-xs font-medium border-b-2 transition-colors",
              activeSection === s ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}>
            {s === 'competences' ? `Competências (${competences.length})` : `Movimentações (${entries.length})`}
          </button>
        ))}
      </div>

      {/* Competences table */}
      {activeSection === 'competences' && (
        <>
          {competences.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma competência registrada.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="px-3 py-2 text-left font-medium">Competência</th>
                    <th className="px-3 py-2 text-right font-medium">Créditos</th>
                    <th className="px-3 py-2 text-right font-medium">Compensações</th>
                    <th className="px-3 py-2 text-right font-medium">Vencidos</th>
                    <th className="px-3 py-2 text-right font-medium">Saldo</th>
                    <th className="px-3 py-2 text-center font-medium">Comp. até</th>
                    <th className="px-3 py-2 text-center font-medium">Dias</th>
                    <th className="px-3 py-2 text-center font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {competences.map(c => {
                    const s = SIT_CONFIG[c.situation] ?? SIT_CONFIG.REGULAR
                    return (
                      <tr key={c.competence} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-700">{monthLabel(c.competence)}</td>
                        <td className="px-3 py-2 text-right text-blue-600 font-medium">{c.creditMinutes > 0 ? `+${Math.floor(c.creditMinutes/60)}h${c.creditMinutes%60>0?String(c.creditMinutes%60).padStart(2,'0'):''}` : '—'}</td>
                        <td className="px-3 py-2 text-right text-orange-500">{c.debitMinutes > 0 ? `${Math.floor(c.debitMinutes/60)}h${c.debitMinutes%60>0?String(c.debitMinutes%60).padStart(2,'0'):''}` : '—'}</td>
                        <td className="px-3 py-2 text-right text-red-500">{c.expiredMinutes > 0 ? `${Math.floor(c.expiredMinutes/60)}h` : '—'}</td>
                        <td className={cn("px-3 py-2 text-right font-bold", c.balanceMinutes < 0 ? "text-red-600" : c.balanceMinutes === 0 ? "text-slate-300" : "text-green-600")}>{c.balanceFmt}</td>
                        <td className="px-3 py-2 text-center text-slate-500">{new Date(c.compensateTo).toLocaleDateString('pt-BR')}</td>
                        <td className="px-3 py-2 text-center text-slate-500">{c.daysLeft > 0 ? `${c.daysLeft}d` : <span className="text-red-500">Vencido</span>}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", s.cls)}>{s.icon} {s.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Entries table */}
      {activeSection === 'entries' && (
        <>
          {entries.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma movimentação registrada.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="px-3 py-2 text-left font-medium">Data</th>
                    <th className="px-3 py-2 text-left font-medium">Competência</th>
                    <th className="px-3 py-2 text-left font-medium">Tipo</th>
                    <th className="px-3 py-2 text-right font-medium">Crédito</th>
                    <th className="px-3 py-2 text-right font-medium">Débito</th>
                    <th className="px-3 py-2 text-left font-medium">Responsável</th>
                    <th className="px-3 py-2 text-left font-medium">Observação</th>
                    <th className="px-3 py-2 text-center font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-600">{fmtDate(e.entryDate)}</td>
                      <td className="px-3 py-2 text-slate-600">{monthLabel(e.competence)}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{TYPE_LABELS[e.type] ?? e.type}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-blue-600 font-medium">{e.creditMinutes > 0 ? e.creditFmt : '—'}</td>
                      <td className="px-3 py-2 text-right text-orange-500">{e.debitMinutes > 0 ? e.debitFmt : '—'}</td>
                      <td className="px-3 py-2 text-slate-500 truncate max-w-[120px]">{e.responsible ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-400 truncate max-w-[160px]">{e.observations ?? '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setEditEntry(e)} title="Editar"
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteEntry(e.id)} title="Estornar"
                            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-slate-400 text-center pt-2">
        Banco de horas calculado com base nos lançamentos registrados. Prazo de compensação: {config.compensationDays} dias.
      </p>
    </div>
  )
}

// ─── Header summary (for modal header) ───────────────────────────────────────

export function HourBankHeaderSummary({ memberId }: { memberId: string }) {
  const [data, setData] = useState<{ balanceFmt: string; nextExpiry: { compensateTo: string } | null; totalExpiredMinutes: number; situation: string } | null>(null)

  useEffect(() => {
    fetch(`/api/gestao-equipe/members/${memberId}/banco-horas`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d ? setData(d.summary) : null)
      .catch(() => {})
  }, [memberId])

  if (!data) return null

  const sit = SIT_CONFIG[data.situation] ?? SIT_CONFIG.REGULAR

  return (
    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
      <div className="flex items-center gap-1">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>Banco de Horas:</span>
        <span className={cn("font-semibold", data.situation === 'NEGATIVO' || data.situation === 'VENCIDO' ? "text-red-600" : "text-green-600")}>
          {data.balanceFmt}
        </span>
      </div>
      {data.nextExpiry && (
        <div className="flex items-center gap-1">
          <span>Próx. venc.:</span>
          <span className="font-medium">{new Date(data.nextExpiry.compensateTo).toLocaleDateString('pt-BR')}</span>
        </div>
      )}
      {data.totalExpiredMinutes > 0 && (
        <div className="flex items-center gap-1 text-red-500">
          <AlertTriangle className="w-3 h-3" />
          <span>{Math.round(data.totalExpiredMinutes/60)}h vencidas</span>
        </div>
      )}
    </div>
  )
}
