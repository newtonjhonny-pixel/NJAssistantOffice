/**
 * Utilitários compartilhados — Ponto Diário / Escala / Calendário
 * Prefixado com _ para não ser tratado como route pelo Next.js.
 */

import { prisma } from '@/lib/prisma-sqlite'

// ─── CONVERSÃO DE TEMPO ───────────────────────────────────────────────────────

/** "HH:MM" → minutos inteiros */
export function hhmm2min(s: string | null | undefined): number {
  if (!s) return 0
  const [h, m] = s.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

/** minutos inteiros → "HH:MM" */
export function min2hhmm(min: number): string {
  const abs = Math.abs(min)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${min < 0 ? '-' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** número ou string → inteiro (0 se nulo/inválido) */
export function n0(v: unknown): number {
  if (v == null || v === '') return 0
  const n = Number.parseInt(String(v), 10)
  return Number.isFinite(n) ? n : 0
}

/** número ou string → inteiro | null */
export function ni(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number.parseInt(String(v), 10)
  return Number.isFinite(n) ? n : null
}

// ─── CÁLCULO DE MINUTOS TRABALHADOS (A PARTIR DAS BATIDAS) ───────────────────

/** Calcula minutos a partir de até 4 pares de batidas. */
export function calcWorked(record: {
  entryMode?: string | null
  entry1?: string | null; exit1?: string | null
  entry2?: string | null; exit2?: string | null
  entry3?: string | null; exit3?: string | null
  entry4?: string | null; exit4?: string | null
  totalMinutes?: number | null
}): number {
  const mode = record.entryMode ?? 'MARCACAO'
  if (mode === 'TOTAL' || mode === 'AJUSTE') {
    return n0(record.totalMinutes)
  }
  let total = 0
  const pairs: [string | null | undefined, string | null | undefined][] = [
    [record.entry1, record.exit1],
    [record.entry2, record.exit2],
    [record.entry3, record.exit3],
    [record.entry4, record.exit4],
  ]
  for (const [en, ex] of pairs) {
    if (en && ex) {
      const diff = hhmm2min(ex) - hhmm2min(en)
      if (diff > 0) total += diff
    }
  }
  return total
}

// ─── CLASSIFICAÇÃO AUTOMÁTICA DO SALDO ───────────────────────────────────────

/**
 * Determina classificação inicial do saldo diário.
 * BANCO = saldo dentro da escala / crédito normal
 * HORA_EXTRA = crédito em dia extra (sábado, domingo, feriado)
 * DESCONTO = débito sem justificativa
 * SEM_EFEITO = dia não trabalhado e não esperado (ex: feriado folga)
 * PENDENTE = aguardando revisão
 */
export function autoClassify(
  balanceMinutes: number,
  dayType: string,
  plannedMinutes: number,
  workedMinutes: number,
): string {
  // Dia sem jornada e sem trabalho = sem efeito
  if (plannedMinutes === 0 && workedMinutes === 0) return 'SEM_EFEITO'
  // Dia sem jornada prevista mas com horas trabalhadas = hora extra
  if (plannedMinutes === 0 && workedMinutes > 0) return 'HORA_EXTRA'
  // Dia não trabalhado com jornada prevista = pendente de justificativa
  if (workedMinutes === 0 && plannedMinutes > 0) return 'PENDENTE'
  // Tolerância legal de 10 minutos: variações de ±10 min não vão para banco
  // O trabalhado ainda conta normalmente; apenas o banco é zerado
  if (Math.abs(balanceMinutes) <= 10) return 'SEM_EFEITO'
  // Fora da tolerância: vai para banco de horas (positivo ou negativo)
  return 'BANCO'
}

// ─── DATA HELPERS ─────────────────────────────────────────────────────────────

/** "YYYY-MM-DD" → dia da semana (0=Dom … 6=Sáb) */
export function dateToDayOfWeek(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** Gera array de datas "YYYY-MM-DD" para um mês YYYY-MM */
export function datesOfMonth(competence: string): string[] {
  const [yyyy, mm] = competence.split('-').map(Number)
  const days: string[] = []
  const total = new Date(yyyy, mm, 0).getDate() // último dia do mês
  for (let d = 1; d <= total; d++) {
    days.push(`${yyyy}-${String(mm).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return days
}

/** "YYYY-MM-DD" → "YYYY-MM" */
export function dateToCompetence(date: string): string {
  return date.substring(0, 7)
}

// ─── ESCALA VIGENTE ───────────────────────────────────────────────────────────

/** Normaliza isWorked (INTEGER/BOOLEAN/NULL) para '1' ou '0'. NULL ⇒ '1'. */
function isWorkedToFlag(v: unknown): string {
  if (v === null || v === undefined) return '1'
  if (typeof v === 'boolean') return v ? '1' : '0'
  return Number(v) ? '1' : '0'
}

/**
 * Busca a escala vigente para um colaborador em uma data específica.
 *
 * A montagem de `daysData` é feita em JavaScript (e não via GROUP_CONCAT/STRING_AGG)
 * para que o mesmo código funcione em SQLite (dev) e PostgreSQL (produção).
 */
export async function getActiveSchedule(memberId: string, date: string): Promise<any | null> {
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT * FROM "EmployeeSchedule"
    WHERE "memberId" = ?
      AND "active" = 1
      AND "startDate" <= ?
      AND ("endDate" IS NULL OR "endDate" >= ?)
    ORDER BY "startDate" DESC
    LIMIT 1
  `, memberId, date, date)

  const schedule = rows[0] ?? null
  if (!schedule) return null

  const dayRows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT "dayOfWeek","isWorked","entry1","exit1","entry2","exit2","dailyMinutes"
    FROM "EmployeeScheduleDay"
    WHERE "scheduleId" = ?
    ORDER BY "dayOfWeek" ASC
  `, schedule.id)

  // IMPORTANTE: separador de campo usa § (não :) para não conflitar com HH:MM dos horários
  // Formato por dia: "dow§isWorked§entry1§exit1§entry2§exit2§dailyMinutes", unidos por "|"
  schedule.daysData = dayRows
    .map(d => [
      String(d.dayOfWeek ?? ''),
      isWorkedToFlag(d.isWorked),
      d.entry1 ?? '',
      d.exit1  ?? '',
      d.entry2 ?? '',
      d.exit2  ?? '',
      String(d.dailyMinutes ?? '0'),
    ].join('§'))
    .join('|')

  return schedule
}

/** Retorna minutosPrevistos para um dia, combinando escala + calendário + exceção individual. */
export async function getPlannedMinutes(memberId: string, date: string): Promise<{
  plannedMinutes: number
  dayType: string
  calendarEntryId: string | null
  scheduleId: string | null
}> {
  const dow = dateToDayOfWeek(date)

  // 1. Exceção individual do colaborador
  const excRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "MemberCalendarException" WHERE "memberId" = ? AND "date" = ?`,
    memberId, date
  )
  if (excRows.length) {
    const exc = excRows[0]
    return {
      plannedMinutes: n0(exc.plannedMinutes),
      dayType: exc.type === 'FERIAS' ? 'FOLGA' : exc.type === 'AFASTAMENTO' ? 'FOLGA' : exc.overrideWorked ? 'UTIL' : 'FOLGA',
      calendarEntryId: null,
      scheduleId: null,
    }
  }

  // 2. Busca empresa empregadora (lotação) do colaborador para filtrar feriados por escopo
  const memberRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "companyId" FROM "TeamMember" WHERE "id" = ? LIMIT 1`, memberId
  )
  const employerCompanyId = memberRows[0]?.companyId ?? null

  // Busca UF, município e IBGE code da empresa empregadora
  let employerUF: string | null = null
  let employerCity: string | null = null
  let employerIbge: string | null = null
  if (employerCompanyId) {
    const compRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "state", "city", "ibgeCode" FROM "ClientCompany" WHERE "id" = ? LIMIT 1`,
      employerCompanyId
    )
    if (compRows.length) {
      employerUF   = compRows[0].state   ?? null
      employerCity = compRows[0].city    ?? null
      employerIbge = compRows[0].ibgeCode ?? null
    }
  }

  // 2. Evento de calendário (feriado, ponto facultativo etc.)
  // Filtra por escopo da empresa empregadora:
  //   FERIADO_EMPRESA: apenas se companyId == empresa empregadora
  //   FERIADO_MUNICIPAL: apenas se uf + (ibgeCode ou municipio) batem
  //   FERIADO_ESTADUAL: apenas se uf bate
  //   FERIADO_NACIONAL / demais: sem filtro geográfico
  const calRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "WorkCalendarEntry"
     WHERE "date" = ? AND "active" = 1
       AND (
         -- Nacional, Facultativo, SemExpediente, Especial: sem filtro geográfico
         "type" IN ('FERIADO_NACIONAL','FACULTATIVO','SEM_EXPEDIENTE','ESPECIAL')
         -- Estadual: filtra por UF da empresa empregadora
         OR ("type" = 'FERIADO_ESTADUAL'  AND ("uf" IS NULL OR "uf" = ?))
         -- Municipal: filtra por UF E (ibgeCode OU municipio) da empresa empregadora
         OR ("type" = 'FERIADO_MUNICIPAL' AND ("uf" IS NULL OR "uf" = ?)
               AND ("ibgeCode" IS NULL OR "ibgeCode" = ?
                    OR LOWER("municipio") = LOWER(?)))
         -- Empresa: apenas se for a empresa empregadora do colaborador
         OR ("type" = 'FERIADO_EMPRESA'   AND "companyId" = ?)
       )
     ORDER BY CASE "type"
       WHEN 'FERIADO_EMPRESA'   THEN 1
       WHEN 'FERIADO_MUNICIPAL' THEN 2
       WHEN 'FERIADO_ESTADUAL'  THEN 3
       WHEN 'FERIADO_NACIONAL'  THEN 4
       ELSE 5 END
     LIMIT 1`,
    date,
    employerUF ?? '',
    employerUF ?? '',
    employerIbge ?? '',
    employerCity ?? '',
    employerCompanyId ?? ''
  )
  const calEntry = calRows[0] ?? null

  // 3. Escala vigente
  const schedule = await getActiveSchedule(memberId, date)
  const scheduleId = schedule?.id ?? null

  let plannedBySchedule = 0
  if (schedule?.daysData) {
    const dayParts = (schedule.daysData as string).split('|')
    for (const part of dayParts) {
      // Formato: "dow§isWorked§entry1§exit1§entry2§exit2§dailyMinutes"
      const [dowStr, isWorkedStr, , , , , mins] = part.split('§')
      if (Number(dowStr) === dow) {
        plannedBySchedule = isWorkedStr === '1' || isWorkedStr === 'true' ? n0(mins) : 0
        break
      }
    }
  }

  // Se tem calendário e não é trabalhado: feriado/folga
  if (calEntry && !calEntry.isWorked) {
    return {
      plannedMinutes: 0,
      dayType: calEntry.type.startsWith('FERIADO') ? 'FERIADO' : 'FOLGA',
      calendarEntryId: calEntry.id,
      scheduleId,
    }
  }

  // Dom/Sáb sem escala
  if (dow === 0) return { plannedMinutes: 0, dayType: 'DOMINGO', calendarEntryId: calEntry?.id ?? null, scheduleId }
  if (dow === 6) return { plannedMinutes: plannedBySchedule, dayType: plannedBySchedule > 0 ? 'SABADO' : 'FOLGA', calendarEntryId: calEntry?.id ?? null, scheduleId }

  return {
    plannedMinutes: plannedBySchedule,
    dayType: 'UTIL',
    calendarEntryId: calEntry?.id ?? null,
    scheduleId,
  }
}

// ─── ENSURE SCHEMA ────────────────────────────────────────────────────────────

export async function ensureTimesheetSchema() {
  // WorkCalendarEntry
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WorkCalendarEntry" (
      "id"           TEXT PRIMARY KEY,
      "date"         TEXT NOT NULL,
      "year"         INTEGER NOT NULL,
      "description"  TEXT NOT NULL,
      "type"         TEXT NOT NULL,
      "uf"           TEXT,
      "municipio"    TEXT,
      "companyId"    TEXT,
      "unitId"       TEXT,
      "isWorked"     INTEGER DEFAULT 0,
      "observations" TEXT,
      "active"       INTEGER DEFAULT 1,
      "createdAt"    TEXT,
      "updatedAt"    TEXT
    )
  `)

  // EmployeeSchedule
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EmployeeSchedule" (
      "id"             TEXT PRIMARY KEY,
      "memberId"       TEXT NOT NULL,
      "name"           TEXT NOT NULL,
      "weeklyMinutes"  INTEGER DEFAULT 0,
      "monthlyMinutes" INTEGER DEFAULT 0,
      "startDate"      TEXT NOT NULL,
      "endDate"        TEXT,
      "observations"   TEXT,
      "active"         INTEGER DEFAULT 1,
      "createdAt"      TEXT,
      "updatedAt"      TEXT,
      FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE
    )
  `)

  // EmployeeScheduleDay
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EmployeeScheduleDay" (
      "id"           TEXT PRIMARY KEY,
      "scheduleId"   TEXT NOT NULL,
      "dayOfWeek"    INTEGER NOT NULL,
      "isWorked"     INTEGER DEFAULT 1,
      "entry1"       TEXT,
      "exit1"        TEXT,
      "entry2"       TEXT,
      "exit2"        TEXT,
      "entry3"       TEXT,
      "exit3"        TEXT,
      "dailyMinutes" INTEGER DEFAULT 0,
      "createdAt"    TEXT,
      "updatedAt"    TEXT,
      FOREIGN KEY ("scheduleId") REFERENCES "EmployeeSchedule"("id") ON DELETE CASCADE,
      UNIQUE ("scheduleId", "dayOfWeek")
    )
  `)

  // DailyTimeRecord
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DailyTimeRecord" (
      "id"                TEXT PRIMARY KEY,
      "memberId"          TEXT NOT NULL,
      "date"              TEXT NOT NULL,
      "dayOfWeek"         INTEGER NOT NULL,
      "competence"        TEXT NOT NULL,
      "dayType"           TEXT DEFAULT 'UTIL',
      "calendarEntryId"   TEXT,
      "scheduleId"        TEXT,
      "plannedMinutes"    INTEGER DEFAULT 0,
      "entryMode"         TEXT DEFAULT 'MARCACAO',
      "entry1"            TEXT,
      "exit1"             TEXT,
      "entry2"            TEXT,
      "exit2"             TEXT,
      "entry3"            TEXT,
      "exit3"             TEXT,
      "entry4"            TEXT,
      "exit4"             TEXT,
      "totalMinutes"      INTEGER,
      "workedMinutes"     INTEGER DEFAULT 0,
      "balanceMinutes"    INTEGER DEFAULT 0,
      "classification"    TEXT DEFAULT 'PENDENTE',
      "justification"     TEXT,
      "justificationDesc" TEXT,
      "hasAttachment"     INTEGER DEFAULT 0,
      "status"            TEXT DEFAULT 'NAO_PREENCHIDO',
      "source"            TEXT DEFAULT 'MANUAL',
      "observations"      TEXT,
      "createdAt"         TEXT,
      "updatedAt"         TEXT,
      FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE,
      UNIQUE ("memberId", "date")
    )
  `)

  // MonthlyTimeCompetence
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MonthlyTimeCompetence" (
      "id"                  TEXT PRIMARY KEY,
      "memberId"            TEXT NOT NULL,
      "competence"          TEXT NOT NULL,
      "plannedMinutes"      INTEGER DEFAULT 0,
      "workedMinutes"       INTEGER DEFAULT 0,
      "balanceMinutes"      INTEGER DEFAULT 0,
      "bankCreditMinutes"   INTEGER DEFAULT 0,
      "bankDebitMinutes"    INTEGER DEFAULT 0,
      "overtimeMinutes"     INTEGER DEFAULT 0,
      "abonoMinutes"        INTEGER DEFAULT 0,
      "compensationMinutes" INTEGER DEFAULT 0,
      "pendingCount"        INTEGER DEFAULT 0,
      "status"              TEXT DEFAULT 'ABERTA',
      "closedAt"            TEXT,
      "closedBy"            TEXT,
      "bankHoursEntryId"    TEXT,
      "observations"        TEXT,
      "createdAt"           TEXT,
      "updatedAt"           TEXT,
      FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE,
      UNIQUE ("memberId", "competence")
    )
  `)

  // MemberCalendarException
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MemberCalendarException" (
      "id"             TEXT PRIMARY KEY,
      "memberId"       TEXT NOT NULL,
      "date"           TEXT NOT NULL,
      "type"           TEXT NOT NULL,
      "description"    TEXT,
      "overrideWorked" INTEGER DEFAULT 0,
      "plannedMinutes" INTEGER DEFAULT 0,
      "createdAt"      TEXT,
      "updatedAt"      TEXT,
      FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE,
      UNIQUE ("memberId", "date")
    )
  `)

  // WorkCalendarEntry — colunas adicionadas depois
  for (const stmt of [
    `ALTER TABLE "WorkCalendarEntry" ADD COLUMN "ibgeCode" TEXT`,
    `ALTER TABLE "WorkCalendarEntry" ADD COLUMN "country"  TEXT DEFAULT 'Brasil'`,
    `ALTER TABLE "WorkCalendarEntry" ADD COLUMN "origin"   TEXT DEFAULT 'MANUAL'`,
  ]) {
    try { await prisma.$executeRawUnsafe(stmt) } catch { /* coluna já existe */ }
  }

  // HolidayCalendarGeneration — histórico de gerações automáticas
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HolidayCalendarGeneration" (
      "id"               TEXT PRIMARY KEY,
      "year"             INTEGER NOT NULL,
      "generatedAt"      TEXT NOT NULL,
      "generatedBy"      TEXT,
      "localitiesCount"  INTEGER DEFAULT 0,
      "entriesCreated"   INTEGER DEFAULT 0,
      "entriesUpdated"   INTEGER DEFAULT 0,
      "entriesSkipped"   INTEGER DEFAULT 0,
      "companiesPending" INTEGER DEFAULT 0,
      "summary"          TEXT,
      "status"           TEXT DEFAULT 'CONCLUIDO',
      "createdAt"        TEXT NOT NULL
    )
  `)

  // CompanyHolidayOverride — override por empresa de uma entrada do calendário
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CompanyHolidayOverride" (
      "id"              TEXT PRIMARY KEY,
      "companyId"       TEXT NOT NULL,
      "calendarEntryId" TEXT NOT NULL,
      "isWorked"        INTEGER DEFAULT 0,
      "isExempt"        INTEGER DEFAULT 0,
      "observations"    TEXT,
      "createdAt"       TEXT NOT NULL,
      "updatedAt"       TEXT NOT NULL
    )
  `)
  // Garante unicidade companyId+calendarEntryId
  try {
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_override_company_entry"
        ON "CompanyHolidayOverride" ("companyId", "calendarEntryId")
    `)
  } catch { /* já existe */ }

  // DailyTimeRecord — colunas opcionais adicionadas depois do CREATE
  for (const stmt of [
    `ALTER TABLE "DailyTimeRecord" ADD COLUMN "sourceType" TEXT DEFAULT 'MANUAL'`,
    `ALTER TABLE "DailyTimeRecord" ADD COLUMN "importBatchId" TEXT`,
  ]) {
    try { await prisma.$executeRawUnsafe(stmt) } catch { /* coluna já existe */ }
  }

  // HourBankConfig — período do acordo de banco de horas
  for (const stmt of [
    `ALTER TABLE "HourBankConfig" ADD COLUMN "periodoInicio" TEXT`,
    `ALTER TABLE "HourBankConfig" ADD COLUMN "periodoFim" TEXT`,
  ]) {
    try { await prisma.$executeRawUnsafe(stmt) } catch { /* coluna já existe */ }
  }

  // PontoLote — lote de importação em lote (vários arquivos / vários colaboradores)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PontoLote" (
      "id"                   TEXT PRIMARY KEY,
      "code"                 TEXT NOT NULL,
      "status"               TEXT DEFAULT 'PROCESSANDO',
      "totalFiles"           INTEGER DEFAULT 0,
      "totalCollaboradores"  INTEGER DEFAULT 0,
      "totalDias"            INTEGER DEFAULT 0,
      "totalBatidas"         INTEGER DEFAULT 0,
      "totalConflitos"       INTEGER DEFAULT 0,
      "totalRejeitados"      INTEGER DEFAULT 0,
      "importedAt"           TEXT,
      "importedBy"           TEXT,
      "observations"         TEXT,
      "createdAt"            TEXT NOT NULL,
      "updatedAt"            TEXT NOT NULL
    )
  `)

  // PontoImportBatch — log por colaborador dentro de um lote
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PontoImportBatch" (
      "id"               TEXT PRIMARY KEY,
      "loteId"           TEXT,
      "memberId"         TEXT,
      "competence"       TEXT NOT NULL,
      "fileName"         TEXT NOT NULL,
      "fileHash"         TEXT NOT NULL,
      "importedAt"       TEXT NOT NULL,
      "importedBy"       TEXT,
      "daysProcessed"    INTEGER DEFAULT 0,
      "punchesImported"  INTEGER DEFAULT 0,
      "bancoHCount"      INTEGER DEFAULT 0,
      "method"           TEXT DEFAULT 'deterministic_parser',
      "fileStoredPermanently" INTEGER DEFAULT 0,
      "observations"     TEXT,
      "createdAt"        TEXT,
      FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL
    )
  `)

  // PontoImportBatch — colunas adicionadas depois (idempotente)
  for (const stmt of [
    `ALTER TABLE "PontoImportBatch" ADD COLUMN "loteId" TEXT`,
    `ALTER TABLE "PontoImportBatch" ADD COLUMN "memberName" TEXT`,
    `ALTER TABLE "PontoImportBatch" ADD COLUMN "memberNotFound" INTEGER DEFAULT 0`,
    `ALTER TABLE "PontoImportBatch" ADD COLUMN "conflito" INTEGER DEFAULT 0`,
  ]) {
    try { await prisma.$executeRawUnsafe(stmt) } catch { /* já existe */ }
  }
}
