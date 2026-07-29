"use client"

import { useEffect, useState } from "react"
import { X, Users, ChevronRight, Loader2, CheckSquare, Square } from "lucide-react"
import { Edge, MarkerType } from "@xyflow/react"
import { cn } from "@/lib/utils"
import { ProcessOrgNodeData, ProcessOrgNodeModel, ProcessOrgNodeType } from "./ProcessOrgNode"

// ── Tipos locais ──────────────────────────────────────────────────────────────

interface Member {
  id:     string
  name:   string
  role:   string
  sector: string | null
  unit:   string | null
}

interface ActivityItem {
  id:          string
  title:       string
  description: string | null
}

interface ActivityTemplate {
  id:          string
  name:        string
  category:    string | null
  actCategory: { name: string } | null
  items:       ActivityItem[]
}

interface MemberActivityLink {
  id:               string
  memberId:         string
  observation:      string | null
  member:           Member
  activityTemplate: ActivityTemplate
  itemLinks:        { item: ActivityItem }[]
}

export type DetailLevel = 1 | 2 | 3 | 4
export type LayoutDir   = "vertical" | "horizontal"

const DETAIL_OPTIONS: { value: DetailLevel; label: string; desc: string }[] = [
  { value: 1, label: "Colaborador + Função",    desc: "Apenas o colaborador e seu cargo" },
  { value: 2, label: "+ Categoria + Atividade", desc: "Inclui as atividades por categoria" },
  { value: 3, label: "+ Itens / Etapas",        desc: "Detalha os itens de cada atividade" },
  { value: 4, label: "+ Descrição dos Itens",   desc: "Inclui a descrição de cada item" },
]

// ── Geração de nós e arestas ─────────────────────────────────────────────────

const EDGE_STYLE = {
  type:      "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
  style:     { stroke: "#94a3b8", strokeWidth: 1.5 },
}

function mkNode(
  id: string,
  nodeType: ProcessOrgNodeType,
  label: string,
  x: number,
  y: number,
  extra?: Partial<ProcessOrgNodeData>,
): ProcessOrgNodeModel {
  return {
    id,
    type: "processOrgNode",
    position: { x, y },
    data: { nodeType, label, ...extra },
  }
}

function mkEdge(source: string, target: string): Edge {
  return { id: `e-${source}-${target}`, source, target, ...EDGE_STYLE }
}

export function generateFromMembers(
  membersWithActs: { member: Member; activities: MemberActivityLink[] }[],
  detailLevel: DetailLevel,
  layoutDir:   LayoutDir,
): { nodes: ProcessOrgNodeModel[]; edges: Edge[] } {
  const nodes: ProcessOrgNodeModel[] = []
  const edges: Edge[] = []
  let counter = 0
  const id = () => `poc-${++counter}`

  // Dimensões dos nós e espaçamentos
  const NW = 180, NH = 60
  const GX = 40,  GY = 50

  // Para cada membro, criar uma "árvore" e posicioná-la lado a lado
  const MEMBER_TREE_W = 600 // largura reservada por membro (vertical)
  const MEMBER_TREE_H = 500 // altura reservada por membro (horizontal)

  membersWithActs.forEach(({ member, activities }, mi) => {
    const baseX = layoutDir === "vertical"   ? mi * MEMBER_TREE_W : 0
    const baseY = layoutDir === "horizontal" ? mi * MEMBER_TREE_H : 0

    const colX = layoutDir === "vertical"   ? baseX + 80 : baseX
    const colY = layoutDir === "vertical"   ? 0          : baseY

    // Nó colaborador
    const colId = id()
    nodes.push(mkNode(colId, "collaborator", member.name, colX, colY, {
      sublabel: [member.sector, member.unit].filter(Boolean).join(" · ") || undefined,
      sourceId: member.id,
    }))

    // Nó função
    const roleX = layoutDir === "vertical"   ? colX          : colX + NW + GX
    const roleY = layoutDir === "vertical"   ? colY + NH + GY: colY
    const roleId = id()
    nodes.push(mkNode(roleId, "role", member.role || "Função", roleX, roleY, { sourceId: member.id }))
    edges.push(mkEdge(colId, roleId))

    if (detailLevel < 2 || activities.length === 0) return

    // Agrupa atividades por categoria
    const catMap = new Map<string, { catId: string; acts: MemberActivityLink[] }>()
    activities.forEach(act => {
      const catName = act.activityTemplate.actCategory?.name || act.activityTemplate.category || "Geral"
      if (!catMap.has(catName)) catMap.set(catName, { catId: id(), acts: [] })
      catMap.get(catName)!.acts.push(act)
    })

    let catIdx = 0
    catMap.forEach(({ catId, acts }, catName) => {
      const catX = layoutDir === "vertical"
        ? baseX + catIdx * (NW + GX)
        : roleX + NW + GX
      const catY = layoutDir === "vertical"
        ? roleY + NH + GY
        : roleY + catIdx * (NH + GY)

      nodes.push(mkNode(catId, "category", catName, catX, catY))
      edges.push(mkEdge(roleId, catId))

      acts.forEach((act, actIdx) => {
        const actX = layoutDir === "vertical"
          ? catX + actIdx * (NW + GX)
          : catX + NW + GX
        const actY = layoutDir === "vertical"
          ? catY + NH + GY
          : catY + actIdx * (NH + GY)

        const actId = id()
        nodes.push(mkNode(actId, "activity", act.activityTemplate.name, actX, actY, {
          sourceId: act.activityTemplate.id,
        }))
        edges.push(mkEdge(catId, actId))

        if (detailLevel < 3) return

        const items = act.itemLinks.length > 0
          ? act.itemLinks.map(il => il.item)
          : act.activityTemplate.items

        items.forEach((item, itemIdx) => {
          const itemX = layoutDir === "vertical"
            ? actX + itemIdx * (NW + GX)
            : actX + NW + GX
          const itemY = layoutDir === "vertical"
            ? actY + NH + GY
            : actY + itemIdx * (NH + GY)

          const itemId = id()
          nodes.push(mkNode(itemId, "item", item.title, itemX, itemY, { sourceId: item.id }))
          edges.push(mkEdge(actId, itemId))

          if (detailLevel < 4 || !item.description) return

          const descX = layoutDir === "vertical"
            ? itemX
            : itemX + NW + GX
          const descY = layoutDir === "vertical"
            ? itemY + NH + GY
            : itemY

          const descId = id()
          nodes.push(mkNode(descId, "description", item.description, descX, descY))
          edges.push(mkEdge(itemId, descId))
        })
      })

      catIdx++
    })
  })

  return { nodes, edges }
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface Props {
  onClose:   () => void
  onGenerate:(nodes: ProcessOrgNodeModel[], edges: Edge[]) => void
}

export function ProcessOrgImportModal({ onClose, onGenerate }: Props) {
  const [step,        setStep]        = useState<1 | 2 | 3>(1)
  const [members,     setMembers]     = useState<Member[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [detailLevel, setDetailLevel] = useState<DetailLevel>(2)
  const [layoutDir,   setLayoutDir]   = useState<LayoutDir>("vertical")
  const [generating,  setGenerating]  = useState(false)
  const [error,       setError]       = useState("")

  useEffect(() => {
    fetch("/api/gestao-equipe/members")
      .then(r => r.json())
      .then((data: Member[]) => setMembers(data))
      .catch(() => setError("Erro ao carregar colaboradores"))
      .finally(() => setLoading(false))
  }, [])

  function toggleMember(id: string) {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleGenerate() {
    if (selected.size === 0) return
    setGenerating(true)
    setError("")
    try {
      const membersWithActs = await Promise.all(
        Array.from(selected).map(async memberId => {
          const member = members.find(m => m.id === memberId)!
          let activities: MemberActivityLink[] = []
          if (detailLevel >= 2) {
            const r = await fetch(`/api/gestao-equipe/member-activities?memberId=${memberId}`)
            activities = await r.json()
          }
          return { member, activities }
        })
      )

      const { nodes, edges } = generateFromMembers(membersWithActs, detailLevel, layoutDir)
      onGenerate(nodes, edges)
      onClose()
    } catch {
      setError("Erro ao gerar organograma. Tente novamente.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Gerar a partir da Gestão de Equipe</h2>
              <p className="text-xs text-slate-500">Passo {step} de 3</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="mb-4 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          {/* Passo 1: selecionar colaboradores */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Selecione os colaboradores</p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">Nenhum colaborador cadastrado.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setSelected(new Set(members.map(m => m.id)))}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Selecionar todos
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      onClick={() => setSelected(new Set())}
                      className="text-xs text-slate-500 hover:underline"
                    >
                      Limpar
                    </button>
                    <span className="text-xs text-slate-400 ml-auto">
                      {selected.size} selecionado(s)
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {members.map(m => (
                      <button
                        key={m.id}
                        onClick={() => toggleMember(m.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all",
                          selected.has(m.id)
                            ? "border-blue-400 bg-blue-50"
                            : "border-slate-200 hover:border-blue-200 hover:bg-slate-50",
                        )}
                      >
                        {selected.has(m.id)
                          ? <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                          : <Square      className="w-4 h-4 text-slate-300 shrink-0" />
                        }
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{m.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {[m.role, m.sector, m.unit].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Passo 2: nível de detalhe */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Nível de detalhe</p>
              <div className="space-y-2">
                {DETAIL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDetailLevel(opt.value)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                      detailLevel === opt.value
                        ? "border-blue-400 bg-blue-50"
                        : "border-slate-200 hover:border-blue-200 hover:bg-slate-50",
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center",
                      detailLevel === opt.value ? "border-blue-500 bg-blue-500" : "border-slate-300",
                    )}>
                      {detailLevel === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Passo 3: layout */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Direção do layout</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "vertical",   label: "Vertical (top-down)",    emoji: "⬇️" },
                  { value: "horizontal", label: "Horizontal (left-right)", emoji: "➡️" },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setLayoutDir(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 px-4 py-5 rounded-xl border-2 transition-all",
                      layoutDir === opt.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-blue-200 hover:bg-slate-50",
                    )}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <p className="text-xs font-medium text-slate-700 text-center">{opt.label}</p>
                  </button>
                ))}
              </div>

              {/* Resumo */}
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p><span className="font-medium">Colaboradores:</span> {selected.size}</p>
                <p><span className="font-medium">Nível:</span> {DETAIL_OPTIONS.find(o => o.value === detailLevel)?.label}</p>
                <p><span className="font-medium">Layout:</span> {layoutDir === "vertical" ? "Vertical" : "Horizontal"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-5 border-t border-slate-100">
          {step > 1 && (
            <button
              onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ← Voltar
            </button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button
              onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 && selected.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-50 transition-colors"
            >
              Próximo
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating || selected.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50 transition-colors"
            >
              {generating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {generating ? "Gerando…" : "Gerar Organograma"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
