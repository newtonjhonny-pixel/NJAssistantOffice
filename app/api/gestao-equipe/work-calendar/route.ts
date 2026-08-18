import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import { ensureTimesheetSchema } from '../members/[id]/timesheet/_utils'

export const dynamic = 'force-dynamic'

// GET /api/gestao-equipe/work-calendar?year=2026&uf=SP&municipio=...&type=...&origin=...&companyId=...
export async function GET(req: Request) {
  try {
    await ensureTimesheetSchema()
    const { searchParams } = new URL(req.url)
    const year      = searchParams.get('year')
    const companyId = searchParams.get('companyId')
    const uf        = searchParams.get('uf')
    const municipio = searchParams.get('municipio')
    const type      = searchParams.get('type')
    const origin    = searchParams.get('origin')

    let sql = `SELECT * FROM "WorkCalendarEntry" WHERE "active" = 1`
    const params: any[] = []

    if (year)      { sql += ` AND "year" = ?`;       params.push(Number(year)) }
    if (companyId) { sql += ` AND ("companyId" IS NULL OR "companyId" = ?)`; params.push(companyId) }
    if (uf)        { sql += ` AND ("uf" IS NULL OR "uf" = ?)`; params.push(uf.toUpperCase()) }
    if (municipio) { sql += ` AND LOWER(COALESCE("municipio",'')) LIKE LOWER(?)`; params.push(`%${municipio}%`) }
    if (type)      { sql += ` AND "type" = ?`;       params.push(type) }
    if (origin)    { sql += ` AND COALESCE("origin",'MANUAL') = ?`; params.push(origin) }

    sql += ` ORDER BY "date" ASC`

    const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params)
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[work-calendar GET]', e)
    return NextResponse.json({ error: 'Erro ao listar calendário' }, { status: 500 })
  }
}

// POST /api/gestao-equipe/work-calendar
export async function POST(req: Request) {
  try {
    await ensureTimesheetSchema()
    const body = await req.json()
    const { date, description, type, uf, municipio, ibgeCode, companyId, unitId, isWorked, observations, origin } = body

    if (!date || !description || !type)
      return NextResponse.json({ error: 'date, description e type são obrigatórios.' }, { status: 400 })
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return NextResponse.json({ error: 'Formato de data inválido. Use YYYY-MM-DD.' }, { status: 400 })

    const year = Number(date.substring(0, 4))
    const id = randomUUID()
    const now = new Date().toISOString()

    await prisma.$executeRawUnsafe(`
      INSERT INTO "WorkCalendarEntry" (
        "id","date","year","description","type","uf","municipio","ibgeCode",
        "country","companyId","unitId","isWorked","observations",
        "origin","active","createdAt","updatedAt"
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)
    `,
      id, date, year, description, type,
      uf ?? null, municipio ?? null, ibgeCode ?? null,
      'Brasil',
      companyId ?? null, unitId ?? null,
      isWorked ? 1 : 0, observations ?? null,
      origin ?? 'MANUAL',
      now, now
    )

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "WorkCalendarEntry" WHERE "id" = ?`, id
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e) {
    console.error('[work-calendar POST]', e)
    return NextResponse.json({ error: 'Erro ao criar entrada de calendário' }, { status: 500 })
  }
}
