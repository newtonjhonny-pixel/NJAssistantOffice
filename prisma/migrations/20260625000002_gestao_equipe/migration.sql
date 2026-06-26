-- Migration: Gestão de Equipe
-- Criado em: 2026-06-25
-- Seguro: apenas CREATE TABLE e ALTER TABLE ADD COLUMN (sem DROP, TRUNCATE ou DELETE)

CREATE TABLE IF NOT EXISTS "TeamMember" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "role"         TEXT NOT NULL,
    "sector"       TEXT,
    "unit"         TEXT,
    "email"        TEXT,
    "phone"        TEXT,
    "joinedAt"     TIMESTAMP(3),
    "status"       TEXT NOT NULL DEFAULT 'ATIVO',
    "observations" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeamFeedback" (
    "id"                TEXT NOT NULL,
    "memberId"          TEXT NOT NULL,
    "feedbackDate"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type"              TEXT NOT NULL,
    "observedSituation" TEXT,
    "positivePoints"    TEXT,
    "improvementPoints" TEXT,
    "orientationGiven"  TEXT,
    "agreedAction"      TEXT,
    "nextFollowUp"      TIMESTAMP(3),
    "observations"      TEXT,
    "aiGenerated"       BOOLEAN NOT NULL DEFAULT false,
    "aiContent"         TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamFeedback_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "TeamFeedback" ADD CONSTRAINT "TeamFeedback_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "TeamActivityDirection" (
    "id"             TEXT NOT NULL,
    "memberId"       TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "description"    TEXT,
    "dueDate"        TIMESTAMP(3),
    "priority"       TEXT NOT NULL DEFAULT 'MEDIA',
    "complexity"     TEXT NOT NULL DEFAULT 'SIMPLES',
    "expectedResult" TEXT,
    "aiOrientation"  TEXT,
    "status"         TEXT NOT NULL DEFAULT 'PLANEJADA',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamActivityDirection_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "TeamActivityDirection" ADD CONSTRAINT "TeamActivityDirection_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "TeamVacation" (
    "id"               TEXT NOT NULL,
    "memberId"         TEXT NOT NULL,
    "acquisitivePeriod" TEXT,
    "availableDays"    INTEGER,
    "startDate"        TIMESTAMP(3),
    "returnDate"       TIMESTAMP(3),
    "status"           TEXT NOT NULL DEFAULT 'A_PROGRAMAR',
    "substitute"       TEXT,
    "observations"     TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamVacation_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "TeamVacation" ADD CONSTRAINT "TeamVacation_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "TeamTraining" (
    "id"             TEXT NOT NULL,
    "memberId"       TEXT NOT NULL,
    "topic"          TEXT NOT NULL,
    "objective"      TEXT,
    "plannedDate"    TIMESTAMP(3),
    "completedDate"  TIMESTAMP(3),
    "status"         TEXT NOT NULL DEFAULT 'PLANEJADO',
    "responsible"    TEXT,
    "expectedResult" TEXT,
    "evaluation"     TEXT,
    "observations"   TEXT,
    "aiPlan"         TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamTraining_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "TeamTraining" ADD CONSTRAINT "TeamTraining_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "TeamActivity" (
    "id"                TEXT NOT NULL,
    "memberId"          TEXT NOT NULL,
    "title"             TEXT NOT NULL,
    "description"       TEXT,
    "receivedAt"        TIMESTAMP(3),
    "dueDate"           TIMESTAMP(3),
    "priority"          TEXT NOT NULL DEFAULT 'MEDIA',
    "status"            TEXT NOT NULL DEFAULT 'PENDENTE',
    "statusObservation" TEXT,
    "expectedResult"    TEXT,
    "deliveredResult"   TEXT,
    "coordinatorRating" TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamActivity_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "TeamActivity" ADD CONSTRAINT "TeamActivity_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "TeamGuideline" (
    "id"           TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "category"     TEXT NOT NULL,
    "description"  TEXT,
    "reason"       TEXT,
    "practicalUse" TEXT,
    "responsible"  TEXT,
    "status"       TEXT NOT NULL DEFAULT 'ATIVA',
    "observations" TEXT,
    "aiGenerated"  BOOLEAN NOT NULL DEFAULT false,
    "aiContent"    TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamGuideline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeamAiSuggestion" (
    "id"          TEXT NOT NULL,
    "type"        TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "content"     TEXT NOT NULL,
    "aiPowered"   BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamAiSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeamHistory" (
    "id"          TEXT NOT NULL,
    "memberId"    TEXT,
    "type"        TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamHistory_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "TeamHistory" ADD CONSTRAINT "TeamHistory_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
