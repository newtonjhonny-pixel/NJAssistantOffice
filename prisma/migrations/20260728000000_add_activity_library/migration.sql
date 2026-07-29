-- Additive migration: activity library and member links
-- Existing data is not changed or removed.

CREATE TABLE IF NOT EXISTS "ActivityTemplate" (
  "id"           TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "category"     TEXT,
  "department"   TEXT,
  "active"       BOOLEAN NOT NULL DEFAULT true,
  "order"        INTEGER NOT NULL DEFAULT 0,
  "observations" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ActivityTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MemberActivityLink" (
  "id"                 TEXT NOT NULL,
  "memberId"           TEXT NOT NULL,
  "activityTemplateId" TEXT NOT NULL,
  "observation"        TEXT,
  "includedAt"         TEXT NOT NULL,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MemberActivityLink_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: a member cannot have the same activity twice
CREATE UNIQUE INDEX IF NOT EXISTS "MemberActivityLink_memberId_activityTemplateId_key"
  ON "MemberActivityLink"("memberId", "activityTemplateId");

-- Indexes
CREATE INDEX IF NOT EXISTS "ActivityTemplate_active_idx"   ON "ActivityTemplate"("active");
CREATE INDEX IF NOT EXISTS "MemberActivityLink_memberId_idx" ON "MemberActivityLink"("memberId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MemberActivityLink_memberId_fkey'
  ) THEN
    ALTER TABLE "MemberActivityLink"
      ADD CONSTRAINT "MemberActivityLink_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MemberActivityLink_activityTemplateId_fkey'
  ) THEN
    ALTER TABLE "MemberActivityLink"
      ADD CONSTRAINT "MemberActivityLink_activityTemplateId_fkey"
      FOREIGN KEY ("activityTemplateId") REFERENCES "ActivityTemplate"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
