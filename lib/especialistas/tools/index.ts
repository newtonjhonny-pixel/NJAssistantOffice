// ─── Camada 5 · Registro Central de Ferramentas ───────────────────────────────
// Cada especialista declara quais tools OpenAI estão disponíveis para ele.
// O motor de raciocínio usa esse mapa para passar `tools` ao chat completion.

import type { ChatCompletionTool } from "openai/resources/chat"
import { DP_TOOLS, executarFerramentaDP } from "./dp"

// ─── Mapa de tools por especialista ──────────────────────────────────────────

export const SPECIALIST_TOOLS: Record<string, ChatCompletionTool[]> = {
  departamento_pessoal: DP_TOOLS,
  // Demais especialistas respondem com conhecimento/RAG — sem tools de cálculo por ora
  esocial: [],
  juridico: [],
  seguranca: [],
  medicina: [],
  processos: [],
  qualidade: [],
  recrutamento: [],
  comportamento: [],
}

// ─── Dispatcher global ────────────────────────────────────────────────────────

export function executarFerramenta(
  specialistId: string,
  toolName: string,
  args: Record<string, unknown>,
): object {
  if (specialistId === "departamento_pessoal") {
    return executarFerramentaDP(toolName, args)
  }
  return { erro: `Nenhuma ferramenta registrada para ${specialistId}::${toolName}` }
}

export { DP_TOOLS }
