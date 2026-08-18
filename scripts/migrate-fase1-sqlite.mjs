/**
 * Migration Fase 1 — usa better-sqlite3 diretamente (sem Prisma client)
 * Executa via: node scripts/migrate-fase1-sqlite.mjs
 */
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// Tenta localizar better-sqlite3 nas dependências do Prisma
let Database
try {
  Database = require('better-sqlite3')
} catch {
  // Tenta o caminho interno do Prisma
  const p = resolve(__dirname, '../node_modules/@prisma/engines')
  console.log('better-sqlite3 não encontrado no PATH padrão, tentando via @prisma...')
  process.exit(2)
}

const dbPath = resolve(__dirname, '../prisma/dev.db')
console.log(`DB: ${dbPath}`)
const db = new Database(dbPath)

const migrations = [
  // ── 0. Reconciliar status: copiar docStatus → status onde ainda é o default ──
  `UPDATE "ProcedureDocument" SET status = docStatus WHERE docStatus IS NOT NULL AND status = 'VIGENTE' AND docStatus != 'VIGENTE'`,

  // ── 1. Identificação ────────────────────────────────────────────────────────
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

  // ── 2. Governança ───────────────────────────────────────────────────────────
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

  // ── 3. ProcedureHistory ─────────────────────────────────────────────────────
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

  // ── 4. ProcedureVersion ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "ProcedureVersion" (
    "id" NOT NULL PRIMARY KEY,
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

  // ── 5. ProcedureApproval ────────────────────────────────────────────────────
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

let ok = 0, skip = 0
for (const sql of migrations) {
  const preview = sql.replace(/\s+/g, ' ').trim().slice(0, 90)
  try {
    db.exec(sql)
    console.log(`✅ ${preview}`)
    ok++
  } catch (err) {
    const msg = err.message ?? String(err)
    if (msg.includes('duplicate column') || msg.includes('already exists') || msg.includes('table') && msg.includes('already')) {
      console.log(`⏭  já existe: ${preview}`)
      skip++
    } else {
      console.error(`❌ ERRO: ${msg}\n   SQL: ${preview}`)
      process.exit(1)
    }
  }
}

db.close()
console.log(`\n✔ Concluído: ${ok} executadas, ${skip} ignoradas (já existiam).`)
