-- Safe compatibility migration.
-- Older local drafts created activity dates as text. In PostgreSQL, convert only
-- when a column is still text; otherwise this migration is a no-op.

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
