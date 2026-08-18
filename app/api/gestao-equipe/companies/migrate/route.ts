import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// ─── POST /api/gestao-equipe/companies/migrate ────────────────────────────────
// Migra dados operacionais de MemberCompanyLink → CompanyOperationalSnapshot
// Competência padrão: 08/2026
// Regra: se há conflito de campos entre colaboradores, usa o valor do
// colaborador com role = 'RESPONSAVEL' ou, em empate, o mais recente.
// NÃO apaga dados de MemberCompanyLink — apenas copia.

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const competence = body.competence ?? '08/2026'
    const dryRun = body.dryRun === true

    if (!/^\d{2}\/\d{4}$/.test(competence))
      return NextResponse.json({ error: 'Formato de competência inválido. Use MM/YYYY.' }, { status: 400 })

    // Garante tabela de destino
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CompanyOperationalSnapshot" (
        "id"                  TEXT PRIMARY KEY,
        "companyId"           TEXT NOT NULL,
        "competence"          TEXT NOT NULL,
        "headcountActive"     INTEGER,
        "headcountApprentice" INTEGER,
        "headcountIntern"     INTEGER,
        "headcountOnLeave"    INTEGER,
        "avgAdmissions"       REAL,
        "avgTerminations"     REAL,
        "avgVacations"        REAL,
        "folhasProcessadas"   INTEGER,
        "complexity"          TEXT,
        "automationLevel"     TEXT,
        "observations"        TEXT,
        "createdAt"           TEXT,
        "updatedAt"           TEXT,
        UNIQUE("companyId","competence")
      )
    `)

    // Busca todos os links com dados operacionais
    const links = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        mcl.*,
        tm."name" AS "memberName"
      FROM "MemberCompanyLink" mcl
      JOIN "TeamMember" tm ON tm."id" = mcl."memberId"
      ORDER BY mcl."companyId" ASC,
               CASE WHEN mcl."memberRole" = 'RESPONSAVEL' THEN 0 ELSE 1 END ASC,
               mcl."updatedAt" DESC
    `)

    // Agrupa por empresa: pega o primeiro (responsável principal ou mais recente)
    const byCompany: Record<string, any> = {}
    for (const link of links) {
      if (!byCompany[link.companyId]) {
        byCompany[link.companyId] = link
      }
    }

    const companies = Object.values(byCompany)

    const report: any[] = []
    let created = 0
    let skipped = 0
    let conflicts: any[] = []

    for (const link of companies) {
      const companyId = link.companyId

      // Detecta conflitos (outros colaboradores com dados diferentes)
      const otherLinks = links.filter(
        (l: any) => l.companyId === companyId && l.id !== link.id
      )
      const conflictFields: string[] = []
      for (const other of otherLinks) {
        const fields = ['headcountActive','headcountApprentice','headcountIntern','headcountOnLeave',
          'avgAdmissions','avgTerminations','avgVacations','folhasProcessadas','complexity','automationLevel']
        for (const f of fields) {
          if (other[f] !== null && other[f] !== undefined && other[f] !== link[f]) {
            conflictFields.push(`${f}: ${link.memberName}=${link[f]} vs ${other.memberName}=${other[f]}`)
          }
        }
      }
      if (conflictFields.length) conflicts.push({ companyId, conflicts: conflictFields })

      // Verifica se snapshot já existe para essa competência
      const existing = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id" FROM "CompanyOperationalSnapshot" WHERE "companyId" = ? AND "competence" = ?`,
        companyId, competence
      )

      if (existing.length) {
        report.push({ companyId, action: 'skipped', reason: 'já existe snapshot para esta competência' })
        skipped++
        continue
      }

      if (!dryRun) {
        const id = randomUUID()
        const now = new Date()
        await prisma.$executeRawUnsafe(`
          INSERT INTO "CompanyOperationalSnapshot" (
            "id","companyId","competence",
            "headcountActive","headcountApprentice","headcountIntern","headcountOnLeave",
            "avgAdmissions","avgTerminations","avgVacations","folhasProcessadas",
            "complexity","automationLevel","observations","createdAt","updatedAt"
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `,
          id, companyId, competence,
          link.headcountActive ?? null,
          link.headcountApprentice ?? null,
          link.headcountIntern ?? null,
          link.headcountOnLeave ?? null,
          link.avgAdmissions ?? null,
          link.avgTerminations ?? null,
          link.avgVacations ?? null,
          link.folhasProcessadas ?? null,
          link.complexity ?? null,
          link.automationLevel ?? null,
          `Migrado de MemberCompanyLink — responsável: ${link.memberName}`,
          now, now
        )
      }

      report.push({
        companyId,
        action: dryRun ? 'would_create' : 'created',
        source: link.memberName,
        competence,
        data: {
          headcountActive: link.headcountActive,
          headcountApprentice: link.headcountApprentice,
          complexity: link.complexity,
          automationLevel: link.automationLevel,
        },
      })
      created++
    }

    return NextResponse.json({
      dryRun,
      competence,
      total: companies.length,
      created,
      skipped,
      conflicts,
      report,
    })
  } catch (e) {
    console.error('[companies/migrate POST]', e)
    return NextResponse.json({ error: 'Erro na migração' }, { status: 500 })
  }
}
