"use client"

import { useState } from "react"
import {
  FileText, Download, Filter, ChevronDown, ChevronUp,
  ClipboardList, GitBranch, Users2, AlertTriangle,
  ShieldCheck, BarChart2, CheckSquare, FileCheck,
  Printer, FileSpreadsheet, BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ReportDef {
  id:   string
  name: string
  desc: string
  formats: ("pdf" | "word" | "excel")[]
}

interface ReportGroup {
  id:      string
  label:   string
  icon:    React.ElementType
  color:   string
  reports: ReportDef[]
}

// ─── Configuração dos relatórios ──────────────────────────────────────────────

const REPORT_GROUPS: ReportGroup[] = [
  {
    id: "processos", label: "Processos", icon: BookOpen,
    color: "text-slate-600 bg-slate-50 border-slate-200",
    reports: [
      { id: "processo-completo",  name: "Processo Completo",     desc: "Dados, fluxo, RACI, riscos e indicadores de um processo.",       formats: ["pdf", "word"] },
      { id: "cadastro-processos", name: "Cadastro de Processos", desc: "Lista de todos os processos com status, dono e departamento.",   formats: ["pdf", "excel"] },
    ],
  },
  {
    id: "procedimentos", label: "Procedimentos", icon: ClipboardList,
    color: "text-blue-700 bg-blue-50 border-blue-200",
    reports: [
      { id: "pop",           name: "POP",                  desc: "Procedimento Operacional Padrão completo com objetivo e passos.",  formats: ["pdf", "word"] },
      { id: "it",            name: "Instrução de Trabalho", desc: "IT com passo a passo, imagens e pontos de atenção.",              formats: ["pdf", "word"] },
      { id: "checklist",     name: "Checklist",             desc: "Lista de verificação em branco ou preenchida.",                   formats: ["pdf", "excel"] },
      { id: "pop-it",        name: "POP + IT",              desc: "Pacote: POP com instruções de trabalho vinculadas.",              formats: ["pdf"] },
      { id: "pop-checklist", name: "POP + Fluxograma + Checklist", desc: "Conjunto completo do procedimento.",                      formats: ["pdf"] },
    ],
  },
  {
    id: "fluxogramas", label: "Fluxogramas e BPMN", icon: GitBranch,
    color: "text-orange-700 bg-orange-50 border-orange-200",
    reports: [
      { id: "bpmn-asis",    name: "BPMN AS-IS",              desc: "Fluxo atual do processo em notação BPMN.",                      formats: ["pdf"] },
      { id: "bpmn-tobe",    name: "BPMN TO-BE",              desc: "Fluxo futuro / proposta de melhoria.",                         formats: ["pdf"] },
      { id: "comparacao",   name: "Comparação AS-IS × TO-BE", desc: "Relatório lado a lado das versões atual e futura.",            formats: ["pdf"] },
    ],
  },
  {
    id: "raci", label: "RACI", icon: Users2,
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    reports: [
      { id: "raci-processo", name: "RACI por Processo",  desc: "Matriz de responsabilidades de um processo específico.",           formats: ["pdf", "excel"] },
      { id: "raci-global",   name: "RACI Consolidado",   desc: "Matriz global de todos os processos.",                            formats: ["pdf", "excel"] },
    ],
  },
  {
    id: "riscos", label: "Riscos e Controles", icon: AlertTriangle,
    color: "text-red-700 bg-red-50 border-red-200",
    reports: [
      { id: "fmea",        name: "FMEA / Análise de Riscos", desc: "Tabela FMEA com probabilidade, impacto e tratamento.",         formats: ["pdf", "excel"] },
      { id: "controles",   name: "Controles",                desc: "Plano de controles com efetividade e próxima execução.",       formats: ["pdf", "excel"] },
      { id: "capa",        name: "CAPA",                     desc: "Ação Corretiva e Preventiva com plano de ação.",               formats: ["pdf", "word"] },
    ],
  },
  {
    id: "auditoria", label: "Evidências e Auditoria", icon: ShieldCheck,
    color: "text-cyan-700 bg-cyan-50 border-cyan-200",
    reports: [
      { id: "evidencias",    name: "Evidências",               desc: "Lista de evidências por status e tipo.",                     formats: ["pdf", "excel"] },
      { id: "auditoria-rel", name: "Relatório de Auditoria",   desc: "Resumo com achados, não conformidades e oportunidades.",    formats: ["pdf", "word"] },
      { id: "nao-conform",   name: "Não Conformidades",        desc: "Registro de NCs abertas com plano de ação.",                formats: ["pdf", "excel"] },
    ],
  },
  {
    id: "indicadores", label: "Indicadores", icon: BarChart2,
    color: "text-teal-700 bg-teal-50 border-teal-200",
    reports: [
      { id: "indicadores-painel", name: "Painel de Indicadores", desc: "Dashboard com todos os KPIs, metas e tendências.",        formats: ["pdf", "excel"] },
      { id: "indicadores-hist",   name: "Histórico de Medições", desc: "Série temporal de medições por indicador.",               formats: ["pdf", "excel"] },
    ],
  },
  {
    id: "conformidade", label: "Conformidade", icon: CheckSquare,
    color: "text-indigo-700 bg-indigo-50 border-indigo-200",
    reports: [
      { id: "obrigacoes",   name: "Obrigações de Conformidade", desc: "Lista com status, vencimentos e responsáveis.",            formats: ["pdf", "excel"] },
      { id: "plano-conting",name: "Planos de Contingência",     desc: "Documentos de contingência por processo.",                formats: ["pdf", "word"] },
    ],
  },
]

// ─── Filtros ──────────────────────────────────────────────────────────────────

const EMPTY_FILTERS = {
  empresa:       "",
  unidade:       "",
  processo:      "",
  procedimento:  "",
  tipo:          "",
  competencia:   "",
  responsavel:   "",
  dataInicio:    "",
  dataFim:       "",
  status:        "",
}

// ─── Formatadores ──────────────────────────────────────────────────────────────

const FORMAT_ICONS = {
  pdf:   FileText,
  word:  FileCheck,
  excel: FileSpreadsheet,
}
const FORMAT_LABELS = { pdf: "PDF", word: "Word", excel: "Excel" }
const FORMAT_COLORS = {
  pdf:   "border-red-200 text-red-700 hover:bg-red-50",
  word:  "border-blue-200 text-blue-700 hover:bg-blue-50",
  excel: "border-green-200 text-green-700 hover:bg-green-50",
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TabRelatorios() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string[]>(["procedimentos", "processos"])

  function setF(k: keyof typeof EMPTY_FILTERS, v: string) {
    setFilters(f => ({ ...f, [k]: v }))
  }

  function toggleGroup(id: string) {
    setExpanded(ex => ex.includes(id) ? ex.filter(x => x !== id) : [...ex, id])
  }

  async function generate(reportId: string, format: string) {
    setGenerating(`${reportId}-${format}`)
    // Simula geração (backend real seria aqui)
    await new Promise(r => setTimeout(r, 1200))
    setGenerating(null)
    // TODO: integrar com endpoint de geração de relatório
    alert(`Relatório "${reportId}" em ${format.toUpperCase()} — funcionalidade de geração será integrada com o backend de relatórios.`)
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Central de Relatórios
          </h2>
          <p className="text-sm text-slate-500">Exporte documentos, matrizes e relatórios do módulo Processos</p>
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
            showFilters
              ? "bg-blue-50 border-blue-300 text-blue-700"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300",
          )}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="text-[10px] bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
          {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {([
              { key: "empresa",      label: "Empresa",      type: "text" },
              { key: "unidade",      label: "Unidade",      type: "text" },
              { key: "processo",     label: "Processo",     type: "text" },
              { key: "procedimento", label: "Procedimento", type: "text" },
              { key: "responsavel",  label: "Responsável",  type: "text" },
              { key: "tipo",         label: "Tipo",
                options: ["POP","IT","Checklist","Política","Norma","Plano de Contingência","Termo"] },
              { key: "status",       label: "Status",
                options: ["Ativo","Em revisão","Arquivado","Pendente","Concluído"] },
              { key: "competencia",  label: "Competência",  type: "month" },
              { key: "dataInicio",   label: "Data início",  type: "date" },
              { key: "dataFim",      label: "Data fim",     type: "date" },
            ] as { key: keyof typeof EMPTY_FILTERS; label: string; type?: string; options?: string[] }[]).map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-slate-600">{f.label}</label>
                {f.options ? (
                  <select
                    value={filters[f.key]}
                    onChange={e => setF(f.key, e.target.value)}
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Todos</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type ?? "text"}
                    value={filters[f.key]}
                    onChange={e => setF(f.key, e.target.value)}
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                )}
              </div>
            ))}
          </div>
          {activeFilterCount > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end">
              <button onClick={() => setFilters(EMPTY_FILTERS)}
                className="text-xs text-slate-500 hover:text-red-600 transition-colors">
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grupos de relatórios */}
      <div className="space-y-3">
        {REPORT_GROUPS.map(group => {
          const Icon = group.icon
          const isExpanded = expanded.includes(group.id)
          return (
            <div key={group.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              {/* Header do grupo */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center border", group.color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-slate-700 text-sm">{group.label}</span>
                  <span className="text-xs text-slate-400">{group.reports.length} relatório{group.reports.length !== 1 ? "s" : ""}</span>
                </div>
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Listagem dos relatórios */}
              {isExpanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-100">
                  {group.reports.map(report => {
                    return (
                      <div key={report.id}
                        className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700">{report.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{report.desc}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {report.formats.map(fmt => {
                            const FmtIcon = FORMAT_ICONS[fmt]
                            const key = `${report.id}-${fmt}`
                            const isGen = generating === key
                            return (
                              <button
                                key={fmt}
                                onClick={() => generate(report.id, fmt)}
                                disabled={!!generating}
                                className={cn(
                                  "flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all",
                                  FORMAT_COLORS[fmt],
                                  generating ? "opacity-50 cursor-wait" : "",
                                )}
                              >
                                {isGen
                                  ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  : <FmtIcon className="w-3 h-3" />}
                                {FORMAT_LABELS[fmt]}
                              </button>
                            )
                          })}
                          <button
                            onClick={() => generate(report.id, "print")}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
                            title="Imprimir"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Rodapé informativo */}
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
        <p className="text-xs text-slate-400">
          Os filtros aplicados acima são repassados para todos os relatórios gerados.
          Use os filtros de Processo, Tipo e Data para relatórios específicos.
        </p>
      </div>
    </div>
  )
}
