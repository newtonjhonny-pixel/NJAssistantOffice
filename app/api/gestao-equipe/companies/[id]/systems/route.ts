import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

async function ensureSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CompanySystem" (
      "id"           TEXT PRIMARY KEY,
      "companyId"    TEXT NOT NULL,
      "systemName"   TEXT NOT NULL,
      "systemType"   TEXT,
      "vendor"       TEXT,
      "version"      TEXT,
      "isActive"     INTEGER NOT NULL DEFAULT 1,
      "observations" TEXT,
      "createdAt"    TEXT,
      "updatedAt"    TEXT
    )
  `)
}

// ─── GET /api/gestao-equipe/companies/[id]/systems ────────────────────────────

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await ensureSchema()
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "CompanySystem"
      WHERE "companyId" = ?
      ORDER BY "systemName" ASC
    `, params.id)
    return NextResponse.json(rows.map(r => ({ ...r, isActive: Boolean(r.isActive) })))
  } catch (e) {
    console.error('[systems GET]', e)
    return NextResponse.json({ error: 'Erro ao listar sistemas' }, { status: 500 })
  }
}

// ─── POST /api/gestao-equipe/companies/[id]/systems ──────────────────────────

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureSchema()
    const body = await req.json()
    const { systemName, systemType, vendor, version, isActive, observations } = body

    if (!systemName?.trim())
      return NextResponse.json({ error: 'Nome do sistema é obrigatório.' }, { status: 400 })

    const comp = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id" FROM "ClientCompany" WHERE "id" = ?`, params.id
    )
    if (!comp.length)
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const id = randomUUID()
    const now = new Date()
    await prisma.$executeRawUnsafe(`
      INSERT INTO "CompanySystem" (
        "id","companyId","systemName","systemType","vendor","version","isActive","observations","createdAt","updatedAt"
      ) VALUES (?,?,?,?,?,?,?,?,?,?)
    `,
      id, params.id,
      systemName.trim(),
      systemType ?? null,
      vendor?.trim() || null,
      version?.trim() || null,
      isActive !== false ? 1 : 0,
      observations?.trim() || null,
      now, now
    )

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "CompanySystem" WHERE "id" = ?`, id
    )
    return NextResponse.json({ ...rows[0], isActive: Boolean(rows[0].isActive) }, { status: 201 })
  } catch (e) {
    console.error('[systems POST]', e)
    return NextResponse.json({ error: 'Erro ao criar sistema' }, { status: 500 })
  }
}
