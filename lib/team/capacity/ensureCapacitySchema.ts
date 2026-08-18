/**
 * ensureCapacitySchema — Schema não-destrutivo para Mensuração de Carga do DP
 *
 * REGRAS:
 * - Nunca usar prisma db push / migrate reset
 * - Nunca apagar dados existentes
 * - Usar apenas CREATE TABLE IF NOT EXISTS e ALTER TABLE ADD COLUMN (ignorar erro se já existe)
 * - Semear dados padrão somente se as tabelas estiverem vazias
 */

import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import {
  DEFAULT_INTERVENTION_CONFIGS,
  DP_PROCESS_CATALOG,
  DP_ACTIVITY_CATALOG,
} from './CapacityEngine'

// ─── DDL ─────────────────────────────────────────────────────────────────────

const DDL_STATEMENTS = [
  // Catálogo de processos DP (extensível — não hardcodado)
  `CREATE TABLE IF NOT EXISTS "DpProcessCatalog" (
    "id"          TEXT PRIMARY KEY,
    "code"        TEXT NOT NULL UNIQUE,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "category"    TEXT DEFAULT 'DP',
    "order"       INTEGER DEFAULT 0,
    "active"      INTEGER DEFAULT 1,
    "createdAt"   TEXT NOT NULL
  )`,
  // Catálogo de atividades por processo (extensível)
  `CREATE TABLE IF NOT EXISTS "DpActivityCatalog" (
    "id"               TEXT PRIMARY KEY,
    "processCode"      TEXT NOT NULL,
    "name"             TEXT NOT NULL,
    "description"      TEXT,
    "suggestedLevel"   TEXT DEFAULT 'ASSISTENTE',
    "defaultExecution" TEXT DEFAULT 'MANUAL',
    "defaultTimeMin"   REAL DEFAULT 30,
    "order"            INTEGER DEFAULT 0,
    "active"           INTEGER DEFAULT 1
  )`,
  // Instâncias de atividades cadastradas por vínculo membro-empresa
  `CREATE TABLE IF NOT EXISTS "DpActivityInstance" (
    "id"             TEXT PRIMARY KEY,
    "linkId"         TEXT NOT NULL,
    "processCode"    TEXT NOT NULL,
    "catalogId"      TEXT,
    "activityName"   TEXT NOT NULL,
    "executionType"  TEXT NOT NULL DEFAULT 'MANUAL',
    "volume"         REAL DEFAULT 1,
    "avgTimeMinutes" REAL DEFAULT 0,
    "requiredLevel"  TEXT DEFAULT 'ASSISTENTE',
    "observations"   TEXT,
    "active"         INTEGER DEFAULT 1,
    "createdAt"      TEXT NOT NULL,
    "updatedAt"      TEXT NOT NULL
  )`,
  // Índice para lookup por vínculo
  `CREATE INDEX IF NOT EXISTS "idx_dp_activity_link" ON "DpActivityInstance" ("linkId")`,
  `CREATE INDEX IF NOT EXISTS "idx_dp_activity_process" ON "DpActivityInstance" ("linkId", "processCode")`,
  // Configuração de intervenção humana por tipo de execução (parametrizável)
  `CREATE TABLE IF NOT EXISTS "InterventionConfig" (
    "id"              TEXT PRIMARY KEY,
    "executionType"   TEXT NOT NULL UNIQUE,
    "interventionPct" REAL NOT NULL,
    "label"           TEXT NOT NULL,
    "description"     TEXT,
    "updatedAt"       TEXT NOT NULL
  )`,
  // Estender CapacityConfig com campos de jornada e novas faixas
  `ALTER TABLE "CapacityConfig" ADD COLUMN "monthlyHours"       REAL DEFAULT 220`,
  `ALTER TABLE "CapacityConfig" ADD COLUMN "operationalReserve" REAL DEFAULT 20`,
  `ALTER TABLE "CapacityConfig" ADD COLUMN "bandLow"            REAL DEFAULT 60`,
  `ALTER TABLE "CapacityConfig" ADD COLUMN "bandAvailable"      REAL DEFAULT 75`,
  `ALTER TABLE "CapacityConfig" ADD COLUMN "bandAdequate"       REAL DEFAULT 85`,
  `ALTER TABLE "CapacityConfig" ADD COLUMN "bandHigh"           REAL DEFAULT 95`,
  `ALTER TABLE "CapacityConfig" ADD COLUMN "bandLimit"          REAL DEFAULT 100`,
]

// ─── Função principal ─────────────────────────────────────────────────────────

let _schemaDone = false

export async function ensureCapacitySchema(): Promise<void> {
  if (_schemaDone) return

  // Executar DDL (ignora erros de "já existe")
  for (const sql of DDL_STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch {
      // coluna / tabela / índice já existem — ignorar
    }
  }

  // Semear dados padrão se vazios
  await seedInterventionConfig()
  await seedProcessCatalog()
  await seedActivityCatalog()

  _schemaDone = true
}

// ─── Seeds ────────────────────────────────────────────────────────────────────

async function seedInterventionConfig() {
  try {
    const count = await prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT COUNT(*) as n FROM "InterventionConfig"`
    )
    if (Number(count[0]?.n ?? 0) > 0) return

    const now = new Date().toISOString()
    for (const cfg of Object.values(DEFAULT_INTERVENTION_CONFIGS)) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "InterventionConfig"
         ("id","executionType","interventionPct","label","description","updatedAt")
         VALUES (?,?,?,?,?,?)
         ON CONFLICT ("executionType") DO NOTHING`,
        randomUUID(), cfg.executionType, cfg.interventionPct, cfg.label, cfg.description ?? null, now
      )
    }
  } catch { /* ignora */ }
}

async function seedProcessCatalog() {
  try {
    const count = await prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT COUNT(*) as n FROM "DpProcessCatalog"`
    )
    if (Number(count[0]?.n ?? 0) > 0) return

    const now = new Date().toISOString()
    for (const p of DP_PROCESS_CATALOG) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "DpProcessCatalog"
         ("id","code","name","description","category","order","active","createdAt")
         VALUES (?,?,?,?,?,?,?,?)
         ON CONFLICT ("code") DO NOTHING`,
        randomUUID(), p.code, p.name, p.description ?? null, 'DP', p.order, 1, now
      )
    }
  } catch { /* ignora */ }
}

async function seedActivityCatalog() {
  try {
    const count = await prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT COUNT(*) as n FROM "DpActivityCatalog"`
    )
    if (Number(count[0]?.n ?? 0) > 0) return

    for (const a of DP_ACTIVITY_CATALOG) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "DpActivityCatalog"
         ("id","processCode","name","description","suggestedLevel","defaultExecution","defaultTimeMin","order","active")
         VALUES (?,?,?,?,?,?,?,?,?)
         ON CONFLICT ("id") DO NOTHING`,
        randomUUID(), a.processCode, a.name, a.description ?? null,
        a.suggestedLevel, a.defaultExecution, a.defaultTimeMin, a.order, 1
      )
    }
  } catch { /* ignora */ }
}
