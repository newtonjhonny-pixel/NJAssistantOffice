-- Additive migration: daily tasks, capacity, hour bank and procedure governance.
-- Safe DDL only plus non-destructive status reconciliation.

CREATE TABLE IF NOT EXISTS "ClientCompany" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cnpj" TEXT,
  "segment" TEXT,
  "observations" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientCompany_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClientCompany_active_idx" ON "ClientCompany"("active");

CREATE TABLE IF NOT EXISTS "MemberCompanyLink" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "memberRole" TEXT,
  "headcountActive" INTEGER,
  "headcountApprentice" INTEGER,
  "headcountIntern" INTEGER,
  "headcountOnLeave" INTEGER,
  "headcountUpdatedAt" TIMESTAMP(3),
  "avgAdmissions" DOUBLE PRECISION,
  "avgTerminations" DOUBLE PRECISION,
  "avgVacations" DOUBLE PRECISION,
  "folhasProcessadas" INTEGER,
  "unions" INTEGER,
  "establishments" INTEGER DEFAULT 1,
  "systemUsed" TEXT,
  "automationLevel" TEXT,
  "complexity" TEXT,
  "startDate" TIMESTAMP(3),
  "substitute" TEXT,
  "observations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberCompanyLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MemberCompanyLink_memberId_companyId_key" ON "MemberCompanyLink"("memberId", "companyId");
CREATE INDEX IF NOT EXISTS "MemberCompanyLink_memberId_idx" ON "MemberCompanyLink"("memberId");
CREATE INDEX IF NOT EXISTS "MemberCompanyLink_companyId_idx" ON "MemberCompanyLink"("companyId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MemberCompanyLink_memberId_fkey') THEN
    ALTER TABLE "MemberCompanyLink" ADD CONSTRAINT "MemberCompanyLink_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MemberCompanyLink_companyId_fkey') THEN
    ALTER TABLE "MemberCompanyLink" ADD CONSTRAINT "MemberCompanyLink_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "ClientCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MemberCompanyProcess" (
  "id" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "processType" TEXT NOT NULL,
  "volume" DOUBLE PRECISION,
  "complexity" TEXT,
  "automationLevel" TEXT,
  "avgTimeMinutes" DOUBLE PRECISION,
  "isCritical" BOOLEAN NOT NULL DEFAULT false,
  "observations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberCompanyProcess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MemberCompanyProcess_linkId_processType_key" ON "MemberCompanyProcess"("linkId", "processType");
CREATE INDEX IF NOT EXISTS "MemberCompanyProcess_linkId_idx" ON "MemberCompanyProcess"("linkId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MemberCompanyProcess_linkId_fkey') THEN
    ALTER TABLE "MemberCompanyProcess" ADD CONSTRAINT "MemberCompanyProcess_linkId_fkey"
      FOREIGN KEY ("linkId") REFERENCES "MemberCompanyLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MemberSalary" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "baseSalary" DOUBLE PRECISION,
  "fixedAdditions" DOUBLE PRECISION,
  "gratification" DOUBLE PRECISION,
  "trustFunction" DOUBLE PRECISION,
  "commission" DOUBLE PRECISION,
  "otherFixed" DOUBLE PRECISION,
  "estimatedMonthly" DOUBLE PRECISION,
  "estimatedCharges" DOUBLE PRECISION,
  "estimatedCost" DOUBLE PRECISION,
  "validFrom" TIMESTAMP(3),
  "lastAdjustment" TIMESTAMP(3),
  "adjustmentReason" TEXT,
  "observations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberSalary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MemberSalary_memberId_key" ON "MemberSalary"("memberId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MemberSalary_memberId_fkey') THEN
    ALTER TABLE "MemberSalary" ADD CONSTRAINT "MemberSalary_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CapacityConfig" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'padrão',
  "weightEmployee" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "weightCompany" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  "weightProcess" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
  "weightVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "weightComplexity" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
  "weightManual" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
  "weightCritical" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
  "capacityRef" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
  "bandGreen" DOUBLE PRECISION NOT NULL DEFAULT 70.0,
  "bandBlue" DOUBLE PRECISION NOT NULL DEFAULT 85.0,
  "bandYellow" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
  "bandOrange" DOUBLE PRECISION NOT NULL DEFAULT 120.0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CapacityConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HourBankEntry" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "entryDate" TIMESTAMP(3) NOT NULL,
  "competence" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "creditMinutes" INTEGER NOT NULL DEFAULT 0,
  "debitMinutes" INTEGER NOT NULL DEFAULT 0,
  "responsible" TEXT,
  "observations" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ATIVO',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HourBankEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HourBankEntry_memberId_idx" ON "HourBankEntry"("memberId");
CREATE INDEX IF NOT EXISTS "HourBankEntry_memberId_competence_idx" ON "HourBankEntry"("memberId", "competence");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HourBankEntry_memberId_fkey') THEN
    ALTER TABLE "HourBankEntry" ADD CONSTRAINT "HourBankEntry_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "HourBankConfig" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "compensationDays" INTEGER NOT NULL DEFAULT 180,
  "alertDaysBeforeExp" INTEGER NOT NULL DEFAULT 30,
  "maxCreditHours" INTEGER,
  "negativeBalance" BOOLEAN NOT NULL DEFAULT false,
  "observations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HourBankConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HourBankConfig_memberId_key" ON "HourBankConfig"("memberId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HourBankConfig_memberId_fkey') THEN
    ALTER TABLE "HourBankConfig" ADD CONSTRAINT "HourBankConfig_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "DailyTask" (
  "id" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "responsible" TEXT,
  "title" TEXT,
  "objective" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ABERTO',
  "initialNotes" TEXT,
  "finalNotes" TEXT,
  "summary" TEXT,
  "completionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DailyTask_date_idx" ON "DailyTask"("date");
CREATE INDEX IF NOT EXISTS "DailyTask_responsible_idx" ON "DailyTask"("responsible");

CREATE TABLE IF NOT EXISTS "DailyTaskItem" (
  "id" TEXT NOT NULL,
  "dailyTaskId" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'MEDIA',
  "status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "plannedTime" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "responsible" TEXT,
  "notes" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "taskId" TEXT,
  "processId" TEXT,
  "origin" TEXT DEFAULT 'MANUAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyTaskItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DailyTaskItem_dailyTaskId_idx" ON "DailyTaskItem"("dailyTaskId");
CREATE INDEX IF NOT EXISTS "DailyTaskItem_status_idx" ON "DailyTaskItem"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyTaskItem_dailyTaskId_fkey') THEN
    ALTER TABLE "DailyTaskItem" ADD CONSTRAINT "DailyTaskItem_dailyTaskId_fkey"
      FOREIGN KEY ("dailyTaskId") REFERENCES "DailyTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "DailyTaskHistory" (
  "id" TEXT NOT NULL,
  "dailyTaskId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyTaskHistory_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyTaskHistory_dailyTaskId_fkey') THEN
    ALTER TABLE "DailyTaskHistory" ADD CONSTRAINT "DailyTaskHistory_dailyTaskId_fkey"
      FOREIGN KEY ("dailyTaskId") REFERENCES "DailyTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "DailyTaskAttachment" (
  "id" TEXT NOT NULL,
  "dailyTaskId" TEXT,
  "itemId" TEXT,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL DEFAULT 0,
  "filePath" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyTaskAttachment_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyTaskAttachment_dailyTaskId_fkey') THEN
    ALTER TABLE "DailyTaskAttachment" ADD CONSTRAINT "DailyTaskAttachment_dailyTaskId_fkey"
      FOREIGN KEY ("dailyTaskId") REFERENCES "DailyTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'VIGENTE';
UPDATE "ProcedureDocument" SET "status" = "docStatus"
WHERE "docStatus" IS NOT NULL AND "status" = 'VIGENTE' AND "docStatus" != 'VIGENTE';

ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "subtitle" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "macroprocess" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "unit" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "company" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "targetAudience" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "scope" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "infoClassification" TEXT DEFAULT 'USO_INTERNO';
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "legalBasis" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "retentionPeriod" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "revisionNumber" INTEGER DEFAULT 0;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "elaborationDate" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "approvalDate" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "effectiveDate" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "reviewPeriodicity" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "creationReason" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "revisionReason" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "replacedDocument" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "successorDocument" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "tags" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "keywords" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "elaboratedBy" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "technicalReviewer" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "qualityReviewer" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "legalReviewer" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "processOwner" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "publicationResponsible" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "substitute" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "approvalCommittee" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "approvalLevel" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "approvalDeadline" TEXT;
ALTER TABLE "ProcedureDocument" ADD COLUMN IF NOT EXISTS "workflowStatus" TEXT NOT NULL DEFAULT 'RASCUNHO';

CREATE TABLE IF NOT EXISTS "ProcedureHistory" (
  "id" TEXT NOT NULL,
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
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcedureHistory_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProcedureHistory_documentId_fkey') THEN
    ALTER TABLE "ProcedureHistory" ADD CONSTRAINT "ProcedureHistory_documentId_fkey"
      FOREIGN KEY ("documentId") REFERENCES "ProcedureDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ProcedureVersion" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "snapshot" TEXT NOT NULL,
  "changedBy" TEXT,
  "changeNote" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcedureVersion_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProcedureVersion_documentId_fkey') THEN
    ALTER TABLE "ProcedureVersion" ADD CONSTRAINT "ProcedureVersion_documentId_fkey"
      FOREIGN KEY ("documentId") REFERENCES "ProcedureDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ProcedureApproval" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "step" INTEGER NOT NULL DEFAULT 0,
  "role" TEXT NOT NULL,
  "approverName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "decision" TEXT,
  "comment" TEXT,
  "decidedAt" TIMESTAMP(3),
  "deadline" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcedureApproval_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProcedureApproval_documentId_fkey') THEN
    ALTER TABLE "ProcedureApproval" ADD CONSTRAINT "ProcedureApproval_documentId_fkey"
      FOREIGN KEY ("documentId") REFERENCES "ProcedureDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
