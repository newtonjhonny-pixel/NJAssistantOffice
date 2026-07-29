-- Migration: add ActivityCategory, ActivityItem, MemberActivityItemLink.
-- Additive and PostgreSQL-safe: preserves all existing activity templates.

CREATE TABLE IF NOT EXISTS "ActivityCategory" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "department"  TEXT,
  "color"       TEXT NOT NULL DEFAULT '#6B7280',
  "icon"        TEXT NOT NULL DEFAULT '📋',
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityCategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ActivityTemplate"
  ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ActivityTemplate_categoryId_fkey'
  ) THEN
    ALTER TABLE "ActivityTemplate"
      ADD CONSTRAINT "ActivityTemplate_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "ActivityCategory"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ActivityItem" (
  "id"                 TEXT NOT NULL,
  "activityId"         TEXT NOT NULL,
  "title"              TEXT NOT NULL,
  "description"        TEXT,
  "order"              INTEGER NOT NULL DEFAULT 0,
  "required"           BOOLEAN NOT NULL DEFAULT true,
  "defaultResponsible" TEXT,
  "defaultDays"        INTEGER,
  "observation"        TEXT,
  "active"             BOOLEAN NOT NULL DEFAULT true,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ActivityItem_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "ActivityTemplate"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "MemberActivityItemLink" (
  "id"          TEXT NOT NULL,
  "linkId"      TEXT NOT NULL,
  "itemId"      TEXT NOT NULL,
  "observation" TEXT,
  "includedAt"  TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberActivityItemLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MemberActivityItemLink_linkId_fkey"
    FOREIGN KEY ("linkId") REFERENCES "MemberActivityLink"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MemberActivityItemLink_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "ActivityItem"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ActivityCategory_active_idx"
  ON "ActivityCategory"("active");
CREATE INDEX IF NOT EXISTS "ActivityItem_activityId_idx"
  ON "ActivityItem"("activityId");
CREATE INDEX IF NOT EXISTS "ActivityTemplate_categoryId_idx"
  ON "ActivityTemplate"("categoryId");
CREATE INDEX IF NOT EXISTS "MemberActivityItemLink_linkId_idx"
  ON "MemberActivityItemLink"("linkId");
CREATE UNIQUE INDEX IF NOT EXISTS "MemberActivityItemLink_linkId_itemId_key"
  ON "MemberActivityItemLink"("linkId", "itemId");

-- Create categories from the legacy ActivityTemplate.category text column.
INSERT INTO "ActivityCategory" ("id", "name", "active", "order", "createdAt", "updatedAt")
SELECT
  md5(t.category || clock_timestamp()::text || random()::text),
  t.category,
  true,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "category"
  FROM "ActivityTemplate"
  WHERE "category" IS NOT NULL AND "category" <> ''
) t
WHERE NOT EXISTS (
  SELECT 1 FROM "ActivityCategory" ac WHERE ac."name" = t.category
);

UPDATE "ActivityTemplate" at
SET "categoryId" = ac."id"
FROM "ActivityCategory" ac
WHERE at."category" IS NOT NULL
  AND at."category" <> ''
  AND at."categoryId" IS NULL
  AND ac."name" = at."category";
