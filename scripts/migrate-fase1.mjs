/**
 * Migration Fase 1 — Procedimentos Corporativos
 * Executa via: node scripts/migrate-fase1.mjs
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const migrations = [
  // ── 0. Reconciliar status/docStatus ────────────────────────────────────────
  // Manter 'status' como coluna canônica; docStatus permanece no DB mas não é mais usada pelo app
  // Copiar docStatus → status onde status ainda tem o default 'VIGENTE' e docStatus é 'RASCUNHO'
  `UPDATE "ProcedureDocument" SET status = docStatus WHERE docStatus IS NOT NULL AND status = 'VIGENTE'`,

  // ── 1. Campos de Identificação ─────────────────────────────────────────────
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "subtitle" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "category" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "macroprocess" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "unit" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "company" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "targetAudience" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "scope" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "infoClassification" TEXT DEFAULT 'USO_INTERNO'`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "legalBasis" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "retentionPeriod" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "revisionNumber" INTEGER DEFAULT 0`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "elaborationDate" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "approvalDate" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "effectiveDate" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "reviewPeriodicity" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "creationReason" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "revisionReason" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "replacedDocument" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "successorDocument" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "tags" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "keywords" TEXT`,

  // ── 2. Campos de Governança ────────────────────────────────────────────────
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "elaboratedBy" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "technicalReviewer" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "qualityReviewer" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "legalReviewer" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "processOwner" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "publicationResponsible" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "substitute" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "approvalCommittee" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "approvalLevel" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "approvalDeadline" TEXT`,
  `ALTER TABLE "ProcedureDocument" ADD COLUMN "workflowStatus" TEXT NOT NULL DEFAULT 'RASCUNHO'`,

  // ── 3. ProcedureHistory ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "ProcedureHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "comment" TEXT,
    "oldWorkflowStatus" TEXT,
    "newWorkflowStatus" TEXT,
    "version" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("documentId") REFERENCES "ProcedureDocument"("id") ON DELETE CASCADE
  )`,

  // ── 4. ProcedureVersion ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "ProcedureVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changedBy" TEXT,
    "changeNote" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("documentId") REFERENCES "ProcedureDocument"("id") ON DELETE CASCADE
  )`,

  // ── 5. ProcedureApproval ───────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "ProcedureApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "role" TEXT NOT NULL,
    "approverName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "decision" TEXT,
    "comment" TEXT,
    "decidedAt" DATETIME,
    "deadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("documentId") REFERENCES "ProcedureDocument"("id") ON DELETE CASCADE
  )`,
]

async function run() {
  let ok = 0
  let skip = 0
  for (const sql of migrations) {
    const preview = sql.replace(/\s+/g, ' ').trim().slice(0, 80)
    try {
      await prisma.$executeRawUnsafe(sql)
      console.log(`✅ ${preview}`)
      ok++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('duplicate column') || msg.includes('already exists')) {
        console.log(`⏭  já existe: ${preview}`)
        skip++
      } else {
        console.error(`❌ ERRO: ${msg}\n   SQL: ${preview}`)
        throw err
      }
    }
  }
  console.log(`\nConcluído: ${ok} executadas, ${skip} ignoradas (já existiam).`)
}

run()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
