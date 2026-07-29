-- Pre-deploy validation for activity hierarchy migration.
-- Read-only. It can run before the new tables exist; missing tables are reported
-- as count 0 and are not considered blockers before first deploy.

DO $$
DECLARE
  v_count bigint;
BEGIN
  IF to_regclass('public."ActivityCategory"') IS NULL THEN
    RAISE NOTICE 'ActivityCategory.count=0 (table not created yet)';
  ELSE
    EXECUTE 'SELECT count(*) FROM "ActivityCategory"' INTO v_count;
    RAISE NOTICE 'ActivityCategory.count=%', v_count;

    EXECUTE 'SELECT count(*) FROM "ActivityCategory" WHERE lower(coalesce("active"::text, '''')) NOT IN ('''', ''0'', ''1'', ''true'', ''false'', ''t'', ''f'', ''yes'', ''no'', ''y'', ''n'')'
      INTO v_count;
    RAISE NOTICE 'ActivityCategory.active.incompatible=%', v_count;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'ActivityCategory.active has incompatible values.';
    END IF;
  END IF;

  IF to_regclass('public."ActivityItem"') IS NULL THEN
    RAISE NOTICE 'ActivityItem.count=0 (table not created yet)';
  ELSE
    EXECUTE 'SELECT count(*) FROM "ActivityItem"' INTO v_count;
    RAISE NOTICE 'ActivityItem.count=%', v_count;

    EXECUTE 'SELECT count(*) FROM "ActivityItem" WHERE lower(coalesce("required"::text, '''')) NOT IN ('''', ''0'', ''1'', ''true'', ''false'', ''t'', ''f'', ''yes'', ''no'', ''y'', ''n'')'
      INTO v_count;
    RAISE NOTICE 'ActivityItem.required.incompatible=%', v_count;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'ActivityItem.required has incompatible values.';
    END IF;

    EXECUTE 'SELECT count(*) FROM "ActivityItem" WHERE lower(coalesce("active"::text, '''')) NOT IN ('''', ''0'', ''1'', ''true'', ''false'', ''t'', ''f'', ''yes'', ''no'', ''y'', ''n'')'
      INTO v_count;
    RAISE NOTICE 'ActivityItem.active.incompatible=%', v_count;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'ActivityItem.active has incompatible values.';
    END IF;

    IF to_regclass('public."ActivityTemplate"') IS NOT NULL THEN
      EXECUTE 'SELECT count(*) FROM "ActivityItem" ai LEFT JOIN "ActivityTemplate" at ON at."id" = ai."activityId" WHERE at."id" IS NULL'
        INTO v_count;
      RAISE NOTICE 'ActivityItem.orphan_activityId=%', v_count;
      IF v_count > 0 THEN
        RAISE EXCEPTION 'ActivityItem has orphan activityId values.';
      END IF;
    END IF;
  END IF;

  IF to_regclass('public."MemberActivityLink"') IS NULL THEN
    RAISE NOTICE 'MemberActivityLink.count=0 (table not created yet)';
  ELSE
    EXECUTE 'SELECT count(*) FROM "MemberActivityLink"' INTO v_count;
    RAISE NOTICE 'MemberActivityLink.count=%', v_count;

    IF to_regclass('public."TeamMember"') IS NOT NULL THEN
      EXECUTE 'SELECT count(*) FROM "MemberActivityLink" mal LEFT JOIN "TeamMember" tm ON tm."id" = mal."memberId" WHERE tm."id" IS NULL'
        INTO v_count;
      RAISE NOTICE 'MemberActivityLink.orphan_memberId=%', v_count;
      IF v_count > 0 THEN
        RAISE EXCEPTION 'MemberActivityLink has orphan memberId values.';
      END IF;
    END IF;

    IF to_regclass('public."ActivityTemplate"') IS NOT NULL THEN
      EXECUTE 'SELECT count(*) FROM "MemberActivityLink" mal LEFT JOIN "ActivityTemplate" at ON at."id" = mal."activityTemplateId" WHERE at."id" IS NULL'
        INTO v_count;
      RAISE NOTICE 'MemberActivityLink.orphan_activityTemplateId=%', v_count;
      IF v_count > 0 THEN
        RAISE EXCEPTION 'MemberActivityLink has orphan activityTemplateId values.';
      END IF;
    END IF;

    EXECUTE 'SELECT count(*) FROM (SELECT "memberId", "activityTemplateId" FROM "MemberActivityLink" GROUP BY "memberId", "activityTemplateId" HAVING count(*) > 1) duplicates'
      INTO v_count;
    RAISE NOTICE 'MemberActivityLink.duplicate_member_template=%', v_count;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'MemberActivityLink has duplicate memberId/activityTemplateId pairs.';
    END IF;
  END IF;

  IF to_regclass('public."MemberActivityItemLink"') IS NULL THEN
    RAISE NOTICE 'MemberActivityItemLink.count=0 (table not created yet)';
  ELSE
    EXECUTE 'SELECT count(*) FROM "MemberActivityItemLink"' INTO v_count;
    RAISE NOTICE 'MemberActivityItemLink.count=%', v_count;

    IF to_regclass('public."MemberActivityLink"') IS NOT NULL THEN
      EXECUTE 'SELECT count(*) FROM "MemberActivityItemLink" mail LEFT JOIN "MemberActivityLink" mal ON mal."id" = mail."linkId" WHERE mal."id" IS NULL'
        INTO v_count;
      RAISE NOTICE 'MemberActivityItemLink.orphan_linkId=%', v_count;
      IF v_count > 0 THEN
        RAISE EXCEPTION 'MemberActivityItemLink has orphan linkId values.';
      END IF;
    END IF;

    IF to_regclass('public."ActivityItem"') IS NOT NULL THEN
      EXECUTE 'SELECT count(*) FROM "MemberActivityItemLink" mail LEFT JOIN "ActivityItem" ai ON ai."id" = mail."itemId" WHERE ai."id" IS NULL'
        INTO v_count;
      RAISE NOTICE 'MemberActivityItemLink.orphan_itemId=%', v_count;
      IF v_count > 0 THEN
        RAISE EXCEPTION 'MemberActivityItemLink has orphan itemId values.';
      END IF;
    END IF;

    EXECUTE 'SELECT count(*) FROM (SELECT "linkId", "itemId" FROM "MemberActivityItemLink" GROUP BY "linkId", "itemId" HAVING count(*) > 1) duplicates'
      INTO v_count;
    RAISE NOTICE 'MemberActivityItemLink.duplicate_link_item=%', v_count;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'MemberActivityItemLink has duplicate linkId/itemId pairs.';
    END IF;
  END IF;
END $$;
