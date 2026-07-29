-- Safe additive migration: align activity tables with Prisma/PostgreSQL types.
-- Preserves all rows, IDs, relations and existing business data.
-- No table recreation is performed.

-- ActivityCategory.active: integer/text -> boolean, only if needed.
DO $$
DECLARE
  column_type text;
BEGIN
  SELECT data_type
    INTO column_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'ActivityCategory'
    AND column_name = 'active';

  IF column_type IS NOT NULL AND column_type <> 'boolean' THEN
    IF EXISTS (
      SELECT 1
      FROM "ActivityCategory"
      WHERE lower(coalesce("active"::text, '')) NOT IN ('', '1', 'true', 't', 'yes', 'y', '0', 'false', 'f', 'no', 'n')
    ) THEN
      RAISE EXCEPTION 'ActivityCategory.active has incompatible values; migration stopped without data loss.';
    END IF;

    EXECUTE '
      ALTER TABLE "ActivityCategory"
      ALTER COLUMN "active" TYPE BOOLEAN
      USING (
        CASE lower(coalesce("active"::text, ''''))
          WHEN ''1'' THEN true
          WHEN ''true'' THEN true
          WHEN ''t'' THEN true
          WHEN ''yes'' THEN true
          WHEN ''y'' THEN true
          WHEN ''0'' THEN false
          WHEN ''false'' THEN false
          WHEN ''f'' THEN false
          WHEN ''no'' THEN false
          WHEN ''n'' THEN false
          ELSE false
        END
      )
    ';
  END IF;
END $$;

-- ActivityItem.required and ActivityItem.active: integer/text -> boolean, only if needed.
DO $$
DECLARE
  column_type text;
BEGIN
  SELECT data_type
    INTO column_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'ActivityItem'
    AND column_name = 'required';

  IF column_type IS NOT NULL AND column_type <> 'boolean' THEN
    IF EXISTS (
      SELECT 1
      FROM "ActivityItem"
      WHERE lower(coalesce("required"::text, '')) NOT IN ('', '1', 'true', 't', 'yes', 'y', '0', 'false', 'f', 'no', 'n')
    ) THEN
      RAISE EXCEPTION 'ActivityItem.required has incompatible values; migration stopped without data loss.';
    END IF;

    EXECUTE '
      ALTER TABLE "ActivityItem"
      ALTER COLUMN "required" TYPE BOOLEAN
      USING (
        CASE lower(coalesce("required"::text, ''''))
          WHEN ''1'' THEN true
          WHEN ''true'' THEN true
          WHEN ''t'' THEN true
          WHEN ''yes'' THEN true
          WHEN ''y'' THEN true
          WHEN ''0'' THEN false
          WHEN ''false'' THEN false
          WHEN ''f'' THEN false
          WHEN ''no'' THEN false
          WHEN ''n'' THEN false
          ELSE true
        END
      )
    ';
  END IF;

  SELECT data_type
    INTO column_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'ActivityItem'
    AND column_name = 'active';

  IF column_type IS NOT NULL AND column_type <> 'boolean' THEN
    IF EXISTS (
      SELECT 1
      FROM "ActivityItem"
      WHERE lower(coalesce("active"::text, '')) NOT IN ('', '1', 'true', 't', 'yes', 'y', '0', 'false', 'f', 'no', 'n')
    ) THEN
      RAISE EXCEPTION 'ActivityItem.active has incompatible values; migration stopped without data loss.';
    END IF;

    EXECUTE '
      ALTER TABLE "ActivityItem"
      ALTER COLUMN "active" TYPE BOOLEAN
      USING (
        CASE lower(coalesce("active"::text, ''''))
          WHEN ''1'' THEN true
          WHEN ''true'' THEN true
          WHEN ''t'' THEN true
          WHEN ''yes'' THEN true
          WHEN ''y'' THEN true
          WHEN ''0'' THEN false
          WHEN ''false'' THEN false
          WHEN ''f'' THEN false
          WHEN ''no'' THEN false
          WHEN ''n'' THEN false
          ELSE true
        END
      )
    ';
  END IF;
END $$;

-- Convert date columns to timestamp(3) when they were created as text.
-- Numeric epoch milliseconds and ISO/date-like strings are supported.
DO $$
DECLARE
  v_table_name text;
  v_column_name text;
  v_column_type text;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY['ActivityCategory', 'ActivityItem', 'MemberActivityItemLink']
  LOOP
    FOREACH v_column_name IN ARRAY ARRAY['createdAt', 'updatedAt']
    LOOP
      SELECT data_type
        INTO v_column_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_table_name
        AND column_name = v_column_name;

      IF v_column_type IS NOT NULL AND v_column_type NOT IN ('timestamp without time zone', 'timestamp with time zone') THEN
        EXECUTE format(
          'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMP(3) USING (
             CASE
               WHEN %I IS NULL THEN CURRENT_TIMESTAMP
               WHEN %I::text ~ ''^[0-9]+$'' THEN to_timestamp((%I::numeric / 1000.0))::timestamp(3)
               ELSE replace(replace(%I::text, ''T'', '' ''), ''Z'', '''')::timestamp(3)
             END
           )',
          v_table_name,
          v_column_name,
          v_column_name,
          v_column_name,
          v_column_name,
          v_column_name
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Defaults expected by Prisma.
ALTER TABLE "ActivityCategory"
  ALTER COLUMN "active" SET DEFAULT true,
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ActivityItem"
  ALTER COLUMN "required" SET DEFAULT true,
  ALTER COLUMN "active" SET DEFAULT true,
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "MemberActivityItemLink"
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Validate mandatory columns before enforcing NOT NULL.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ActivityCategory"
    WHERE "id" IS NULL OR "name" IS NULL OR "active" IS NULL OR "order" IS NULL OR "createdAt" IS NULL OR "updatedAt" IS NULL
  ) THEN
    RAISE EXCEPTION 'ActivityCategory has null values in required columns; migration stopped without data loss.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "ActivityItem"
    WHERE "id" IS NULL OR "activityId" IS NULL OR "title" IS NULL OR "order" IS NULL
       OR "required" IS NULL OR "active" IS NULL OR "createdAt" IS NULL OR "updatedAt" IS NULL
  ) THEN
    RAISE EXCEPTION 'ActivityItem has null values in required columns; migration stopped without data loss.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "MemberActivityItemLink"
    WHERE "id" IS NULL OR "linkId" IS NULL OR "itemId" IS NULL OR "includedAt" IS NULL
       OR "createdAt" IS NULL OR "updatedAt" IS NULL
  ) THEN
    RAISE EXCEPTION 'MemberActivityItemLink has null values in required columns; migration stopped without data loss.';
  END IF;
END $$;

ALTER TABLE "ActivityCategory"
  ALTER COLUMN "id" SET NOT NULL,
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "active" SET NOT NULL,
  ALTER COLUMN "order" SET NOT NULL,
  ALTER COLUMN "createdAt" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "ActivityItem"
  ALTER COLUMN "id" SET NOT NULL,
  ALTER COLUMN "activityId" SET NOT NULL,
  ALTER COLUMN "title" SET NOT NULL,
  ALTER COLUMN "order" SET NOT NULL,
  ALTER COLUMN "required" SET NOT NULL,
  ALTER COLUMN "active" SET NOT NULL,
  ALTER COLUMN "createdAt" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "MemberActivityItemLink"
  ALTER COLUMN "id" SET NOT NULL,
  ALTER COLUMN "linkId" SET NOT NULL,
  ALTER COLUMN "itemId" SET NOT NULL,
  ALTER COLUMN "includedAt" SET NOT NULL,
  ALTER COLUMN "createdAt" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

-- Validate relations before adding or relying on foreign keys.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ActivityItem" ai
    LEFT JOIN "ActivityTemplate" at ON at."id" = ai."activityId"
    WHERE at."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'ActivityItem has orphan activityId values; migration stopped without data loss.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "MemberActivityItemLink" mail
    LEFT JOIN "MemberActivityLink" mal ON mal."id" = mail."linkId"
    WHERE mal."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'MemberActivityItemLink has orphan linkId values; migration stopped without data loss.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "MemberActivityItemLink" mail
    LEFT JOIN "ActivityItem" ai ON ai."id" = mail."itemId"
    WHERE ai."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'MemberActivityItemLink has orphan itemId values; migration stopped without data loss.';
  END IF;

  IF EXISTS (
    SELECT "linkId", "itemId"
    FROM "MemberActivityItemLink"
    GROUP BY "linkId", "itemId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'MemberActivityItemLink has duplicate linkId/itemId pairs; migration stopped without data loss.';
  END IF;
END $$;

-- Add constraints only when they are missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ActivityItem_activityId_fkey'
  ) THEN
    ALTER TABLE "ActivityItem"
      ADD CONSTRAINT "ActivityItem_activityId_fkey"
      FOREIGN KEY ("activityId") REFERENCES "ActivityTemplate"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MemberActivityItemLink_linkId_fkey'
  ) THEN
    ALTER TABLE "MemberActivityItemLink"
      ADD CONSTRAINT "MemberActivityItemLink_linkId_fkey"
      FOREIGN KEY ("linkId") REFERENCES "MemberActivityLink"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MemberActivityItemLink_itemId_fkey'
  ) THEN
    ALTER TABLE "MemberActivityItemLink"
      ADD CONSTRAINT "MemberActivityItemLink_itemId_fkey"
      FOREIGN KEY ("itemId") REFERENCES "ActivityItem"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Recreate expected indexes without removing existing data.
CREATE INDEX IF NOT EXISTS "ActivityCategory_active_idx" ON "ActivityCategory"("active");
CREATE INDEX IF NOT EXISTS "ActivityItem_activityId_idx" ON "ActivityItem"("activityId");
CREATE INDEX IF NOT EXISTS "MemberActivityItemLink_linkId_idx" ON "MemberActivityItemLink"("linkId");
CREATE UNIQUE INDEX IF NOT EXISTS "MemberActivityItemLink_linkId_itemId_key"
  ON "MemberActivityItemLink"("linkId","itemId");
