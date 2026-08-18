-- Migration: Banco de Horas
-- Models: HourBankEntry, HourBankConfig

CREATE TABLE IF NOT EXISTS "HourBankEntry" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "memberId"      TEXT NOT NULL,
  "entryDate"     DATETIME NOT NULL,
  "competence"    TEXT NOT NULL,
  "type"          TEXT NOT NULL,
  "creditMinutes" INTEGER NOT NULL DEFAULT 0,
  "debitMinutes"  INTEGER NOT NULL DEFAULT 0,
  "responsible"   TEXT,
  "observations"  TEXT,
  "status"        TEXT NOT NULL DEFAULT 'ATIVO',
  "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HourBankEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "HourBankEntry_memberId_idx" ON "HourBankEntry"("memberId");
CREATE INDEX IF NOT EXISTS "HourBankEntry_memberId_competence_idx" ON "HourBankEntry"("memberId", "competence");

CREATE TABLE IF NOT EXISTS "HourBankConfig" (
  "id"                 TEXT NOT NULL PRIMARY KEY,
  "memberId"           TEXT NOT NULL UNIQUE,
  "compensationDays"   INTEGER NOT NULL DEFAULT 180,
  "alertDaysBeforeExp" INTEGER NOT NULL DEFAULT 30,
  "maxCreditHours"     INTEGER,
  "negativeBalance"    INTEGER NOT NULL DEFAULT 0,
  "observations"       TEXT,
  "createdAt"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HourBankConfig_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
