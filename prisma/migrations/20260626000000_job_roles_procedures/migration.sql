-- Migration: Job roles and procedure documents
-- Safe DDL only: CREATE TABLE IF NOT EXISTS and ADD CONSTRAINT.

CREATE TABLE IF NOT EXISTS "JobRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "manager" TEXT,
    "cbo" TEXT,
    "workSchedule" TEXT,
    "contractType" TEXT,
    "workLocation" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "objective" TEXT,
    "mission" TEXT,
    "responsibilities" TEXT,
    "dailyActivities" TEXT,
    "weeklyActivities" TEXT,
    "monthlyActivities" TEXT,
    "eventualActivities" TEXT,
    "technicalSkills" TEXT,
    "behavioralSkills" TEXT,
    "requiredKnowledge" TEXT,
    "toolsUsed" TEXT,
    "kpis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JobProcess" (
    "id" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "steps" TEXT,
    "responsible" TEXT,
    "deadline" TEXT,
    "flowchart" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobProcess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JobChecklistItem" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JobDocument" (
    "id" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JobVersion" (
    "id" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changedBy" TEXT,
    "changeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProcedureDocument" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "process" TEXT,
    "department" TEXT,
    "responsible" TEXT,
    "objective" TEXT,
    "application" TEXT,
    "systemsUsed" TEXT,
    "description" TEXT,
    "responsibilities" TEXT,
    "attentionPoints" TEXT,
    "risks" TEXT,
    "expectedResult" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProcedureDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProcedureStep" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imagePath" TEXT,
    "notes" TEXT,
    "attentionPoint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProcedureStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProcedureChecklistItem" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProcedureChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProcedureAttachment" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "stepId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcedureAttachment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "JobProcess" ADD CONSTRAINT "JobProcess_jobRoleId_fkey"
    FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobChecklistItem" ADD CONSTRAINT "JobChecklistItem_processId_fkey"
    FOREIGN KEY ("processId") REFERENCES "JobProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobDocument" ADD CONSTRAINT "JobDocument_jobRoleId_fkey"
    FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobVersion" ADD CONSTRAINT "JobVersion_jobRoleId_fkey"
    FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProcedureStep" ADD CONSTRAINT "ProcedureStep_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "ProcedureDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProcedureChecklistItem" ADD CONSTRAINT "ProcedureChecklistItem_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "ProcedureDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProcedureAttachment" ADD CONSTRAINT "ProcedureAttachment_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "ProcedureDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
