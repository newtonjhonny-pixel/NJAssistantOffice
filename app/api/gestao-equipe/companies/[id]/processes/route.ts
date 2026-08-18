import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

async function ensureSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CompanyProcessConfig" (
      "id"              TEXT PRIMARY KEY,
      "companyId"       TEXT NOT NULL,
      "processType"     TEXT NOT NULL,
      "volume"          REAL,
      "automationLevel" TEXT,
      "avgTimeMinutes"  REAL,
      "isCritical"      INTEGER NOT NULL DEFAULT 0,
      "observations"    TEXT,
      "createdAt"       TEXT,
      "updatedAt"       TEXT,
      UNIQUE("companyId","processType")
    )
  `)
}

const VALID_PROCESS_TYPES = [
  'FOLHA','ADMISSAO','RESCISAO','FERIAS','BENEFICIOS',
  'ENCARGOS','PONTO','ESOCIAL','FGTS','DCTFWEB','OUTROS',
]

// ─── GET /api/gestao-equipe/companies/[id]/processes ─────────────────────────

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await ensureSchema()
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "CompanyProcessConfig"
      WHERE "companyId" = ?
      ORDER BY "processType" ASC
    `, params.id)
    return NextResponse.json(rows.map(r => ({ ...r, isCritical: Boolean(r.isCritical) })))
  } catch (e) {
    console.error('[processes GET]', e)
    return NextResponse.json({ error: 'Erro ao listar processos' }, { status: 500 })
  }
}

// ─── POST /api/gestao-equipe/companies/[id]/processes ────────────────────────

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureSchema()
    const body = await req.json()
    const { processType, volume, automationLevel, avgTimeMinutes, isCritical, observations } = body

    if (!processType || !VALID_PROCESS_TYPES.includes(processType))
      return NextResponse.json({ error: 'Tipo de processo inválido.' }, { status: 400 })

    const comp = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id" FROM "ClientCompany" WHERE "id" = ?`, params.id
    )
    if (!comp.length)
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    // Upsert: se já existe, atualiza
    const exists = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id" FROM "CompanyProcessConfig" WHERE "companyId" = ? AND "processType" = ?`,
      params.id, processType
    )

    const now = new Date()
    if (exists.length) {
      const existId = exists[0].id
      await prisma.$executeRawUnsafe(`
        UPDATE "CompanyProcessConfig"
        SET "volume" = ?, "automationLevel" = ?, "avgTimeMinutes" = ?,
            "isCritical" = ?, "observations" = ?, "updatedAt" = ?
        WHERE "id" = ?
      `,
        volume ?? null, automationLevel ?? null, avgTimeMinutes ?? null,
        isCritical ? 1 : 0, observations?.trim() || null, now, existId
      )
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "CompanyProcessConfig" WHERE "id" = ?`, existId
      )
      return NextResponse.json({ ...rows[0], isCritical: Boolean(rows[0].isCritical) })
    }

    const id = randomUUID()
    await prisma.$executeRawUnsafe(`
      INSERT INTO "CompanyProcessConfig" (
        "id","companyId","processType","volume","automationLevel","avgTimeMinutes","isCritical","observations","createdAt","updatedAt"
      ) VALUES (?,?,?,?,?,?,?,?,?,?)
    `,
      id, params.id, processType,
      volume ?? null, automationLevel ?? null, avgTimeMinutes ?? null,
      isCritical ? 1 : 0, observations?.trim() || null,
      now, now
    )

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "CompanyProcessConfig" WHERE "id" = ?`, id
    )
    return NextResponse.json({ ...rows[0], isCritical: Boolean(rows[0].isCritical) }, { status: 201 })
  } catch (e) {
    console.error('[processes POST]', e)
    return NextResponse.json({ error: 'Erro ao criar processo' }, { status: 500 })
  }
}

// ─── DELETE /api/gestao-equipe/companies/[id]/processes?processType=FOLHA ────

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url)
    const processType = url.searchParams.get('processType')
    if (!processType)
      return NextResponse.json({ error: 'processType é obrigatório.' }, { status: 400 })

    await prisma.$executeRawUnsafe(
      `DELETE FROM "CompanyProcessConfig" WHERE "companyId" = ? AND "processType" = ?`,
      params.id, processType
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[processes DELETE]', e)
    return NextResponse.json({ error: 'Erro ao deletar processo' }, { status: 500 })
  }
}
