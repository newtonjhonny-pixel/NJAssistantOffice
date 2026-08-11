import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'

// Garante que a tabela de histórico existe
async function ensureHistoryTable() {
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

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureHistoryTable()
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "MemberSalaryHistory"
       WHERE "memberId" = ?
       ORDER BY "recordedAt" DESC`,
      params.id
    )
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[salary/history GET]', e)
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 })
  }
}
