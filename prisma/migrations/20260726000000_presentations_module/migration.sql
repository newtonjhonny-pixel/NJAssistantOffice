CREATE TABLE IF NOT EXISTS "Presentation" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "content" TEXT,
  "thumbnail" TEXT,
  "favorite" BOOLEAN NOT NULL DEFAULT false,
  "tags" TEXT,
  "objective" TEXT,
  "audience" TEXT,
  "linkedTo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL DEFAULT 'default-user',

  CONSTRAINT "Presentation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PresentationVersion" (
  "id" TEXT NOT NULL,
  "presentationId" TEXT NOT NULL,
  "label" TEXT,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PresentationVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PresentationHistory" (
  "id" TEXT NOT NULL,
  "presentationId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PresentationHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PresentationTemplate" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "thumbnail" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PresentationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Presentation_userId_idx" ON "Presentation"("userId");
CREATE INDEX IF NOT EXISTS "Presentation_type_idx" ON "Presentation"("type");
CREATE INDEX IF NOT EXISTS "Presentation_status_idx" ON "Presentation"("status");
CREATE INDEX IF NOT EXISTS "Presentation_favorite_idx" ON "Presentation"("favorite");
CREATE INDEX IF NOT EXISTS "PresentationVersion_presentationId_idx" ON "PresentationVersion"("presentationId");
CREATE INDEX IF NOT EXISTS "PresentationHistory_presentationId_idx" ON "PresentationHistory"("presentationId");
CREATE INDEX IF NOT EXISTS "PresentationTemplate_type_idx" ON "PresentationTemplate"("type");
CREATE INDEX IF NOT EXISTS "PresentationTemplate_category_idx" ON "PresentationTemplate"("category");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Presentation_userId_fkey'
  ) THEN
    ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PresentationVersion_presentationId_fkey'
  ) THEN
    ALTER TABLE "PresentationVersion" ADD CONSTRAINT "PresentationVersion_presentationId_fkey"
      FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PresentationHistory_presentationId_fkey'
  ) THEN
    ALTER TABLE "PresentationHistory" ADD CONSTRAINT "PresentationHistory_presentationId_fkey"
      FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
