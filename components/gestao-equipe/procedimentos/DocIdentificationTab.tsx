"use client"

import { useState, useEffect } from "react"
import { Save, Loader2, Tag, Info, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface IdentificationDoc {
  id: string; type: string; title: string; code?: string | null
  subtitle?: string | null; category?: string | null; macroprocess?: string | null
  process?: string | null; processId?: string | null
  department?: string | null; unit?: string | null; company?: string | null
  targetAudience?: string | null; scope?: string | null
  infoClassification?: string | null; legalBasis?: string | null
  retentionPeriod?: string | null; status?: string; version?: string | null
  revisionNumber?: number | null; elaborationDate?: string | null
  approvalDate?: string | null; effectiveDate?: string | null
  nextReview?: string | null; reviewPeriodicity?: string | null
  creationReason?: string | null; revisionReason?: string | null
  replacedDocument?: string | null; successorDocument?: string | null
  tags?: string | null; keywords?: string | null
}

const INFO_CLASSIFICATION = [
  { value: 'PUBLICA',               label: 'Pública',                color: 'bg-green-100 text-green-700' },
  { value: 'USO_INTERNO',           label: 'Uso Interno',            color: 'bg-blue-100 text-blue-700' },
  { value: 'CONFIDENCIAL',          label: 'Confidencial',           color: 'bg-amber-100 text-amber-700' },
  { value: 'RESTRITA',              label: 'Restrita',               color: 'bg-red-100 text-red-700' },
  { value: 'DADOS_PESSOAIS',        label: 'Dados Pessoais',         color: 'bg-violet-100 text-violet-700' },
  { value: 'DADOS_PESSOAIS_SENSIVEIS', label: 'Dados Pessoais Sensíveis', color: 'bg-rose-100 text-rose-700' },
]

const REVIEW_PERIODS = ['Mensal', 'Trimestral', 'Semestral', 'Anual', 'Bienal', 'Conforme demanda']
const CATEGORIES     = ['Operacional', 'Gestão', 'Apoio', 'Estratégico', 'Qualidade', 'SST', 'Meio Ambiente', 'Jurídico', 'TI', 'Financeiro', 'RH/DP', 'Conformidade']

// ─── Campos auxiliares ────────────────────────────────────────────────────────

function SInput({ label, value, onChange, placeholder = '', required }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      />
    </div>
  )
}

function STextarea({ label, value, onChange, rows = 2, placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void
  rows?: number; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <textarea
        rows={rows} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-y"
      />
    </div>
  )
}

function SSelect({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function SDate({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input
        type="date" value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      />
    </div>
  )
}

// ─── Indicador de Completude ──────────────────────────────────────────────────

function CompletenessBar({ fields }: { fields: Record<string, string | null | undefined> }) {
  const required = ['title', 'code', 'process', 'department', 'category', 'targetAudience',
    'elaborationDate', 'reviewPeriodicity', 'creationReason']
  const optional = ['subtitle', 'macroprocess', 'unit', 'company', 'scope',
    'infoClassification', 'effectiveDate', 'nextReview', 'keywords', 'tags']

  const filledReq = required.filter(k => !!fields[k]).length
  const filledOpt = optional.filter(k => !!fields[k]).length
  const pct = Math.round((filledReq / required.length) * 70 + (filledOpt / optional.length) * 30)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-600">Completude da Identificação</p>
        <span className={cn(
          "text-sm font-bold",
          pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'
        )}>{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className={cn("h-2 rounded-full transition-all duration-500",
            pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {required.filter(k => !fields[k]).map(k => (
          <span key={k} className="text-[10px] bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full">
            {k}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Seção com acordeão ───────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <span className={cn("text-slate-400 transition-transform", open ? "rotate-180" : "")}>▾</span>
      </button>
      {open && <div className="px-5 pb-5 space-y-3 border-t border-slate-100">{children}</div>}
    </div>
  )
}

// ─── Tab Principal ─────────────────────────────────────────────────────────────

export function DocIdentificationTab({
  doc,
  onSaved,
}: {
  doc: IdentificationDoc
  onSaved: (updated: IdentificationDoc) => void
}) {
  const [form, setForm] = useState({
    title:              doc.title             ?? '',
    code:               doc.code              ?? '',
    subtitle:           doc.subtitle          ?? '',
    category:           doc.category          ?? '',
    macroprocess:       doc.macroprocess      ?? '',
    process:            doc.process           ?? '',
    department:         doc.department        ?? '',
    unit:               doc.unit              ?? '',
    company:            doc.company           ?? '',
    targetAudience:     doc.targetAudience    ?? '',
    scope:              doc.scope             ?? '',
    infoClassification: doc.infoClassification ?? 'USO_INTERNO',
    legalBasis:         doc.legalBasis        ?? '',
    retentionPeriod:    doc.retentionPeriod   ?? '',
    version:            doc.version           ?? 'v1.0',
    elaborationDate:    doc.elaborationDate   ?? '',
    approvalDate:       doc.approvalDate      ?? '',
    effectiveDate:      doc.effectiveDate     ?? '',
    nextReview:         doc.nextReview        ?? '',
    reviewPeriodicity:  doc.reviewPeriodicity ?? '',
    creationReason:     doc.creationReason    ?? '',
    revisionReason:     doc.revisionReason    ?? '',
    replacedDocument:   doc.replacedDocument  ?? '',
    successorDocument:  doc.successorDocument ?? '',
    tags:               doc.tags              ?? '',
    keywords:           doc.keywords          ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  function set(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/procedures/${doc.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const updated = await res.json()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onSaved(updated)
    } catch (err) {
      console.error('[DocIdentificationTab.save]', err)
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const classif = INFO_CLASSIFICATION.find(c => c.value === form.infoClassification)
  const isPersonalData = form.infoClassification === 'DADOS_PESSOAIS' || form.infoClassification === 'DADOS_PESSOAIS_SENSIVEIS'

  return (
    <div className="space-y-4">
      <CompletenessBar fields={form} />

      {/* Ação */}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Salvando…</>
            : saved
              ? <><CheckCircle2 className="w-4 h-4 mr-1 text-emerald-400" />Salvo!</>
              : <><Save className="w-4 h-4 mr-1" />Salvar Identificação</>}
        </Button>
      </div>

      {/* 1. Documento */}
      <Section title="1. Identificação do Documento">
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <SInput label="Título *" value={form.title} onChange={v => set('title', v)} required placeholder="Ex: POP de Admissão de Colaboradores" />
          <SInput label="Subtítulo" value={form.subtitle} onChange={v => set('subtitle', v)} placeholder="Complemento do título" />
          <SInput label="Código do Documento" value={form.code} onChange={v => set('code', v)} placeholder="Gerado automaticamente — editável" />
          <SInput label="Versão" value={form.version} onChange={v => set('version', v)} placeholder="v1.0" />
          <SSelect label="Categoria" value={form.category} onChange={v => set('category', v)}
            options={CATEGORIES.map(c => ({ value: c, label: c }))} placeholder="— Selecione —" />
          <SInput label="Macroprocesso" value={form.macroprocess} onChange={v => set('macroprocess', v)} placeholder="Ex: Gestão de Pessoas" />
        </div>
      </Section>

      {/* 2. Escopo e Aplicação */}
      <Section title="2. Escopo e Aplicação">
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <SInput label="Processo Relacionado" value={form.process} onChange={v => set('process', v)} placeholder="Ex: Admissão" />
          <SInput label="Área / Departamento" value={form.department} onChange={v => set('department', v)} placeholder="Ex: Departamento Pessoal" />
          <SInput label="Empresa" value={form.company} onChange={v => set('company', v)} placeholder="Razão social ou nome" />
          <SInput label="Unidade" value={form.unit} onChange={v => set('unit', v)} placeholder="Ex: Sede / Filial SP" />
        </div>
        <STextarea label="Público-alvo" value={form.targetAudience} onChange={v => set('targetAudience', v)}
          placeholder="Quem deve ler / cumprir este documento" rows={2} />
        <STextarea label="Escopo de Aplicação" value={form.scope} onChange={v => set('scope', v)}
          placeholder="Onde e quando este documento se aplica" rows={2} />
      </Section>

      {/* 3. Classificação da Informação */}
      <Section title="3. Classificação da Informação">
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-600 mb-2">Nível de Classificação</p>
          <div className="flex flex-wrap gap-2">
            {INFO_CLASSIFICATION.map(c => (
              <button
                key={c.value}
                onClick={() => set('infoClassification', c.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  form.infoClassification === c.value
                    ? cn(c.color, 'ring-2 ring-offset-1 ring-blue-400')
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          {classif && (
            <div className={cn("mt-3 rounded-lg px-4 py-3 flex items-start gap-2", classif.color)}>
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-xs">
                {form.infoClassification === 'PUBLICA' && 'Pode ser divulgado externamente sem restrições.'}
                {form.infoClassification === 'USO_INTERNO' && 'Uso restrito a colaboradores da empresa. Não divulgar externamente.'}
                {form.infoClassification === 'CONFIDENCIAL' && 'Acesso restrito a área responsável e gestores. Proteger contra vazamento.'}
                {form.infoClassification === 'RESTRITA' && 'Acesso somente para perfis autorizados nominalmente. Registrar acessos.'}
                {form.infoClassification === 'DADOS_PESSOAIS' && 'Contém dados pessoais (LGPD). Informar base legal, finalidade e prazo de retenção.'}
                {form.infoClassification === 'DADOS_PESSOAIS_SENSIVEIS' && 'Contém dados pessoais sensíveis (LGPD, art. 11). Consentimento explícito ou hipótese legal obrigatória.'}
              </p>
            </div>
          )}

          {isPersonalData && (
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <STextarea label="Base Legal (LGPD)" value={form.legalBasis} onChange={v => set('legalBasis', v)}
                placeholder="Ex: Consentimento / Cumprimento de obrigação legal / Execução de contrato" rows={2} />
              <STextarea label="Prazo de Retenção" value={form.retentionPeriod} onChange={v => set('retentionPeriod', v)}
                placeholder="Ex: 5 anos após término do contrato" rows={2} />
            </div>
          )}
        </div>
      </Section>

      {/* 4. Ciclo de Vida */}
      <Section title="4. Ciclo de Vida do Documento">
        <div className="mt-3 grid sm:grid-cols-3 gap-3">
          <SDate label="Data de Elaboração" value={form.elaborationDate} onChange={v => set('elaborationDate', v)} />
          <SDate label="Data de Aprovação" value={form.approvalDate} onChange={v => set('approvalDate', v)} />
          <SDate label="Data de Vigência" value={form.effectiveDate} onChange={v => set('effectiveDate', v)} />
          <SDate label="Próxima Revisão" value={form.nextReview} onChange={v => set('nextReview', v)} />
          <SSelect label="Periodicidade de Revisão" value={form.reviewPeriodicity} onChange={v => set('reviewPeriodicity', v)}
            options={REVIEW_PERIODS.map(r => ({ value: r, label: r }))} placeholder="— Selecione —" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <STextarea label="Motivo da Criação" value={form.creationReason} onChange={v => set('creationReason', v)} rows={2} />
          <STextarea label="Motivo da Revisão" value={form.revisionReason} onChange={v => set('revisionReason', v)} rows={2} placeholder="Preencher somente em revisões" />
          <SInput label="Documento Substituído" value={form.replacedDocument} onChange={v => set('replacedDocument', v)} placeholder="Código ou título do doc anterior" />
          <SInput label="Documento Sucessor" value={form.successorDocument} onChange={v => set('successorDocument', v)} placeholder="Código ou título do doc que vai substituir este" />
        </div>
      </Section>

      {/* 5. Tags */}
      <Section title="5. Palavras-chave e Tags" defaultOpen={false}>
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <div>
            <SInput label="Palavras-chave" value={form.keywords} onChange={v => set('keywords', v)} placeholder="Separadas por vírgula" />
            <p className="text-xs text-slate-400 mt-1">Ex: admissão, esocial, s-2200, prazo</p>
          </div>
          <div>
            <SInput label="Tags" value={form.tags} onChange={v => set('tags', v)} placeholder="Separadas por vírgula" />
            <p className="text-xs text-slate-400 mt-1">Ex: DP, qualidade, urgente, template</p>
          </div>
        </div>
        {(form.tags || form.keywords) && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {[...(form.tags?.split(',') ?? []), ...(form.keywords?.split(',') ?? [])]
              .map(t => t.trim()).filter(Boolean).map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 rounded-full">
                <Tag className="w-3 h-3" />{t}
              </span>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
