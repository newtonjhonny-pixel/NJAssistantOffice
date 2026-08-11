-- ─────────────────────────────────────────────────────────────────────────────
-- Módulo Unificado de Treinamentos e Ambientação Operacional
-- Additive migration – safe DDL only (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Training (Treinamento Completo | Ambientação) ───────────────────────────

CREATE TABLE IF NOT EXISTS "Training" (
  "id"             TEXT NOT NULL,
  "tipo"           TEXT NOT NULL DEFAULT 'TREINAMENTO',  -- TREINAMENTO | AMBIENTACAO
  "modalidade"     TEXT NOT NULL DEFAULT 'COMPLETO',     -- COMPLETO | SIMPLIFICADO
  "titulo"         TEXT NOT NULL,
  "subtitulo"      TEXT,
  "objetivo"       TEXT,
  "processId"      TEXT,
  "presentationId" TEXT,
  "departamento"   TEXT,
  "publicoAlvo"    TEXT,
  "responsavel"    TEXT,
  "tags"           TEXT,
  "duracaoMin"     INTEGER,
  "status"         TEXT NOT NULL DEFAULT 'RASCUNHO',     -- RASCUNHO | ATIVO | ARQUIVADO
  "obrigatorio"    BOOLEAN NOT NULL DEFAULT false,
  "config"         TEXT,   -- JSON: avaliacao, prontidão
  "conteudo"       TEXT,   -- JSON: estrutura livre
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Training_tipo_idx"      ON "Training"("tipo");
CREATE INDEX IF NOT EXISTS "Training_status_idx"    ON "Training"("status");
CREATE INDEX IF NOT EXISTS "Training_processId_idx" ON "Training"("processId");

-- ─── TrainingModule ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "TrainingModule" (
  "id"         TEXT NOT NULL,
  "trainingId" TEXT NOT NULL,
  "ordem"      INTEGER NOT NULL DEFAULT 0,
  "titulo"     TEXT NOT NULL,
  "descricao"  TEXT,
  "conteudo"   TEXT,   -- JSON
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingModule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainingModule_trainingId_fkey" FOREIGN KEY ("trainingId")
    REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TrainingModule_trainingId_ordem_idx" ON "TrainingModule"("trainingId", "ordem");

-- ─── TrainingLesson ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "TrainingLesson" (
  "id"        TEXT NOT NULL,
  "moduleId"  TEXT NOT NULL,
  "ordem"     INTEGER NOT NULL DEFAULT 0,
  "titulo"    TEXT NOT NULL,
  "tipo"      TEXT NOT NULL DEFAULT 'TEXTO',  -- TEXTO | VIDEO | PRINT | CHECKLIST | EXERCICIO | PRATICA
  "conteudo"  TEXT,
  "duracao"   INTEGER,  -- minutos
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingLesson_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainingLesson_moduleId_fkey" FOREIGN KEY ("moduleId")
    REFERENCES "TrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TrainingLesson_moduleId_ordem_idx" ON "TrainingLesson"("moduleId", "ordem");

-- ─── TrainingMaterial ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "TrainingMaterial" (
  "id"         TEXT NOT NULL,
  "trainingId" TEXT NOT NULL,
  "titulo"     TEXT NOT NULL,
  "tipo"       TEXT NOT NULL DEFAULT 'LINK',  -- LINK | PDF | IMAGEM | VIDEO | ARQUIVO
  "url"        TEXT,
  "descricao"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingMaterial_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainingMaterial_trainingId_fkey" FOREIGN KEY ("trainingId")
    REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TrainingMaterial_trainingId_idx" ON "TrainingMaterial"("trainingId");

-- ─── TrainingParticipant ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "TrainingParticipant" (
  "id"                TEXT NOT NULL,
  "trainingId"        TEXT NOT NULL,
  "memberId"          TEXT NOT NULL,
  "status"            TEXT NOT NULL DEFAULT 'PENDENTE',  -- PENDENTE | EM_ANDAMENTO | CONCLUIDO | CANCELADO
  "progresso"         INTEGER NOT NULL DEFAULT 0,        -- 0-100
  "nota"              REAL,
  "dataInicio"        TIMESTAMP(3),
  "dataConclusao"     TIMESTAMP(3),
  "instrutorNome"     TEXT,
  "duracaoReal"       INTEGER,   -- minutos reais
  "cienciaConfirmada" BOOLEAN NOT NULL DEFAULT false,
  "dataCiencia"       TIMESTAMP(3),
  "observacoes"       TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingParticipant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainingParticipant_trainingId_memberId_key" UNIQUE ("trainingId", "memberId"),
  CONSTRAINT "TrainingParticipant_trainingId_fkey" FOREIGN KEY ("trainingId")
    REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TrainingParticipant_memberId_fkey" FOREIGN KEY ("memberId")
    REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TrainingParticipant_memberId_idx"   ON "TrainingParticipant"("memberId");
CREATE INDEX IF NOT EXISTS "TrainingParticipant_trainingId_idx" ON "TrainingParticipant"("trainingId");

-- ─── TrainingHistory ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "TrainingHistory" (
  "id"         TEXT NOT NULL,
  "trainingId" TEXT NOT NULL,
  "acao"       TEXT NOT NULL,  -- CRIACAO | EDICAO | PUBLICACAO | PARTICIPANTE_ADICIONADO | CONCLUIDO | ARQUIVADO
  "descricao"  TEXT,
  "memberId"   TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainingHistory_trainingId_fkey" FOREIGN KEY ("trainingId")
    REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TrainingHistory_trainingId_idx" ON "TrainingHistory"("trainingId");

-- ─── TrainingTrail (Trilhas) ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "TrainingTrail" (
  "id"          TEXT NOT NULL,
  "titulo"      TEXT NOT NULL,
  "descricao"   TEXT,
  "cargo"       TEXT,
  "status"      TEXT NOT NULL DEFAULT 'ATIVA',  -- ATIVA | ARQUIVADA
  "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingTrail_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TrainingTrail_status_idx" ON "TrainingTrail"("status");

-- ─── TrainingTrailItem ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "TrainingTrailItem" (
  "id"          TEXT NOT NULL,
  "trilhaId"    TEXT NOT NULL,
  "trainingId"  TEXT NOT NULL,
  "ordem"       INTEGER NOT NULL DEFAULT 0,
  "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingTrailItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainingTrailItem_trilhaId_trainingId_key" UNIQUE ("trilhaId", "trainingId"),
  CONSTRAINT "TrainingTrailItem_trilhaId_fkey" FOREIGN KEY ("trilhaId")
    REFERENCES "TrainingTrail"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TrainingTrailItem_trainingId_fkey" FOREIGN KEY ("trainingId")
    REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TrainingTrailItem_trilhaId_ordem_idx" ON "TrainingTrailItem"("trilhaId", "ordem");

-- ─── AmbientacaoSystem (Sistemas para Ambientação) ───────────────────────────

CREATE TABLE IF NOT EXISTS "AmbientacaoSystem" (
  "id"           TEXT NOT NULL,
  "nome"         TEXT NOT NULL,
  "finalidade"   TEXT,
  "responsavel"  TEXT,
  "url"          TEXT,
  "nivelAcesso"  TEXT,
  "observacoes"  TEXT,
  "logoUrl"      TEXT,
  "processosIds" TEXT,  -- JSON array de IDs de Process
  "prints"       TEXT,  -- JSON array de URLs/base64
  "ativo"        BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AmbientacaoSystem_pkey" PRIMARY KEY ("id")
);

-- ─── TrainingReadinessConfig (Prontidão configurável) ────────────────────────

CREATE TABLE IF NOT EXISTS "TrainingReadinessConfig" (
  "id"                    TEXT NOT NULL,
  "cargo"                 TEXT NOT NULL DEFAULT 'global',
  "pesoAmbientacao"       INTEGER NOT NULL DEFAULT 20,
  "pesoTreinamento"       INTEGER NOT NULL DEFAULT 40,
  "pesoPratica"           INTEGER NOT NULL DEFAULT 20,
  "pesoAvaliacao"         INTEGER NOT NULL DEFAULT 20,
  "trainingsObrigatorios" TEXT,  -- JSON array de IDs
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingReadinessConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainingReadinessConfig_cargo_key" UNIQUE ("cargo")
);

-- Seed da config global padrão
INSERT INTO "TrainingReadinessConfig" ("id","cargo","pesoAmbientacao","pesoTreinamento","pesoPratica","pesoAvaliacao","createdAt","updatedAt")
VALUES ('readiness-global','global',20,40,20,20,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("cargo") DO NOTHING;

-- ─── TrainingClass (Turmas) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "TrainingClass" (
  "id"            TEXT NOT NULL,
  "trainingId"    TEXT NOT NULL,
  "titulo"        TEXT NOT NULL,
  "dataInicio"    TIMESTAMP(3),
  "dataFim"       TIMESTAMP(3),
  "local"         TEXT,   -- Online | Presencial | Híbrido
  "instrutorNome" TEXT,
  "vagas"         INTEGER,
  "status"        TEXT NOT NULL DEFAULT 'PLANEJADA',  -- PLANEJADA | EM_ANDAMENTO | CONCLUIDA | CANCELADA
  "observacoes"   TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingClass_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainingClass_trainingId_fkey" FOREIGN KEY ("trainingId")
    REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TrainingClass_trainingId_idx" ON "TrainingClass"("trainingId");
CREATE INDEX IF NOT EXISTS "TrainingClass_status_idx"     ON "TrainingClass"("status");
