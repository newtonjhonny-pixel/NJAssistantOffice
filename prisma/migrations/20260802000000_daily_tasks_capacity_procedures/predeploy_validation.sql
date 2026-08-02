DO $$
DECLARE
  v_orphans integer;
BEGIN
  IF to_regclass('public."TeamMember"') IS NULL THEN
    RAISE EXCEPTION 'TeamMember table not found.';
  END IF;

  IF to_regclass('public."ProcedureDocument"') IS NULL THEN
    RAISE EXCEPTION 'ProcedureDocument table not found.';
  END IF;

  IF to_regclass('public."MemberCompanyLink"') IS NOT NULL THEN
    SELECT count(*) INTO v_orphans
    FROM "MemberCompanyLink" l
    LEFT JOIN "TeamMember" m ON m."id" = l."memberId"
    WHERE m."id" IS NULL;
    IF v_orphans > 0 THEN
      RAISE EXCEPTION 'MemberCompanyLink has orphan member rows: %', v_orphans;
    END IF;
  END IF;

  RAISE NOTICE 'Predeploy validation passed for daily tasks, capacity and procedure governance migration.';
END $$;
