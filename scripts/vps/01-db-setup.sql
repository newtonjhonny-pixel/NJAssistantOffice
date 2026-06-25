-- ============================================================
-- NJ Assistant Office — Provisionamento do Banco de Dados
-- Executar como superusuário PostgreSQL (postgres)
-- VPS: Hostinger Ubuntu 24.04 / PostgreSQL 16
-- ============================================================

-- 1. Criar usuário dedicado (sem superusuário)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'njassistantoffice_user') THEN
    CREATE ROLE njassistantoffice_user WITH LOGIN PASSWORD 'SUBSTITUIR_SENHA_FORTE';
  END IF;
END
$$;

-- 2. Criar banco de dados dedicado
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'njassistantoffice_prod') THEN
    CREATE DATABASE njassistantoffice_prod
      WITH OWNER = njassistantoffice_user
      ENCODING = 'UTF8'
      LC_COLLATE = 'en_US.UTF-8'
      LC_CTYPE = 'en_US.UTF-8'
      TEMPLATE = template0;
  END IF;
END
$$;

-- 3. Garantir privilégios no banco
GRANT CONNECT ON DATABASE njassistantoffice_prod TO njassistantoffice_user;
GRANT CREATE ON DATABASE njassistantoffice_prod TO njassistantoffice_user;

-- 4. Privilégios no schema public (necessário para Prisma migrate)
\c njassistantoffice_prod
GRANT ALL ON SCHEMA public TO njassistantoffice_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO njassistantoffice_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO njassistantoffice_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO njassistantoffice_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO njassistantoffice_user;

-- ============================================================
-- DATABASE_URL resultante para o .env de produção:
--
-- DATABASE_URL="postgresql://njassistantoffice_user:SENHA@localhost:5432/njassistantoffice_prod?schema=public"
--
-- Substitua SENHA pela senha definida acima.
-- ============================================================
