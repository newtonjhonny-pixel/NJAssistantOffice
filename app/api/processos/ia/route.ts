import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { aiService } from '@/lib/ai/gateway'

export const dynamic = 'force-dynamic'

async function buildContext() {
  const [processes, risks, controls, compliance, indicators, audits, procedures] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT id, code, name, category, status, owner, department FROM "Process" ORDER BY name ASC`
    ).catch(() => []),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT code, title, category, riskLevel, status, treatmentType, responsible, cause, effect FROM "Risk" ORDER BY impact DESC, probability DESC LIMIT 20`
    ).catch(() => []),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT code, title, type, status, effectiveness, responsible, frequency FROM "Control" LIMIT 20`
    ).catch(() => []),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT title, category, status, legalBasis, frequency, responsible, dueDate FROM "ComplianceObligation" ORDER BY dueDate ASC LIMIT 20`
    ).catch(() => []),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT code, name, category, status, currentValue, target, unit, trend FROM "Indicator" LIMIT 20`
    ).catch(() => []),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT code, title, type, status, result, plannedDate FROM "AuditRecord" ORDER BY plannedDate DESC LIMIT 10`
    ).catch(() => []),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT type, title, docStatus FROM "ProcedureDocument" ORDER BY updatedAt DESC LIMIT 20`
    ).catch(() => []),
  ])

  const lines: string[] = ["# CONTEXTO DA ORGANIZAÇÃO\n"]

  if ((processes as unknown[]).length) {
    lines.push(`## Processos Cadastrados (${(processes as unknown[]).length})`)
    for (const p of processes) {
      lines.push(`- ${p.code ? `[${p.code}] ` : ""}${p.name} | Cat: ${p.category} | Status: ${p.status}${p.owner ? ` | Dono: ${p.owner}` : ""}`)
    }
    lines.push("")
  }

  if ((risks as unknown[]).length) {
    lines.push(`## Riscos Identificados (${(risks as unknown[]).length})`)
    for (const r of risks) {
      lines.push(`- ${r.code ? `[${r.code}] ` : ""}${r.title} | Nível: ${r.riskLevel} | Status: ${r.status} | Tratamento: ${r.treatmentType}`)
    }
    lines.push("")
  }

  if ((controls as unknown[]).length) {
    lines.push(`## Controles (${(controls as unknown[]).length})`)
    for (const c of controls) {
      lines.push(`- ${c.code ? `[${c.code}] ` : ""}${c.title} | Tipo: ${c.type} | Status: ${c.status} | Efetividade: ${c.effectiveness}`)
    }
    lines.push("")
  }

  if ((compliance as unknown[]).length) {
    lines.push(`## Obrigações de Conformidade (${(compliance as unknown[]).length})`)
    for (const o of compliance) {
      const overdue = o.dueDate && o.status !== "EM_DIA" && new Date(o.dueDate as string) < new Date()
      lines.push(`- ${o.title} | Cat: ${o.category} | Status: ${o.status}${overdue ? " ⚠️ VENCIDA" : ""}${o.dueDate ? ` | Prazo: ${o.dueDate}` : ""}`)
    }
    lines.push("")
  }

  if ((indicators as unknown[]).length) {
    lines.push(`## Indicadores (${(indicators as unknown[]).length})`)
    for (const i of indicators) {
      lines.push(`- ${i.code ? `[${i.code}] ` : ""}${i.name} | Status: ${i.status} | Valor: ${i.currentValue ?? "sem dado"} ${i.unit} | Meta: ${i.target ?? "—"} | Tendência: ${i.trend ?? "—"}`)
    }
    lines.push("")
  }

  if ((audits as unknown[]).length) {
    lines.push(`## Auditorias (${(audits as unknown[]).length})`)
    for (const a of audits) {
      lines.push(`- ${a.code ? `[${a.code}] ` : ""}${a.title} | Tipo: ${a.type} | Status: ${a.status}${a.result ? ` | Resultado: ${a.result}` : ""}`)
    }
    lines.push("")
  }

  if ((procedures as unknown[]).length) {
    lines.push(`## Documentos de Procedimento (${(procedures as unknown[]).length})`)
    const grouped: Record<string, number> = {}
    for (const d of procedures) {
      grouped[d.type as string] = (grouped[d.type as string] ?? 0) + 1
    }
    for (const [type, count] of Object.entries(grouped)) {
      lines.push(`- ${type}: ${count}`)
    }
  }

  return lines.join("\n")
}

const SYSTEM = `Você é o Assistente de IA de Gestão de Processos do NJ Assistant Office.

Seu papel é ajudar gestores e analistas a:
• Analisar riscos, controles e conformidade dos processos
• Gerar planos de ação para mitigar riscos identificados
• Sugerir indicadores relevantes para medir desempenho
• Interpretar resultados de auditorias e propor melhorias
• Identificar gargalos e oportunidades de melhoria
• Apoiar a construção de uma gestão por processos madura

Responda sempre em português brasileiro, de forma objetiva e estruturada.
Use ** para negrito, • para listas. Seja específico e cite os dados fornecidos quando relevante.
Nunca invente dados — baseie-se apenas nas informações do contexto fornecido.`

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    message: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  const context = await buildContext()

  const systemWithContext = `${SYSTEM}

${context}

Data atual: ${new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`

  if (!aiService.isConfigured()) {
    return NextResponse.json({
      content: buildFallback(body.message, context),
      aiPowered: false,
    })
  }

  try {
    const messages = [
      ...(body.history ?? []),
      { role: 'user' as const, content: body.message },
    ]
    const result = await aiService.ask({
      module: 'processos.ia',
      specialist: 'Gestão de Processos',
      systemPrompt: systemWithContext,
      message: body.message,
      history: body.history,
      maxTokens: 2000,
    })
    return NextResponse.json({ content: result.content, aiPowered: result.aiPowered })
  } catch {
    return NextResponse.json({ content: buildFallback(body.message, context), aiPowered: false })
  }
}

function buildFallback(message: string, context: string): string {
  const tag = '*(IA não configurada — configure OPENAI_API_KEY para usar o assistente real)*'
  const lower = message.toLowerCase()

  if (lower.includes("risco") || lower.includes("risk")) {
    const hasRisks = context.includes("Riscos Identificados")
    return `${tag}\n\n**Análise de Riscos**\n\n${hasRisks ? "Identifico riscos cadastrados no sistema. Com a IA ativa, posso analisar cada um, sugerir controles adicionais e priorizar um plano de ação." : "Ainda não há riscos cadastrados. Recomendo iniciar o mapeamento pelos processos mais críticos da organização."}\n\n**Para ativar:** adicione \`OPENAI_API_KEY\` no arquivo \`.env\`.`
  }
  if (lower.includes("indicador") || lower.includes("kpi") || lower.includes("meta")) {
    return `${tag}\n\n**Indicadores de Processo**\n\nCom a IA ativa, posso analisar os indicadores cadastrados, identificar quais estão abaixo da meta, sugerir ações corretivas e recomendar novos KPIs relevantes para cada processo.\n\n**Para ativar:** adicione \`OPENAI_API_KEY\` no arquivo \`.env\`.`
  }
  if (lower.includes("auditoria") || lower.includes("conformidade") || lower.includes("compliance")) {
    return `${tag}\n\n**Conformidade e Auditoria**\n\nCom a IA ativa, posso revisar as obrigações de conformidade, identificar as que estão em atraso, sugerir planos de ação para auditorias com não conformidades e recomendar melhorias no sistema de gestão.\n\n**Para ativar:** adicione \`OPENAI_API_KEY\` no arquivo \`.env\`.`
  }
  return `${tag}\n\n**Assistente de Processos**\n\nEstou pronto para ajudar com análise de riscos, controles, conformidade, indicadores e auditorias dos processos da organização.\n\nPossíveis perguntas:\n• "Quais são os riscos mais críticos?"\n• "Que indicadores estão abaixo da meta?"\n• "Quais obrigações estão vencidas?"\n• "Gere um plano de ação para o RISK-001"\n\n**Para ativar:** adicione \`OPENAI_API_KEY\` no arquivo \`.env\`.`
}
