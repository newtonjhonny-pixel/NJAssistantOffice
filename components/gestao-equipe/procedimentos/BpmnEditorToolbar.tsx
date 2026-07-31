"use client"

import { cn } from "@/lib/utils"
import {
  Circle, Square, Diamond, FileText, Mail, CheckCircle, Clock, AlignLeft,
  Hand, User, Settings, Layers, LayoutGrid, Trash2, Save, Loader2,
  ZoomIn, ZoomOut, Maximize2, AlignJustify, Download, FileImage,
  Printer, Plus, GitBranch,
} from "lucide-react"
import { BpmnNodeType } from "./BpmnNode"

interface BpmnEditorToolbarProps {
  canDelete:      boolean
  saving:         boolean
  exporting:      boolean
  onAddNode:      (type: BpmnNodeType | "bpmn-lane") => void
  onDelete:       () => void
  onSave:         () => void
  onFitView:      () => void
  onZoomIn:       () => void
  onZoomOut:      () => void
  onAutoLayout:   () => void
  onGenerateFromSteps?: () => void
  onExportPdf:    () => void
  onExportPng:    () => void
  onPrint:        () => void
}

function Sep() { return <div className="w-px h-5 bg-slate-200 mx-0.5" /> }

function Btn({
  onClick, title, disabled, variant = "default", children,
}: {
  onClick: () => void; title: string; disabled?: boolean
  variant?: "default" | "primary" | "danger"
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium transition-colors disabled:opacity-40",
        variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
        variant === "danger"  && "text-red-600 hover:bg-red-50",
        variant === "default" && "text-slate-600 hover:bg-slate-100",
      )}
    >
      {children}
    </button>
  )
}

interface GroupBtnProps { type: BpmnNodeType | "bpmn-lane"; label: string; icon: React.ReactNode; onAdd: (t: BpmnNodeType | "bpmn-lane") => void }
function AddBtn({ type, label, icon, onAdd }: GroupBtnProps) {
  return (
    <button
      title={`Adicionar: ${label}`}
      onClick={() => onAdd(type)}
      className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
    >
      <span className="w-5 h-5">{icon}</span>
      <span className="text-[9px] leading-tight text-center max-w-[52px]">{label}</span>
    </button>
  )
}

const EVT_SIZE = "w-4 h-4"

export function BpmnEditorToolbar({
  canDelete, saving, exporting,
  onAddNode, onDelete, onSave, onFitView, onZoomIn, onZoomOut, onAutoLayout,
  onGenerateFromSteps, onExportPdf, onExportPng, onPrint,
}: BpmnEditorToolbarProps) {
  return (
    <div className="flex flex-col border-b border-slate-200 bg-white">
      {/* Row 1 — node palette */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-slate-100">
        {/* Eventos */}
        <span className="text-[9px] font-semibold text-slate-400 uppercase mr-1">Eventos</span>
        <AddBtn type="bpmn-start"        label="Início"       icon={<Circle className={cn(EVT_SIZE, "stroke-green-600 fill-green-50 stroke-[2.5]")} />} onAdd={onAddNode} />
        <AddBtn type="bpmn-intermediate" label="Interm."      icon={<Circle className={cn(EVT_SIZE, "stroke-yellow-500 fill-yellow-50")} />}               onAdd={onAddNode} />
        <AddBtn type="bpmn-end"          label="Fim"          icon={<Circle className={cn(EVT_SIZE, "stroke-red-600 fill-red-100 stroke-[3]")} />}          onAdd={onAddNode} />
        <Sep />

        {/* Tarefas */}
        <span className="text-[9px] font-semibold text-slate-400 uppercase mr-1">Tarefas</span>
        <AddBtn type="bpmn-task"         label="Tarefa"       icon={<Square className={cn(EVT_SIZE, "stroke-blue-500 fill-blue-50")} />}                   onAdd={onAddNode} />
        <AddBtn type="bpmn-task-manual"  label="Manual"       icon={<Hand    className={cn(EVT_SIZE, "stroke-cyan-600")} />}                               onAdd={onAddNode} />
        <AddBtn type="bpmn-task-user"    label="Usuário"      icon={<User    className={cn(EVT_SIZE, "stroke-indigo-500")} />}                             onAdd={onAddNode} />
        <AddBtn type="bpmn-task-system"  label="Sistema"      icon={<Settings className={cn(EVT_SIZE, "stroke-slate-500")} />}                             onAdd={onAddNode} />
        <AddBtn type="bpmn-subprocess"   label="Subproc."     icon={<Layers   className={cn(EVT_SIZE, "stroke-purple-500")} />}                            onAdd={onAddNode} />
        <Sep />

        {/* Decisões */}
        <span className="text-[9px] font-semibold text-slate-400 uppercase mr-1">Decisões</span>
        <AddBtn type="bpmn-gateway-exclusive" label="Excl. (X)" icon={<Diamond className={cn(EVT_SIZE, "stroke-yellow-600 fill-yellow-50")} />}            onAdd={onAddNode} />
        <AddBtn type="bpmn-gateway-parallel"  label="Paral.(+)" icon={<Diamond className={cn(EVT_SIZE, "stroke-teal-600 fill-teal-50")} />}                onAdd={onAddNode} />
        <Sep />

        {/* Outros */}
        <span className="text-[9px] font-semibold text-slate-400 uppercase mr-1">Outros</span>
        <AddBtn type="bpmn-document"   label="Documento"  icon={<FileText     className={cn(EVT_SIZE, "stroke-green-600")} />}                             onAdd={onAddNode} />
        <AddBtn type="bpmn-message"    label="Mensagem"   icon={<Mail         className={cn(EVT_SIZE, "stroke-blue-500")} />}                              onAdd={onAddNode} />
        <AddBtn type="bpmn-approval"   label="Aprovação"  icon={<CheckCircle  className={cn(EVT_SIZE, "stroke-orange-500")} />}                            onAdd={onAddNode} />
        <AddBtn type="bpmn-wait"       label="Espera"     icon={<Clock        className={cn(EVT_SIZE, "stroke-amber-500")} />}                             onAdd={onAddNode} />
        <AddBtn type="bpmn-annotation" label="Anotação"   icon={<AlignLeft    className={cn(EVT_SIZE, "stroke-slate-500")} />}                             onAdd={onAddNode} />
        <AddBtn type="bpmn-lane"       label="Raia"       icon={<LayoutGrid   className={cn(EVT_SIZE, "stroke-violet-500")} />}                            onAdd={onAddNode} />
      </div>

      {/* Row 2 — actions */}
      <div className="flex items-center gap-0.5 px-2 py-1">
        {onGenerateFromSteps && (
          <>
            <Btn onClick={onGenerateFromSteps} title="Gerar fluxo a partir das etapas do procedimento">
              <GitBranch className="w-3.5 h-3.5" />
              <span>Gerar das Etapas</span>
            </Btn>
            <Sep />
          </>
        )}

        <Btn onClick={onDelete} title="Excluir selecionado" disabled={!canDelete} variant="danger">
          <Trash2 className="w-3.5 h-3.5" />
        </Btn>

        <Sep />

        <Btn onClick={onAutoLayout} title="Organizar automaticamente">
          <AlignJustify className="w-3.5 h-3.5" />
          <span>Organizar</span>
        </Btn>
        <Btn onClick={onFitView}  title="Ajustar à tela"><Maximize2 className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={onZoomIn}   title="Ampliar"><ZoomIn  className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={onZoomOut}  title="Reduzir"><ZoomOut className="w-3.5 h-3.5" /></Btn>

        <Sep />

        {/* Export */}
        {exporting
          ? <span className="flex items-center gap-1 text-[11px] text-slate-500 px-1"><Loader2 className="w-3.5 h-3.5 animate-spin" />Gerando…</span>
          : (
            <>
              <Btn onClick={onExportPdf} title="Exportar PDF" disabled={exporting}>
                <Download className="w-3.5 h-3.5" /><span>PDF</span>
              </Btn>
              <Btn onClick={onExportPng} title="Exportar PNG" disabled={exporting}>
                <FileImage className="w-3.5 h-3.5" /><span>PNG</span>
              </Btn>
              <Btn onClick={onPrint} title="Imprimir" disabled={exporting}>
                <Printer className="w-3.5 h-3.5" />
              </Btn>
            </>
          )
        }

        <Sep />

        <Btn onClick={onSave} variant="primary" title="Salvar" disabled={saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saving ? "Salvando…" : "Salvar"}</span>
        </Btn>
      </div>
    </div>
  )
}
