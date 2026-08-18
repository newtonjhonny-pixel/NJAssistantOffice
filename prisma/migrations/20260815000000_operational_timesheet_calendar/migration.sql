-- ============================================================================
-- Modulo Operacional / Ponto / Calendario / Fluxogramas
--
-- Migration ADITIVA e SEGURA. Contem exclusivamente:
--   CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN / CREATE INDEX / ADD CONSTRAINT
-- NAO contem: DROP TABLE, DROP COLUMN, TRUNCATE, DELETE, ALTER COLUMN TYPE.
--
-- Os tipos abaixo espelham EXATAMENTE o SQL raw executado em runtime pelas
-- funcoes ensureSchema()/ensureTimesheetSchema()/ensureProcessFlowchartSchema().
-- Flags booleanas usam INTEGER (0 = false, 1 = true) porque as queries raw
-- comparam com 0/1. Ver decisao registrada no schema.
-- ============================================================================

-- ─── ClientCompany: coluna nova (calendario de feriados) ────────────────────
ALTER TABLE "ClientCompany" ADD COLUMN IF NOT EXISTS "ibgeCode" TEXT;

-- ─── CompanyOperationalSnapshot ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CompanyOperationalSnapshot" (
  "id"                          TEXT PRIMARY KEY,
  "companyId"                   TEXT NOT NULL,
  "competence"                  TEXT NOT NULL,
  "status"                      TEXT DEFAULT 'EM_PREENCHIMENTO',
  "isInitialCompetence"         INTEGER DEFAULT 0,
  "closedAt"                    TEXT,
  "headcountInitialActive"      INTEGER,
  "headcountInitialApprentice"  INTEGER,
  "headcountInitialIntern"      INTEGER,
  "headcountInitialOnLeave"     INTEGER,
  "admissionsClt"               INTEGER DEFAULT 0,
  "admissionsApprentice"        INTEGER DEFAULT 0,
  "admissionsIntern"            INTEGER DEFAULT 0,
  "entriesClt"                  INTEGER DEFAULT 0,
  "entriesApprentice"           INTEGER DEFAULT 0,
  "entriesIntern"               INTEGER DEFAULT 0,
  "terminationsClt"             INTEGER DEFAULT 0,
  "terminationsApprentice"      INTEGER DEFAULT 0,
  "terminationsIntern"          INTEGER DEFAULT 0,
  "exitsClt"                    INTEGER DEFAULT 0,
  "exitsApprentice"             INTEGER DEFAULT 0,
  "exitsIntern"                 INTEGER DEFAULT 0,
  "newLeaves"                   INTEGER DEFAULT 0,
  "returnFromLeave"             INTEGER DEFAULT 0,
  "headcountFinalActive"        INTEGER,
  "headcountFinalApprentice"    INTEGER,
  "headcountFinalIntern"        INTEGER,
  "headcountFinalOnLeave"       INTEGER,
  "headcountActive"             INTEGER,
  "headcountApprentice"         INTEGER,
  "headcountIntern"             INTEGER,
  "headcountOnLeave"            INTEGER,
  "avgAdmissions"               DOUBLE PRECISION,
  "avgTerminations"             DOUBLE PRECISION,
  "avgVacations"                DOUBLE PRECISION,
  "folhasProcessadas"           INTEGER,
  "complexity"                  TEXT,
  "automationLevel"             TEXT,
  "observations"                TEXT,
  "createdAt"                   TEXT,
  "updatedAt"                   TEXT,
  CONSTRAINT "CompanyOperationalSnapshot_companyId_competence_key" UNIQUE ("companyId","competence")
);
CREATE INDEX IF NOT EXISTS "CompanyOperationalSnapshot_companyId_idx" ON "CompanyOperationalSnapshot"("companyId");

-- ─── CompanySystem ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CompanySystem" (
  "id"           TEXT PRIMARY KEY,
  "companyId"    TEXT NOT NULL,
  "systemName"   TEXT NOT NULL,
  "systemType"   TEXT,
  "vendor"       TEXT,
  "version"      TEXT,
  "isActive"     INTEGER NOT NULL DEFAULT 1,
  "observations" TEXT,
  "createdAt"    TEXT,
  "updatedAt"    TEXT
);
CREATE INDEX IF NOT EXISTS "CompanySystem_companyId_idx" ON "CompanySystem"("companyId");

-- ─── CompanyProcessConfig ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CompanyProcessConfig" (
  "id"              TEXT PRIMARY KEY,
  "companyId"       TEXT NOT NULL,
  "processType"     TEXT NOT NULL,
  "volume"          DOUBLE PRECISION,
  "automationLevel" TEXT,
  "avgTimeMinutes"  DOUBLE PRECISION,
  "isCritical"      INTEGER NOT NULL DEFAULT 0,
  "observations"    TEXT,
  "createdAt"       TEXT,
  "updatedAt"       TEXT,
  CONSTRAINT "CompanyProcessConfig_companyId_processType_key" UNIQUE ("companyId","processType")
);
CREATE INDEX IF NOT EXISTS "CompanyProcessConfig_companyId_idx" ON "CompanyProcessConfig"("companyId");

-- ─── WorkCalendarEntry ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "WorkCalendarEntry" (
  "id"           TEXT PRIMARY KEY,
  "date"         TEXT NOT NULL,
  "year"         INTEGER NOT NULL,
  "description"  TEXT NOT NULL,
  "type"         TEXT NOT NULL,
  "uf"           TEXT,
  "municipio"    TEXT,
  "ibgeCode"     TEXT,
  "country"      TEXT DEFAULT 'Brasil',
  "origin"       TEXT DEFAULT 'MANUAL',
  "companyId"    TEXT,
  "unitId"       TEXT,
  "isWorked"     INTEGER DEFAULT 0,
  "observations" TEXT,
  "active"       INTEGER DEFAULT 1,
  "createdAt"    TEXT,
  "updatedAt"    TEXT
);
CREATE INDEX IF NOT EXISTS "WorkCalendarEntry_date_idx" ON "WorkCalendarEntry"("date");
CREATE INDEX IF NOT EXISTS "WorkCalendarEntry_year_idx" ON "WorkCalendarEntry"("year");

-- ─── EmployeeSchedule ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmployeeSchedule" (
  "id"             TEXT PRIMARY KEY,
  "memberId"       TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "weeklyMinutes"  INTEGER DEFAULT 0,
  "monthlyMinutes" INTEGER DEFAULT 0,
  "startDate"      TEXT NOT NULL,
  "endDate"        TEXT,
  "observations"   TEXT,
  "active"         INTEGER DEFAULT 1,
  "createdAt"      TEXT,
  "updatedAt"      TEXT,
  CONSTRAINT "EmployeeSchedule_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "EmployeeSchedule_memberId_idx" ON "EmployeeSchedule"("memberId");
CREATE INDEX IF NOT EXISTS "EmployeeSchedule_memberId_startDate_idx" ON "EmployeeSchedule"("memberId","startDate");

-- ─── EmployeeScheduleDay ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmployeeScheduleDay" (
  "id"           TEXT PRIMARY KEY,
  "scheduleId"   TEXT NOT NULL,
  "dayOfWeek"    INTEGER NOT NULL,
  "isWorked"     INTEGER DEFAULT 1,
  "entry1"       TEXT,
  "exit1"        TEXT,
  "entry2"       TEXT,
  "exit2"        TEXT,
  "entry3"       TEXT,
  "exit3"        TEXT,
  "dailyMinutes" INTEGER DEFAULT 0,
  "createdAt"    TEXT,
  "updatedAt"    TEXT,
  CONSTRAINT "EmployeeScheduleDay_scheduleId_fkey"
    FOREIGN KEY ("scheduleId") REFERENCES "EmployeeSchedule"("id") ON DELETE CASCADE,
  CONSTRAINT "EmployeeScheduleDay_scheduleId_dayOfWeek_key" UNIQUE ("scheduleId","dayOfWeek")
);
CREATE INDEX IF NOT EXISTS "EmployeeScheduleDay_scheduleId_idx" ON "EmployeeScheduleDay"("scheduleId");

-- ─── DailyTimeRecord ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DailyTimeRecord" (
  "id"                TEXT PRIMARY KEY,
  "memberId"          TEXT NOT NULL,
  "date"              TEXT NOT NULL,
  "dayOfWeek"         INTEGER NOT NULL,
  "competence"        TEXT NOT NULL,
  "dayType"           TEXT DEFAULT 'UTIL',
  "calendarEntryId"   TEXT,
  "scheduleId"        TEXT,
  "plannedMinutes"    INTEGER DEFAULT 0,
  "entryMode"         TEXT DEFAULT 'MARCACAO',
  "entry1"            TEXT,
  "exit1"             TEXT,
  "entry2"            TEXT,
  "exit2"             TEXT,
  "entry3"            TEXT,
  "exit3"             TEXT,
  "entry4"            TEXT,
  "exit4"             TEXT,
  "totalMinutes"      INTEGER,
  "workedMinutes"     INTEGER DEFAULT 0,
  "balanceMinutes"    INTEGER DEFAULT 0,
  "classification"    TEXT DEFAULT 'PENDENTE',
  "justification"     TEXT,
  "justificationDesc" TEXT,
  "hasAttachment"     INTEGER DEFAULT 0,
  "status"            TEXT DEFAULT 'NAO_PREENCHIDO',
  "source"            TEXT DEFAULT 'MANUAL',
  "sourceType"        TEXT DEFAULT 'MANUAL',
  "importBatchId"     TEXT,
  "observations"      TEXT,
  "createdAt"         TEXT,
  "updatedAt"         TEXT,
  CONSTRAINT "DailyTimeRecord_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE,
  CONSTRAINT "DailyTimeRecord_memberId_date_key" UNIQUE ("memberId","date")
);
CREATE INDEX IF NOT EXISTS "DailyTimeRecord_memberId_idx" ON "DailyTimeRecord"("memberId");
CREATE INDEX IF NOT EXISTS "DailyTimeRecord_memberId_competence_idx" ON "DailyTimeRecord"("memberId","competence");
CREATE INDEX IF NOT EXISTS "DailyTimeRecord_competence_idx" ON "DailyTimeRecord"("competence");

-- ─── MonthlyTimeCompetence ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "MonthlyTimeCompetence" (
  "id"                  TEXT PRIMARY KEY,
  "memberId"            TEXT NOT NULL,
  "competence"          TEXT NOT NULL,
  "plannedMinutes"      INTEGER DEFAULT 0,
  "workedMinutes"       INTEGER DEFAULT 0,
  "balanceMinutes"      INTEGER DEFAULT 0,
  "bankCreditMinutes"   INTEGER DEFAULT 0,
  "bankDebitMinutes"    INTEGER DEFAULT 0,
  "overtimeMinutes"     INTEGER DEFAULT 0,
  "abonoMinutes"        INTEGER DEFAULT 0,
  "compensationMinutes" INTEGER DEFAULT 0,
  "pendingCount"        INTEGER DEFAULT 0,
  "status"              TEXT DEFAULT 'ABERTA',
  "closedAt"            TEXT,
  "closedBy"            TEXT,
  "bankHoursEntryId"    TEXT,
  "observations"        TEXT,
  "createdAt"           TEXT,
  "updatedAt"           TEXT,
  CONSTRAINT "MonthlyTimeCompetence_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE,
  CONSTRAINT "MonthlyTimeCompetence_memberId_competence_key" UNIQUE ("memberId","competence")
);
CREATE INDEX IF NOT EXISTS "MonthlyTimeCompetence_memberId_idx" ON "MonthlyTimeCompetence"("memberId");

-- ─── MemberCalendarException ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "MemberCalendarException" (
  "id"             TEXT PRIMARY KEY,
  "memberId"       TEXT NOT NULL,
  "date"           TEXT NOT NULL,
  "type"           TEXT NOT NULL,
  "description"    TEXT,
  "overrideWorked" INTEGER DEFAULT 0,
  "plannedMinutes" INTEGER DEFAULT 0,
  "createdAt"      TEXT,
  "updatedAt"      TEXT,
  CONSTRAINT "MemberCalendarException_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE,
  CONSTRAINT "MemberCalendarException_memberId_date_key" UNIQUE ("memberId","date")
);
CREATE INDEX IF NOT EXISTS "MemberCalendarException_memberId_idx" ON "MemberCalendarException"("memberId");
