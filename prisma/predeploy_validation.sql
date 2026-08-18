-- ============================================================================
-- PREDEPLOY VALIDATION — NJAssistantOffice
--
-- SOMENTE LEITURA. Nao altera nada. Rode ANTES de `prisma migrate deploy`.
--
--   psql "$DATABASE_URL" -f prisma/predeploy_validation.sql
--
-- Objetivo: detectar divergencia entre o que a migration vai criar e o que
-- ja existe no banco (possivelmente criado em runtime pelas funcoes
-- ensureSchema em deploys anteriores).
--
-- REGRA DE PARADA: se a secao 2 apontar type_mismatch, ou a 5 apontar
-- orfaos/duplicidades, NAO aplicar a migration. Reconciliar antes.
-- ============================================================================

\echo '=== 1. TABELAS ALVO: existem? tem dados? ==================================='
SELECT
  t.tabela,
  CASE WHEN c.oid IS NULL THEN 'AUSENTE (sera criada)' ELSE 'JA EXISTE' END AS situacao,
  COALESCE(s.n_live_tup, 0)                                                AS linhas_aprox
FROM (VALUES
  ('CompanyOperationalSnapshot'), ('CompanySystem'), ('CompanyProcessConfig'),
  ('WorkCalendarEntry'), ('EmployeeSchedule'), ('EmployeeScheduleDay'),
  ('DailyTimeRecord'), ('MonthlyTimeCompetence'), ('MemberCalendarException'),
  ('ProcessFlowchart'), ('HolidayCalendarGeneration'), ('CompanyHolidayOverride'),
  ('PontoLote'), ('PontoImportBatch')
) AS t(tabela)
LEFT JOIN pg_class c
       ON c.relname = t.tabela AND c.relnamespace = 'public'::regnamespace
LEFT JOIN pg_stat_user_tables s ON s.relname = t.tabela
ORDER BY situacao DESC, t.tabela;

\echo ''
\echo '=== 2. DIVERGENCIA DE TIPO (flags 0/1 precisam ser integer) ==============='
-- Se alguma destas colunas ja existir como boolean, o SQL raw (`= 1`) vai
-- falhar com: operator does not exist: boolean = integer
SELECT
  table_name, column_name, data_type,
  CASE WHEN data_type = 'integer' THEN 'OK'
       ELSE '*** TYPE_MISMATCH — PARAR E RECONCILIAR ***' END AS veredito
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (
    ('WorkCalendarEntry','isWorked'), ('WorkCalendarEntry','active'),
    ('EmployeeSchedule','active'),    ('EmployeeScheduleDay','isWorked'),
    ('DailyTimeRecord','hasAttachment'),
    ('MemberCalendarException','overrideWorked'),
    ('CompanySystem','isActive'),     ('CompanyProcessConfig','isCritical'),
    ('CompanyOperationalSnapshot','isInitialCompetence')
  )
ORDER BY veredito DESC, table_name, column_name;

\echo ''
\echo '=== 2b. ClientCompany.active DEVE seguir boolean (Prisma-managed) ========='
SELECT column_name, data_type,
       CASE WHEN data_type = 'boolean' THEN 'OK (query usa = true)'
            ELSE '*** DIVERGENTE ***' END AS veredito
FROM information_schema.columns
WHERE table_schema='public' AND table_name='ClientCompany' AND column_name='active';

\echo ''
\echo '=== 3. COLUNAS NOVAS via ALTER TABLE ======================================'
SELECT t.tabela, t.coluna,
       CASE WHEN c.column_name IS NULL THEN 'AUSENTE (sera adicionada)' ELSE 'JA EXISTE' END AS situacao
FROM (VALUES
  ('ClientCompany','ibgeCode'),
  ('WorkCalendarEntry','ibgeCode'), ('WorkCalendarEntry','country'), ('WorkCalendarEntry','origin'),
  ('DailyTimeRecord','sourceType'), ('DailyTimeRecord','importBatchId')
) AS t(tabela, coluna)
LEFT JOIN information_schema.columns c
       ON c.table_schema='public' AND c.table_name=t.tabela AND c.column_name=t.coluna
ORDER BY t.tabela, t.coluna;

\echo ''
\echo '=== 4. DEPENDENCIAS DE FK (tabelas referenciadas devem existir) ==========='
SELECT t.tabela,
       CASE WHEN c.oid IS NULL THEN '*** AUSENTE — FK VAI FALHAR ***' ELSE 'OK' END AS situacao
FROM (VALUES ('TeamMember'), ('ClientCompany'), ('Process')) AS t(tabela)
LEFT JOIN pg_class c ON c.relname=t.tabela AND c.relnamespace='public'::regnamespace;

\echo ''
\echo '=== 5. ORFAOS E DUPLICIDADES (so roda se as tabelas ja existirem) ========='
DO $$
DECLARE v_orfaos BIGINT; v_dups BIGINT; v_total BIGINT := 0;
BEGIN
  IF to_regclass('public."EmployeeSchedule"') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM "EmployeeSchedule" es
             WHERE NOT EXISTS (SELECT 1 FROM "TeamMember" m WHERE m.id = es."memberId")'
      INTO v_orfaos;
    RAISE NOTICE 'EmployeeSchedule orfaos (memberId inexistente): %', v_orfaos;
    v_total := v_total + v_orfaos;
  END IF;

  IF to_regclass('public."EmployeeScheduleDay"') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM "EmployeeScheduleDay" esd
             WHERE NOT EXISTS (SELECT 1 FROM "EmployeeSchedule" es WHERE es.id = esd."scheduleId")'
      INTO v_orfaos;
    RAISE NOTICE 'EmployeeScheduleDay orfaos (scheduleId inexistente): %', v_orfaos;
    v_total := v_total + v_orfaos;

    EXECUTE 'SELECT COALESCE(sum(c-1),0) FROM (
               SELECT count(*) c FROM "EmployeeScheduleDay"
               GROUP BY "scheduleId","dayOfWeek" HAVING count(*)>1) x'
      INTO v_dups;
    RAISE NOTICE 'EmployeeScheduleDay duplicidades (scheduleId,dayOfWeek): %', v_dups;
    v_total := v_total + v_dups;
  END IF;

  IF to_regclass('public."DailyTimeRecord"') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM "DailyTimeRecord" d
             WHERE NOT EXISTS (SELECT 1 FROM "TeamMember" m WHERE m.id = d."memberId")'
      INTO v_orfaos;
    RAISE NOTICE 'DailyTimeRecord orfaos (memberId inexistente): %', v_orfaos;
    v_total := v_total + v_orfaos;

    EXECUTE 'SELECT COALESCE(sum(c-1),0) FROM (
               SELECT count(*) c FROM "DailyTimeRecord"
               GROUP BY "memberId","date" HAVING count(*)>1) x'
      INTO v_dups;
    RAISE NOTICE 'DailyTimeRecord duplicidades (memberId,date): %', v_dups;
    v_total := v_total + v_dups;
  END IF;

  IF to_regclass('public."MonthlyTimeCompetence"') IS NOT NULL THEN
    EXECUTE 'SELECT COALESCE(sum(c-1),0) FROM (
               SELECT count(*) c FROM "MonthlyTimeCompetence"
               GROUP BY "memberId","competence" HAVING count(*)>1) x'
      INTO v_dups;
    RAISE NOTICE 'MonthlyTimeCompetence duplicidades (memberId,competence): %', v_dups;
    v_total := v_total + v_dups;
  END IF;

  IF to_regclass('public."CompanyOperationalSnapshot"') IS NOT NULL THEN
    EXECUTE 'SELECT COALESCE(sum(c-1),0) FROM (
               SELECT count(*) c FROM "CompanyOperationalSnapshot"
               GROUP BY "companyId","competence" HAVING count(*)>1) x'
      INTO v_dups;
    RAISE NOTICE 'CompanyOperationalSnapshot duplicidades (companyId,competence): %', v_dups;
    v_total := v_total + v_dups;
  END IF;

  RAISE NOTICE '---';
  IF v_total = 0 THEN
    RAISE NOTICE 'RESULTADO: nenhum orfao/duplicidade. Seguro aplicar a migration.';
  ELSE
    RAISE WARNING 'RESULTADO: % problema(s). NAO aplicar a migration — reconciliar antes.', v_total;
  END IF;
END $$;

\echo ''
\echo '=== 6. MIGRATIONS JA APLICADAS ==========================================='
SELECT migration_name, finished_at,
       CASE WHEN finished_at IS NULL THEN '*** INCOMPLETA ***' ELSE 'OK' END AS situacao
FROM "_prisma_migrations"
ORDER BY started_at DESC
LIMIT 10;

\echo ''
\echo '=== FIM. Revise as secoes 2, 2b e 5 antes de prosseguir. ================='
