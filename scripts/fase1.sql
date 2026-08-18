-- Migration Fase 1 — Procedimentos Corporativos
-- Seguro: todos os comandos são idempotentes via DEFAULT + NOT NULL DEFAULT

-- 0. Reconciliar docStatus → status (onde status ainda é o default VIGENTE)
UPDATE "ProcedureDocument" SET status = docStatus
WHERE docStatus IS NOT NULL AND status = 'VIGENTE' AND docStatus != 'VIGENTE';

-- 1. Identificação
ALTER TABLE "ProcedureDocument" ADD COLUMN "subtitle" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "category" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "macroprocess" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "unit" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "company" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "targetAudience" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "scope" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "infoClassification" TEXT DEFAULT 'USO_INTERNO';
ALTER TABLE "ProcedureDocument" ADD COLUMN "legalBasis" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "retentionPeriod" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "revisionNumber" INTEGER DEFAULT 0;
ALTER TABLE "ProcedureDocument" ADD COLUMN "elaborationDate" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "approvalDate" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "effectiveDate" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "reviewPeriodicity" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "creationReason" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "revisionReason" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "replacedDocument" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "successorDocument" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "tags" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "keywords" TEXT;

-- 2. Governança
ALTER TABLE "ProcedureDocument" ADD COLUMN "elaboratedBy" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "technicalReviewer" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "qualityReviewer" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "legalReviewer" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "processOwner" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "publicationResponsible" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "substitute" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "approvalCommittee" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "approvalLevel" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "approvalDeadline" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN "workflowStatus" TEXT NOT NULL DEFAULT 'RASCUNHO';

-- 3. ProcedureHistory
CREATE TABLE IF NOT EXISTS "ProcedureHistory" (
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
);

-- 4. ProcedureVersion
CREATE TABLE IF NOT EXISTS "ProcedureVersion" (
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
);

-- 5. ProcedureApproval
CREATE TABLE IF NOT EXISTS "ProcedureApproval" (
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
);
