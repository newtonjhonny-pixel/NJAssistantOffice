-- Safe DDL only: create new tables, indexes and foreign keys.

CREATE TABLE IF NOT EXISTS "TaskChat" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "mode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskChat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CentralItem" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'UPLOAD',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "title" TEXT NOT NULL DEFAULT 'Nova entrada',
  "senderName" TEXT,
  "senderEmail" TEXT,
  "company" TEXT,
  "collaborator" TEXT,
  "subject" TEXT,
  "pastedContent" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'MEDIA',
  "dueDate" TEXT,
  "department" TEXT,
  "responsible" TEXT,
  "category" TEXT,
  "keywords" TEXT,
  "summary" TEXT,
  "risks" TEXT,
  "aiRaw" TEXT,
  "aiPowered" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CentralItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CentralAttachment" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "filePath" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CentralAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CentralHistory" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CentralHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CentralSuggestion" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "applied" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CentralSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CentralChat" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "mode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CentralChat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CentralConfig" (
  "id" TEXT NOT NULL,
  "folderPath" TEXT,
  "folderEnabled" BOOLEAN NOT NULL DEFAULT false,
  "folderIntervalMin" INTEGER NOT NULL DEFAULT 5,
  "folderMoveProcessed" BOOLEAN NOT NULL DEFAULT true,
  "folderProcessedPath" TEXT,
  "emailAddress" TEXT,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CentralConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Note" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Nova anotação',
  "content" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL DEFAULT 'Outros',
  "priority" TEXT NOT NULL DEFAULT 'MEDIA',
  "status" TEXT NOT NULL DEFAULT 'ATIVA',
  "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "observations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),

  CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NoteTag" (
  "id" TEXT NOT NULL,
  "noteId" TEXT NOT NULL,
  "name" TEXT NOT NULL,

  CONSTRAINT "NoteTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NoteAttachment" (
  "id" TEXT NOT NULL,
  "noteId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "filePath" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NoteAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NoteAiMessage" (
  "id" TEXT NOT NULL,
  "noteId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "mode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NoteAiMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NoteHistory" (
  "id" TEXT NOT NULL,
  "noteId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NoteHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TaskChat_taskId_idx" ON "TaskChat"("taskId");
CREATE INDEX IF NOT EXISTS "CentralAttachment_itemId_idx" ON "CentralAttachment"("itemId");
CREATE INDEX IF NOT EXISTS "CentralHistory_itemId_idx" ON "CentralHistory"("itemId");
CREATE INDEX IF NOT EXISTS "CentralSuggestion_itemId_idx" ON "CentralSuggestion"("itemId");
CREATE INDEX IF NOT EXISTS "CentralChat_itemId_idx" ON "CentralChat"("itemId");
CREATE INDEX IF NOT EXISTS "NoteTag_noteId_idx" ON "NoteTag"("noteId");
CREATE INDEX IF NOT EXISTS "NoteAttachment_noteId_idx" ON "NoteAttachment"("noteId");
CREATE INDEX IF NOT EXISTS "NoteAiMessage_noteId_idx" ON "NoteAiMessage"("noteId");
CREATE INDEX IF NOT EXISTS "NoteHistory_noteId_idx" ON "NoteHistory"("noteId");

ALTER TABLE "TaskChat" ADD CONSTRAINT "TaskChat_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CentralAttachment" ADD CONSTRAINT "CentralAttachment_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "CentralItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CentralHistory" ADD CONSTRAINT "CentralHistory_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "CentralItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CentralSuggestion" ADD CONSTRAINT "CentralSuggestion_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "CentralItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CentralChat" ADD CONSTRAINT "CentralChat_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "CentralItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NoteTag" ADD CONSTRAINT "NoteTag_noteId_fkey"
  FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NoteAttachment" ADD CONSTRAINT "NoteAttachment_noteId_fkey"
  FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NoteAiMessage" ADD CONSTRAINT "NoteAiMessage_noteId_fkey"
  FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NoteHistory" ADD CONSTRAINT "NoteHistory_noteId_fkey"
  FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
