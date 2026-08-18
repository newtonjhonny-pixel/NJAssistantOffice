import { prisma } from '@/lib/prisma-sqlite'

let schemaEnsured = false

export async function ensureProcessFlowchartSchema() {
  if (schemaEnsured) return
  const stmts = [
    `CREATE TABLE IF NOT EXISTS "ProcessFlowchart" (
      "id"                  TEXT PRIMARY KEY,
      "processId"           TEXT NOT NULL,
      "type"                TEXT NOT NULL DEFAULT 'OPERACIONAL',
      "name"                TEXT NOT NULL,
      "description"         TEXT,
      "version"             TEXT DEFAULT '1.0',
      "status"              TEXT DEFAULT 'RASCUNHO',
      "content"             TEXT,
      "procedureDocumentId" TEXT,
      "responsible"         TEXT,
      "systems"             TEXT,
      "duplicatedFromId"    TEXT,
      "createdAt"           TEXT NOT NULL,
      "updatedAt"           TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS "idx_pf_processId" ON "ProcessFlowchart"("processId")`,
  ]
  for (const stmt of stmts) {
    try { await prisma.$executeRawUnsafe(stmt) } catch { /* já existe */ }
  }
  schemaEnsured = true
}
