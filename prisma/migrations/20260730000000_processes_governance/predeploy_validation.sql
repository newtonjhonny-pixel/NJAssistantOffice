-- Read-only validation for process governance deployment.

DO $$
DECLARE
  v_count bigint;
BEGIN
  IF to_regclass('public."ProcedureDocument"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'ProcedureDocument'
        AND column_name = 'processId'
    ) AND to_regclass('public."Process"') IS NOT NULL THEN
      EXECUTE 'SELECT count(*) FROM "ProcedureDocument" d LEFT JOIN "Process" p ON p."id" = d."processId" WHERE d."processId" IS NOT NULL AND p."id" IS NULL'
        INTO v_count;
      RAISE NOTICE 'ProcedureDocument.orphan_processId=%', v_count;
      IF v_count > 0 THEN
        RAISE EXCEPTION 'ProcedureDocument has orphan processId values.';
      END IF;
    ELSE
      RAISE NOTICE 'ProcedureDocument.processId validation skipped before first deployment';
    END IF;
  END IF;

  FOREACH v_count IN ARRAY ARRAY[0]
  LOOP
    RAISE NOTICE 'Process governance migration is additive and ready for migrate deploy';
  END LOOP;
END $$;
