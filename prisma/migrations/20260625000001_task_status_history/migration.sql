-- Migration: task_status_history
-- Adiciona campos receivedAt e responsible à Task
-- Cria tabela TaskStatusHistory para auditoria completa de status

ALTER TABLE "Task" ADD COLUMN "receivedAt"  TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "responsible" TEXT;

CREATE TABLE "TaskStatusHistory" (
    "id"             TEXT NOT NULL,
    "taskId"         TEXT NOT NULL,
    "statusAnterior" TEXT NOT NULL,
    "statusNovo"     TEXT NOT NULL,
    "observacao"     TEXT NOT NULL,
    "responsavel"    TEXT NOT NULL,
    "waitingFor"     TEXT,
    "waitingReason"  TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskStatusHistory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TaskStatusHistory"
    ADD CONSTRAINT "TaskStatusHistory_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
