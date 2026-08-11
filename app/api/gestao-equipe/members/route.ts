import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

// Garante colunas necessárias (sem migration)
async function ensureMemberCompany() {
  const sqls = [
    `ALTER TABLE "TeamMember" ADD COLUMN "companyId" TEXT`,
    // Colunas da ClientCompany referenciadas no JOIN abaixo
    `ALTER TABLE "ClientCompany" ADD COLUMN "code"              TEXT`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "tradeName"         TEXT`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "establishmentType" TEXT DEFAULT 'MATRIZ'`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "parentCompanyId"   TEXT`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "zipCode"           TEXT`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "street"            TEXT`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "number"            TEXT`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "complement"        TEXT`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "neighborhood"      TEXT`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "city"              TEXT`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "state"             TEXT`,
    `ALTER TABLE "ClientCompany" ADD COLUMN "country"           TEXT DEFAULT 'Brasil'`,
  ]
  for (const sql of sqls) {
    try { await prisma.$executeRawUnsafe(sql) } catch { /* já existe */ }
  }
}

export async function GET(req: Request) {
  await ensureMemberCompany()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const search = searchParams.get("search")

  // Filtros dinâmicos
  const conditions: string[] = []
  const values: any[] = []
  if (status) { conditions.push(`m."status" = ?`); values.push(status) }
  if (search) {
    const s = `%${search}%`
    conditions.push(`(m."name" LIKE ? OR m."role" LIKE ? OR COALESCE(m."sector",'') LIKE ?)`)
    values.push(s, s, s)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      m."id", m."name", m."role", m."sector", m."unit",
      m."email", m."phone", m."joinedAt", m."status", m."observations",
      m."companyId", m."createdAt", m."updatedAt",
      cc."code"  AS "companyCode",
      cc."name"  AS "companyName",
      (SELECT COUNT(*) FROM "TeamFeedback"          WHERE "memberId" = m."id") AS "feedbackCount",
      (SELECT COUNT(*) FROM "TeamActivityDirection" WHERE "memberId" = m."id") AS "directionCount",
      (SELECT COUNT(*) FROM "TeamVacation"          WHERE "memberId" = m."id") AS "vacationCount",
      (SELECT COUNT(*) FROM "TeamTraining"          WHERE "memberId" = m."id") AS "trainingCount",
      (SELECT COUNT(*) FROM "TeamActivity"          WHERE "memberId" = m."id") AS "activityCount"
    FROM "TeamMember" m
    LEFT JOIN "ClientCompany" cc ON cc."id" = m."companyId"
    ${where}
    ORDER BY m."name" ASC
  `, ...values)

  // Formata para manter compatibilidade com o _count anterior
  const members = rows.map(r => ({
    id:           r.id,
    name:         r.name,
    role:         r.role,
    sector:       r.sector,
    unit:         r.unit,
    email:        r.email,
    phone:        r.phone,
    joinedAt:     r.joinedAt,
    status:       r.status,
    observations: r.observations,
    companyId:    r.companyId,
    companyCode:  r.companyCode,
    companyName:  r.companyName,
    createdAt:    r.createdAt,
    updatedAt:    r.updatedAt,
    _count: {
      feedbacks:  Number(r.feedbackCount  ?? 0),
      directions: Number(r.directionCount ?? 0),
      vacations:  Number(r.vacationCount  ?? 0),
      trainings:  Number(r.trainingCount  ?? 0),
      activities: Number(r.activityCount  ?? 0),
    },
  }))

  return NextResponse.json(members)
}

export async function POST(req: Request) {
  await ensureMemberCompany()

  const body = await req.json()
  const { name, role, sector, unit, email, phone, joinedAt, status, observations, companyId } = body

  if (!name || !role) {
    return NextResponse.json({ error: "Nome e cargo são obrigatórios" }, { status: 400 })
  }

  const member = await prisma.teamMember.create({
    data: {
      name, role,
      sector:      sector      || null,
      unit:        unit        || null,
      email:       email       || null,
      phone:       phone       || null,
      joinedAt:    joinedAt    ? new Date(joinedAt) : null,
      status:      status      || "ATIVO",
      observations: observations || null,
    },
  })

  // Salva companyId via raw SQL (coluna não está no schema Prisma)
  if (companyId) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "TeamMember" SET "companyId" = ? WHERE "id" = ?`,
        companyId, member.id
      )
    } catch {}
  }

  await prisma.teamHistory.create({
    data: {
      memberId:    member.id,
      type:        "MEMBRO_CRIADO",
      title:       "Colaborador cadastrado",
      description: `${name} — ${role}`,
    },
  })

  return NextResponse.json({ ...member, companyId: companyId || null }, { status: 201 })
}
