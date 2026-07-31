"use client"

import { X } from "lucide-react"
import { BpmnNodeData, BpmnNodeType, BpmnNodeModel } from "./BpmnNode"
import { BpmnLaneData, LANE_COLORS } from "./BpmnLane"

const NODE_TYPE_OPTIONS: { value: BpmnNodeType; label: string }[] = [
  { value: "bpmn-start",             label: "Início (Evento)"          },
  { value: "bpmn-intermediate",      label: "Evento Intermediário"     },
  { value: "bpmn-end",               label: "Fim (Evento)"             },
  { value: "bpmn-task",              label: "Tarefa"                   },
  { value: "bpmn-task-manual",       label: "Tarefa Manual"            },
  { value: "bpmn-task-user",         label: "Tarefa de Usuário"        },
  { value: "bpmn-task-system",       label: "Tarefa de Sistema"        },
  { value: "bpmn-subprocess",        label: "Subprocesso"              },
  { value: "bpmn-gateway-exclusive", label: "Decisão Exclusiva (X)"    },
  { value: "bpmn-gateway-parallel",  label: "Paralelo (+)"             },
  { value: "bpmn-document",          label: "Documento"                },
  { value: "bpmn-message",           label: "Mensagem"                 },
  { value: "bpmn-approval",          label: "Aprovação"                },
  { value: "bpmn-wait",              label: "Espera / Temporizador"    },
  { value: "bpmn-annotation",        label: "Anotação"                 },
]

interface Props {
  node:     BpmnNodeModel | { id: string; data: BpmnLaneData }
  isLane?:  boolean
  onChange: (patch: Partial<BpmnNodeData> | Partial<BpmnLaneData>) => void
  onClose:  () => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}

const inputCls = "w-full text-[12px] border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"

export function BpmnNodeEditPanel({ node, isLane, onChange, onClose }: Props) {
  const data = node.data as BpmnNodeData & BpmnLaneData

  if (isLane) {
    return (
      <aside className="w-60 shrink-0 border-l border-slate-200 bg-slate-50 flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
          <p className="text-[11px] font-semibold text-slate-700">Raia</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex flex-col gap-3 p-3 overflow-y-auto flex-1">
          <Field label="Nome da Raia">
            <input className={inputCls} value={data.label} onChange={e => onChange({ label: e.target.value })} />
          </Field>
          <Field label="Cor">
            <select className={inputCls} value={data.color ?? "slate"} onChange={e => onChange({ color: e.target.value })}>
              {LANE_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-60 shrink-0 border-l border-slate-200 bg-slate-50 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
        <p className="text-[11px] font-semibold text-slate-700">Propriedades</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
      </div>

      <div className="flex flex-col gap-3 p-3 overflow-y-auto flex-1">
        <Field label="Tipo">
          <select className={inputCls} value={data.nodeType} onChange={e => onChange({ nodeType: e.target.value as BpmnNodeType })}>
            {NODE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field label="Rótulo">
          <input className={inputCls} value={data.label} onChange={e => onChange({ label: e.target.value })} />
        </Field>

        <Field label="Sublabel / Descrição">
          <input className={inputCls} value={data.sublabel ?? ""} onChange={e => onChange({ sublabel: e.target.value })} placeholder="Opcional" />
        </Field>

        <Field label="Responsável">
          <input className={inputCls} value={data.responsible ?? ""} onChange={e => onChange({ responsible: e.target.value })} placeholder="Nome ou cargo" />
        </Field>

        <Field label="Departamento / Setor">
          <input className={inputCls} value={data.department ?? ""} onChange={e => onChange({ department: e.target.value })} placeholder="Ex: Financeiro" />
        </Field>

        <Field label="Sistema / Ferramenta">
          <input className={inputCls} value={data.system ?? ""} onChange={e => onChange({ system: e.target.value })} placeholder="Ex: ERP, E-mail" />
        </Field>

        <Field label="Raia (ID)">
          <input className={inputCls} value={data.laneId ?? ""} onChange={e => onChange({ laneId: e.target.value })} placeholder="ID da raia pai" />
        </Field>

        <Field label="Nível de Risco">
          <select className={inputCls} value={data.riskLevel ?? ""} onChange={e => onChange({ riskLevel: (e.target.value || undefined) as BpmnNodeData["riskLevel"] })}>
            <option value="">Nenhum</option>
            <option value="low">Baixo</option>
            <option value="medium">Médio</option>
            <option value="high">Alto</option>
          </select>
        </Field>

        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Marcadores</p>
          {([
            ["isGap",       "Gargalo / Problema"],
            ["isManual",    "Passo Manual"],
            ["isAutomated", "Automatizado (TO-BE)"],
            ["isEliminated","Eliminado (TO-BE)"],
          ] as const).map(([key, lbl]) => (
            <label key={key} className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!data[key]}
                onChange={e => onChange({ [key]: e.target.checked })}
                className="rounded accent-blue-600"
              />
              {lbl}
            </label>
          ))}
        </div>

        <Field label="Observações">
          <textarea
            className={inputCls + " resize-none"}
            rows={3}
            value={data.observation ?? ""}
            onChange={e => onChange({ observation: e.target.value })}
            placeholder="Detalhes, riscos, melhorias..."
          />
        </Field>
      </div>
    </aside>
  )
}
