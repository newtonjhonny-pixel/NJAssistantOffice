import { NextRequest, NextResponse } from "next/server"
import { aiService } from "@/lib/ai/gateway"

export const dynamic = "force-dynamic"

// ─── System prompt ─────────────────────────────────────────────────────────────

function buildSystem(type: string): string {
  return `Você é um assistente especializado em criar apresentações corporativas profissionais para o NJ Assistant Office.
Sua tarefa é gerar estruturas JSON válidas para apresentações do tipo "${type}".
Responda APENAS com JSON válido, sem markdown, sem explicação, sem texto adicional.
O JSON deve seguir exatamente o schema solicitado.`
}

// ─── Prompts por tipo ─────────────────────────────────────────────────────────

function orgPrompt(prompt: string): string {
  return `Crie um organograma profissional baseado nesta descrição: "${prompt}"

Gere um JSON no seguinte formato:
{
  "nodes": [
    { "id": "n1", "type": "orgNode", "position": { "x": 0, "y": 0 }, "data": { "label": "Nome", "role": "Cargo", "nodeType": "root" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2" }
  ]
}

Regras:
- nodeType pode ser: root (apenas 1, topo), manager (gerentes/coordenadores), employee (colaboradores), department (departamentos)
- Use IDs únicos como "n1", "n2", etc.
- Crie uma hierarquia realista com 6-15 nós
- Defina edges conectando superiores a subordinados
- As posições serão recalculadas automaticamente, use x:0, y:0 para todos`
}

function flowPrompt(prompt: string, isProcess: boolean): string {
  const context = isProcess ? "mapa de processo de negócio" : "fluxograma"
  return `Crie um ${context} profissional baseado nesta descrição: "${prompt}"

Gere um JSON no seguinte formato:
{
  "nodes": [
    { "id": "n1", "type": "flowNode", "position": { "x": 0, "y": 0 }, "data": { "label": "Início", "nodeType": "start" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2", "label": "" }
  ]
}

Regras:
- nodeType pode ser: start (início, 1 obrigatório), end (fim, 1+ obrigatório), process (ação/etapa), decision (decisão/condicional), document (documento gerado), connector (conector de fluxo)
- Decisões devem ter 2 edges de saída com labels "Sim" e "Não"
- Use IDs únicos como "n1", "n2", etc.
- Crie um fluxo realista com 5-12 nós
- As posições serão recalculadas automaticamente, use x:0, y:0 para todos`
}

function slidesPrompt(prompt: string): string {
  return `Crie uma apresentação de slides profissional baseada nesta descrição: "${prompt}"

Gere um JSON no seguinte formato:
{
  "slides": [
    {
      "id": "s1",
      "bg": "#1e3a5f",
      "elements": [
        { "id": "e1", "type": "title", "x": 10, "y": 25, "w": 80, "h": 20, "content": "Título", "fontSize": "3xl", "bold": true, "align": "center", "color": "#ffffff" },
        { "id": "e2", "type": "subtitle", "x": 15, "y": 48, "w": 70, "h": 10, "content": "Subtítulo", "fontSize": "xl", "bold": false, "align": "center", "color": "#93c5fd" }
      ]
    }
  ]
}

Regras:
- Crie 4-8 slides: capa, agenda, conteúdo (múltiplos), conclusão/próximos passos
- bg pode ser qualquer cor CSS hex ou gradiente (ex: "linear-gradient(135deg, #1e3a5f 0%, #2d6a4f 100%)")
- type de elemento: title, subtitle, text
- x, y, w, h são percentuais (0-100) da área do slide
- fontSize: "xs"|"sm"|"base"|"lg"|"xl"|"2xl"|"3xl"|"4xl"
- Slides de conteúdo podem ter fundo claro (#f8fafc) com texto escuro (#1e293b)
- IDs únicos: slides "s1","s2"... e elementos "e1","e2"...`
}

// ─── Fallback sem IA configurada ──────────────────────────────────────────────

function buildFallback(type: string): string {
  if (type === "organogram") {
    return JSON.stringify({
      nodes: [
        { id: "n1", type: "orgNode", position: { x: 0, y: 0 }, data: { label: "Empresa", role: "Organização", nodeType: "root" } },
        { id: "n2", type: "orgNode", position: { x: 0, y: 0 }, data: { label: "Diretoria", role: "Diretor", nodeType: "manager" } },
        { id: "n3", type: "orgNode", position: { x: 0, y: 0 }, data: { label: "Gerência", role: "Gerente", nodeType: "manager" } },
        { id: "n4", type: "orgNode", position: { x: 0, y: 0 }, data: { label: "Colaborador", role: "Analista", nodeType: "employee" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    })
  }
  if (type === "flowchart" || type === "process") {
    return JSON.stringify({
      nodes: [
        { id: "n1", type: "flowNode", position: { x: 0, y: 0 }, data: { label: "Início", nodeType: "start" } },
        { id: "n2", type: "flowNode", position: { x: 0, y: 0 }, data: { label: "Processo", nodeType: "process" } },
        { id: "n3", type: "flowNode", position: { x: 0, y: 0 }, data: { label: "Fim", nodeType: "end" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    })
  }
  return ""
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { prompt, type, isProcess } = await req.json()

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt obrigatório" }, { status: 400 })
    }
    if (!["organogram", "flowchart", "process", "slides"].includes(type)) {
      return NextResponse.json({ error: "Tipo não suportado" }, { status: 400 })
    }

    let userPrompt: string
    if (type === "organogram") {
      userPrompt = orgPrompt(prompt)
    } else if (type === "flowchart" || type === "process") {
      userPrompt = flowPrompt(prompt, !!isProcess)
    } else {
      userPrompt = slidesPrompt(prompt)
    }

    if (!aiService.isConfigured()) {
      const fallback = buildFallback(type)
      if (!fallback) return NextResponse.json({ error: "IA não configurada e tipo sem fallback" }, { status: 503 })
      return NextResponse.json({ content: fallback, aiPowered: false })
    }

    const result = await aiService.ask({
      module: "apresentacoes.ai",
      message: userPrompt,
      systemPrompt: buildSystem(type),
      maxTokens: 4000,
    })

    const text = result.content ?? ""

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: "IA não retornou JSON válido", raw: text }, { status: 502 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ content: JSON.stringify(parsed), aiPowered: result.aiPowered })
  } catch (err: any) {
    console.error("[apresentacoes/ai]", err)
    return NextResponse.json({ error: err.message ?? "Erro interno" }, { status: 500 })
  }
}
