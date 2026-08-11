import { NextResponse } from "next/server"
import { aiService } from "@/lib/ai/gateway/AIService"

export const dynamic = "force-dynamic"

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedItem {
  order: number
  title: string
  description: string
  required: boolean
  defaultResponsible: string
  deadlineDays: number | null
  active: boolean
}

interface GeneratedActivity {
  name: string
  category: string
  department: string
  generalDescription: string
  notes: string
  status: string
  items: GeneratedItem[]
}

// ─── Perf logger ──────────────────────────────────────────────────────────────

function perfLog(tag: string, ms: number, extra?: Record<string, unknown>) {
  const line = extra
    ? `[activity-ai][${tag}] ${ms}ms | ${JSON.stringify(extra)}`
    : `[activity-ai][${tag}] ${ms}ms`
  console.log(line)
}

// ─── Max tokens (dynamic) ─────────────────────────────────────────────────────

function calcMaxTokens(stepsCount: number, detailLevel: string): number {
  const n       = stepsCount > 0 ? stepsCount : 8      // AUTO → assume 8
  // Margem generosa por etapa: modelo tende a ser mais verboso que o estimado
  const perStep = detailLevel === "RESUMIDO"      ? 280
               : detailLevel === "INTERMEDIARIO"  ? 450
               :                                    650  // COMPLETO
  const overhead = 800  // name, category, dept, description, notes + JSON delimiters + margem
  const raw = overhead + n * perStep
  // Arredonda para cima em múltiplos de 500, mínimo 2000, máximo 8000
  return Math.min(8000, Math.max(2000, Math.ceil(raw / 500) * 500))
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateAndNormalize(raw: unknown): GeneratedActivity {
  if (!raw || typeof raw !== "object") throw new Error("Resposta não é um objeto JSON válido.")
  const obj = raw as Record<string, unknown>

  if (!obj.name || typeof obj.name !== "string") throw new Error("Campo 'name' ausente ou inválido.")
  if (!Array.isArray(obj.items) || obj.items.length === 0) throw new Error("A atividade deve ter pelo menos uma etapa.")

  const items: GeneratedItem[] = obj.items.map((it: unknown, i: number) => {
    if (!it || typeof it !== "object") throw new Error(`Item ${i + 1} inválido.`)
    const item = it as Record<string, unknown>
    if (!item.title || typeof item.title !== "string" || !item.title.trim())
      throw new Error(`Item ${i + 1}: título não pode ser vazio.`)

    return {
      order:              i,
      title:              String(item.title).trim(),
      description:        item.description ? String(item.description).trim() : "",
      required:           item.required !== false,
      defaultResponsible: item.defaultResponsible ? String(item.defaultResponsible) : "",
      deadlineDays:       typeof item.deadlineDays === "number" ? Math.max(0, item.deadlineDays) : null,
      active:             item.active !== false,
    }
  })

  return {
    name:               String(obj.name).trim(),
    category:           obj.category ? String(obj.category) : "",
    department:         obj.department ? String(obj.department) : "",
    generalDescription: obj.generalDescription ? String(obj.generalDescription) : "",
    notes:              obj.notes ? String(obj.notes) : "",
    status:             "ACTIVE",
    items,
  }
}

// ─── JSON parse (json_object mode → sempre JSON válido, fallback por segurança) ──

function parseContent(text: string): unknown {
  // Com json_object mode a resposta já é JSON puro — parse direto
  try { return JSON.parse(text) } catch {}

  // Fallback: extrair de bloco markdown
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) { try { return JSON.parse(fence[1].trim()) } catch {} }

  // Último recurso: encontrar primeiro { ... }
  const s = text.indexOf("{"), e = text.lastIndexOf("}")
  if (s !== -1 && e > s) { try { return JSON.parse(text.slice(s, e + 1)) } catch {} }

  throw new Error("Não foi possível extrair JSON válido da resposta da IA.")
}

// ─── System prompt (enxuto — sem template JSON, garantido pelo json_object mode) ─

function buildSystemPrompt(detailLevel: string, stepsCount: number, opts: Record<string, boolean>): string {
  const detail =
    detailLevel === "RESUMIDO"      ? "concisa (títulos curtos, descrições de 1-2 linhas)" :
    detailLevel === "INTERMEDIARIO" ? "intermediária (descrições de 2-4 linhas por etapa)" :
    "completa (descrições detalhadas e operacionais por etapa)"

  const stepHint = stepsCount > 0
    ? `Gere exatamente ${stepsCount} etapas.`
    : "Gere o número de etapas necessário para cobrir o processo."

  const extras: string[] = []
  if (opts.includeResponsible) extras.push("defaultResponsible: cargo responsável (ex: 'Analista de DP').")
  if (opts.includeDeadlines)   extras.push("deadlineDays: prazo em dias (inteiro >= 0).")

  const extrasLine = extras.length
    ? `Inclua nos itens: ${extras.join(" ")}`
    : `Nos itens, deixe defaultResponsible vazio e deadlineDays como null.`

  return `Especialista em Processos de RH/DP. Ambiente corporativo brasileiro.
Retorne apenas JSON válido, sem texto externo.
Descrição ${detail}. ${stepHint}
${extrasLine}
Títulos das etapas: verbo no infinitivo + ação, máx 8 palavras.
Evite etapas duplicadas. Preserve ordem lógica.
Campos obrigatórios: name, category, department, generalDescription, notes, items[]{title,description,required,defaultResponsible,deadlineDays,active}.`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const t0 = Date.now()

  try {
    const body = await req.json()
    const {
      prompt             = "",
      detailLevel        = "COMPLETO",
      stepsCount         = 0,
      includeResponsible = true,
      includeDeadlines   = true,
    } = body as {
      prompt: string
      detailLevel: string
      stepsCount: number
      includeResponsible: boolean
      includeDeadlines: boolean
    }

    if (!prompt?.trim()) {
      return NextResponse.json({ success: false, error: "O prompt não pode estar vazio." }, { status: 400 })
    }

    if (!aiService.isConfigured()) {
      return NextResponse.json({ success: false, error: "Serviço de IA não configurado." }, { status: 503 })
    }

    const systemPrompt = buildSystemPrompt(detailLevel, stepsCount, { includeResponsible, includeDeadlines })

    // Nota: gpt-5 é modelo de raciocínio — usa tokens internos de "thinking"
    // que consomem max_completion_tokens. Não sobrescrevemos o limite; o módulo
    // define 8000 (modelConfig.ts), que é o mínimo seguro para esse modelo.
    const estimatedOutputTokens = calcMaxTokens(stepsCount, detailLevel)
    perfLog("start", 0, { detailLevel, stepsCount, estimatedOutputTokens, promptLen: prompt.trim().length })

    // ── Chamada à IA ──────────────────────────────────────────────────────────
    const t1 = Date.now()
    const result = await aiService.ask({
      module:         "team.activities.generator",
      specialist:     "processos",
      message:        prompt.trim(),
      systemPrompt,
      // maxTokens: não sobrescrever — módulo usa 8000 para comportar reasoning tokens do gpt-5
      responseFormat: { type: "json_object" },
    })
    const aiMs = Date.now() - t1
    perfLog("ai-call", aiMs, {
      model:             result.model,
      promptTokens:      result.usage?.promptTokens,
      completionTokens:  result.usage?.completionTokens,
      finishReason:      result.finishReason,
    })

    if (!result.aiPowered) {
      return NextResponse.json({ success: false, error: "Serviço de IA não disponível." }, { status: 503 })
    }

    // ── Parse ─────────────────────────────────────────────────────────────────
    const t2 = Date.now()
    const parsed = parseContent(result.content)
    const parseMs = Date.now() - t2
    perfLog("parse", parseMs)

    // ── Validação ─────────────────────────────────────────────────────────────
    const t3 = Date.now()
    const data = validateAndNormalize(parsed)
    const validateMs = Date.now() - t3
    perfLog("validate", validateMs, { items: data.items.length })

    const totalMs = Date.now() - t0
    perfLog("total", totalMs, { aiMs, parseMs, validateMs })

    return NextResponse.json({ success: true, data, generationMs: totalMs })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno ao gerar atividade."
    console.error(`[activity-ai][error] ${Date.now() - t0}ms —`, msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
