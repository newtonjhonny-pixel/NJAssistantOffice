-- ============================================================
-- NJ Assistant Office — Provisionamento do Banco de Dados
-- NÃO executar diretamente com psql local.
-- Executar via docker exec conforme instruções abaixo.
--
-- Comando correto:
--   docker exec -i njsistemas-postgres psql -U postgres \
--     < scripts/vps/01-db-setup.sql
--
-- O superusuário postgres dentro do container usa autenticação
-- trust via socket Unix — sem necessidade de expor senha.
-- ============================================================

-- 1. Criar usuário dedicado (sem superusuário)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'njassistantoffice_user') THEN
    CREATE ROLE njassistantoffice_user WITH LOGIN PASSWORD 'SUBSTITUIR_SENHA_FORTE';
    RAISE NOTICE 'Usuário njassistantoffice_user criado com sucesso.';
  ELSE
    RAISE NOTICE 'Usuário njassistantoffice_user já existe — ignorado.';
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
    RAISE NOTICE 'Banco njassistantoffice_prod criado com sucesso.';
  ELSE
    RAISE NOTICE 'Banco njassistantoffice_prod já existe — ignorado.';
  END IF;
END
$$;

-- 3. Garantir privilégios no banco
GRANT CONNECT ON DATABASE njassistantoffice_prod TO njassistantoffice_user;
GRANT CREATE ON DATABASE njassistantoffice_prod TO njassistantoffice_user;

-- 4. Conectar ao banco e conceder privilégios no schema public
\c njassistantoffice_prod

GRANT ALL ON SCHEMA public TO njassistantoffice_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO njassistantoffice_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO njassistantoffice_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO njassistantoffice_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO njassistantoffice_user;

-- ============================================================
-- DATABASE_URL resultante para o .env de produção na VPS:
--
-- Se o app roda no mesmo host Docker que o PostgreSQL:
--   DATABASE_URL="postgresql://njassistantoffice_user:SENHA@njsistemas-postgres:5432/njassistantoffice_prod?schema=public"
--
-- "njsistemas-postgres" é resolvido via rede Docker interna.
-- Substitua SENHA pela senha definida na linha 19.
-- ============================================================
