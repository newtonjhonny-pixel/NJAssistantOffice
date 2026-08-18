"use client"

import { useState } from "react"
import { Plus, Save, Trash2, Loader2, MoveUp, MoveDown, BarChart2 } from "lucide-react"
import { cn } from "@/lib/utils"

/* ── types ──────────────────────────────────────────────────── */
type BlockType = "kpi" | "text" | "list" | "comparison" | "bar" | "divider" | "title"

interface KpiBlock   { type: "kpi";        id: string; label: string; value: string; unit: string; icon: string; color: string; trend?: string }
interface TextBlock  { type: "text";       id: string; content: string; size: "sm"|"base"|"lg" }
interface ListBlock  { type: "list";       id: string; title: string; items: string[]; icon: string }
interface CompBlock  { type: "comparison"; id: string; label: string; before: string; after: string; metric: string }
interface BarBlock   { type: "bar";        id: string; title: string; items: { name: string; value: number; color: string }[] }
interface DivBlock   { type: "divider";    id: string }
interface TitleBlock { type: "title";      id: string; text: string; subtitle: string }

type Block = KpiBlock | TextBlock | ListBlock | CompBlock | BarBlock | DivBlock | TitleBlock

interface InfographicData { title: string; subtitle: string; theme: string; blocks: Block[] }

interface Props {
  editorRef:      React.RefObject<HTMLDivElement>
  initialContent: string | null
  onSave:         (content: string) => Promise<void>
}

/* ── helpers ────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9)
const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#f97316"]
const THEMES = { blue: "#1e3a5f", emerald: "#065f46", violet: "#4c1d95", slate: "#1e293b" }

function defaultData(): InfographicData {
  return {
    title: "Infográfico", subtitle: "Dados e indicadores",
    theme: "blue",
    blocks: [
      { type: "title", id: uid(), text: "Projetos de Automação", subtitle: "Departamento Pessoal — 2026" },
      { type: "kpi",   id: uid(), label: "Total de Projetos", value: "10", unit: "",  icon: "📊", color: "#3b82f6" },
      { type: "kpi",   id: uid(), label: "Em andamento",      value: "4",  unit: "",  icon: "🔄", color: "#f59e0b" },
      { type: "kpi",   id: uid(), label: "Concluídos",        value: "2",  unit: "",  icon: "✅", color: "#10b981" },
      { type: "bar",   id: uid(), title: "Projetos por status", items: [
        { name: "Planejado",    value: 4, color: "#64748b" },
        { name: "Em andamento", value: 4, color: "#3b82f6" },
        { name: "Concluído",    value: 2, color: "#10b981" },
      ]},
      { type: "list", id: uid(), title: "Benefícios esperados", icon: "🎯", items: [
        "Redução de trabalho manual",
        "Diminuição de erros",
        "Acelerar fechamentos",
        "Liberar capacidade da equipe",
      ]},
    ],
  }
}

function parse(raw: string | null): InfographicData {
  if (!raw) return defaultData()
  try {
    const d = JSON.parse(raw)
    if (d.blocks && Array.isArray(d.blocks)) return d
    return defaultData()
  } catch { return defaultData() }
}

/* ── block editors ──────────────────────────────────────────── */
function BlockEditor({ block, onChange, onDelete, onMoveUp, onMoveDown }: {
  block: Block; onChange: (b: Block) => void; onDelete: () => void
  onMoveUp: () => void; onMoveDown: () => void
}) {
  function upd(patch: Partial<Block>) { onChange({ ...block, ...patch } as Block) }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex-1">{block.type}</span>
        <button onClick={onMoveUp}   className="p-1 rounded hover:bg-slate-200 text-slate-400"><MoveUp   className="w-3 h-3" /></button>
        <button onClick={onMoveDown} className="p-1 rounded hover:bg-slate-200 text-slate-400"><MoveDown className="w-3 h-3" /></button>
        <button onClick={onDelete}   className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2    className="w-3 h-3" /></button>
      </div>
      <div className="p-3 space-y-2">
        {block.type === "title" && <>
          <input value={block.text} onChange={e => upd({ text: e.target.value })}
            placeholder="Título" className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
          <input value={block.subtitle} onChange={e => upd({ subtitle: e.target.value })}
            placeholder="Subtítulo" className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
        </>}
        {block.type === "kpi" && <div className="grid grid-cols-2 gap-2">
          <input value={block.label} onChange={e => upd({ label: e.target.value })} placeholder="Rótulo"
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
          <div className="flex gap-1">
            <input value={block.value} onChange={e => upd({ value: e.target.value })} placeholder="Valor"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
            <input value={block.unit} onChange={e => upd({ unit: e.target.value })} placeholder="un."
              className="w-16 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
          </div>
          <input value={block.icon} onChange={e => upd({ icon: e.target.value })} placeholder="Emoji 📊"
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
          <div className="flex gap-1 flex-wrap">
            {COLORS.map(c => (
              <button key={c} onClick={() => upd({ color: c })}
                className={cn("w-5 h-5 rounded-full border-2 hover:scale-110 transition-transform",
                  (block as KpiBlock).color === c ? "border-slate-700" : "border-transparent")}
                style={{ background: c }} />
            ))}
          </div>
        </div>}
        {block.type === "text" && <>
          <textarea value={block.content} onChange={e => upd({ content: e.target.value })} rows={3}
            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 resize-none" />
          <select value={block.size} onChange={e => upd({ size: e.target.value as "sm"|"base"|"lg" })}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400">
            <option value="sm">Pequeno</option><option value="base">Médio</option><option value="lg">Grande</option>
          </select>
        </>}
        {block.type === "list" && <>
          <div className="flex gap-2">
            <input value={block.title} onChange={e => upd({ title: e.target.value })} placeholder="Título da lista"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
            <input value={block.icon} onChange={e => upd({ icon: e.target.value })} placeholder="🎯"
              className="w-16 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
          </div>
          <div className="space-y-1">
            {block.items.map((item, i) => (
              <div key={i} className="flex gap-1">
                <input value={item} onChange={e => { const items = [...block.items]; items[i] = e.target.value; upd({ items }) }}
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400" />
                <button onClick={() => { const items = block.items.filter((_,j) => j !== i); upd({ items }) }}
                  className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
            <button onClick={() => upd({ items: [...block.items, ""] })}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
              <Plus className="w-3 h-3" /> Adicionar item
            </button>
          </div>
        </>}
        {block.type === "comparison" && <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <input value={block.label} onChange={e => upd({ label: e.target.value })} placeholder="Rótulo"
              className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Como é hoje (AS-IS)</label>
            <textarea value={block.before} onChange={e => upd({ before: e.target.value })} rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 resize-none" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Como será (TO-BE)</label>
            <textarea value={block.after} onChange={e => upd({ after: e.target.value })} rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 resize-none" />
          </div>
          <input value={block.metric} onChange={e => upd({ metric: e.target.value })} placeholder="Métrica de melhoria"
            className="col-span-2 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
        </div>}
        {block.type === "bar" && <>
          <input value={block.title} onChange={e => upd({ title: e.target.value })} placeholder="Título"
            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
          <div className="space-y-1">
            {block.items.map((item, i) => (
              <div key={i} className="flex gap-1 items-center">
                <input value={item.name} onChange={e => { const items = [...block.items]; items[i] = {...item, name: e.target.value}; upd({ items }) }}
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400" />
                <input type="number" value={item.value} onChange={e => { const items = [...block.items]; items[i] = {...item, value: Number(e.target.value)}; upd({ items }) }}
                  className="w-16 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400" />
                <div className="w-5 h-5 rounded-full" style={{ background: item.color }} />
                <button onClick={() => { const items = block.items.filter((_,j) => j !== i); upd({ items }) }}
                  className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
            <button onClick={() => upd({ items: [...block.items, { name: "Item", value: 0, color: COLORS[block.items.length % COLORS.length] }] })}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
              <Plus className="w-3 h-3" /> Adicionar barra
            </button>
          </div>
        </>}
        {block.type === "divider" && <p className="text-xs text-slate-400 text-center">Divisória</p>}
      </div>
    </div>
  )
}

/* ── preview ────────────────────────────────────────────────── */
function InfographicPreview({ data }: { data: InfographicData }) {
  const themeColor = THEMES[data.theme as keyof typeof THEMES] ?? THEMES.blue
  const kpis  = data.blocks.filter(b => b.type === "kpi") as KpiBlock[]

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200" style={{ background: "#f8fafc" }}>
      {/* header */}
      <div className="px-6 py-4 text-white" style={{ background: themeColor }}>
        {data.blocks.filter(b => b.type === "title").map(b => {
          const tb = b as TitleBlock
          return (
            <div key={b.id}>
              <h2 className="text-xl font-bold">{tb.text}</h2>
              {tb.subtitle && <p className="text-sm opacity-80 mt-0.5">{tb.subtitle}</p>}
            </div>
          )
        })}
        {kpis.length > 0 && (
          <div className={cn("grid gap-4 mt-4", `grid-cols-${Math.min(kpis.length, 4)}`)}>
            {kpis.map(k => (
              <div key={k.id} className="bg-white/10 rounded-xl p-3 text-center">
                <div className="text-2xl">{k.icon}</div>
                <div className="text-2xl font-bold mt-1">{k.value}{k.unit}</div>
                <div className="text-xs opacity-80 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* body blocks */}
      <div className="p-4 space-y-4">
        {data.blocks.filter(b => !["title","kpi"].includes(b.type)).map(b => {
          if (b.type === "divider") return <hr key={b.id} className="border-slate-200" />
          if (b.type === "text") {
            const tb = b as TextBlock
            return <p key={b.id} className={cn("text-slate-700", tb.size === "sm" ? "text-xs" : tb.size === "lg" ? "text-base" : "text-sm")}>{tb.content}</p>
          }
          if (b.type === "list") {
            const lb = b as ListBlock
            return (
              <div key={b.id}>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">{lb.icon} {lb.title}</h4>
                <ul className="space-y-1">
                  {lb.items.map((it, i) => <li key={i} className="flex items-center gap-2 text-sm text-slate-600"><span>•</span>{it}</li>)}
                </ul>
              </div>
            )
          }
          if (b.type === "comparison") {
            const cb = b as CompBlock
            return (
              <div key={b.id} className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 bg-red-50 border border-red-100">
                  <div className="text-xs font-semibold text-red-700 mb-1">AS-IS — Hoje</div>
                  <p className="text-sm text-red-800">{cb.before}</p>
                </div>
                <div className="rounded-xl p-3 bg-green-50 border border-green-100">
                  <div className="text-xs font-semibold text-green-700 mb-1">TO-BE — Futuro</div>
                  <p className="text-sm text-green-800">{cb.after}</p>
                </div>
                {cb.metric && <p className="col-span-2 text-xs text-slate-500 text-center">{cb.metric}</p>}
              </div>
            )
          }
          if (b.type === "bar") {
            const bb = b as BarBlock
            const max = Math.max(...bb.items.map(i => i.value), 1)
            return (
              <div key={b.id}>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">{bb.title}</h4>
                <div className="space-y-2">
                  {bb.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 w-28 shrink-0 truncate">{it.name}</span>
                      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full flex items-center px-2"
                          style={{ width: `${(it.value / max) * 100}%`, background: it.color, minWidth: 24 }}>
                          <span className="text-[10px] text-white font-medium">{it.value}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}

/* ── main ───────────────────────────────────────────────────── */
export function InfographicEditor({ editorRef, initialContent, onSave }: Props) {
  const [data,   setData]   = useState<InfographicData>(() => parse(initialContent))
  const [saving, setSaving] = useState(false)
  const [dirty,  setDirty]  = useState(false)
  const [tab,    setTab]    = useState<"edit"|"preview">("edit")

  function mut(fn: (d: InfographicData) => InfographicData) { setData(fn); setDirty(true) }

  function addBlock(type: BlockType) {
    let block: Block
    switch (type) {
      case "kpi":        block = { type, id: uid(), label: "Indicador", value: "0", unit: "", icon: "📊", color: COLORS[data.blocks.filter(b=>b.type==="kpi").length % COLORS.length] }; break
      case "text":       block = { type, id: uid(), content: "Texto do infográfico...", size: "base" }; break
      case "list":       block = { type, id: uid(), title: "Lista", icon: "•", items: ["Item 1","Item 2"] }; break
      case "comparison": block = { type, id: uid(), label: "Comparativo", before: "Situação atual", after: "Situação futura", metric: "" }; break
      case "bar":        block = { type, id: uid(), title: "Gráfico", items: [{ name: "A", value: 5, color: COLORS[0] },{ name: "B", value: 3, color: COLORS[1] }] }; break
      case "divider":    block = { type, id: uid() }; break
      case "title":      block = { type, id: uid(), text: "Título", subtitle: "" }; break
    }
    mut(d => ({ ...d, blocks: [...d.blocks, block] }))
  }

  function updateBlock(id: string, updated: Block) {
    mut(d => ({ ...d, blocks: d.blocks.map(b => b.id === id ? updated : b) }))
  }

  function deleteBlock(id: string) { mut(d => ({ ...d, blocks: d.blocks.filter(b => b.id !== id) })) }
  function moveUp(idx: number) { if (idx === 0) return; mut(d => { const bs = [...d.blocks]; [bs[idx-1],bs[idx]] = [bs[idx],bs[idx-1]]; return {...d,blocks:bs} }) }
  function moveDown(idx: number) { mut(d => { const bs = [...d.blocks]; if (idx >= bs.length-1) return d; [bs[idx],bs[idx+1]] = [bs[idx+1],bs[idx]]; return {...d,blocks:bs} }) }

  async function save() { setSaving(true); await onSave(JSON.stringify(data)); setDirty(false); setSaving(false) }

  const ADD_TYPES: { type: BlockType; label: string }[] = [
    { type: "kpi", label: "KPI" }, { type: "text", label: "Texto" },
    { type: "list", label: "Lista" }, { type: "comparison", label: "AS-IS/TO-BE" },
    { type: "bar", label: "Gráfico" }, { type: "divider", label: "Divisória" },
    { type: "title", label: "Título" },
  ]

  return (
    <div ref={editorRef} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50 flex-wrap">
        <BarChart2 className="w-4 h-4 text-rose-600" />
        <input value={data.title} onChange={e => mut(d => ({...d, title: e.target.value}))}
          className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 min-w-0" />
        <div className="flex gap-1 ml-2">
          {(["edit","preview"] as const).map(v => (
            <button key={v} onClick={() => setTab(v)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border",
                tab === v ? "bg-rose-600 text-white border-rose-600" : "bg-white text-slate-600 border-slate-200 hover:border-rose-300")}>
              {v === "edit" ? "Editor" : "Prévia"}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <select value={data.theme} onChange={e => mut(d => ({...d, theme: e.target.value}))}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
          <option value="blue">Azul</option><option value="emerald">Verde</option>
          <option value="violet">Roxo</option><option value="slate">Cinza</option>
        </select>
        <button onClick={save} disabled={saving||!dirty}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {dirty ? "Salvar*" : "Salvo"}
        </button>
      </div>

      {tab === "edit" ? (
        <div className="p-4 space-y-4">
          {/* Add block buttons */}
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 self-center mr-1">+ Adicionar:</span>
            {ADD_TYPES.map(({ type, label }) => (
              <button key={type} onClick={() => addBlock(type)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50 transition-all">
                {label}
              </button>
            ))}
          </div>
          {/* Blocks */}
          <div className="space-y-2">
            {data.blocks.length === 0
              ? <p className="text-sm text-slate-400 text-center py-8">Nenhum bloco. Adicione um acima.</p>
              : data.blocks.map((b, i) => (
                <BlockEditor key={b.id} block={b}
                  onChange={updated => updateBlock(b.id, updated)}
                  onDelete={() => deleteBlock(b.id)}
                  onMoveUp={() => moveUp(i)}
                  onMoveDown={() => moveDown(i)} />
              ))
            }
          </div>
        </div>
      ) : (
        <div className="p-4">
          <InfographicPreview data={data} />
        </div>
      )}
    </div>
  )
}
