"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Briefcase, Plus, ChevronRight, ChevronLeft, Edit2, Trash2, Save,
  Sparkles, Loader2, FileText, Download, Copy, Check, X, Upload,
  ClipboardList, GitBranch, CheckSquare, AlertCircle, BookOpen,
  RotateCcw, ExternalLink, File
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { cn, formatDate } from "@/lib/utils"

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface ChecklistItem { id: string; text: string; order: number; checked: boolean }
interface JobProcess {
  id: string; name: string; description: string | null; steps: string | null
  responsible: string | null; deadline: string | null; flowchart: string | null
  aiGenerated: boolean; order: number; checklistItems: ChecklistItem[]
}
interface JobDocument {
  id: string; fileName: string; fileType: string; fileSize: number
  filePath: string; createdAt: string
}
interface JobVersion {
  id: string; version: string; changedBy: string | null
  changeNote: string | null; createdAt: string
}
interface JobRole {
  id: string; name: string; department: string | null; manager: string | null
  cbo: string | null; workSchedule: string | null; contractType: string | null
  workLocation: string | null; version: string; status: string
  objective: string | null; mission: string | null; responsibilities: string | null
  dailyActivities: string | null; weeklyActivities: string | null
  monthlyActivities: string | null; eventualActivities: string | null
  technicalSkills: string | null; behavioralSkills: string | null
  requiredKnowledge: string | null; toolsUsed: string | null; kpis: string | null
  createdAt: string; updatedAt: string
  processes: JobProcess[]; documents: JobDocument[]; versions: JobVersion[]
  _count?: { processes: number; documents: number }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fileIcon(type: string) {
  if (type.includes('pdf'))   return '📄'
  if (type.includes('word') || type.includes('document')) return '📝'
  if (type.includes('sheet') || type.includes('excel'))   return '📊'
  if (type.includes('image')) return '🖼️'
  return '📎'
}

function fileSize(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function renderAI(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
}

// ─── TEXTAREA AUTO-RESIZE ────────────────────────────────────────────────────

function Field({ label, value, onChange, rows = 3, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void
  rows?: number; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-y"
      />
    </div>
  )
}

function Input({ label, value, onChange, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      />
    </div>
  )
}

// ─── AI RESULT BLOCK ─────────────────────────────────────────────────────────

function AIBlock({ content, aiPowered, onCopy }: { content: string; aiPowered: boolean; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy?.()
  }
  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {aiPowered
            ? <Sparkles className="w-4 h-4 text-violet-600" />
            : <AlertCircle className="w-4 h-4 text-amber-500" />}
          <span className="text-xs font-semibold text-violet-800">
            {aiPowered ? 'Resultado da IA' : 'Simulação (IA não configurada)'}
          </span>
        </div>
        <button onClick={copy} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <div
        className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: renderAI(content) }}
      />
    </div>
  )
}

// ─── PDF EXPORT ──────────────────────────────────────────────────────────────

function exportPDF(role: JobRole) {
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const processHTML = role.processes.map(p => `
    <div class="process">
      <h3>${p.name}</h3>
      ${p.description ? `<p>${p.description}</p>` : ''}
      ${p.steps ? `<div class="steps"><strong>Passo a passo:</strong><br>${p.steps.replace(/\n/g, '<br>')}</div>` : ''}
      ${p.responsible ? `<p><strong>Responsável:</strong> ${p.responsible}</p>` : ''}
      ${p.deadline    ? `<p><strong>Prazo/Frequência:</strong> ${p.deadline}</p>` : ''}
      ${p.flowchart   ? `<div class="flowchart"><strong>Fluxograma:</strong><br>${p.flowchart.replace(/\n/g, '<br>')}</div>` : ''}
      ${p.checklistItems.length ? `
        <div class="checklist">
          <strong>Checklist:</strong>
          ${p.checklistItems.map(c => `<div>☐ ${c.text}</div>`).join('')}
        </div>` : ''}
    </div>`).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Descrição de Cargo — ${role.name}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9.5pt; color: #1e293b; padding: 14mm 16mm; }
  h1 { font-size: 16pt; color: #0f172a; border-bottom: 2pt solid #1e3a5f; padding-bottom: 6pt; margin-bottom: 10pt; }
  h2 { font-size: 11pt; color: #1e3a5f; margin: 14pt 0 6pt; border-left: 3pt solid #3b82f6; padding-left: 8pt; break-after: avoid; }
  h3 { font-size: 10pt; color: #1e3a5f; margin: 10pt 0 4pt; break-after: avoid; }
  p { margin-bottom: 4pt; line-height: 1.5; }
  .meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6pt; margin-bottom: 12pt; background: #f8fafc; border: 1pt solid #e2e8f0; border-radius: 6pt; padding: 8pt; }
  .meta-item .label { font-size: 7.5pt; color: #64748b; }
  .meta-item .value { font-weight: 600; font-size: 9pt; }
  .section { break-inside: avoid; margin-bottom: 12pt; }
  .process { border: 1pt solid #e2e8f0; border-radius: 6pt; padding: 8pt; margin-bottom: 8pt; break-inside: avoid; }
  .process h3 { color: #1d4ed8; border-bottom: 1pt solid #dbeafe; padding-bottom: 4pt; margin-bottom: 6pt; }
  .steps, .flowchart { background: #f8fafc; border: 1pt solid #e2e8f0; border-radius: 4pt; padding: 6pt; margin: 4pt 0; font-size: 8.5pt; }
  .checklist { margin-top: 6pt; }
  .checklist div { margin: 2pt 0; }
  .footer { border-top: 1pt solid #e2e8f0; margin-top: 14pt; padding-top: 6pt; font-size: 7.5pt; color: #94a3b8; display: flex; justify-content: space-between; }
  .version-badge { display: inline-block; background: #eff6ff; border: 1pt solid #bfdbfe; border-radius: 99pt; padding: 1pt 8pt; font-size: 7.5pt; color: #1d4ed8; margin-left: 8pt; }
</style></head><body>

<h1>${role.name} <span class="version-badge">v${role.version}</span></h1>

<div class="meta">
  ${role.department   ? `<div class="meta-item"><div class="label">Departamento</div><div class="value">${role.department}</div></div>` : ''}
  ${role.manager      ? `<div class="meta-item"><div class="label">Gestor</div><div class="value">${role.manager}</div></div>` : ''}
  ${role.cbo          ? `<div class="meta-item"><div class="label">CBO</div><div class="value">${role.cbo}</div></div>` : ''}
  ${role.workSchedule ? `<div class="meta-item"><div class="label">Jornada</div><div class="value">${role.workSchedule}</div></div>` : ''}
  ${role.contractType ? `<div class="meta-item"><div class="label">Contrato</div><div class="value">${role.contractType}</div></div>` : ''}
  ${role.workLocation ? `<div class="meta-item"><div class="label">Local</div><div class="value">${role.workLocation}</div></div>` : ''}
</div>

${role.objective       ? `<h2>Objetivo do Cargo</h2><div class="section"><p>${role.objective}</p></div>` : ''}
${role.mission         ? `<h2>Missão</h2><div class="section"><p>${role.mission}</p></div>` : ''}
${role.responsibilities? `<h2>Responsabilidades</h2><div class="section"><p>${role.responsibilities.replace(/\n/g,'<br>')}</p></div>` : ''}
${role.dailyActivities ? `<h2>Atividades Diárias</h2><div class="section"><p>${role.dailyActivities.replace(/\n/g,'<br>')}</p></div>` : ''}
${role.weeklyActivities? `<h2>Atividades Semanais</h2><div class="section"><p>${role.weeklyActivities.replace(/\n/g,'<br>')}</p></div>` : ''}
${role.monthlyActivities?`<h2>Atividades Mensais</h2><div class="section"><p>${role.monthlyActivities.replace(/\n/g,'<br>')}</p></div>` : ''}
${role.eventualActivities?`<h2>Atividades Eventuais</h2><div class="section"><p>${role.eventualActivities.replace(/\n/g,'<br>')}</p></div>` : ''}
${role.technicalSkills ? `<h2>Competências Técnicas</h2><div class="section"><p>${role.technicalSkills.replace(/\n/g,'<br>')}</p></div>` : ''}
${role.behavioralSkills? `<h2>Competências Comportamentais</h2><div class="section"><p>${role.behavioralSkills.replace(/\n/g,'<br>')}</p></div>` : ''}
${role.requiredKnowledge?`<h2>Conhecimentos Necessários</h2><div class="section"><p>${role.requiredKnowledge.replace(/\n/g,'<br>')}</p></div>` : ''}
${role.toolsUsed       ? `<h2>Ferramentas Utilizadas</h2><div class="section"><p>${role.toolsUsed.replace(/\n/g,'<br>')}</p></div>` : ''}
${role.kpis            ? `<h2>Indicadores de Desempenho (KPIs)</h2><div class="section"><p>${role.kpis.replace(/\n/g,'<br>')}</p></div>` : ''}

${role.processes.length ? `<h2>Processos do Cargo</h2>${processHTML}` : ''}

<div class="footer">
  <span>Gerado em ${date}</span>
  <span>Versão ${role.version} · Última atualização: ${formatDate(role.updatedAt)}</span>
</div>
</body></html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Popup bloqueado'); return }
  win.document.write(html)
  win.document.close()
  setTimeout(() => { try { win.print() } catch { /* */ } }, 400)
}

// ─── PROCESS FORM ────────────────────────────────────────────────────────────

function ProcessForm({ initial, onSave, onCancel, saving }: {
  initial?: Partial<JobProcess>
  onSave: (data: Omit<Partial<JobProcess>, 'checklistItems'> & { checklistItems: string[] }) => void
  onCancel: () => void
  saving: boolean
}) {
  const [name,        setName]        = useState(initial?.name        ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [steps,       setSteps]       = useState(initial?.steps       ?? '')
  const [responsible, setResponsible] = useState(initial?.responsible ?? '')
  const [deadline,    setDeadline]    = useState(initial?.deadline    ?? '')
  const [clText,      setClText]      = useState(
    initial?.checklistItems?.map(c => c.text).join('\n') ?? ''
  )

  return (
    <div className="space-y-3">
      <Input label="Nome do processo *" value={name} onChange={setName} placeholder="Ex: Admissão, Rescisão, Folha..." />
      <Field label="Descrição" value={description} onChange={setDescription} rows={2} />
      <Field label="Passo a passo (um por linha)" value={steps} onChange={setSteps} rows={4}
        placeholder="1. Receber documentação&#10;2. Cadastrar no sistema&#10;3. Assinar contrato" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Responsável" value={responsible} onChange={setResponsible} />
        <Input label="Prazo / Frequência" value={deadline} onChange={setDeadline} placeholder="Ex: Todo dia 5, Até 3 dias..." />
      </div>
      <Field label="Checklist (um item por linha)" value={clText} onChange={setClText} rows={4}
        placeholder="Receber solicitação&#10;Verificar documentos&#10;Cadastrar no sistema" />
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => onSave({ name, description, steps, responsible, deadline, checklistItems: clText.split('\n').map(s => s.trim()).filter(Boolean) })} disabled={saving || !name.trim()}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar processo
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}

// ─── ROLE DETAIL ─────────────────────────────────────────────────────────────

function RoleDetail({ roleId, onBack }: { roleId: string; onBack: () => void }) {
  const [role,        setRole]        = useState<JobRole | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [innerTab,    setInnerTab]    = useState<'descricao' | 'processos' | 'documentos' | 'versoes'>('descricao')
  const [editing,     setEditing]     = useState(false)
  const [aiResult,    setAiResult]    = useState<{ content: string; aiPowered: boolean } | null>(null)
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiMode,      setAiMode]      = useState('')
  const [editProc,    setEditProc]    = useState<string | null>(null) // processId being edited
  const [addingProc,  setAddingProc]  = useState(false)
  const [procSaving,  setProcSaving]  = useState(false)
  const [separateText,setSeparateText]= useState('')
  const [changeNote,  setChangeNote]  = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Editable fields mirror
  const [form, setForm] = useState<Partial<JobRole>>({})

  const load = useCallback(async () => {
    const res  = await fetch(`/api/job-roles/${roleId}`)
    const data = await res.json()
    setRole(data)
    setForm({
      name: data.name, department: data.department ?? '', manager: data.manager ?? '',
      cbo: data.cbo ?? '', workSchedule: data.workSchedule ?? '',
      contractType: data.contractType ?? '', workLocation: data.workLocation ?? '',
      objective: data.objective ?? '', mission: data.mission ?? '',
      responsibilities: data.responsibilities ?? '', dailyActivities: data.dailyActivities ?? '',
      weeklyActivities: data.weeklyActivities ?? '', monthlyActivities: data.monthlyActivities ?? '',
      eventualActivities: data.eventualActivities ?? '', technicalSkills: data.technicalSkills ?? '',
      behavioralSkills: data.behavioralSkills ?? '', requiredKnowledge: data.requiredKnowledge ?? '',
      toolsUsed: data.toolsUsed ?? '', kpis: data.kpis ?? '',
    })
    setLoading(false)
  }, [roleId])

  useEffect(() => { load() }, [load])

  function setF(key: keyof JobRole, val: string) {
    setForm(p => ({ ...p, [key]: val }))
  }

  async function save(major = false) {
    if (!role) return
    setSaving(true)
    await fetch(`/api/job-roles/${role.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, majorUpdate: major, changeNote: changeNote || 'Atualização da descrição' }),
    })
    setEditing(false)
    setChangeNote('')
    await load()
    setSaving(false)
  }

  async function runAI(mode: string, processName?: string) {
    if (!role) return
    setAiLoading(true)
    setAiMode(mode)
    setAiResult(null)
    const res  = await fetch(`/api/job-roles/${role.id}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, processName, content: separateText || undefined }),
    })
    const data = await res.json()
    setAiResult(data)
    setAiLoading(false)
  }

  async function saveProcess(data: Omit<Partial<JobProcess>, 'checklistItems'> & { checklistItems: string[] }) {
    if (!role) return
    setProcSaving(true)
    if (editProc) {
      await fetch(`/api/job-roles/${role.id}/processes/${editProc}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setEditProc(null)
    } else {
      await fetch(`/api/job-roles/${role.id}/processes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setAddingProc(false)
    }
    await load()
    setProcSaving(false)
  }

  async function deleteProcess(procId: string) {
    if (!role || !confirm('Remover este processo?')) return
    await fetch(`/api/job-roles/${role.id}/processes/${procId}`, { method: 'DELETE' })
    await load()
  }

  async function uploadDoc(e: React.ChangeEvent<HTMLInputElement>) {
    if (!role || !e.target.files?.[0]) return
    const fd = new FormData()
    fd.append('file', e.target.files[0])
    await fetch(`/api/job-roles/${role.id}/documents`, { method: 'POST', body: fd })
    await load()
    if (fileRef.current) fileRef.current.value = ''
  }

  if (loading || !role) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded" />
      <div className="h-64 bg-slate-200 rounded-xl" />
    </div>
  )

  const INNER_TABS = [
    { id: 'descricao',  label: 'Descrição',      icon: BookOpen },
    { id: 'processos',  label: `Processos (${role.processes.length})`, icon: ClipboardList },
    { id: 'documentos', label: `Documentos (${role.documents.length})`, icon: FileText },
    { id: 'versoes',    label: 'Versões',         icon: RotateCcw },
  ] as const

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-1">
            <ChevronLeft className="w-4 h-4" /> Voltar aos cargos
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">{role.name}</h2>
            <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 font-semibold">
              v{role.version}
            </span>
            {role.department && (
              <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2.5 py-0.5">
                {role.department}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportPDF(role)}>
            <Download className="w-3.5 h-3.5" /> Exportar PDF
          </Button>
          {!editing
            ? <Button size="sm" onClick={() => setEditing(true)}><Edit2 className="w-3.5 h-3.5" /> Editar</Button>
            : <>
                <Button size="sm" variant="outline" onClick={() => { setEditing(false); setChangeNote('') }}>Cancelar</Button>
                <Button size="sm" onClick={() => save(false)} disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Salvar v{role.version.split('.').map((n,i) => i===1 ? +n+1 : n).join('.')}
                </Button>
              </>
          }
        </div>
      </div>

      {/* Inner tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0">
          {INNER_TABS.map(t => (
            <button key={t.id} onClick={() => setInnerTab(t.id as typeof innerTab)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                innerTab === t.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── DESCRIÇÃO ── */}
      {innerTab === 'descricao' && (
        <div className="space-y-5">
          {/* AI buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline"
              onClick={() => runAI('improve')} disabled={aiLoading}
              className="border-violet-200 text-violet-700 hover:bg-violet-50">
              {aiLoading && aiMode === 'improve'
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5" />}
              Melhorar Descrição
            </Button>
            <Button size="sm" variant="outline"
              onClick={() => runAI('organize')} disabled={aiLoading}
              className="border-violet-200 text-violet-700 hover:bg-violet-50">
              {aiLoading && aiMode === 'organize'
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <GitBranch className="w-3.5 h-3.5" />}
              Organizar Processos com IA
            </Button>
          </div>

          {aiResult && (aiMode === 'improve' || aiMode === 'organize') && (
            <AIBlock content={aiResult.content} aiPowered={aiResult.aiPowered} />
          )}

          {/* Informações básicas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Nome do cargo *" value={form.name ?? ''} onChange={v => setF('name', v)} />
                  <Input label="Departamento" value={form.department ?? ''} onChange={v => setF('department', v)} />
                  <Input label="Gestor responsável" value={form.manager ?? ''} onChange={v => setF('manager', v)} />
                  <Input label="CBO" value={form.cbo ?? ''} onChange={v => setF('cbo', v)} placeholder="Ex: 2521-05" />
                  <Input label="Jornada" value={form.workSchedule ?? ''} onChange={v => setF('workSchedule', v)} placeholder="Ex: 44h semanais, Seg-Sex 08h-17h" />
                  <Input label="Tipo de contrato" value={form.contractType ?? ''} onChange={v => setF('contractType', v)} placeholder="Ex: CLT, PJ, Estágio" />
                  <Input label="Local de trabalho" value={form.workLocation ?? ''} onChange={v => setF('workLocation', v)} placeholder="Ex: Presencial, Híbrido, Remoto" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    ['Departamento',  role.department],
                    ['Gestor',        role.manager],
                    ['CBO',           role.cbo],
                    ['Jornada',       role.workSchedule],
                    ['Contrato',      role.contractType],
                    ['Local',         role.workLocation],
                    ['Criado em',     formatDate(role.createdAt)],
                    ['Atualizado',    formatDate(role.updatedAt)],
                  ].map(([label, val]) => val ? (
                    <div key={label as string}>
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="text-sm font-medium text-slate-700">{val}</p>
                    </div>
                  ) : null)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description sections */}
          {([
            ['objective',          'Objetivo do Cargo'],
            ['mission',            'Missão'],
            ['responsibilities',   'Responsabilidades'],
            ['dailyActivities',    'Atividades Diárias'],
            ['weeklyActivities',   'Atividades Semanais'],
            ['monthlyActivities',  'Atividades Mensais'],
            ['eventualActivities', 'Atividades Eventuais'],
            ['technicalSkills',    'Competências Técnicas'],
            ['behavioralSkills',   'Competências Comportamentais'],
            ['requiredKnowledge',  'Conhecimentos Necessários'],
            ['toolsUsed',          'Ferramentas Utilizadas'],
            ['kpis',               'Indicadores de Desempenho (KPIs)'],
          ] as [keyof JobRole, string][]).map(([key, label]) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <Field label="" value={(form[key] as string) ?? ''} onChange={v => setF(key, v)} rows={4} placeholder={`Digite ${label.toLowerCase()}...`} />
                ) : (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {(role[key] as string) || <span className="text-slate-300 italic">Não preenchido</span>}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {editing && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Input label="Anotação da alteração (opcional)" value={changeNote} onChange={setChangeNote} placeholder="Ex: Revisão após auditoria interna..." />
                <div className="flex gap-2">
                  <Button onClick={() => save(false)} disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salvar (versão menor)
                  </Button>
                  <Button variant="outline" onClick={() => save(true)} disabled={saving}>
                    Salvar como versão principal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── PROCESSOS ── */}
      {innerTab === 'processos' && (
        <div className="space-y-5">
          {/* AI tools */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-600">Ferramentas de IA para Processos</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => runAI('organize')} disabled={aiLoading}
                  className="border-violet-200 text-violet-700 hover:bg-violet-50">
                  {aiLoading && aiMode === 'organize' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Organizar Processos com IA
                </Button>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Separar processos a partir de texto livre</p>
                <textarea
                  rows={4}
                  value={separateText}
                  onChange={e => setSeparateText(e.target.value)}
                  placeholder="Cole aqui um texto com todas as atividades do cargo. A IA irá separar automaticamente em processos..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-y"
                />
                <Button size="sm" variant="outline" className="mt-2 border-violet-200 text-violet-700 hover:bg-violet-50"
                  onClick={() => runAI('separate')} disabled={aiLoading || !separateText.trim()}>
                  {aiLoading && aiMode === 'separate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
                  Separar Processos
                </Button>
              </div>
            </CardContent>
          </Card>

          {aiResult && (aiMode === 'organize' || aiMode === 'separate' || aiMode === 'flowchart' || aiMode === 'checklist') && (
            <AIBlock content={aiResult.content} aiPowered={aiResult.aiPowered} />
          )}

          {/* Add process */}
          {addingProc ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Novo Processo</CardTitle>
              </CardHeader>
              <CardContent>
                <ProcessForm
                  onSave={saveProcess}
                  onCancel={() => setAddingProc(false)}
                  saving={procSaving}
                />
              </CardContent>
            </Card>
          ) : (
            <Button size="sm" onClick={() => setAddingProc(true)}>
              <Plus className="w-3.5 h-3.5" /> Adicionar Processo
            </Button>
          )}

          {/* Process list */}
          {role.processes.length === 0 && !addingProc ? (
            <div className="text-center py-12 text-slate-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum processo cadastrado.</p>
              <p className="text-xs mt-1">Use o botão acima ou a IA para separar automaticamente.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {role.processes.map(proc => (
                <Card key={proc.id} className="overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-violet-500" />
                  {editProc === proc.id ? (
                    <CardContent className="pt-4">
                      <ProcessForm
                        initial={proc}
                        onSave={saveProcess}
                        onCancel={() => setEditProc(null)}
                        saving={procSaving}
                      />
                    </CardContent>
                  ) : (
                    <>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-blue-800">{proc.name}</CardTitle>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                              onClick={() => runAI('flowchart', proc.name)} disabled={aiLoading}>
                              <GitBranch className="w-3 h-3" /> Fluxograma
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                              onClick={() => runAI('checklist', proc.name)} disabled={aiLoading}>
                              <CheckSquare className="w-3 h-3" /> Checklist IA
                            </Button>
                            <button onClick={() => setEditProc(proc.id)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteProcess(proc.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {proc.description && <p className="text-sm text-slate-600">{proc.description}</p>}
                        {proc.steps && (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <p className="text-xs font-semibold text-slate-500 mb-1.5">Passo a passo</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{proc.steps}</p>
                          </div>
                        )}
                        <div className="flex gap-4 text-xs text-slate-500 flex-wrap">
                          {proc.responsible && <span>👤 {proc.responsible}</span>}
                          {proc.deadline    && <span>🕐 {proc.deadline}</span>}
                          {proc.aiGenerated && <span className="text-violet-600">✨ Gerado por IA</span>}
                        </div>
                        {proc.flowchart && (
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <p className="text-xs font-semibold text-blue-700 mb-1">Fluxograma</p>
                            <p className="text-sm text-blue-800 whitespace-pre-wrap font-mono">{proc.flowchart}</p>
                          </div>
                        )}
                        {proc.checklistItems.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1.5">Checklist</p>
                            <div className="space-y-1">
                              {proc.checklistItems.map(item => (
                                <div key={item.id} className="flex items-start gap-2 text-sm text-slate-700">
                                  <span className="mt-0.5 shrink-0">☐</span>
                                  <span>{item.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DOCUMENTOS ── */}
      {innerTab === 'documentos' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" className="hidden" onChange={uploadDoc}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" />
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" /> Anexar Documento
            </Button>
            <p className="text-xs text-slate-400">PDF, Word, Excel, Imagens — até 10 MB</p>
          </div>

          {role.documents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum documento anexado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {role.documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 bg-white">
                  <span className="text-xl shrink-0">{fileIcon(doc.fileType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{doc.fileName}</p>
                    <p className="text-xs text-slate-400">{fileSize(doc.fileSize)} · {formatDate(doc.createdAt)}</p>
                  </div>
                  <a href={doc.filePath} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title="Abrir">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VERSÕES ── */}
      {innerTab === 'versoes' && (
        <div className="space-y-3">
          {role.versions.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma versão registrada.</p>
          ) : (
            role.versions.map((v, i) => (
              <div key={v.id} className={cn(
                'border rounded-xl px-4 py-3',
                i === 0 ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-white'
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-blue-700">v{v.version}</span>
                    {i === 0 && <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5">Atual</span>}
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(v.createdAt)}</span>
                </div>
                {v.changeNote && <p className="text-sm text-slate-600 mt-1">{v.changeNote}</p>}
                {v.changedBy  && <p className="text-xs text-slate-400 mt-0.5">Por: {v.changedBy}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── ROLE FORM (CREATE) ───────────────────────────────────────────────────────

function RoleCreateForm({ onCreate, onCancel }: { onCreate: () => void; onCancel: () => void }) {
  const [name,         setName]         = useState('')
  const [department,   setDepartment]   = useState('')
  const [manager,      setManager]      = useState('')
  const [cbo,          setCbo]          = useState('')
  const [workSchedule, setWorkSchedule] = useState('')
  const [contractType, setContractType] = useState('')
  const [workLocation, setWorkLocation] = useState('')
  const [saving,       setSaving]       = useState(false)

  async function create() {
    if (!name.trim()) return
    setSaving(true)
    await fetch('/api/job-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, department, manager, cbo, workSchedule, contractType, workLocation }),
    })
    onCreate()
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Novo Cargo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Nome do cargo *" value={name} onChange={setName} placeholder="Ex: Analista de Departamento Pessoal" />
          <Input label="Departamento" value={department} onChange={setDepartment} placeholder="Ex: Departamento Pessoal" />
          <Input label="Gestor responsável" value={manager} onChange={setManager} />
          <Input label="CBO" value={cbo} onChange={setCbo} placeholder="Ex: 2521-05" />
          <Input label="Jornada" value={workSchedule} onChange={setWorkSchedule} placeholder="Ex: 44h semanais" />
          <Input label="Tipo de contrato" value={contractType} onChange={setContractType} placeholder="Ex: CLT, PJ" />
          <Input label="Local de trabalho" value={workLocation} onChange={setWorkLocation} placeholder="Ex: Presencial" />
        </div>
        <div className="flex gap-2 pt-1">
          <Button onClick={create} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Criar cargo
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── MAIN TAB COMPONENT ───────────────────────────────────────────────────────

export function TabCargos() {
  const [roles,    setRoles]    = useState<JobRole[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [search,   setSearch]   = useState('')

  const load = useCallback(async () => {
    const res  = await fetch('/api/job-roles')
    const data = await res.json()
    setRoles(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = roles.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.department?.toLowerCase().includes(search.toLowerCase())
  )

  if (selected) {
    return (
      <RoleDetail
        roleId={selected}
        onBack={() => { setSelected(null); load() }}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {!loading && <><strong className="text-slate-800">{roles.length}</strong> cargo{roles.length !== 1 ? 's' : ''} cadastrado{roles.length !== 1 ? 's' : ''}</>}
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={creating}>
          <Plus className="w-4 h-4" /> Novo Cargo
        </Button>
      </div>

      {creating && (
        <RoleCreateForm
          onCreate={() => { setCreating(false); load() }}
          onCancel={() => setCreating(false)}
        />
      )}

      {/* Search */}
      {roles.length > 0 && (
        <div className="relative">
          <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar cargo ou departamento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search ? 'Nenhum cargo encontrado' : 'Nenhum cargo cadastrado'}</p>
          <p className="text-sm mt-1">Clique em "Novo Cargo" para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(role => (
            <button
              key={role.id}
              onClick={() => setSelected(role.id)}
              className="w-full text-left bg-white border border-slate-200 rounded-xl px-5 py-4 hover:shadow-md hover:border-slate-300 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Briefcase className="w-4 h-4 text-blue-500 shrink-0" />
                    <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {role.name}
                    </p>
                    <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 rounded-full px-2 py-0.5">
                      v{role.version}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 flex-wrap text-xs text-slate-400">
                    {role.department    && <span>{role.department}</span>}
                    {role.manager       && <span>Gestor: {role.manager}</span>}
                    {role.contractType  && <span>{role.contractType}</span>}
                    <span>{(role._count?.processes ?? 0)} processo{(role._count?.processes ?? 0) !== 1 ? 's' : ''}</span>
                    <span>{(role._count?.documents ?? 0)} documento{(role._count?.documents ?? 0) !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 shrink-0 mt-1 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
