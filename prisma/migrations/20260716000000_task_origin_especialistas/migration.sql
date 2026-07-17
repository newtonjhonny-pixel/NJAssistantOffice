CREATE TABLE IF NOT EXISTS "TaskOrigin" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL DEFAULT '#6B7280',
  "icon" TEXT NOT NULL DEFAULT '📌',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TaskOrigin_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "originId" TEXT;

CREATE TABLE IF NOT EXISTS "EspecialistaConversation" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "specialist" TEXT NOT NULL,
  "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "messageCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EspecialistaConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EspecialistaMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sources" TEXT,
  "specialist" TEXT,
  "docsUsed" TEXT,
  "autoUpdated" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EspecialistaMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EspecialistaUpdateLog" (
  "id" TEXT NOT NULL,
  "specialist" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "newDocs" INTEGER NOT NULL DEFAULT 0,
  "updatedDocs" INTEGER NOT NULL DEFAULT 0,
  "removedDocs" INTEGER NOT NULL DEFAULT 0,
  "duration" INTEGER NOT NULL DEFAULT 0,
  "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
  "status" TEXT NOT NULL DEFAULT 'completed',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EspecialistaUpdateLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EspecialistaBase" (
  "id" TEXT NOT NULL,
  "specialist" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DESATUALIZADO',
  "lastUpdated" TIMESTAMP(3),
  "version" TEXT,
  "docCount" INTEGER NOT NULL DEFAULT 0,
  "lastChecked" TIMESTAMP(3),
  "sources" TEXT,
  "docsByCategory" TEXT,
  "nextUpdate" TIMESTAMP(3),
  "initialLoadDone" BOOLEAN NOT NULL DEFAULT false,
  "initialLoadAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EspecialistaBase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EspecialistaDocument" (
  "id" TEXT NOT NULL,
  "specialist" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'geral',
  "type" TEXT NOT NULL DEFAULT 'documento',
  "content" TEXT,
  "source" TEXT,
  "version" TEXT,
  "tags" TEXT,
  "embedding" TEXT,
  "checksum" TEXT,
  "isRevoked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EspecialistaDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EspecialistaMemory" (
  "id" TEXT NOT NULL,
  "specialist" TEXT NOT NULL,
  "conversationId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'topic',
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "relevance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EspecialistaMemory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EspecialistaSource" (
  "id" TEXT NOT NULL,
  "specialist" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "description" TEXT,
  "lastFetched" TIMESTAMP(3),
  "lastHash" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EspecialistaSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EspecialistaToolExecution" (
  "id" TEXT NOT NULL,
  "specialist" TEXT NOT NULL,
  "conversationId" TEXT,
  "toolName" TEXT NOT NULL,
  "input" TEXT NOT NULL,
  "output" TEXT NOT NULL,
  "duration" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EspecialistaToolExecution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TaskOrigin_name_key" ON "TaskOrigin"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "EspecialistaBase_specialist_key" ON "EspecialistaBase"("specialist");
CREATE INDEX IF NOT EXISTS "EspecialistaUpdateLog_specialist_idx" ON "EspecialistaUpdateLog"("specialist");
CREATE INDEX IF NOT EXISTS "EspecialistaDocument_specialist_idx" ON "EspecialistaDocument"("specialist");
CREATE INDEX IF NOT EXISTS "EspecialistaDocument_specialist_isRevoked_idx" ON "EspecialistaDocument"("specialist", "isRevoked");
CREATE INDEX IF NOT EXISTS "EspecialistaMemory_specialist_conversationId_idx" ON "EspecialistaMemory"("specialist", "conversationId");
CREATE INDEX IF NOT EXISTS "EspecialistaMemory_specialist_type_idx" ON "EspecialistaMemory"("specialist", "type");
CREATE INDEX IF NOT EXISTS "EspecialistaSource_specialist_active_idx" ON "EspecialistaSource"("specialist", "active");
CREATE INDEX IF NOT EXISTS "EspecialistaToolExecution_specialist_toolName_idx" ON "EspecialistaToolExecution"("specialist", "toolName");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Task_originId_fkey'
  ) THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_originId_fkey"
      FOREIGN KEY ("originId") REFERENCES "TaskOrigin"("id") ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EspecialistaMessage_conversationId_fkey'
  ) THEN
    ALTER TABLE "EspecialistaMessage" ADD CONSTRAINT "EspecialistaMessage_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "EspecialistaConversation"("id") ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;
