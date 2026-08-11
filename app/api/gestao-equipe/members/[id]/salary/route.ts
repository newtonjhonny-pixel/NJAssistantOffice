import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// ─── Auto-migração: garante colunas e tabelas necessárias ────────────────────

async function ensureSchema() {
  // Adiciona colunas novas à tabela existente MemberSalary (ignora se já existem)
  const newCols = [
    `ALTER TABLE "MemberSalary" ADD COLUMN "salaryType" TEXT DEFAULT 'MENSAL'`,
    `ALTER TABLE "MemberSalary" ADD COLUMN "cargo" TEXT`,
    `ALTER TABLE "MemberSalary" ADD COLUMN "previousSalary" REAL`,
    `ALTER TABLE "MemberSalary" ADD COLUMN "adjustmentPercentage" REAL`,
  ]
  for (const sql of newCols) {
    try { await prisma.$executeRawUnsafe(sql) } catch { /* coluna já existe */ }
  }

  // Tabela de histórico salarial
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MemberSalaryHistory" (
      "id"                   TEXT PRIMARY KEY,
      "memberId"             TEXT NOT NULL,
      "previousSalary"       REAL,
      "newSalary"            REAL NOT NULL,
      "salaryType"           TEXT,
      "adjustmentPercentage" REAL,
      "adjustmentReason"     TEXT,
      "cargo"                TEXT,
      "observations"         TEXT,
      "validFrom"            TEXT,
      "recordedBy"           TEXT,
      "recordedAt"           TEXT NOT NULL
    )
  `)
}

// ─── Verifica permissão do usuário atual ─────────────────────────────────────

async function getCallerRole(): Promise<string> {
  try {
    const users = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "role" FROM "User" ORDER BY "createdAt" ASC LIMIT 1`
    )
    return users[0]?.role ?? 'viewer'
  } catch { return 'viewer' }
}

// ─── GET /api/gestao-equipe/members/[id]/salary ──────────────────────────────

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await ensureSchema()
    const role = await getCallerRole()
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "MemberSalary" WHERE "memberId" = ?`,
      params.id
    )
    return NextResponse.json(rows[0] ?? null)
  } catch (e) {
    console.error('[salary GET]', e)
    return NextResponse.json({ error: 'Erro ao buscar remuneração' }, { status: 500 })
  }
}

// ─── PUT /api/gestao-equipe/members/[id]/salary ──────────────────────────────

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureSchema()
    const role = await getCallerRole()
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const {
      baseSalary,        // obrigatório, > 0
      salaryType,        // MENSAL | HORA | DIA | COMISSAO | OUTRO
      validFrom,
      adjustmentReason,  // ADMISSAO | PROMOCAO | REAJUSTE | DISSIDIO | MERITO | ENQUADRAMENTO | OUTRO
      cargo,
      observations,
      // campos calculados / somente-leitura no frontend
      previousSalary,    // enviado pelo frontend (valor anterior)
      adjustmentPercentage,
      // campos de custo
      fixedAdditions, gratification, trustFunction, commission, otherFixed,
      estimatedCharges, estimatedCost,
    } = body

    // Validação
    if (!baseSalary || baseSalary <= 0) {
      return NextResponse.json({ error: 'Salário-base é obrigatório e deve ser maior que zero.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const validFromVal = validFrom ? new Date(validFrom).toISOString() : null

    // Calcula soma dos componentes → estimatedMonthly
    const calcSum = (baseSalary ?? 0) + (fixedAdditions ?? 0) + (gratification ?? 0) +
      (trustFunction ?? 0) + (commission ?? 0) + (otherFixed ?? 0)
    const calcMonthly = calcSum > 0 ? calcSum : null

    // Busca registro existente para calcular percentual e guardar salário anterior
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "MemberSalary" WHERE "memberId" = ?`,
      params.id
    )
    const prev = existing[0] ?? null
    const prevSalary = (prev?.baseSalary ?? null) as number | null

    // Percentual de reajuste (calculado automaticamente se havia salário anterior)
    let calcPct: number | null = adjustmentPercentage ?? null
    if (prevSalary && prevSalary > 0 && baseSalary !== prevSalary) {
      calcPct = parseFloat((((baseSalary - prevSalary) / prevSalary) * 100).toFixed(2))
    }

    // Nome do usuário que fez o lançamento
    const userRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "name" FROM "User" ORDER BY "createdAt" ASC LIMIT 1`
    )
    const recordedBy = userRows[0]?.name ?? 'Sistema'

    if (prev) {
      // Atualiza registro existente
      await prisma.$executeRawUnsafe(`
        UPDATE "MemberSalary" SET
          "baseSalary"           = ?,
          "salaryType"           = ?,
          "fixedAdditions"       = ?,
          "gratification"        = ?,
          "trustFunction"        = ?,
          "commission"           = ?,
          "otherFixed"           = ?,
          "estimatedMonthly"     = ?,
          "estimatedCharges"     = ?,
          "estimatedCost"        = ?,
          "validFrom"            = ?,
          "adjustmentReason"     = ?,
          "adjustmentPercentage" = ?,
          "previousSalary"       = ?,
          "cargo"                = ?,
          "observations"         = ?,
          "updatedAt"            = ?
        WHERE "memberId" = ?
      `,
        baseSalary ?? null,
        salaryType ?? 'MENSAL',
        fixedAdditions ?? null,
        gratification ?? null,
        trustFunction ?? null,
        commission ?? null,
        otherFixed ?? null,
        calcMonthly,
        estimatedCharges ?? null,
        estimatedCost ?? null,
        validFromVal,
        adjustmentReason ?? null,
        calcPct,
        prevSalary,
        cargo ?? null,
        observations ?? null,
        now,
        params.id
      )
    } else {
      // Insere novo registro
      const id = randomUUID()
      await prisma.$executeRawUnsafe(`
        INSERT INTO "MemberSalary" (
          "id","memberId",
          "baseSalary","salaryType",
          "fixedAdditions","gratification","trustFunction","commission","otherFixed",
          "estimatedMonthly","estimatedCharges","estimatedCost",
          "validFrom","adjustmentReason","adjustmentPercentage","previousSalary",
          "cargo","observations",
          "createdAt","updatedAt"
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `,
        id, params.id,
        baseSalary ?? null, salaryType ?? 'MENSAL',
        fixedAdditions ?? null, gratification ?? null, trustFunction ?? null,
        commission ?? null, otherFixed ?? null,
        calcMonthly, estimatedCharges ?? null, estimatedCost ?? null,
        validFromVal, adjustmentReason ?? null, calcPct, null,
        cargo ?? null, observations ?? null,
        now, now
      )
    }

    // Registra no histórico (sempre que salvar, incluindo criação inicial)
    const histId = randomUUID()
    await prisma.$executeRawUnsafe(`
      INSERT INTO "MemberSalaryHistory" (
        "id","memberId",
        "previousSalary","newSalary",
        "salaryType","adjustmentPercentage","adjustmentReason",
        "cargo","observations","validFrom",
        "recordedBy","recordedAt"
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `,
      histId, params.id,
      prevSalary, baseSalary,
      salaryType ?? 'MENSAL', calcPct, adjustmentReason ?? null,
      cargo ?? null, observations ?? null, validFromVal,
      recordedBy, now
    )

    // Retorna registro atualizado
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "MemberSalary" WHERE "memberId" = ?`,
      params.id
    )
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error('[salary PUT]', e)
    return NextResponse.json({ error: 'Erro ao salvar remuneração' }, { status: 500 })
  }
}
