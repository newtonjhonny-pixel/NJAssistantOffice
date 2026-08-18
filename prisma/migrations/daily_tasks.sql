-- Migration: Daily Tasks — Fase 1
-- Models: DailyTask, DailyTaskItem, DailyTaskHistory, DailyTaskAttachment

CREATE TABLE IF NOT EXISTS "DailyTask" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "date"          TEXT NOT NULL,                       -- YYYY-MM-DD (sem TZ)
  "responsible"   TEXT,
  "title"         TEXT,
  "objective"     TEXT,
  "status"        TEXT NOT NULL DEFAULT 'ABERTO',      -- ABERTO | EM_ANDAMENTO | CONCLUIDO | ENCERRADO
  "initialNotes"  TEXT,
  "finalNotes"    TEXT,
  "summary"       TEXT,
  "completionPct" REAL NOT NULL DEFAULT 0,
  "userId"        TEXT,
  "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "DailyTask_date_idx"        ON "DailyTask"("date");
CREATE INDEX IF NOT EXISTS "DailyTask_responsible_idx" ON "DailyTask"("responsible");

CREATE TABLE IF NOT EXISTS "DailyTaskItem" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "dailyTaskId"  TEXT NOT NULL,
  "order"        INTEGER NOT NULL DEFAULT 0,
  "title"        TEXT NOT NULL,
  "description"  TEXT,
  "category"     TEXT,
  "priority"     TEXT NOT NULL DEFAULT 'MEDIA',   -- BAIXA | MEDIA | ALTA | URGENTE
  "status"       TEXT NOT NULL DEFAULT 'PENDENTE',-- PENDENTE | EM_ANDAMENTO | CONCLUIDO | NAO_REALIZADO | ADIADO | CANCELADO
  "plannedTime"  TEXT,                            -- "HH:MM"
  "startedAt"    DATETIME,
  "completedAt"  DATETIME,
  "responsible"  TEXT,
  "notes"        TEXT,
  "required"     INTEGER NOT NULL DEFAULT 0,      -- 0=false 1=true
  "taskId"       TEXT,
  "processId"    TEXT,
  "origin"       TEXT DEFAULT 'MANUAL',           -- MANUAL | MODELO | COPIADO | CONVERTIDO
  "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyTaskItem_dailyTaskId_fkey" FOREIGN KEY ("dailyTaskId") REFERENCES "DailyTask" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "DailyTaskItem_dailyTaskId_idx" ON "DailyTaskItem"("dailyTaskId");
CREATE INDEX IF NOT EXISTS "DailyTaskItem_status_idx"      ON "DailyTaskItem"("status");

CREATE TABLE IF NOT EXISTS "DailyTaskHistory" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "dailyTaskId" TEXT NOT NULL,
  "action"      TEXT NOT NULL,
  "description" TEXT,
  "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyTaskHistory_dailyTaskId_fkey" FOREIGN KEY ("dailyTaskId") REFERENCES "DailyTask" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "DailyTaskAttachment" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "dailyTaskId" TEXT,
  "itemId"      TEXT,
  "fileName"    TEXT NOT NULL,
  "fileType"    TEXT NOT NULL,
  "fileSize"    INTEGER NOT NULL DEFAULT 0,
  "filePath"    TEXT NOT NULL,
  "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
