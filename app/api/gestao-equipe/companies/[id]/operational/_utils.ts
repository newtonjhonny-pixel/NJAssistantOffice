/**
 * Utilitários compartilhados entre os routes de CompanyOperationalSnapshot.
 * Arquivo prefixado com _ para não ser tratado como route pelo Next.js.
 */

import { prisma } from '@/lib/prisma-sqlite'

export function ni(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number.parseInt(String(v), 10)
  return Number.isFinite(n) ? n : null
}
export function n0(v: unknown): number { return ni(v) ?? 0 }

export function nextMonth(competence: string): string {
  const [mm, yyyy] = competence.split('/').map(Number)
  const m = mm === 12 ? 1 : mm + 1
  const y = mm === 12 ? yyyy + 1 : yyyy
  return `${String(m).padStart(2, '0')}/${y}`
}

/** Calcula o quadro final a partir do quadro inicial e das movimentações. */
export function computeFinal(snap: Record<string, any>) {
  const ia  = n0(snap.headcountInitialActive     ?? snap.headcountActive)
  const iap = n0(snap.headcountInitialApprentice ?? snap.headcountApprentice)
  const ii  = n0(snap.headcountInitialIntern     ?? snap.headcountIntern)
  const io  = n0(snap.headcountInitialOnLeave    ?? snap.headcountOnLeave)

  const finalActive = ia
    + n0(snap.admissionsClt) + n0(snap.entriesClt)
    - n0(snap.terminationsClt) - n0(snap.exitsClt)
    - n0(snap.newLeaves) + n0(snap.returnFromLeave)

  const finalApprentice = iap
    + n0(snap.admissionsApprentice) + n0(snap.entriesApprentice)
    - n0(snap.terminationsApprentice) - n0(snap.exitsApprentice)

  const finalIntern = ii
    + n0(snap.admissionsIntern) + n0(snap.entriesIntern)
    - n0(snap.terminationsIntern) - n0(snap.exitsIntern)

  const finalOnLeave = io + n0(snap.newLeaves) - n0(snap.returnFromLeave)

  return {
    headcountFinalActive:     Math.max(0, finalActive),
    headcountFinalApprentice: Math.max(0, finalApprentice),
    headcountFinalIntern:     Math.max(0, finalIntern),
    headcountFinalOnLeave:    Math.max(0, finalOnLeave),
  }
}

/** Valida que nenhum saldo ficará negativo. Retorna mensagem de erro ou null. */
export function validateMovements(snap: Record<string, any>): string | null {
  const ia  = n0(snap.headcountInitialActive     ?? snap.headcountActive)
  const iap = n0(snap.headcountInitialApprentice ?? snap.headcountApprentice)
  const ii  = n0(snap.headcountInitialIntern     ?? snap.headcountIntern)
  const io  = n0(snap.headcountInitialOnLeave    ?? snap.headcountOnLeave)

  if (ia + n0(snap.admissionsClt) + n0(snap.entriesClt)
      - n0(snap.terminationsClt) - n0(snap.exitsClt) - n0(snap.newLeaves) < 0)
    return 'Saídas de ativos CLT excedem entradas + saldo inicial. Verifique as movimentações.'

  if (iap + n0(snap.admissionsApprentice) + n0(snap.entriesApprentice)
      - n0(snap.terminationsApprentice) - n0(snap.exitsApprentice) < 0)
    return 'Saídas de aprendizes excedem entradas + saldo inicial.'

  if (ii + n0(snap.admissionsIntern) + n0(snap.entriesIntern)
      - n0(snap.terminationsIntern) - n0(snap.exitsIntern) < 0)
    return 'Saídas de estagiários excedem entradas + saldo inicial.'

  if (io + n0(snap.newLeaves) - n0(snap.returnFromLeave) < 0)
    return 'Retornos de afastamento excedem novos afastamentos + saldo inicial.'

  return null
}

/** Cria as tabelas e colunas necessárias se não existirem. */
export async function ensureSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CompanyOperationalSnapshot" (
      "id"                          TEXT PRIMARY KEY,
      "companyId"                   TEXT NOT NULL,
      "competence"                  TEXT NOT NULL,
      "status"                      TEXT DEFAULT 'EM_PREENCHIMENTO',
      "isInitialCompetence"         INTEGER DEFAULT 0,
      "closedAt"                    TEXT,
      "headcountInitialActive"      INTEGER,
      "headcountInitialApprentice"  INTEGER,
      "headcountInitialIntern"      INTEGER,
      "headcountInitialOnLeave"     INTEGER,
      "admissionsClt"               INTEGER DEFAULT 0,
      "admissionsApprentice"        INTEGER DEFAULT 0,
      "admissionsIntern"            INTEGER DEFAULT 0,
      "entriesClt"                  INTEGER DEFAULT 0,
      "entriesApprentice"           INTEGER DEFAULT 0,
      "entriesIntern"               INTEGER DEFAULT 0,
      "terminationsClt"             INTEGER DEFAULT 0,
      "terminationsApprentice"      INTEGER DEFAULT 0,
      "terminationsIntern"          INTEGER DEFAULT 0,
      "exitsClt"                    INTEGER DEFAULT 0,
      "exitsApprentice"             INTEGER DEFAULT 0,
      "exitsIntern"                 INTEGER DEFAULT 0,
      "newLeaves"                   INTEGER DEFAULT 0,
      "returnFromLeave"             INTEGER DEFAULT 0,
      "headcountFinalActive"        INTEGER,
      "headcountFinalApprentice"    INTEGER,
      "headcountFinalIntern"        INTEGER,
      "headcountFinalOnLeave"       INTEGER,
      "headcountActive"             INTEGER,
      "headcountApprentice"         INTEGER,
      "headcountIntern"             INTEGER,
      "headcountOnLeave"            INTEGER,
      "avgAdmissions"               REAL,
      "avgTerminations"             REAL,
      "avgVacations"                REAL,
      "folhasProcessadas"           INTEGER,
      "complexity"                  TEXT,
      "automationLevel"             TEXT,
      "observations"                TEXT,
      "createdAt"                   TEXT,
      "updatedAt"                   TEXT,
      UNIQUE("companyId","competence")
    )
  `)

  const newCols = [
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "status"                     TEXT DEFAULT 'EM_PREENCHIMENTO'`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "isInitialCompetence"        INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "closedAt"                   TEXT`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "headcountInitialActive"     INTEGER`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "headcountInitialApprentice" INTEGER`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "headcountInitialIntern"     INTEGER`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "headcountInitialOnLeave"    INTEGER`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "admissionsClt"              INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "admissionsApprentice"       INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "admissionsIntern"           INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "entriesClt"                 INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "entriesApprentice"          INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "entriesIntern"              INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "terminationsClt"            INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "terminationsApprentice"     INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "terminationsIntern"         INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "exitsClt"                   INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "exitsApprentice"            INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "exitsIntern"                INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "newLeaves"                  INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "returnFromLeave"            INTEGER DEFAULT 0`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "headcountFinalActive"       INTEGER`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "headcountFinalApprentice"   INTEGER`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "headcountFinalIntern"       INTEGER`,
    `ALTER TABLE "CompanyOperationalSnapshot" ADD COLUMN "headcountFinalOnLeave"      INTEGER`,
  ]
  for (const sql of newCols) {
    try { await prisma.$executeRawUnsafe(sql) } catch { /* já existe */ }
  }

  const companyCols = [
    `ALTER TABLE "ClientCompany" ADD COLUMN "laborUnionCount"    INTEGER`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "cctCount"           INTEGER`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "establishmentCount" INTEGER`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "filialCount"        INTEGER`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "laborBaseDate"      TEXT`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "complexityGeneral"  TEXT`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "situacao"           TEXT DEFAULT 'ATIVA'`,
  ]
  for (const sql of companyCols) {
    try { await prisma.$executeRawUnsafe(sql) } catch { /* já existe */ }
  }
}
