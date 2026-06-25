-- Migration inicial — NJ Assistant Office
-- Provider: PostgreSQL 16
-- Gerada em: 2026-06-25

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE "User" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "role"      TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- ─── TASKS ───────────────────────────────────────────────────────────────────
CREATE TABLE "Task" (
    "id"           TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "description"  TEXT,
    "origin"       TEXT,
    "priority"     TEXT NOT NULL DEFAULT 'MEDIA',
    "status"       TEXT NOT NULL DEFAULT 'PENDENTE',
    "person"       TEXT,
    "observations" TEXT,
    "dueDate"      TIMESTAMP(3),
    "inboxItemId"  TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    "userId"       TEXT NOT NULL,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskHistory" (
    "id"          TEXT NOT NULL,
    "taskId"      TEXT NOT NULL,
    "action"      TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "oldValue"    TEXT,
    "newValue"    TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskHistory_pkey" PRIMARY KEY ("id")
);

-- ─── EMAIL ACCOUNTS ──────────────────────────────────────────────────────────
CREATE TABLE "EmailAccount" (
    "id"           TEXT NOT NULL,
    "provider"     TEXT NOT NULL,
    "email"        TEXT NOT NULL,
    "displayName"  TEXT,
    "accessToken"  TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt"    TIMESTAMP(3),
    "connectedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt"   TIMESTAMP(3),
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailAccount_provider_email_key" ON "EmailAccount"("provider", "email");

CREATE TABLE "EmailFolder" (
    "id"               TEXT NOT NULL,
    "accountId"        TEXT NOT NULL,
    "providerFolderId" TEXT NOT NULL,
    "name"             TEXT NOT NULL,
    "isSelected"       BOOLEAN NOT NULL DEFAULT false,
    "totalCount"       INTEGER,
    "unreadCount"      INTEGER,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailFolder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailFolder_accountId_providerFolderId_key" ON "EmailFolder"("accountId", "providerFolderId");

-- ─── INBOX ───────────────────────────────────────────────────────────────────
CREATE TABLE "InboxItem" (
    "id"                   TEXT NOT NULL,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider"             TEXT NOT NULL DEFAULT 'SIMULATED',
    "accountId"            TEXT,
    "externalId"           TEXT,
    "folderId"             TEXT,
    "sender"               TEXT NOT NULL,
    "senderEmail"          TEXT,
    "subject"              TEXT NOT NULL,
    "bodyPreview"          TEXT,
    "body"                 TEXT NOT NULL,
    "receivedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead"               BOOLEAN NOT NULL DEFAULT false,
    "isIgnored"            BOOLEAN NOT NULL DEFAULT false,
    "taskCreated"          BOOLEAN NOT NULL DEFAULT false,
    "hasAttachments"       BOOLEAN NOT NULL DEFAULT false,
    "summary"              TEXT,
    "aiSuggestedTaskTitle" TEXT,
    "aiSuggestedPriority"  TEXT,
    "aiSuggestedDueDate"   TEXT,
    "aiSuggestedResponse"  TEXT,
    "suggestedTask"        TEXT,
    "suggestedReply"       TEXT,
    CONSTRAINT "InboxItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InboxItem_provider_externalId_key" ON "InboxItem"("provider", "externalId");

-- ─── IA / AGENTES ────────────────────────────────────────────────────────────
CREATE TABLE "AiSuggestion" (
    "id"        TEXT NOT NULL,
    "taskId"    TEXT,
    "agent"     TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentInteraction" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "agent"     TEXT NOT NULL,
    "role"      TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentInteraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Settings" (
    "id"        TEXT NOT NULL,
    "key"       TEXT NOT NULL,
    "value"     TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

CREATE TABLE "Notification" (
    "id"          TEXT NOT NULL,
    "type"        TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "message"     TEXT NOT NULL,
    "relatedType" TEXT,
    "relatedId"   TEXT,
    "isRead"      BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- ─── PROJETOS ────────────────────────────────────────────────────────────────
CREATE TABLE "Project" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "objective"   TEXT,
    "responsible" TEXT,
    "startDate"   TIMESTAMP(3),
    "dueDate"     TIMESTAMP(3),
    "priority"    TEXT NOT NULL DEFAULT 'MEDIA',
    "status"      TEXT NOT NULL DEFAULT 'PLANEJADO',
    "progress"    INTEGER NOT NULL DEFAULT 0,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectStage" (
    "id"          TEXT NOT NULL,
    "projectId"   TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "order"       INTEGER NOT NULL DEFAULT 0,
    "startDate"   TIMESTAMP(3),
    "dueDate"     TIMESTAMP(3),
    "status"      TEXT NOT NULL DEFAULT 'NAO_INICIADA',
    "progress"    INTEGER NOT NULL DEFAULT 0,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectTask" (
    "id"          TEXT NOT NULL,
    "projectId"   TEXT NOT NULL,
    "stageId"     TEXT,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "responsible" TEXT,
    "startDate"   TIMESTAMP(3),
    "dueDate"     TIMESTAMP(3),
    "status"      TEXT NOT NULL DEFAULT 'PENDENTE',
    "priority"    TEXT NOT NULL DEFAULT 'MEDIA',
    "progress"    INTEGER NOT NULL DEFAULT 0,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectMilestone" (
    "id"          TEXT NOT NULL,
    "projectId"   TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "dueDate"     TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status"      TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectHistory" (
    "id"          TEXT NOT NULL,
    "projectId"   TEXT NOT NULL,
    "type"        TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectHistory_pkey" PRIMARY KEY ("id")
);

-- ─── CONFERÊNCIA ─────────────────────────────────────────────────────────────
CREATE TABLE "Conference" (
    "id"                TEXT NOT NULL,
    "title"             TEXT NOT NULL,
    "processType"       TEXT NOT NULL,
    "competence"        TEXT,
    "companyUnit"       TEXT,
    "analystName"       TEXT,
    "coordinatorName"   TEXT,
    "conferenceDate"    TIMESTAMP(3),
    "correctionDueDate" TIMESTAMP(3),
    "status"            TEXT NOT NULL DEFAULT 'PENDENTE',
    "priority"          TEXT NOT NULL DEFAULT 'MEDIA',
    "description"       TEXT,
    "notes"             TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Conference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConferenceChecklistItem" (
    "id"                    TEXT NOT NULL,
    "conferenceId"          TEXT NOT NULL,
    "description"           TEXT NOT NULL,
    "result"                TEXT NOT NULL DEFAULT 'PENDENTE_ANALISE',
    "notes"                 TEXT,
    "correctionResponsible" TEXT,
    "correctionDueDate"     TIMESTAMP(3),
    "order"                 INTEGER NOT NULL DEFAULT 0,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConferenceChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConferenceIssue" (
    "id"                    TEXT NOT NULL,
    "conferenceId"          TEXT NOT NULL,
    "title"                 TEXT NOT NULL,
    "description"           TEXT,
    "severity"              TEXT NOT NULL DEFAULT 'MEDIA',
    "impact"                TEXT,
    "probableCause"         TEXT,
    "recommendedSolution"   TEXT,
    "correctionResponsible" TEXT,
    "correctionDueDate"     TIMESTAMP(3),
    "correctionStatus"      TEXT NOT NULL DEFAULT 'ABERTA',
    "finalNotes"            TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConferenceIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConferenceCorrection" (
    "id"           TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "issueId"      TEXT,
    "responsible"  TEXT,
    "dueDate"      TIMESTAMP(3),
    "status"       TEXT NOT NULL DEFAULT 'ABERTA',
    "notes"        TEXT,
    "correctedAt"  TIMESTAMP(3),
    "validatedAt"  TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConferenceCorrection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConferenceAiAnalysis" (
    "id"           TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "content"      TEXT NOT NULL,
    "aiPowered"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConferenceAiAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConferenceHistory" (
    "id"           TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "type"         TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "description"  TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConferenceHistory_pkey" PRIMARY KEY ("id")
);

-- ─── FOREIGN KEYS ────────────────────────────────────────────────────────────
ALTER TABLE "Task"
    ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "Task_inboxItemId_fkey" FOREIGN KEY ("inboxItemId") REFERENCES "InboxItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TaskHistory"
    ADD CONSTRAINT "TaskHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailFolder"
    ADD CONSTRAINT "EmailFolder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InboxItem"
    ADD CONSTRAINT "InboxItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "InboxItem_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "EmailFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiSuggestion"
    ADD CONSTRAINT "AiSuggestion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgentInteraction"
    ADD CONSTRAINT "AgentInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectStage"
    ADD CONSTRAINT "ProjectStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectTask"
    ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ProjectTask_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ProjectStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectMilestone"
    ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectHistory"
    ADD CONSTRAINT "ProjectHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConferenceChecklistItem"
    ADD CONSTRAINT "ConferenceChecklistItem_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConferenceIssue"
    ADD CONSTRAINT "ConferenceIssue_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConferenceCorrection"
    ADD CONSTRAINT "ConferenceCorrection_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ConferenceCorrection_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "ConferenceIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConferenceAiAnalysis"
    ADD CONSTRAINT "ConferenceAiAnalysis_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConferenceHistory"
    ADD CONSTRAINT "ConferenceHistory_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── MIGRATION METADATA (Prisma) ─────────────────────────────────────────────
-- Prisma usa a tabela _prisma_migrations para rastrear execuções.
-- O entrypoint `prisma migrate deploy` a cria automaticamente.
