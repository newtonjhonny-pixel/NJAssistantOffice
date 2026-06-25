// Camada de compatibilidade — delega para lib/ai/agents.ts
// Mantida para não quebrar imports existentes
export type { AgentResponse } from './ai/agents'
export { getAgentResponse, analyzeTask, getDailySummary, analyzePending } from './ai/agents'
