-- Additive migration: process governance module.
-- Creates process, flow, risk, control, compliance, evidence, indicator,
-- audit and RACI tables without deleting existing data.

ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "processId" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "version" TEXT DEFAULT '1.0';
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "docStatus" TEXT DEFAULT 'RASCUNHO';
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "nextReview" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "reviewer" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "approver" TEXT;

CREATE TABLE IF NOT EXISTS "Process" (
  "id"          TEXT NOT NULL,
  "code"        TEXT,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "objective"   TEXT,
  "owner"       TEXT,
  "department"  TEXT,
  "category"    TEXT,
  "status"      TEXT NOT NULL DEFAULT 'ATIVO',
  "sla"         TEXT,
  "frequency"   TEXT,
  "inputs"      TEXT,
  "outputs"     TEXT,
  "tools"       TEXT,
  "risks"       TEXT,
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProcedureFlow" (
  "id"         TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "type"       TEXT NOT NULL,
  "content"    TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcedureFlow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProcedureFlow_documentId_type_key"
  ON "ProcedureFlow"("documentId", "type");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProcedureFlow_documentId_fkey'
  ) THEN
    ALTER TABLE "ProcedureFlow"
      ADD CONSTRAINT "ProcedureFlow_documentId_fkey"
      FOREIGN KEY ("documentId") REFERENCES "ProcedureDocument"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "RaciMatrix" (
  "id"          TEXT NOT NULL,
  "processId"   TEXT,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "activities"  TEXT NOT NULL DEFAULT '[]',
  "roles"       TEXT NOT NULL DEFAULT '[]',
  "entries"     TEXT NOT NULL DEFAULT '{}',
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RaciMatrix_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Risk" (
  "id"            TEXT NOT NULL,
  "code"          TEXT,
  "title"         TEXT NOT NULL,
  "description"   TEXT,
  "category"      TEXT NOT NULL DEFAULT 'OPERACIONAL',
  "processId"     TEXT,
  "probability"   INTEGER NOT NULL DEFAULT 3,
  "impact"        INTEGER NOT NULL DEFAULT 3,
  "riskLevel"     TEXT NOT NULL DEFAULT 'MEDIO',
  "cause"         TEXT,
  "effect"        TEXT,
  "currentControl" TEXT,
  "treatmentType" TEXT NOT NULL DEFAULT 'MITIGAR',
  "actionPlan"    TEXT,
  "responsible"   TEXT,
  "dueDate"       TEXT,
  "status"        TEXT NOT NULL DEFAULT 'IDENTIFICADO',
  "residualProbability" INTEGER,
  "residualImpact"      INTEGER,
  "residualLevel"       TEXT,
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Control" (
  "id"           TEXT NOT NULL,
  "code"         TEXT,
  "title"        TEXT NOT NULL,
  "description"  TEXT,
  "type"         TEXT NOT NULL DEFAULT 'PREVENTIVO',
  "category"     TEXT NOT NULL DEFAULT 'PROCESSO',
  "processId"    TEXT,
  "riskId"       TEXT,
  "responsible"  TEXT,
  "frequency"    TEXT NOT NULL DEFAULT 'MENSAL',
  "status"       TEXT NOT NULL DEFAULT 'ATIVO',
  "lastExecution" TEXT,
  "nextExecution" TEXT,
  "evidence"     TEXT,
  "effectiveness" TEXT NOT NULL DEFAULT 'NAO_AVALIADO',
  "notes"        TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Control_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ComplianceObligation" (
  "id"          TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "legalBasis"  TEXT,
  "category"    TEXT NOT NULL DEFAULT 'OUTROS',
  "responsible" TEXT,
  "frequency"   TEXT NOT NULL DEFAULT 'MENSAL',
  "dueDate"     TEXT,
  "status"      TEXT NOT NULL DEFAULT 'PENDENTE',
  "description" TEXT,
  "notes"       TEXT,
  "processId"   TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceObligation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Evidence" (
  "id"           TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "type"         TEXT NOT NULL DEFAULT 'DOCUMENTO',
  "description"  TEXT,
  "processId"    TEXT,
  "documentId"   TEXT,
  "responsible"  TEXT,
  "evidenceDate" TEXT,
  "status"       TEXT NOT NULL DEFAULT 'PENDENTE',
  "expiresAt"    TEXT,
  "notes"        TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Indicator" (
  "id"           TEXT NOT NULL,
  "code"         TEXT,
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "unit"         TEXT NOT NULL DEFAULT '%',
  "frequency"    TEXT NOT NULL DEFAULT 'MENSAL',
  "category"     TEXT NOT NULL DEFAULT 'QUALIDADE',
  "processId"    TEXT,
  "responsible"  TEXT,
  "target"       DOUBLE PRECISION,
  "minimum"      DOUBLE PRECISION,
  "maximum"      DOUBLE PRECISION,
  "currentValue" DOUBLE PRECISION,
  "status"       TEXT NOT NULL DEFAULT 'SEM_DADOS',
  "lastMeasuredAt" TEXT,
  "trend"        TEXT,
  "notes"        TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Indicator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IndicatorMeasurement" (
  "id"          TEXT NOT NULL,
  "indicatorId" TEXT NOT NULL,
  "value"       DOUBLE PRECISION NOT NULL,
  "measuredAt"  TEXT NOT NULL,
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IndicatorMeasurement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuditRecord" (
  "id"           TEXT NOT NULL,
  "code"         TEXT,
  "title"        TEXT NOT NULL,
  "type"         TEXT NOT NULL DEFAULT 'INTERNA',
  "scope"        TEXT,
  "processId"    TEXT,
  "auditor"      TEXT,
  "auditee"      TEXT,
  "plannedDate"  TEXT,
  "executedDate" TEXT,
  "status"       TEXT NOT NULL DEFAULT 'PLANEJADA',
  "result"       TEXT,
  "findings"     TEXT,
  "nonConformities" TEXT,
  "opportunities"   TEXT,
  "actionPlan"   TEXT,
  "nextAudit"    TEXT,
  "notes"        TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Process_status_idx" ON "Process"("status");
CREATE INDEX IF NOT EXISTS "Risk_processId_idx" ON "Risk"("processId");
CREATE INDEX IF NOT EXISTS "Control_processId_idx" ON "Control"("processId");
CREATE INDEX IF NOT EXISTS "ComplianceObligation_processId_idx" ON "ComplianceObligation"("processId");
CREATE INDEX IF NOT EXISTS "Evidence_processId_idx" ON "Evidence"("processId");
CREATE INDEX IF NOT EXISTS "Indicator_processId_idx" ON "Indicator"("processId");
CREATE INDEX IF NOT EXISTS "AuditRecord_processId_idx" ON "AuditRecord"("processId");
CREATE INDEX IF NOT EXISTS "RaciMatrix_processId_idx" ON "RaciMatrix"("processId");
