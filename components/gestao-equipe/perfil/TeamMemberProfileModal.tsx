"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X, User, Activity, MessageSquare, GraduationCap, Umbrella, Clock,
  FileText, ChevronDown, ChevronRight, Loader2, Printer, Download,
  Building2, Calendar, Mail, Phone, Edit2, Navigation, Table2,
  BookOpen, RefreshCw, FileSpreadsheet, DollarSign, Briefcase,
  AlertTriangle, CheckCircle2, Save, Plus, Trash2, Lock, Timer,
} from "lucide-react"
import { TabBancoHoras, HourBankHeaderSummary } from "./TabBancoHoras"
import { cn } from "@/lib/utils"

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface MemberDetail {
  id: string; name: string; role: string; sector: string | null; unit: string | null
  email: string | null; phone: string | null; joinedAt: string | null
  status: string; observations: string | null; createdAt: string; updatedAt: string
  feedbacks: {
    id: string; type: string; feedbackDate: string
    observedSituation: string | null; positivePoints: string | null
    improvementPoints: string | null; orientationGiven: string | null
    agreedAction: string | null; nextFollowUp: string | null; observations: string | null
  }[]
  directions: {
    id: string; title: string; description: string | null
    dueDate: string | null; priority: string; status: string
    expectedResult: string | null; complexity: string; createdAt: string
  }[]
  vacations: {
    id: string; companyName: string | null
    acquisitionStartDate: string | null; acquisitionEndDate: string | null
    concessionStartDate: string | null; concessionEndDate: string | null
    availableDays: number | null; vacationDays: number | null
    hasBonus: boolean; bonusDays: number | null
    startDate: string | null; endDate: string | null; returnDate: string | null
    status: string; substitute: string | null; observations: string | null
  }[]
  trainings: {
    id: string; topic: string; objective: string | null
    plannedDate: string | null; completedDate: string | null
    status: string; responsible: string | null
    expectedResult: string | null; evaluation: string | null; observations: string | null
  }[]
  history: { id: string; type: string; title: string; description: string | null; createdAt: string }[]
}

interface ActItem {
  id: string; title: string; description: string | null; order: number; observation: string | null
}

interface MemberActivity {
  id: string; observation: string | null; includedAt: string
  activityTemplate: {
    id: string; name: string; description: string | null
    category: string | null; observations: string | null
    actCategory: { id: string; name: string; color: string; icon: string } | null
    department: string | null; items: ActItem[]
  }
  itemLinks: { id: string; observation: string | null; item: ActItem }[]
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  ATIVO: 'Ativo', AFASTADO: 'Afastado', FERIAS: 'Férias',
  INATIVO: 'Inativo', LICENCA: 'Licença', DESLIGADO: 'Desligado',
}
const STATUS_COLORS: Record<string, string> = {
  ATIVO: 'bg-green-100 text-green-700 border-green-200',
  AFASTADO: 'bg-amber-100 text-amber-700 border-amber-200',
  FERIAS: 'bg-blue-100 text-blue-700 border-blue-200',
  INATIVO: 'bg-slate-100 text-slate-500 border-slate-200',
  LICENCA: 'bg-purple-100 text-purple-700 border-purple-200',
  DESLIGADO: 'bg-red-100 text-red-700 border-red-200',
}
const FEEDBACK_TYPE: Record<string, string> = {
  POSITIVO: 'Positivo', MELHORIA: 'Melhoria', ALINHAMENTO: 'Alinhamento',
  DESENVOLVIMENTO: 'Desenvolvimento', RECONHECIMENTO: 'Reconhecimento',
  CORRECAO_CONDUTA: 'Correção de Conduta', ADVERTENCIA_VERBAL: 'Advert. Verbal',
}
const FEEDBACK_COLOR: Record<string, string> = {
  POSITIVO: 'bg-green-100 text-green-700', RECONHECIMENTO: 'bg-blue-100 text-blue-700',
  MELHORIA: 'bg-amber-100 text-amber-700', ALINHAMENTO: 'bg-slate-100 text-slate-600',
  DESENVOLVIMENTO: 'bg-violet-100 text-violet-700',
  CORRECAO_CONDUTA: 'bg-orange-100 text-orange-700', ADVERTENCIA_VERBAL: 'bg-red-100 text-red-700',
}
const DIR_STATUS: Record<string, string> = {
  PLANEJADA: 'Planejada', DIRECIONADA: 'Direcionada', EM_EXECUCAO: 'Em Execução',
  AGUARDANDO_RETORNO: 'Aguard. Retorno', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada',
}
const VAC_STATUS: Record<string, string> = {
  A_PROGRAMAR: 'A Programar', PROGRAMADA: 'Programada',
  EM_FERIAS: 'Em Férias', RETORNOU: 'Retornou', CANCELADA: 'Cancelada',
}
const TRAIN_STATUS: Record<string, string> = {
  PLANEJADO: 'Planejado', EM_ANDAMENTO: 'Em Andamento', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado',
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  const s = d.includes('T') ? d.slice(0, 10) : d
  const p = s.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d
}

function Badge({ label, className }: { label: string; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", className)}>{label}</span>
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-700">{value || '—'}</p>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 mt-5 first:mt-0">{children}</h3>
}

function EmptyState({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <Icon className="w-8 h-8 mb-2 opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

// ─── REPORT BUILDERS ─────────────────────────────────────────────────────────

const CSS_BASE = `
  @page{size:A4;margin:20mm 15mm}
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:10pt;color:#1e293b;margin:0}
  h1{font-size:15pt;margin:0 0 4px;color:#1e3a5f}
  .hdr{border-bottom:3px solid #1e3a5f;padding-bottom:10px;margin-bottom:14px}
  .hdr-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
  .ml{font-weight:bold;color:#64748b;text-transform:uppercase;font-size:7.5pt}
  .mv{font-size:9.5pt}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0 14px}
  .sc{border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center}
  .sn{font-size:16pt;font-weight:bold;color:#1e3a5f}
  .sl{font-size:7.5pt;color:#64748b;text-transform:uppercase}
  .cat-hdr{background:#1e3a5f;color:#fff;padding:6px 10px;font-weight:bold;font-size:10pt;border-radius:4px 4px 0 0;margin-top:12px}
  .act-blk{border:1px solid #e2e8f0;border-top:none;padding:10px 10px 6px}
  .act-name{font-size:11pt;font-weight:bold;color:#1e3a5f;margin-bottom:3px}
  .act-desc{font-size:9pt;color:#475569;margin-bottom:5px}
  .act-obs{font-size:9pt;background:#fffbeb;border-left:3px solid #f59e0b;padding:4px 8px;margin:5px 0}
  .act-meta{font-size:8pt;color:#94a3b8;margin-top:5px}
  table{width:100%;border-collapse:collapse;margin-top:6px;font-size:9pt}
  th{background:#f1f5f9;border:1px solid #cbd5e1;padding:5px 8px;text-align:left;font-size:8pt}
  td{border:1px solid #e2e8f0;padding:5px 8px;vertical-align:top}
  tr:nth-child(even) td{background:#f8fafc}
  .ctr{text-align:center}
  .sec-hdr{background:#334155;color:#fff;padding:5px 8px;font-weight:bold;margin:14px 0 6px;font-size:9pt}
  .ftr{position:fixed;bottom:0;left:0;right:0;font-size:8pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding:4px 15mm;display:flex;justify-content:space-between}
`

function groupActivitiesByCategory(activities: MemberActivity[]) {
  const groups: Record<string, { catName: string; color: string; items: MemberActivity[] }> = {}
  for (const a of activities) {
    const cat = a.activityTemplate.actCategory?.name ?? a.activityTemplate.category ?? 'Sem Categoria'
    const color = a.activityTemplate.actCategory?.color ?? '#6366f1'
    if (!groups[cat]) groups[cat] = { catName: cat, color, items: [] }
    groups[cat].items.push(a)
  }
  return Object.values(groups)
}

function buildActivitiesHTML(member: MemberDetail, activities: MemberActivity[]): string {
  const genDate = fmtDate(new Date().toISOString())
  const groups = groupActivitiesByCategory(activities)
  const totalItems = activities.reduce((s, a) => {
    return s + (a.itemLinks.length > 0 ? a.itemLinks.length : a.activityTemplate.items.length)
  }, 0)

  const body = groups.map(g => `
    <div class="cat-hdr">${g.catName.toUpperCase()}</div>
    ${g.items.map(act => {
      const displayItems = act.itemLinks.length > 0
        ? act.itemLinks.map(il => il.item)
        : act.activityTemplate.items
      return `
        <div class="act-blk">
          <div class="act-name">${act.activityTemplate.name}</div>
          ${act.activityTemplate.description ? `<div class="act-desc">${act.activityTemplate.description}</div>` : ''}
          ${act.observation ? `<div class="act-obs"><strong>Obs. do colaborador:</strong> ${act.observation}</div>` : ''}
          ${displayItems.length > 0 ? `
            <table><thead><tr><th style="width:36px">#</th><th>Etapa / Item</th><th>Descrição</th><th>Observação</th></tr></thead>
            <tbody>${displayItems.map((it, i) => `
              <tr><td class="ctr">${i + 1}</td><td><strong>${it.title}</strong></td>
              <td>${it.description ?? '—'}</td><td>${it.observation ?? '—'}</td></tr>
            `).join('')}</tbody></table>` : ''}
          <div class="act-meta">Incluída em: ${fmtDate(act.includedAt)}</div>
        </div>`
    }).join('')}
  `).join('')

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <title>Atividades — ${member.name}</title><style>${CSS_BASE}</style></head><body>
  <div class="hdr">
    <div style="text-align:right;font-size:8pt;color:#94a3b8">Gerado em ${genDate}</div>
    <h1>Relatório de Atividades e Responsabilidades</h1>
    <div class="hdr-meta">
      <div><div class="ml">Colaborador</div><div class="mv">${member.name}</div></div>
      <div><div class="ml">Cargo/Função</div><div class="mv">${member.role}</div></div>
      <div><div class="ml">Setor</div><div class="mv">${member.sector ?? '—'}</div></div>
      <div><div class="ml">Unidade</div><div class="mv">${member.unit ?? '—'}</div></div>
      <div><div class="ml">Admissão</div><div class="mv">${fmtDate(member.joinedAt)}</div></div>
      <div><div class="ml">Status</div><div class="mv">${STATUS_LABELS[member.status] ?? member.status}</div></div>
    </div>
  </div>
  <div class="summary">
    <div class="sc"><div class="sn">${activities.length}</div><div class="sl">Atividades</div></div>
    <div class="sc"><div class="sn">${totalItems}</div><div class="sl">Itens/Etapas</div></div>
    <div class="sc"><div class="sn">${groups.length}</div><div class="sl">Categorias</div></div>
    <div class="sc"><div class="sn">${activities.length}</div><div class="sl">Ativas</div></div>
  </div>
  ${body}
  <div class="ftr"><span>${member.name} — ${member.role}</span><span>Atividades e Responsabilidades</span></div>
  </body></html>`
}

function buildProfileHTML(member: MemberDetail, activities: MemberActivity[]): string {
  const genDate = fmtDate(new Date().toISOString())
  const groups = groupActivitiesByCategory(activities)

  const feedbacksHTML = member.feedbacks.length === 0
    ? '<p style="color:#94a3b8;font-size:9pt">Nenhum feedback registrado.</p>'
    : `<table><thead><tr><th>Data</th><th>Tipo</th><th>Situação</th><th>Orientação</th><th>Ação Acordada</th></tr></thead>
       <tbody>${member.feedbacks.map(f => `
         <tr><td>${fmtDate(f.feedbackDate)}</td><td>${FEEDBACK_TYPE[f.type] ?? f.type}</td>
         <td>${f.observedSituation ?? '—'}</td><td>${f.orientationGiven ?? '—'}</td><td>${f.agreedAction ?? '—'}</td></tr>
       `).join('')}</tbody></table>`

  const directionsHTML = member.directions.length === 0
    ? '<p style="color:#94a3b8;font-size:9pt">Nenhum direcionamento registrado.</p>'
    : `<table><thead><tr><th>Título</th><th>Prioridade</th><th>Status</th><th>Prazo</th></tr></thead>
       <tbody>${member.directions.map(d => `
         <tr><td>${d.title}</td><td>${d.priority}</td><td>${DIR_STATUS[d.status] ?? d.status}</td><td>${fmtDate(d.dueDate)}</td></tr>
       `).join('')}</tbody></table>`

  const trainingsHTML = member.trainings.length === 0
    ? '<p style="color:#94a3b8;font-size:9pt">Nenhum treinamento registrado.</p>'
    : `<table><thead><tr><th>Tema</th><th>Status</th><th>Data Planejada</th><th>Concluído</th><th>Responsável</th></tr></thead>
       <tbody>${member.trainings.map(t => `
         <tr><td>${t.topic}</td><td>${TRAIN_STATUS[t.status] ?? t.status}</td><td>${fmtDate(t.plannedDate)}</td><td>${fmtDate(t.completedDate)}</td><td>${t.responsible ?? '—'}</td></tr>
       `).join('')}</tbody></table>`

  const vacationsHTML = member.vacations.length === 0
    ? '<p style="color:#94a3b8;font-size:9pt">Nenhuma férias registrada.</p>'
    : `<table><thead><tr><th>Empresa</th><th>Per. Aquisitivo</th><th>Per. Concessivo</th><th>Dias</th><th>Início</th><th>Fim</th><th>Status</th></tr></thead>
       <tbody>${member.vacations.map(v => `
         <tr><td>${v.companyName ?? '—'}</td>
         <td>${fmtDate(v.acquisitionStartDate)} a ${fmtDate(v.acquisitionEndDate)}</td>
         <td>${fmtDate(v.concessionStartDate)} a ${fmtDate(v.concessionEndDate)}</td>
         <td>${v.vacationDays ?? '—'}${v.hasBonus ? ` (+${v.bonusDays ?? 10} abono)` : ''}</td>
         <td>${fmtDate(v.startDate)}</td><td>${fmtDate(v.endDate)}</td>
         <td>${VAC_STATUS[v.status] ?? v.status}</td></tr>
       `).join('')}</tbody></table>`

  const activitiesBody = groups.length === 0
    ? '<p style="color:#94a3b8;font-size:9pt">Nenhuma atividade vinculada.</p>'
    : groups.map(g => `
        <div class="cat-hdr" style="margin-top:8px">${g.catName.toUpperCase()}</div>
        ${g.items.map(act => {
          const displayItems = act.itemLinks.length > 0
            ? act.itemLinks.map(il => il.item)
            : act.activityTemplate.items
          return `
            <div class="act-blk">
              <div class="act-name">${act.activityTemplate.name}</div>
              ${act.activityTemplate.description ? `<div class="act-desc">${act.activityTemplate.description}</div>` : ''}
              ${displayItems.length > 0 ? `
                <table style="margin-top:4px"><thead><tr><th style="width:30px">#</th><th>Item</th><th>Descrição</th></tr></thead>
                <tbody>${displayItems.map((it, i) => `<tr><td class="ctr">${i+1}</td><td>${it.title}</td><td>${it.description ?? '—'}</td></tr>`).join('')}
                </tbody></table>` : ''}
            </div>`
        }).join('')}
      `).join('')

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <title>Perfil — ${member.name}</title><style>${CSS_BASE}</style></head><body>
  <div class="hdr">
    <div style="text-align:right;font-size:8pt;color:#94a3b8">Gerado em ${genDate}</div>
    <h1>Perfil Corporativo do Colaborador</h1>
    <div class="hdr-meta">
      <div><div class="ml">Nome</div><div class="mv">${member.name}</div></div>
      <div><div class="ml">Cargo/Função</div><div class="mv">${member.role}</div></div>
      <div><div class="ml">Setor</div><div class="mv">${member.sector ?? '—'}</div></div>
      <div><div class="ml">Unidade</div><div class="mv">${member.unit ?? '—'}</div></div>
      <div><div class="ml">E-mail</div><div class="mv">${member.email ?? '—'}</div></div>
      <div><div class="ml">Telefone</div><div class="mv">${member.phone ?? '—'}</div></div>
      <div><div class="ml">Admissão</div><div class="mv">${fmtDate(member.joinedAt)}</div></div>
      <div><div class="ml">Status</div><div class="mv">${STATUS_LABELS[member.status] ?? member.status}</div></div>
    </div>
  </div>

  <div class="sec-hdr">📋 ATIVIDADES E RESPONSABILIDADES</div>
  <div class="summary" style="grid-template-columns:repeat(3,1fr)">
    <div class="sc"><div class="sn">${activities.length}</div><div class="sl">Atividades</div></div>
    <div class="sc"><div class="sn">${groups.length}</div><div class="sl">Categorias</div></div>
    <div class="sc"><div class="sn">${activities.reduce((s,a)=>s+(a.itemLinks.length>0?a.itemLinks.length:a.activityTemplate.items.length),0)}</div><div class="sl">Itens</div></div>
  </div>
  ${activitiesBody}

  <div class="sec-hdr" style="margin-top:16px">💬 FEEDBACKS (${member.feedbacks.length})</div>
  ${feedbacksHTML}

  <div class="sec-hdr">🎯 DIRECIONAMENTOS (${member.directions.length})</div>
  ${directionsHTML}

  <div class="sec-hdr">🎓 TREINAMENTOS (${member.trainings.length})</div>
  ${trainingsHTML}

  <div class="sec-hdr">🏖️ FÉRIAS (${member.vacations.length})</div>
  ${vacationsHTML}

  <div class="ftr"><span>${member.name} — ${member.role}</span><span>Perfil Corporativo</span></div>
  </body></html>`
}

function exportExcel(member: MemberDetail, activities: MemberActivity[]): void {
  const groups = groupActivitiesByCategory(activities)
  const activitiesRows = groups.flatMap(g =>
    g.items.flatMap(act => {
      const items = act.itemLinks.length > 0 ? act.itemLinks.map(il => il.item) : act.activityTemplate.items
      return items.map((it, i) => `
        <tr>
          <td>${g.catName}</td>
          <td>${act.activityTemplate.name}</td>
          <td>${i + 1}</td><td>${it.title}</td><td>${it.description ?? ''}</td>
          <td>${it.observation ?? ''}</td><td>${act.observation ?? ''}</td>
          <td>${fmtDate(act.includedAt)}</td>
        </tr>`)
    })
  ).join('')

  const feedbackRows = member.feedbacks.map(f => `
    <tr>
      <td>${fmtDate(f.feedbackDate)}</td><td>${FEEDBACK_TYPE[f.type] ?? f.type}</td>
      <td>${f.observedSituation ?? ''}</td><td>${f.positivePoints ?? ''}</td>
      <td>${f.improvementPoints ?? ''}</td><td>${f.orientationGiven ?? ''}</td>
      <td>${f.agreedAction ?? ''}</td>
    </tr>`).join('')

  const trainingRows = member.trainings.map(t => `
    <tr>
      <td>${t.topic}</td><td>${TRAIN_STATUS[t.status] ?? t.status}</td>
      <td>${fmtDate(t.plannedDate)}</td><td>${fmtDate(t.completedDate)}</td>
      <td>${t.responsible ?? ''}</td><td>${t.evaluation ?? ''}</td>
    </tr>`).join('')

  const vacationRows = member.vacations.map(v => `
    <tr>
      <td>${v.companyName ?? ''}</td>
      <td>${fmtDate(v.acquisitionStartDate)}</td><td>${fmtDate(v.acquisitionEndDate)}</td>
      <td>${fmtDate(v.concessionStartDate)}</td><td>${fmtDate(v.concessionEndDate)}</td>
      <td>${v.availableDays ?? ''}</td><td>${v.vacationDays ?? ''}</td>
      <td>${v.hasBonus ? 'Sim' : 'Não'}</td><td>${v.bonusDays ?? ''}</td>
      <td>${fmtDate(v.startDate)}</td><td>${fmtDate(v.endDate)}</td>
      <td>${fmtDate(v.returnDate)}</td><td>${VAC_STATUS[v.status] ?? v.status}</td>
      <td>${v.substitute ?? ''}</td>
    </tr>`).join('')

  const headerStyle = 'background:#1e3a5f;color:white;font-weight:bold;'
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
  <x:ExcelWorksheet><x:Name>Dados Gerais</x:Name><x:WorksheetOptions><x:Selected/></x:WorksheetOptions></x:ExcelWorksheet>
  <x:ExcelWorksheet><x:Name>Atividades</x:Name></x:ExcelWorksheet>
  <x:ExcelWorksheet><x:Name>Feedbacks</x:Name></x:ExcelWorksheet>
  <x:ExcelWorksheet><x:Name>Treinamentos</x:Name></x:ExcelWorksheet>
  <x:ExcelWorksheet><x:Name>Férias</x:Name></x:ExcelWorksheet>
  </x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
  <body>
  <table><tr><td colspan="2" style="font-size:16pt;font-weight:bold;color:#1e3a5f">${member.name}</td></tr>
  <tr><td style="${headerStyle}padding:4px">Campo</td><td style="${headerStyle}padding:4px">Valor</td></tr>
  <tr><td>Nome</td><td>${member.name}</td></tr>
  <tr><td>Cargo/Função</td><td>${member.role}</td></tr>
  <tr><td>Setor</td><td>${member.sector ?? ''}</td></tr>
  <tr><td>Unidade</td><td>${member.unit ?? ''}</td></tr>
  <tr><td>E-mail</td><td>${member.email ?? ''}</td></tr>
  <tr><td>Telefone</td><td>${member.phone ?? ''}</td></tr>
  <tr><td>Data de Admissão</td><td>${fmtDate(member.joinedAt)}</td></tr>
  <tr><td>Status</td><td>${STATUS_LABELS[member.status] ?? member.status}</td></tr>
  <tr><td>Observações</td><td>${member.observations ?? ''}</td></tr>
  </table>

  <br/><table>
  <tr><td colspan="8" style="font-size:13pt;font-weight:bold;color:#1e3a5f">Atividades e Responsabilidades</td></tr>
  <tr>
    <td style="${headerStyle}padding:4px">Categoria</td><td style="${headerStyle}padding:4px">Atividade</td>
    <td style="${headerStyle}padding:4px">#</td><td style="${headerStyle}padding:4px">Item</td>
    <td style="${headerStyle}padding:4px">Descrição do Item</td><td style="${headerStyle}padding:4px">Obs. Item</td>
    <td style="${headerStyle}padding:4px">Obs. Colaborador</td><td style="${headerStyle}padding:4px">Incluída em</td>
  </tr>
  ${activitiesRows || '<tr><td colspan="8">Nenhuma atividade vinculada.</td></tr>'}
  </table>

  <br/><table>
  <tr><td colspan="7" style="font-size:13pt;font-weight:bold;color:#1e3a5f">Feedbacks</td></tr>
  <tr>
    <td style="${headerStyle}padding:4px">Data</td><td style="${headerStyle}padding:4px">Tipo</td>
    <td style="${headerStyle}padding:4px">Situação</td><td style="${headerStyle}padding:4px">Pontos Positivos</td>
    <td style="${headerStyle}padding:4px">Melhoria</td><td style="${headerStyle}padding:4px">Orientação</td>
    <td style="${headerStyle}padding:4px">Ação Acordada</td>
  </tr>
  ${feedbackRows || '<tr><td colspan="7">Nenhum feedback.</td></tr>'}
  </table>

  <br/><table>
  <tr><td colspan="6" style="font-size:13pt;font-weight:bold;color:#1e3a5f">Treinamentos</td></tr>
  <tr>
    <td style="${headerStyle}padding:4px">Tema</td><td style="${headerStyle}padding:4px">Status</td>
    <td style="${headerStyle}padding:4px">Data Planejada</td><td style="${headerStyle}padding:4px">Concluído</td>
    <td style="${headerStyle}padding:4px">Responsável</td><td style="${headerStyle}padding:4px">Avaliação</td>
  </tr>
  ${trainingRows || '<tr><td colspan="6">Nenhum treinamento.</td></tr>'}
  </table>

  <br/><table>
  <tr><td colspan="14" style="font-size:13pt;font-weight:bold;color:#1e3a5f">Férias</td></tr>
  <tr>
    <td style="${headerStyle}padding:4px">Empresa</td>
    <td style="${headerStyle}padding:4px">P.Aquisitivo Início</td><td style="${headerStyle}padding:4px">P.Aquisitivo Fim</td>
    <td style="${headerStyle}padding:4px">P.Concessivo Início</td><td style="${headerStyle}padding:4px">P.Concessivo Fim</td>
    <td style="${headerStyle}padding:4px">Dias Direito</td><td style="${headerStyle}padding:4px">Dias Gozo</td>
    <td style="${headerStyle}padding:4px">Abono</td><td style="${headerStyle}padding:4px">Dias Abono</td>
    <td style="${headerStyle}padding:4px">Início</td><td style="${headerStyle}padding:4px">Fim</td>
    <td style="${headerStyle}padding:4px">Retorno</td><td style="${headerStyle}padding:4px">Status</td>
    <td style="${headerStyle}padding:4px">Substituto</td>
  </tr>
  ${vacationRows || '<tr><td colspan="14">Nenhuma férias.</td></tr>'}
  </table>
  </body></html>`

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Perfil_${member.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xls`
  a.click()
  URL.revokeObjectURL(url)
}

function printHTML(html: string): void {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  setTimeout(() => { win.print(); win.close() }, 400)
}

// ─── TAB: DADOS GERAIS ────────────────────────────────────────────────────────

function TabDadosGerais({ member, onEdit }: { member: MemberDetail; onEdit: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge label={STATUS_LABELS[member.status] ?? member.status} className={STATUS_COLORS[member.status]} />
        <button onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
          <Edit2 className="w-3.5 h-3.5" /> Editar dados
        </button>
      </div>

      <div>
        <SectionTitle>Identificação</SectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Nome" value={member.name} />
          <Field label="Cargo / Função" value={member.role} />
          <Field label="Status" value={STATUS_LABELS[member.status] ?? member.status} />
        </div>
      </div>

      <div>
        <SectionTitle>Lotação</SectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Setor / Departamento" value={member.sector} />
          <Field label="Unidade" value={member.unit} />
        </div>
      </div>

      <div>
        <SectionTitle>Contato</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="E-mail" value={
            member.email ? (
              <a href={`mailto:${member.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />{member.email}
              </a>
            ) : '—'
          } />
          <Field label="Telefone" value={
            member.phone ? (
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{member.phone}</span>
            ) : '—'
          } />
        </div>
      </div>

      <div>
        <SectionTitle>Histórico de Vínculo</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Data de Admissão" value={
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmtDate(member.joinedAt)}</span>
          } />
          <Field label="Cadastrado em" value={fmtDate(member.createdAt)} />
        </div>
      </div>

      {member.observations && (
        <div>
          <SectionTitle>Observações</SectionTitle>
          <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-200">
            {member.observations}
          </p>
        </div>
      )}

      <div>
        <SectionTitle>Indicadores</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Feedbacks', value: member.feedbacks.length, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Direcionamentos', value: member.directions.length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Treinamentos', value: member.trainings.length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Férias', value: member.vacations.length, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(c => (
            <div key={c.label} className={cn("rounded-xl border border-slate-200 p-3 text-center", c.bg)}>
              <p className={cn("text-2xl font-bold", c.color)}>{c.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── TAB: ATIVIDADES ─────────────────────────────────────────────────────────

function TabAtividadesPerfil({
  memberId, activities, loading, onReload,
}: {
  memberId: string; activities: MemberActivity[]; loading: boolean; onReload: () => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }))
  const groups = groupActivitiesByCategory(activities)
  const totalItems = activities.reduce((s, a) =>
    s + (a.itemLinks.length > 0 ? a.itemLinks.length : a.activityTemplate.items.length), 0)

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Indicadores */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{activities.length}</p>
          <p className="text-xs text-slate-500">Atividades</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-bold text-violet-600">{totalItems}</p>
          <p className="text-xs text-slate-500">Itens/Etapas</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-bold text-slate-600">{groups.length}</p>
          <p className="text-xs text-slate-500">Categorias</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <EmptyState icon={Activity} label="Nenhuma atividade vinculada a este colaborador." />
      ) : (
        <div className="space-y-4">
          {groups.map(g => (
            <div key={g.catName} className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-800 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider">{g.catName}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {g.items.map(act => {
                  const isExp = expanded[act.id]
                  const displayItems = act.itemLinks.length > 0
                    ? act.itemLinks.map(il => il.item)
                    : act.activityTemplate.items
                  return (
                    <div key={act.id}>
                      <button
                        className="w-full text-left px-4 py-3 flex items-start justify-between hover:bg-slate-50 transition-colors"
                        onClick={() => toggle(act.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{act.activityTemplate.name}</p>
                          {act.activityTemplate.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{act.activityTemplate.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-slate-400">{displayItems.length} item(s)</span>
                            <span className="text-xs text-slate-400">Incluída em {fmtDate(act.includedAt)}</span>
                          </div>
                        </div>
                        {isExp ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                               : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                      </button>
                      {isExp && (
                        <div className="px-4 pb-4 bg-slate-50">
                          {act.observation && (
                            <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                              <p className="text-xs text-amber-700"><strong>Obs. do colaborador:</strong> {act.observation}</p>
                            </div>
                          )}
                          {displayItems.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Nenhum item/etapa cadastrado.</p>
                          ) : (
                            <div className="space-y-2">
                              {displayItems.map((it, i) => (
                                <div key={it.id} className="flex gap-3 bg-white rounded-lg border border-slate-200 p-3">
                                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                                    {i + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700">{it.title}</p>
                                    {it.description && <p className="text-xs text-slate-500 mt-0.5">{it.description}</p>}
                                    {it.observation && (
                                      <p className="text-xs text-slate-400 mt-1 italic">{it.observation}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TAB: FEEDBACKS E DIRECIONAMENTOS ────────────────────────────────────────

function TabFeedbacksDirecionamentos({ member }: { member: MemberDetail }) {
  const [tab, setTab] = useState<'feedbacks' | 'direcoes'>('feedbacks')
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {(['feedbacks', 'direcoes'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}>
            {t === 'feedbacks' ? `Feedbacks (${member.feedbacks.length})` : `Direcionamentos (${member.directions.length})`}
          </button>
        ))}
      </div>

      {tab === 'feedbacks' && (
        member.feedbacks.length === 0
          ? <EmptyState icon={MessageSquare} label="Nenhum feedback registrado." />
          : <div className="space-y-3">
              {member.feedbacks.map(f => (
                <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge label={FEEDBACK_TYPE[f.type] ?? f.type}
                        className={cn("border-0", FEEDBACK_COLOR[f.type] ?? 'bg-slate-100 text-slate-600')} />
                    </div>
                    <span className="text-xs text-slate-400">{fmtDate(f.feedbackDate)}</span>
                  </div>
                  {f.observedSituation && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-slate-400 mb-0.5">Situação observada</p>
                      <p className="text-sm text-slate-700">{f.observedSituation}</p>
                    </div>
                  )}
                  {f.orientationGiven && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-slate-400 mb-0.5">Orientação dada</p>
                      <p className="text-sm text-slate-700">{f.orientationGiven}</p>
                    </div>
                  )}
                  {f.agreedAction && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-slate-400 mb-0.5">Ação acordada</p>
                      <p className="text-sm text-slate-700">{f.agreedAction}</p>
                    </div>
                  )}
                  {f.nextFollowUp && (
                    <p className="text-xs text-slate-400 mt-2">Próximo acompanhamento: {fmtDate(f.nextFollowUp)}</p>
                  )}
                </div>
              ))}
            </div>
      )}

      {tab === 'direcoes' && (
        member.directions.length === 0
          ? <EmptyState icon={Navigation} label="Nenhum direcionamento registrado." />
          : <div className="space-y-3">
              {member.directions.map(d => (
                <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-800">{d.title}</p>
                    <div className="flex gap-2">
                      <Badge label={d.priority}
                        className={d.priority === 'URGENTE' ? 'bg-red-100 text-red-700 border-red-200'
                          : d.priority === 'ALTA' ? 'bg-orange-100 text-orange-700 border-orange-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'} />
                      <Badge label={DIR_STATUS[d.status] ?? d.status}
                        className={d.status === 'CONCLUIDA' ? 'bg-green-100 text-green-700 border-green-200'
                          : d.status === 'CANCELADA' ? 'bg-red-100 text-red-700 border-red-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'} />
                    </div>
                  </div>
                  {d.description && <p className="text-sm text-slate-600 mb-2">{d.description}</p>}
                  {d.expectedResult && (
                    <div className="text-xs text-slate-500">
                      <strong>Resultado esperado:</strong> {d.expectedResult}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    {d.dueDate && <span>Prazo: {fmtDate(d.dueDate)}</span>}
                    <span>Registrado em: {fmtDate(d.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
      )}
    </div>
  )
}

// ─── TAB: TREINAMENTOS ───────────────────────────────────────────────────────

function TabTreinamentosPerfil({ member }: { member: MemberDetail }) {
  if (member.trainings.length === 0) return <EmptyState icon={GraduationCap} label="Nenhum treinamento registrado." />
  return (
    <div className="space-y-3">
      {member.trainings.map(t => (
        <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-semibold text-slate-800">{t.topic}</p>
            <Badge label={TRAIN_STATUS[t.status] ?? t.status}
              className={t.status === 'CONCLUIDO' ? 'bg-green-100 text-green-700 border-green-200'
                : t.status === 'CANCELADO' ? 'bg-red-100 text-red-700 border-red-200'
                : t.status === 'EM_ANDAMENTO' ? 'bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-amber-100 text-amber-700 border-amber-200'} />
          </div>
          {t.objective && <p className="text-xs text-slate-500 mb-2">{t.objective}</p>}
          <div className="grid grid-cols-2 gap-3 mt-2 text-xs text-slate-500">
            {t.plannedDate && <span>Planejado: {fmtDate(t.plannedDate)}</span>}
            {t.completedDate && <span>Concluído: {fmtDate(t.completedDate)}</span>}
            {t.responsible && <span>Responsável: {t.responsible}</span>}
          </div>
          {t.evaluation && (
            <div className="mt-2 text-xs text-slate-500">
              <strong>Avaliação:</strong> {t.evaluation}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── TAB: FÉRIAS ─────────────────────────────────────────────────────────────

function TabFeriasPerfil({ member }: { member: MemberDetail }) {
  if (member.vacations.length === 0) return <EmptyState icon={Umbrella} label="Nenhuma férias registrada." />
  return (
    <div className="space-y-3">
      {member.vacations.map(v => (
        <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              {v.companyName && <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{v.companyName}</p>}
            </div>
            <Badge label={VAC_STATUS[v.status] ?? v.status}
              className={v.status === 'RETORNOU' ? 'bg-green-100 text-green-700 border-green-200'
                : v.status === 'EM_FERIAS' ? 'bg-blue-100 text-blue-700 border-blue-200'
                : v.status === 'CANCELADA' ? 'bg-red-100 text-red-700 border-red-200'
                : v.status === 'PROGRAMADA' ? 'bg-violet-100 text-violet-700 border-violet-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <div>
              <p className="text-slate-400 font-medium">Período Aquisitivo</p>
              <p className="text-slate-700">{fmtDate(v.acquisitionStartDate)} a {fmtDate(v.acquisitionEndDate)}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Período Concessivo</p>
              <p className="text-slate-700">{fmtDate(v.concessionStartDate)} a {fmtDate(v.concessionEndDate)}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Dias de Direito</p>
              <p className="text-slate-700">{v.availableDays ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Dias Gozados</p>
              <p className="text-slate-700">{v.vacationDays ?? '—'}{v.hasBonus ? ` + ${v.bonusDays ?? 10}d abono` : ''}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Início → Retorno</p>
              <p className="text-slate-700">{fmtDate(v.startDate)} → {fmtDate(v.returnDate)}</p>
            </div>
            {v.substitute && (
              <div>
                <p className="text-slate-400 font-medium">Substituto</p>
                <p className="text-slate-700">{v.substitute}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── TAB: HISTÓRICO ──────────────────────────────────────────────────────────

function TabHistoricoPerfil({ member }: { member: MemberDetail }) {
  const HIST_ICONS: Record<string, string> = {
    MEMBRO_CRIADO: '🆕', STATUS: '🔄', ATIVIDADE_VINCULADA: '📎',
    ATIVIDADE_REMOVIDA: '🗑️', TREINAMENTO: '🎓', FERIAS: '🏖️',
    FEEDBACK: '💬', DOCUMENTO: '📄',
  }
  if (member.history.length === 0) return <EmptyState icon={Clock} label="Nenhum evento no histórico." />
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
      <div className="space-y-3 pl-10">
        {member.history.map(h => (
          <div key={h.id} className="relative">
            <div className="absolute -left-[26px] w-5 h-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center text-xs">
              {HIST_ICONS[h.type] ?? '●'}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-slate-700">{h.title}</p>
                <span className="text-xs text-slate-400 shrink-0 ml-2">{fmtDate(h.createdAt)}</span>
              </div>
              {h.description && <p className="text-xs text-slate-500 mt-0.5">{h.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TAB: RELATÓRIOS ─────────────────────────────────────────────────────────

function TabRelatoriosPerfil({
  member, activities,
}: { member: MemberDetail; activities: MemberActivity[] }) {
  const [printing, setPrinting] = useState<string | null>(null)

  async function run(key: string, fn: () => void) {
    setPrinting(key)
    await new Promise(r => setTimeout(r, 100))
    fn()
    setPrinting(null)
  }

  const groups = groupActivitiesByCategory(activities)
  const totalItems = activities.reduce((s, a) =>
    s + (a.itemLinks.length > 0 ? a.itemLinks.length : a.activityTemplate.items.length), 0)

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <SectionTitle>Resumo do Perfil</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
          {[
            { label: 'Atividades', value: activities.length },
            { label: 'Itens/Etapas', value: totalItems },
            { label: 'Feedbacks', value: member.feedbacks.length },
            { label: 'Treinamentos', value: member.trainings.length },
          ].map(c => (
            <div key={c.label} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xl font-bold text-slate-800">{c.value}</p>
              <p className="text-xs text-slate-400">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Relatório de Atividades */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Atividades e Responsabilidades</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {activities.length} atividade(s) · {totalItems} item(s) · {groups.length} categori(as)
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => run('pdf-ativ', () => printHTML(buildActivitiesHTML(member, activities)))}
            disabled={printing === 'pdf-ativ'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors">
            {printing === 'pdf-ativ' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
            Imprimir / PDF
          </button>
          <button onClick={() => run('xls', () => exportExcel(member, activities))}
            disabled={printing === 'xls'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors">
            {printing === 'xls' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            Excel
          </button>
        </div>
      </div>

      {/* Perfil Completo */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-800">Perfil Completo</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Dados gerais + atividades + feedbacks + direcionamentos + treinamentos + férias
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => run('pdf-full', () => printHTML(buildProfileHTML(member, activities)))}
            disabled={printing === 'pdf-full'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors">
            {printing === 'pdf-full' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
            Imprimir / PDF Completo
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── TYPES: FASE 1 ───────────────────────────────────────────────────────────

interface MemberCompanyLink {
  id: string; memberId: string; companyId: string
  companyName: string; cnpj: string | null; segment: string | null
  memberRole: string | null
  headcountActive: number | null; headcountApprentice: number | null
  headcountIntern: number | null; headcountOnLeave: number | null
  headcountUpdatedAt: string | null
  avgAdmissions: number | null; avgTerminations: number | null; avgVacations: number | null
  folhasProcessadas: number | null; unions: number | null; establishments: number | null
  systemUsed: string | null; automationLevel: string | null; complexity: string | null
  startDate: string | null; substitute: string | null; observations: string | null
}

interface MemberSalaryData {
  id: string; memberId: string
  baseSalary: number | null; fixedAdditions: number | null; gratification: number | null
  trustFunction: number | null; commission: number | null; otherFixed: number | null
  estimatedMonthly: number | null; estimatedCharges: number | null; estimatedCost: number | null
  validFrom: string | null; lastAdjustment: string | null
  adjustmentReason: string | null; observations: string | null
}

// ─── TAB: REMUNERAÇÃO ────────────────────────────────────────────────────────

const MEMBER_ROLES_COMPANY: Record<string, string> = {
  RESPONSAVEL: 'Responsável Principal', APOIO: 'Apoio', CONFERENCIA: 'Conferência',
  APROVACAO: 'Aprovação', ADMISSAO: 'Admissão', PONTO: 'Ponto', FOLHA: 'Folha',
  FERIAS: 'Férias', RESCISAO: 'Rescisão', BENEFICIOS: 'Benefícios',
  ENCARGOS: 'Encargos', ATENDIMENTO: 'Atendimento', OUTRO: 'Outro',
}
const AUTOMATION_LABELS: Record<string, string> = {
  ALTO: 'Alto', MEDIO: 'Médio', BAIXO: 'Baixo', MANUAL: 'Manual',
}
const COMPLEXITY_LABELS: Record<string, string> = {
  BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', MUITO_ALTA: 'Muito Alta',
}
const COMPLEXITY_COLORS: Record<string, string> = {
  BAIXA: 'bg-green-100 text-green-700 border-green-200',
  MEDIA: 'bg-amber-100 text-amber-700 border-amber-200',
  ALTA: 'bg-orange-100 text-orange-700 border-orange-200',
  MUITO_ALTA: 'bg-red-100 text-red-700 border-red-200',
}
const AUTOMATION_COLORS: Record<string, string> = {
  ALTO: 'bg-green-100 text-green-700', MEDIO: 'bg-blue-100 text-blue-700',
  BAIXO: 'bg-amber-100 text-amber-700', MANUAL: 'bg-red-100 text-red-700',
}

function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function TabRemuneracao({ memberId, showSalary }: { memberId: string; showSalary: boolean }) {
  const [salary, setSalary] = useState<MemberSalaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    baseSalary: '', fixedAdditions: '', gratification: '', trustFunction: '',
    commission: '', otherFixed: '', estimatedCharges: '', estimatedCost: '',
    validFrom: '', lastAdjustment: '', adjustmentReason: '', observations: '',
  })

  useEffect(() => {
    setLoading(true)
    fetch(`/api/gestao-equipe/members/${memberId}/salary`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setSalary(d)
        if (d) {
          setForm({
            baseSalary: d.baseSalary ?? '', fixedAdditions: d.fixedAdditions ?? '',
            gratification: d.gratification ?? '', trustFunction: d.trustFunction ?? '',
            commission: d.commission ?? '', otherFixed: d.otherFixed ?? '',
            estimatedCharges: d.estimatedCharges ?? '', estimatedCost: d.estimatedCost ?? '',
            validFrom: d.validFrom ? d.validFrom.slice(0, 10) : '',
            lastAdjustment: d.lastAdjustment ? d.lastAdjustment.slice(0, 10) : '',
            adjustmentReason: d.adjustmentReason ?? '',
            observations: d.observations ?? '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [memberId])

  const num = (s: string) => s === '' ? null : parseFloat(s.replace(',', '.'))

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/gestao-equipe/members/${memberId}/salary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseSalary: num(form.baseSalary), fixedAdditions: num(form.fixedAdditions),
          gratification: num(form.gratification), trustFunction: num(form.trustFunction),
          commission: num(form.commission), otherFixed: num(form.otherFixed),
          estimatedCharges: num(form.estimatedCharges), estimatedCost: num(form.estimatedCost),
          validFrom: form.validFrom || null, lastAdjustment: form.lastAdjustment || null,
          adjustmentReason: form.adjustmentReason || null, observations: form.observations || null,
        }),
      })
      if (res.ok) { setSalary(await res.json()); setEditing(false) }
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
    </div>
  )

  if (!showSalary) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Lock className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm font-medium">Acesso restrito</p>
      <p className="text-xs mt-1">Os dados de remuneração são restritos e não estão visíveis para este perfil.</p>
    </div>
  )

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div className="space-y-5">
      {/* Aviso restrito */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          <strong>Dado restrito.</strong> Informações de remuneração são confidenciais e não aparecem em relatórios gerais.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Remuneração e Custo</p>
        {!editing ? (
          <button onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Edit2 className="w-3.5 h-3.5" /> {salary ? 'Editar' : 'Cadastrar'}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg border border-slate-200">Cancelar</button>
            <button onClick={save} disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <SectionTitle>Componentes da Remuneração</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: 'Salário-base (R$)', key: 'baseSalary' },
              { label: 'Adicionais fixos (R$)', key: 'fixedAdditions' },
              { label: 'Gratificação (R$)', key: 'gratification' },
              { label: 'Função de confiança (R$)', key: 'trustFunction' },
              { label: 'Comissão média (R$)', key: 'commission' },
              { label: 'Outros fixos (R$)', key: 'otherFixed' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-slate-500 block mb-1">{f.label}</label>
                <input type="number" step="0.01" min="0"
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className={inputClass} placeholder="0,00" />
              </div>
            ))}
          </div>
          <SectionTitle>Custo Total</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Encargos estimados (R$)', key: 'estimatedCharges' },
              { label: 'Custo mensal estimado (R$)', key: 'estimatedCost' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-slate-500 block mb-1">{f.label}</label>
                <input type="number" step="0.01" min="0"
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className={inputClass} placeholder="0,00" />
              </div>
            ))}
          </div>
          <SectionTitle>Histórico Salarial</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Data de vigência</label>
              <input type="date" value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Último reajuste</label>
              <input type="date" value={form.lastAdjustment} onChange={e => setForm(p => ({ ...p, lastAdjustment: e.target.value }))} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500 block mb-1">Motivo do reajuste</label>
              <input value={form.adjustmentReason} onChange={e => setForm(p => ({ ...p, adjustmentReason: e.target.value }))} className={inputClass} placeholder="Ex: Dissídio anual, promoção..." />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500 block mb-1">Observações</label>
              <textarea rows={2} value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))} className={inputClass} />
            </div>
          </div>
        </div>
      ) : salary ? (
        <div className="space-y-4">
          {/* Remuneração calculada */}
          {salary.estimatedMonthly != null && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Remuneração Mensal Estimada</p>
              <p className="text-3xl font-bold text-blue-700">{fmtCurrency(salary.estimatedMonthly)}</p>
              {salary.estimatedCost && (
                <p className="text-xs text-blue-500 mt-1">Custo total estimado: {fmtCurrency(salary.estimatedCost)}</p>
              )}
            </div>
          )}
          <SectionTitle>Composição</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: 'Salário-base', v: salary.baseSalary },
              { label: 'Adicionais fixos', v: salary.fixedAdditions },
              { label: 'Gratificação', v: salary.gratification },
              { label: 'Função de confiança', v: salary.trustFunction },
              { label: 'Comissão média', v: salary.commission },
              { label: 'Outros fixos', v: salary.otherFixed },
            ].map(f => (
              <div key={f.label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-400">{f.label}</p>
                <p className="text-sm font-semibold text-slate-700">{fmtCurrency(f.v)}</p>
              </div>
            ))}
          </div>
          {(salary.estimatedCharges != null) && (
            <>
              <SectionTitle>Custo</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">Encargos estimados</p>
                  <p className="text-sm font-semibold text-slate-700">{fmtCurrency(salary.estimatedCharges)}</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">Custo mensal estimado</p>
                  <p className="text-sm font-semibold text-slate-700">{fmtCurrency(salary.estimatedCost)}</p>
                </div>
              </div>
            </>
          )}
          <SectionTitle>Vigência</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de vigência" value={fmtDate(salary.validFrom)} />
            <Field label="Último reajuste" value={fmtDate(salary.lastAdjustment)} />
            {salary.adjustmentReason && <div className="col-span-2"><Field label="Motivo" value={salary.adjustmentReason} /></div>}
            {salary.observations && <div className="col-span-2"><Field label="Observações" value={salary.observations} /></div>}
          </div>
        </div>
      ) : (
        <EmptyState icon={DollarSign} label="Nenhuma remuneração cadastrada. Clique em Cadastrar para adicionar." />
      )}
    </div>
  )
}

// ─── TAB: CARTEIRA DE EMPRESAS ────────────────────────────────────────────────

function CapacityIndicator({ memberId }: { memberId: string }) {
  const [cap, setCap] = useState<CapacityResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/gestao-equipe/members/${memberId}/capacity`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setCap(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [memberId])

  if (loading) return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
    </div>
  )
  if (!cap) return null

  const colors = BAND_COLORS[cap.band] ?? BAND_COLORS.green
  const barPct = Math.min(cap.capacityPct, 130)

  return (
    <div className={cn("rounded-xl border p-4", colors.bg, colors.border)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Indicador de Capacidade</p>
          <p className={cn("text-2xl font-bold mt-0.5", colors.text)}>{cap.capacityPct.toFixed(1)}%</p>
          <p className={cn("text-xs font-medium", colors.text)}>{cap.bandLabel}</p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <p>Score: {cap.totalScore} pts</p>
          <p>Ref: {cap.capacityRef} pts</p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden mb-3">
        <div
          className={cn("h-2 rounded-full transition-all", colors.bar)}
          style={{ width: `${Math.min(barPct / 130 * 100, 100)}%` }}
        />
      </div>

      {/* Legenda das faixas */}
      <div className="flex gap-1 text-[10px] text-slate-400 mb-3">
        <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />≤{cap.config.bandGreen}% Disp.</span>
        <span className="flex items-center gap-0.5 ml-2"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />≤{cap.config.bandBlue}% Eq.</span>
        <span className="flex items-center gap-0.5 ml-2"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />≤{cap.config.bandYellow}% Aten.</span>
        <span className="flex items-center gap-0.5 ml-2"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />≤{cap.config.bandOrange}% Sob.</span>
        <span className="flex items-center gap-0.5 ml-2"><span className="w-2 h-2 rounded-full bg-red-600 inline-block" />&gt;{cap.config.bandOrange}% Crit.</span>
      </div>

      {/* Breakdown por empresa */}
      {cap.breakdown.length > 0 && (
        <div className="space-y-1">
          {cap.breakdown.map(b => {
            const bPct = cap.totalScore > 0 ? (b.score / cap.totalScore) * 100 : 0
            return (
              <div key={b.companyId} className="flex items-center gap-2 text-xs">
                <span className="truncate flex-1 text-slate-600">{b.companyName}</span>
                <div className="w-20 h-1.5 rounded-full bg-slate-200 overflow-hidden shrink-0">
                  <div className={cn("h-1.5 rounded-full", colors.bar)} style={{ width: `${bPct}%` }} />
                </div>
                <span className="text-slate-400 w-10 text-right shrink-0">{b.score}pts</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TabCarteira({ memberId }: { memberId: string }) {
  const [links, setLinks] = useState<MemberCompanyLink[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string; segment: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [capKey, setCapKey] = useState(0)

  const emptyForm = {
    companyId: '', memberRole: '', headcountActive: '', headcountApprentice: '',
    headcountIntern: '', headcountOnLeave: '', avgAdmissions: '', avgTerminations: '',
    avgVacations: '', folhasProcessadas: '', unions: '', establishments: '',
    systemUsed: '', automationLevel: '', complexity: '', substitute: '', observations: '',
  }
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    const [linksRes, companiesRes] = await Promise.all([
      fetch(`/api/gestao-equipe/member-companies?memberId=${memberId}`),
      fetch('/api/gestao-equipe/companies'),
    ])
    if (linksRes.ok) setLinks(await linksRes.json())
    if (companiesRes.ok) setCompanies(await companiesRes.json())
    setLoading(false)
  }, [memberId])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(l: MemberCompanyLink) {
    setEditId(l.id)
    setForm({
      companyId: l.companyId, memberRole: l.memberRole ?? '',
      headcountActive: l.headcountActive?.toString() ?? '',
      headcountApprentice: l.headcountApprentice?.toString() ?? '',
      headcountIntern: l.headcountIntern?.toString() ?? '',
      headcountOnLeave: l.headcountOnLeave?.toString() ?? '',
      avgAdmissions: l.avgAdmissions?.toString() ?? '',
      avgTerminations: l.avgTerminations?.toString() ?? '',
      avgVacations: l.avgVacations?.toString() ?? '',
      folhasProcessadas: l.folhasProcessadas?.toString() ?? '',
      unions: l.unions?.toString() ?? '',
      establishments: l.establishments?.toString() ?? '',
      systemUsed: l.systemUsed ?? '', automationLevel: l.automationLevel ?? '',
      complexity: l.complexity ?? '', substitute: l.substitute ?? '',
      observations: l.observations ?? '',
    })
    setShowForm(true)
  }

  const intVal  = (s: string) => s === '' ? null : parseInt(s, 10)
  const floatVal = (s: string) => s === '' ? null : parseFloat(s)

  async function save() {
    setSaving(true)
    try {
      const payload = {
        companyId: form.companyId, memberRole: form.memberRole || null,
        headcountActive: intVal(form.headcountActive),
        headcountApprentice: intVal(form.headcountApprentice),
        headcountIntern: intVal(form.headcountIntern),
        headcountOnLeave: intVal(form.headcountOnLeave),
        avgAdmissions: floatVal(form.avgAdmissions),
        avgTerminations: floatVal(form.avgTerminations),
        avgVacations: floatVal(form.avgVacations),
        folhasProcessadas: intVal(form.folhasProcessadas),
        unions: intVal(form.unions),
        establishments: intVal(form.establishments) ?? 1,
        systemUsed: form.systemUsed || null, automationLevel: form.automationLevel || null,
        complexity: form.complexity || null, substitute: form.substitute || null,
        observations: form.observations || null,
      }
      if (editId) {
        await fetch(`/api/gestao-equipe/member-companies/${editId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/gestao-equipe/member-companies', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId, ...payload }),
        })
      }
      setShowForm(false)
      await load()
      setCapKey(k => k + 1)
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Remover esta empresa da carteira?')) return
    await fetch(`/api/gestao-equipe/member-companies/${id}`, { method: 'DELETE' })
    await load()
    setCapKey(k => k + 1)
  }

  // Summary
  const totalEmployees = links.reduce((s, l) =>
    s + (l.headcountActive ?? 0) + (l.headcountApprentice ?? 0) + (l.headcountIntern ?? 0), 0)
  const totalAdmissions = links.reduce((s, l) => s + (l.avgAdmissions ?? 0), 0)
  const totalTerminations = links.reduce((s, l) => s + (l.avgTerminations ?? 0), 0)

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const selectClass = `${inputClass} bg-white`

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Indicadores da carteira */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Empresas', value: links.length, color: 'text-blue-600' },
          { label: 'Empregados', value: totalEmployees, color: 'text-slate-700' },
          { label: 'Admissões/mês', value: totalAdmissions.toFixed(1), color: 'text-green-600' },
          { label: 'Rescisões/mês', value: totalTerminations.toFixed(1), color: 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-slate-400">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Indicador de Capacidade */}
      <CapacityIndicator key={capKey} memberId={memberId} />

      {/* Header + Adicionar */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Empresas Atendidas</p>
        <button onClick={openNew}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Adicionar empresa
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-4">
          <p className="text-sm font-semibold text-slate-700">{editId ? 'Editar empresa' : 'Adicionar empresa'}</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {!editId && (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-500 block mb-1">Empresa *</label>
                <select value={form.companyId} onChange={e => setForm(p => ({ ...p, companyId: e.target.value }))} className={selectClass}>
                  <option value="">Selecionar empresa...</option>
                  {companies.filter(c => !links.some(l => l.companyId === c.id)).map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.segment ? ` — ${c.segment}` : ''}</option>
                  ))}
                </select>
                {companies.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Nenhuma empresa cadastrada. Cadastre em "Empresas" primeiro.</p>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Papel do colaborador</label>
              <select value={form.memberRole} onChange={e => setForm(p => ({ ...p, memberRole: e.target.value }))} className={selectClass}>
                <option value="">Não informado</option>
                {Object.entries(MEMBER_ROLES_COMPANY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Complexidade</label>
              <select value={form.complexity} onChange={e => setForm(p => ({ ...p, complexity: e.target.value }))} className={selectClass}>
                <option value="">Não informada</option>
                {Object.entries(COMPLEXITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Nível de automação</label>
              <select value={form.automationLevel} onChange={e => setForm(p => ({ ...p, automationLevel: e.target.value }))} className={selectClass}>
                <option value="">Não informado</option>
                {Object.entries(AUTOMATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Sistema utilizado</label>
              <input value={form.systemUsed} onChange={e => setForm(p => ({ ...p, systemUsed: e.target.value }))} className={inputClass} placeholder="Domínio, RM, SAP..." />
            </div>
          </div>

          <SectionTitle>Headcount</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Empregados ativos', key: 'headcountActive' },
              { label: 'Aprendizes', key: 'headcountApprentice' },
              { label: 'Estagiários', key: 'headcountIntern' },
              { label: 'Afastados', key: 'headcountOnLeave' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-slate-500 block mb-1">{f.label}</label>
                <input type="number" min="0" value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className={inputClass} placeholder="0" />
              </div>
            ))}
          </div>

          <SectionTitle>Volumes Mensais (média)</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: 'Admissões', key: 'avgAdmissions' },
              { label: 'Rescisões', key: 'avgTerminations' },
              { label: 'Férias', key: 'avgVacations' },
              { label: 'Folhas processadas', key: 'folhasProcessadas' },
              { label: 'Sindicatos/CCTs', key: 'unions' },
              { label: 'Estabelecimentos', key: 'establishments' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-slate-500 block mb-1">{f.label}</label>
                <input type="number" min="0" step="0.1" value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className={inputClass} placeholder="0" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Substituto</label>
              <input value={form.substitute} onChange={e => setForm(p => ({ ...p, substitute: e.target.value }))} className={inputClass} placeholder="Nome do substituto" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Observações</label>
              <input value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg border border-slate-200">Cancelar</button>
            <button onClick={save} disabled={saving || (!editId && !form.companyId)}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {editId ? 'Salvar alterações' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de empresas */}
      {links.length === 0 && !showForm ? (
        <EmptyState icon={Briefcase} label="Nenhuma empresa vinculada. Clique em Adicionar empresa." />
      ) : (
        <div className="space-y-3">
          {links.map(l => {
            const isExp = expanded[l.id]
            const total = (l.headcountActive ?? 0) + (l.headcountApprentice ?? 0) + (l.headcountIntern ?? 0)
            return (
              <div key={l.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 flex items-start justify-between">
                  <button className="flex-1 text-left" onClick={() => setExpanded(p => ({ ...p, [l.id]: !p[l.id] }))}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{l.companyName}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {l.segment && <span className="text-xs text-slate-400">{l.segment}</span>}
                          {total > 0 && <span className="text-xs text-slate-500">{total} empregado(s)</span>}
                          {l.memberRole && (
                            <Badge label={MEMBER_ROLES_COMPANY[l.memberRole] ?? l.memberRole}
                              className="bg-blue-50 text-blue-700 border-blue-100" />
                          )}
                          {l.complexity && (
                            <Badge label={COMPLEXITY_LABELS[l.complexity] ?? l.complexity}
                              className={COMPLEXITY_COLORS[l.complexity] ?? 'bg-slate-100 text-slate-600 border-slate-200'} />
                          )}
                          {l.automationLevel && (
                            <Badge label={AUTOMATION_LABELS[l.automationLevel] ?? l.automationLevel}
                              className={cn("border-0", AUTOMATION_COLORS[l.automationLevel] ?? '')} />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <button onClick={() => openEdit(l)} className="text-slate-400 hover:text-blue-600 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(l.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExp ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                  </div>
                </div>

                {isExp && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50">
                    <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <div><p className="text-slate-400">Ativos</p><p className="font-medium text-slate-700">{l.headcountActive ?? '—'}</p></div>
                      <div><p className="text-slate-400">Aprendizes</p><p className="font-medium text-slate-700">{l.headcountApprentice ?? '—'}</p></div>
                      <div><p className="text-slate-400">Estagiários</p><p className="font-medium text-slate-700">{l.headcountIntern ?? '—'}</p></div>
                      <div><p className="text-slate-400">Afastados</p><p className="font-medium text-slate-700">{l.headcountOnLeave ?? '—'}</p></div>
                      <div><p className="text-slate-400">Admissões/mês</p><p className="font-medium text-slate-700">{l.avgAdmissions ?? '—'}</p></div>
                      <div><p className="text-slate-400">Rescisões/mês</p><p className="font-medium text-slate-700">{l.avgTerminations ?? '—'}</p></div>
                      <div><p className="text-slate-400">Férias/mês</p><p className="font-medium text-slate-700">{l.avgVacations ?? '—'}</p></div>
                      <div><p className="text-slate-400">Sindicatos</p><p className="font-medium text-slate-700">{l.unions ?? '—'}</p></div>
                      <div><p className="text-slate-400">Estab.</p><p className="font-medium text-slate-700">{l.establishments ?? '—'}</p></div>
                      <div><p className="text-slate-400">Folhas</p><p className="font-medium text-slate-700">{l.folhasProcessadas ?? '—'}</p></div>
                      {l.systemUsed && <div className="col-span-2"><p className="text-slate-400">Sistema</p><p className="font-medium text-slate-700">{l.systemUsed}</p></div>}
                      {l.substitute && <div className="col-span-2"><p className="text-slate-400">Substituto</p><p className="font-medium text-slate-700">{l.substitute}</p></div>}
                      {l.observations && <div className="col-span-4"><p className="text-slate-400">Obs.</p><p className="text-slate-600">{l.observations}</p></div>}
                      {l.headcountUpdatedAt && (
                        <div className="col-span-4 text-slate-400">
                          Headcount atualizado em {fmtDate(l.headcountUpdatedAt)}
                        </div>
                      )}
                    </div>
                    {!l.substitute && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
                        <AlertTriangle className="w-3.5 h-3.5" /> Sem substituto cadastrado — risco de concentração
                      </div>
                    )}
                    <ProcessesPanel linkId={l.id} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── TYPES: FASE 3 ───────────────────────────────────────────────────────────

interface CapacityResult {
  memberId: string
  totalScore: number
  capacityRef: number
  capacityPct: number
  band: 'green' | 'blue' | 'yellow' | 'orange' | 'critical'
  bandLabel: string
  config: {
    bandGreen: number; bandBlue: number; bandYellow: number; bandOrange: number
  }
  breakdown: {
    companyId: string; companyName: string; segment: string | null
    score: number; headcount: number; processCount: number
    complexity: string | null; automationLevel: string | null
  }[]
}

const BAND_COLORS: Record<string, { bar: string; text: string; bg: string; border: string }> = {
  green:    { bar: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  blue:     { bar: 'bg-blue-500',   text: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200'  },
  yellow:   { bar: 'bg-amber-400',  text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  orange:   { bar: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200'},
  critical: { bar: 'bg-red-600',    text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200'   },
}

// ─── TYPES: FASE 2 ───────────────────────────────────────────────────────────

interface CompanyProcess {
  id: string; linkId: string; processType: string
  volume: number | null; complexity: string | null; automationLevel: string | null
  avgTimeMinutes: number | null; isCritical: boolean | number; observations: string | null
}

const PROCESS_TYPE_LABELS: Record<string, string> = {
  FOLHA: 'Folha de Pagamento', ADMISSAO: 'Admissão', RESCISAO: 'Rescisão',
  FERIAS: 'Férias', BENEFICIOS: 'Benefícios', ENCARGOS: 'Encargos/FGTS',
  PONTO: 'Controle de Ponto', ESOCIAL: 'eSocial', FGTS: 'FGTS/GFIP',
  DCTFWEB: 'DCTFWeb', OUTROS: 'Outros',
}

// ─── PROCESSES PANEL ─────────────────────────────────────────────────────────

function ProcessesPanel({ linkId }: { linkId: string }) {
  const [processes, setProcesses] = useState<CompanyProcess[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProcessId, setEditProcessId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const emptyProc = {
    processType: '', volume: '', complexity: '', automationLevel: '',
    avgTimeMinutes: '', isCritical: false as boolean, observations: '',
  }
  const [form, setForm] = useState(emptyProc)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/gestao-equipe/member-companies/${linkId}/processes`)
    if (res.ok) setProcesses(await res.json())
    setLoading(false)
  }, [linkId])

  useEffect(() => { load() }, [load])

  function openNew() { setEditProcessId(null); setForm(emptyProc); setShowForm(true) }
  function openEdit(p: CompanyProcess) {
    setEditProcessId(p.id)
    setForm({
      processType: p.processType, volume: p.volume?.toString() ?? '',
      complexity: p.complexity ?? '', automationLevel: p.automationLevel ?? '',
      avgTimeMinutes: p.avgTimeMinutes?.toString() ?? '',
      isCritical: !!p.isCritical, observations: p.observations ?? '',
    })
    setShowForm(true)
  }

  const num = (s: string) => s === '' ? null : parseFloat(s)

  async function save() {
    setSaving(true)
    try {
      const payload = {
        processType: form.processType, volume: num(form.volume),
        complexity: form.complexity || null, automationLevel: form.automationLevel || null,
        avgTimeMinutes: num(form.avgTimeMinutes), isCritical: form.isCritical,
        observations: form.observations || null,
      }
      if (editProcessId) {
        await fetch(`/api/gestao-equipe/member-companies/${linkId}/processes/${editProcessId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch(`/api/gestao-equipe/member-companies/${linkId}/processes`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setShowForm(false)
      await load()
    } finally { setSaving(false) }
  }

  async function removeProcess(id: string) {
    if (!confirm('Remover este processo?')) return
    await fetch(`/api/gestao-equipe/member-companies/${linkId}/processes/${id}`, { method: 'DELETE' })
    await load()
  }

  const usedTypes = new Set(processes.map(p => p.processType))
  const inputClass = "w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
  const selectClass = `${inputClass} bg-white`

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Processos</p>
        {!showForm && (
          <button onClick={openNew}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
            <Plus className="w-3 h-3" /> Adicionar processo
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 mb-3 space-y-3">
          <p className="text-xs font-semibold text-slate-700">{editProcessId ? 'Editar processo' : 'Novo processo'}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 block mb-1">Processo *</label>
              <select value={form.processType}
                onChange={e => setForm(p => ({ ...p, processType: e.target.value }))}
                className={selectClass} disabled={!!editProcessId}>
                <option value="">Selecionar...</option>
                {Object.entries(PROCESS_TYPE_LABELS).filter(([k]) => !usedTypes.has(k) || k === form.processType).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Volume/mês</label>
              <input type="number" min="0" step="0.1" value={form.volume}
                onChange={e => setForm(p => ({ ...p, volume: e.target.value }))}
                className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Complexidade</label>
              <select value={form.complexity} onChange={e => setForm(p => ({ ...p, complexity: e.target.value }))} className={selectClass}>
                <option value="">Não informada</option>
                {Object.entries(COMPLEXITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Automação</label>
              <select value={form.automationLevel} onChange={e => setForm(p => ({ ...p, automationLevel: e.target.value }))} className={selectClass}>
                <option value="">Não informado</option>
                {Object.entries(AUTOMATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Tempo médio (min)</label>
              <input type="number" min="0" step="1" value={form.avgTimeMinutes}
                onChange={e => setForm(p => ({ ...p, avgTimeMinutes: e.target.value }))}
                className={inputClass} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Observações</label>
            <input value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))} className={inputClass} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isCritical}
              onChange={e => setForm(p => ({ ...p, isCritical: e.target.checked }))}
              className="w-3.5 h-3.5 rounded border-slate-300 text-red-600" />
            <span className="text-xs text-slate-600">Processo crítico (sem substituto/backup)</span>
          </label>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg border border-slate-200 bg-white">Cancelar</button>
            <button onClick={save} disabled={saving || !form.processType}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {editProcessId ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
      ) : processes.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">Nenhum processo cadastrado.</p>
      ) : (
        <div className="space-y-1.5">
          {processes.map(p => (
            <div key={p.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">
                    {PROCESS_TYPE_LABELS[p.processType] ?? p.processType}
                  </span>
                  {p.complexity && (
                    <Badge label={COMPLEXITY_LABELS[p.complexity] ?? p.complexity}
                      className={cn("text-[10px] px-1.5 py-0", COMPLEXITY_COLORS[p.complexity] ?? '')} />
                  )}
                  {p.automationLevel && (
                    <Badge label={AUTOMATION_LABELS[p.automationLevel] ?? p.automationLevel}
                      className={cn("text-[10px] px-1.5 py-0 border-0", AUTOMATION_COLORS[p.automationLevel] ?? '')} />
                  )}
                  {!!p.isCritical && (
                    <Badge label="Crítico" className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200" />
                  )}
                </div>
                <div className="flex gap-3 mt-0.5 text-[10px] text-slate-400">
                  {p.volume != null && <span>Vol: {p.volume}/mês</span>}
                  {p.avgTimeMinutes != null && <span>Tempo: {p.avgTimeMinutes}min</span>}
                  {p.observations && <span className="truncate">{p.observations}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-blue-600 transition-colors">
                  <Edit2 className="w-3 h-3" />
                </button>
                <button onClick={() => removeProcess(p.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MAIN MODAL ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dados',        label: 'Dados Gerais',    icon: User          },
  { id: 'carteira',     label: 'Carteira',         icon: Briefcase     },
  { id: 'atividades',   label: 'Atividades',       icon: Activity      },
  { id: 'feedbacks',    label: 'Feedbacks',        icon: MessageSquare },
  { id: 'treinamentos', label: 'Treinamentos',     icon: GraduationCap },
  { id: 'ferias',       label: 'Férias',           icon: Umbrella      },
  { id: 'bancohoras',   label: 'Banco de Horas',   icon: Timer         },
  { id: 'historico',    label: 'Histórico',        icon: Clock         },
  { id: 'remuneracao',  label: 'Remuneração',      icon: DollarSign    },
  { id: 'relatorios',   label: 'Relatórios',       icon: FileText      },
]

export function TeamMemberProfileModal({
  memberId,
  onClose,
  onEdit,
  showSalary = false,
}: {
  memberId: string | null
  onClose: () => void
  onEdit: (id: string) => void
  showSalary?: boolean
}) {
  const [activeTab, setActiveTab] = useState('dados')
  const [member, setMember] = useState<MemberDetail | null>(null)
  const [activities, setActivities] = useState<MemberActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAct, setLoadingAct] = useState(false)

  const loadMember = useCallback(async (id: string) => {
    setLoading(true)
    setMember(null)
    try {
      const res = await fetch(`/api/gestao-equipe/members/${id}`)
      if (res.ok) setMember(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  const loadActivities = useCallback(async (id: string) => {
    setLoadingAct(true)
    try {
      const res = await fetch(`/api/gestao-equipe/member-activities?memberId=${id}`)
      if (res.ok) setActivities(await res.json())
    } catch { /* ignore */ }
    finally { setLoadingAct(false) }
  }, [])

  useEffect(() => {
    if (memberId) {
      setActiveTab('dados')
      setActivities([])
      loadMember(memberId)
      loadActivities(memberId)
    }
  }, [memberId, loadMember, loadActivities])

  if (!memberId) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative ml-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              <span className="text-sm text-slate-400">Carregando...</span>
            </div>
          ) : member ? (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900 truncate">{member.name}</p>
                  <p className="text-xs text-slate-500 truncate">{member.role}{member.sector ? ` · ${member.sector}` : ''}</p>
                  <HourBankHeaderSummary memberId={member.id} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Colaborador não encontrado</p>
          )}
          <div className="flex items-center gap-2 ml-3">
            {member && (
              <button onClick={() => onEdit(member.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </button>
            )}
            <button onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-4">
          {TABS.map(tab => {
            const Icon = tab.icon
            const counts: Record<string, number> = member ? {
              atividades: activities.length,
              feedbacks: member.feedbacks.length + member.directions.length,
              treinamentos: member.trainings.length,
              ferias: member.vacations.length,
              historico: member.history.length,
            } : {}
            const count = counts[tab.id]
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                )}>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {count != null && count > 0 && (
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600 leading-none">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : !member ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              Não foi possível carregar os dados do colaborador.
            </div>
          ) : (
            <>
              {activeTab === 'dados'        && <TabDadosGerais member={member} onEdit={() => onEdit(member.id)} />}
              {activeTab === 'carteira'     && <TabCarteira memberId={member.id} />}
              {activeTab === 'atividades'   && <TabAtividadesPerfil memberId={member.id} activities={activities} loading={loadingAct} onReload={() => loadActivities(member.id)} />}
              {activeTab === 'feedbacks'    && <TabFeedbacksDirecionamentos member={member} />}
              {activeTab === 'treinamentos' && <TabTreinamentosPerfil member={member} />}
              {activeTab === 'ferias'       && <TabFeriasPerfil member={member} />}
              {activeTab === 'bancohoras'   && <TabBancoHoras memberId={member.id} />}
              {activeTab === 'historico'    && <TabHistoricoPerfil member={member} />}
              {activeTab === 'remuneracao'  && <TabRemuneracao memberId={member.id} showSalary={showSalary} />}
              {activeTab === 'relatorios'   && <TabRelatoriosPerfil member={member} activities={activities} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
