import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { computeFinal, validateMovements, ensureSchema, ni, n0, nextMonth } from '../../_utils'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// ─── POST /api/gestao-equipe/companies/[id]/operational/[snapshotId]/close ────
// Fecha a competência atual (FECHADA) e cria/atualiza a próxima (PRE_CALCULADA)
// com o saldo final desta como saldo inicial da próxima.

export async function POST(
  _: Request,
  { params }: { params: { id: string; snapshotId: string } }
) {
  try {
    await ensureSchema()

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "CompanyOperationalSnapshot" WHERE "id" = ? AND "companyId" = ?`,
      params.snapshotId, params.id
    )
    if (!rows.length)
      return NextResponse.json({ error: 'Snapshot não encontrado.' }, { status: 404 })

    const snap = rows[0]

    if (snap.status === 'FECHADA')
      return NextResponse.json({ error: 'Esta competência já está fechada.' }, { status: 400 })

    // Enriquece valores legados para compatibilidade
    const enriched = {
      ...snap,
      headcountInitialActive:     ni(snap.headcountInitialActive)     ?? ni(snap.headcountActive),
      headcountInitialApprentice: ni(snap.headcountInitialApprentice) ?? ni(snap.headcountApprentice),
      headcountInitialIntern:     ni(snap.headcountInitialIntern)     ?? ni(snap.headcountIntern),
      headcountInitialOnLeave:    ni(snap.headcountInitialOnLeave)    ?? ni(snap.headcountOnLeave),
      admissionsClt:        n0(snap.admissionsClt),
      admissionsApprentice: n0(snap.admissionsApprentice),
      admissionsIntern:     n0(snap.admissionsIntern),
      entriesClt:           n0(snap.entriesClt),
      entriesApprentice:    n0(snap.entriesApprentice),
      entriesIntern:        n0(snap.entriesIntern),
      terminationsClt:      n0(snap.terminationsClt),
      terminationsApprentice: n0(snap.terminationsApprentice),
      terminationsIntern:   n0(snap.terminationsIntern),
      exitsClt:             n0(snap.exitsClt),
      exitsApprentice:      n0(snap.exitsApprentice),
      exitsIntern:          n0(snap.exitsIntern),
      newLeaves:            n0(snap.newLeaves),
      returnFromLeave:      n0(snap.returnFromLeave),
    }

    const validErr = validateMovements(enriched)
    if (validErr) return NextResponse.json({ error: validErr }, { status: 422 })

    const final = computeFinal(enriched)
    const now = new Date().toISOString()

    // Fecha a competência atual
    await prisma.$executeRawUnsafe(`
      UPDATE "CompanyOperationalSnapshot" SET
        "headcountFinalActive"     = ?,
        "headcountFinalApprentice" = ?,
        "headcountFinalIntern"     = ?,
        "headcountFinalOnLeave"    = ?,
        "status"    = 'FECHADA',
        "closedAt"  = ?,
        "updatedAt" = ?
      WHERE "id" = ?
    `,
      final.headcountFinalActive, final.headcountFinalApprentice,
      final.headcountFinalIntern, final.headcountFinalOnLeave,
      now, now, params.snapshotId
    )

    // Verifica se a próxima competência já existe
    const nextComp = nextMonth(snap.competence)
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "CompanyOperationalSnapshot" WHERE "companyId" = ? AND "competence" = ?`,
      params.id, nextComp
    )

    let nextSnapshot: any = null

    if (!existing.length) {
      // Cria próxima competência
      const newId = randomUUID()
      await prisma.$executeRawUnsafe(`
        INSERT INTO "CompanyOperationalSnapshot" (
          "id","companyId","competence","status","isInitialCompetence",
          "headcountInitialActive","headcountInitialApprentice","headcountInitialIntern","headcountInitialOnLeave",
          "admissionsClt","admissionsApprentice","admissionsIntern",
          "entriesClt","entriesApprentice","entriesIntern",
          "terminationsClt","terminationsApprentice","terminationsIntern",
          "exitsClt","exitsApprentice","exitsIntern",
          "newLeaves","returnFromLeave",
          "createdAt","updatedAt"
        ) VALUES (
          ?,?,?,'PRE_CALCULADA',0,
          ?,?,?,?,
          0,0,0, 0,0,0, 0,0,0, 0,0,0, 0,0,
          ?,?
        )
      `,
        newId, params.id, nextComp,
        final.headcountFinalActive, final.headcountFinalApprentice,
        final.headcountFinalIntern, final.headcountFinalOnLeave,
        now, now
      )
      const newRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "CompanyOperationalSnapshot" WHERE "id" = ?`, newId
      )
      nextSnapshot = newRows[0]
    } else {
      const ex = existing[0]
      if (ex.status === 'PRE_CALCULADA') {
        // Atualiza saldo inicial da seguinte
        await prisma.$executeRawUnsafe(`
          UPDATE "CompanyOperationalSnapshot" SET
            "headcountInitialActive"     = ?,
            "headcountInitialApprentice" = ?,
            "headcountInitialIntern"     = ?,
            "headcountInitialOnLeave"    = ?,
            "updatedAt" = ?
          WHERE "id" = ?
        `,
          final.headcountFinalActive, final.headcountFinalApprentice,
          final.headcountFinalIntern, final.headcountFinalOnLeave,
          now, ex.id
        )
      }
      // Se já tiver dados (EM_PREENCHIMENTO ou FECHADA): mantém sem alterar
      const updated = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "CompanyOperationalSnapshot" WHERE "id" = ?`, ex.id
      )
      nextSnapshot = updated[0]
    }

    const closedRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "CompanyOperationalSnapshot" WHERE "id" = ?`, params.snapshotId
    )

    return NextResponse.json({ closed: closedRows[0], next: nextSnapshot })
  } catch (e) {
    console.error('[operational/[snapshotId]/close POST]', e)
    return NextResponse.json({ error: 'Erro ao fechar competência' }, { status: 500 })
  }
}
