import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'

// ─── GET /api/gestao-equipe/companies/[id]/team ───────────────────────────────
// Retorna todos os colaboradores vinculados à empresa com resumo de carga.

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const comp = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id", "name" FROM "ClientCompany" WHERE "id" = ?`, params.id
    )
    if (!comp.length)
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    // Links com dados do colaborador
    const links = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        mcl.*,
        tm."name"   AS "memberName",
        tm."role"   AS "memberRole_",
        tm."status" AS "memberStatus"
      FROM "MemberCompanyLink" mcl
      JOIN "TeamMember" tm ON tm."id" = mcl."memberId"
      WHERE mcl."companyId" = ?
      ORDER BY mcl."memberRole" ASC, tm."name" ASC
    `, params.id)

    // Carga por colaborador: soma de atividades DpActivityInstance
    const seen = new Set<string>()
    const memberIds: string[] = []
    for (const l of links) { if (!seen.has(l.memberId)) { seen.add(l.memberId); memberIds.push(l.memberId) } }
    const loadMap: Record<string, number> = {}

    for (const memberId of memberIds) {
      try {
        const activities = await prisma.$queryRawUnsafe<any[]>(`
          SELECT dai."volume", dai."avgTimeMinutes"
          FROM "DpActivityInstance" dai
          JOIN "MemberCompanyLink" mcl ON mcl."id" = dai."linkId"
          WHERE mcl."memberId" = ? AND mcl."companyId" = ?
        `, memberId, params.id)

        const totalHours = activities.reduce((acc: number, a: any) => {
          const vol = Number(a.volume ?? 0)
          const mins = Number(a.avgTimeMinutes ?? 0)
          return acc + (vol * mins) / 60
        }, 0)
        loadMap[memberId] = Math.round(totalHours * 10) / 10
      } catch {
        loadMap[memberId] = 0
      }
    }

    const result = links.map((l: any) => ({
      ...l,
      estimatedMonthlyHours: loadMap[l.memberId] ?? 0,
    }))

    return NextResponse.json({ company: comp[0], team: result })
  } catch (e) {
    console.error('[companies/team GET]', e)
    return NextResponse.json({ error: 'Erro ao buscar equipe' }, { status: 500 })
  }
}
