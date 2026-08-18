import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import { ni, ensureSchema } from './_utils'

export const dynamic = 'force-dynamic'

// ─── GET /api/gestao-equipe/companies/[id]/operational ────────────────────────
// Retorna todos os snapshots da empresa ordenados cronologicamente (mais antigo primeiro).

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await ensureSchema()

    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "CompanyOperationalSnapshot"
      WHERE "companyId" = ?
      ORDER BY
        CAST(SUBSTR("competence", 4) AS INTEGER) ASC,
        CAST(SUBSTR("competence", 1, 2) AS INTEGER) ASC
    `, params.id)

    // Compatibilidade: se headcountInitialActive for nulo mas headcountActive existir, propaga
    const enriched = rows.map((r: any) => ({
      ...r,
      headcountInitialActive:     r.headcountInitialActive     ?? r.headcountActive,
      headcountInitialApprentice: r.headcountInitialApprentice ?? r.headcountApprentice,
      headcountInitialIntern:     r.headcountInitialIntern     ?? r.headcountIntern,
      headcountInitialOnLeave:    r.headcountInitialOnLeave    ?? r.headcountOnLeave,
      isInitialCompetence:        r.isInitialCompetence === 1 || r.isInitialCompetence === true,
      admissionsClt:              r.admissionsClt        ?? 0,
      admissionsApprentice:       r.admissionsApprentice ?? 0,
      admissionsIntern:           r.admissionsIntern     ?? 0,
      entriesClt:                 r.entriesClt           ?? 0,
      entriesApprentice:          r.entriesApprentice    ?? 0,
      entriesIntern:              r.entriesIntern        ?? 0,
      terminationsClt:            r.terminationsClt      ?? 0,
      terminationsApprentice:     r.terminationsApprentice ?? 0,
      terminationsIntern:         r.terminationsIntern   ?? 0,
      exitsClt:                   r.exitsClt             ?? 0,
      exitsApprentice:            r.exitsApprentice      ?? 0,
      exitsIntern:                r.exitsIntern          ?? 0,
      newLeaves:                  r.newLeaves            ?? 0,
      returnFromLeave:            r.returnFromLeave      ?? 0,
      status:                     r.status               ?? 'EM_PREENCHIMENTO',
    }))

    return NextResponse.json(enriched)
  } catch (e) {
    console.error('[operational GET]', e)
    return NextResponse.json({ error: 'Erro ao listar snapshots' }, { status: 500 })
  }
}

// ─── POST /api/gestao-equipe/companies/[id]/operational ──────────────────────
// Cria uma nova competência inicial (manualmente). As demais são criadas via close.

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureSchema()
    const body = await req.json()
    const { competence, isInitialCompetence, observations } = body

    if (!competence?.trim())
      return NextResponse.json({ error: 'Competência é obrigatória (MM/YYYY).' }, { status: 400 })
    if (!/^\d{2}\/\d{4}$/.test(competence.trim()))
      return NextResponse.json({ error: 'Formato de competência inválido. Use MM/YYYY.' }, { status: 400 })

    const comp = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id" FROM "ClientCompany" WHERE "id" = ?`, params.id
    )
    if (!comp.length)
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const exists = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id" FROM "CompanyOperationalSnapshot" WHERE "companyId" = ? AND "competence" = ?`,
      params.id, competence.trim()
    )
    if (exists.length)
      return NextResponse.json({ error: `Já existe snapshot para competência ${competence}.` }, { status: 409 })

    const id = randomUUID()
    const now = new Date().toISOString()
    const initFlag = isInitialCompetence ? 1 : 0

    const hia  = ni(body.headcountInitialActive)
    const hiap = ni(body.headcountInitialApprentice)
    const hii  = ni(body.headcountInitialIntern)
    const hio  = ni(body.headcountInitialOnLeave)

    await prisma.$executeRawUnsafe(`
      INSERT INTO "CompanyOperationalSnapshot" (
        "id","companyId","competence",
        "status","isInitialCompetence",
        "headcountInitialActive","headcountInitialApprentice","headcountInitialIntern","headcountInitialOnLeave",
        "admissionsClt","admissionsApprentice","admissionsIntern",
        "entriesClt","entriesApprentice","entriesIntern",
        "terminationsClt","terminationsApprentice","terminationsIntern",
        "exitsClt","exitsApprentice","exitsIntern",
        "newLeaves","returnFromLeave",
        "observations","createdAt","updatedAt"
      ) VALUES (
        ?,?,?,
        'INICIAL',?,
        ?,?,?,?,
        0,0,0,
        0,0,0,
        0,0,0,
        0,0,0,
        0,0,
        ?,?,?
      )
    `,
      id, params.id, competence.trim(),
      initFlag,
      hia, hiap, hii, hio,
      observations?.trim() || null, now, now
    )

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "CompanyOperationalSnapshot" WHERE "id" = ?`, id
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e) {
    console.error('[operational POST]', e)
    return NextResponse.json({ error: 'Erro ao criar snapshot' }, { status: 500 })
  }
}
