DO $$
BEGIN
  IF to_regclass('public."TeamMember"') IS NULL THEN
    RAISE EXCEPTION 'Required table TeamMember does not exist';
  END IF;

  IF to_regclass('public."Presentation"') IS NULL THEN
    RAISE EXCEPTION 'Required table Presentation does not exist';
  END IF;

  IF to_regclass('public."Process"') IS NULL THEN
    RAISE EXCEPTION 'Required table Process does not exist';
  END IF;

  RAISE NOTICE 'Predeploy validation passed for unified training module.';
END $$;
