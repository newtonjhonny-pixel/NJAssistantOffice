import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { computeFinal, validateMovements, ensureSchema, ni, n0, nextMonth } from '../_utils'

export const dynamic = 'force-dynamic'

/** Recalcula recursivamente as competências seguintes (PRE_CALCULADA ou FECHADA). */
async function cascadeRecalculate(companyId: string, fromCompetence: string, newInitial: {
  headcountFinalActive: number; headcountFinalApprentice: number;
  headcountFinalIntern: number; headcountFinalOnLeave: number;
}) {
  const nextComp = nextMonth(fromCompetence)
  const nexts = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "CompanyOperationalSnapshot" WHERE "companyId" = ? AND "competence" = ?`,
    companyId, nextComp
  )
  if (!nexts.length) return

  const next = nexts[0]
  const newFinal = computeFinal({
    ...next,
    headcountInitialActive:     newInitial.headcountFinalActive,
    headcountInitialApprentice: newInitial.headcountFinalApprentice,
    headcountInitialIntern:     newInitial.headcountFinalIntern,
    headcountInitialOnLeave:    newInitial.headcountFinalOnLeave,
  })

  const now = new Date().toISOString()
  await prisma.$executeRawUnsafe(`
    UPDATE "CompanyOperationalSnapshot"
    SET
      "headcountInitialActive"     = ?,
      "headcountInitialApprentice" = ?,
      "headcountInitialIntern"     = ?,
      "headcountInitialOnLeave"    = ?,
      "headcountFinalActive"       = ?,
      "headcountFinalApprentice"   = ?,
      "headcountFinalIntern"       = ?,
      "headcountFinalOnLeave"      = ?,
      "updatedAt" = ?
    WHERE "id" = ?
  `,
    newInitial.headcountFinalActive,
    newInitial.headcountFinalApprentice,
    newInitial.headcountFinalIntern,
    newInitial.headcountFinalOnLeave,
    newFinal.headcountFinalActive,
    newFinal.headcountFinalApprentice,
    newFinal.headcountFinalIntern,
    newFinal.headcountFinalOnLeave,
    now, next.id
  )

  if (next.status === 'FECHADA' || next.status === 'PRE_CALCULADA') {
    await cascadeRecalculate(companyId, nextComp, newFinal)
  }
}

// ─── PATCH /api/gestao-equipe/companies/[id]/operational/[snapshotId] ────────

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; snapshotId: string } }
) {
  try {
    await ensureSchema()
    const body = await req.json()

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "CompanyOperationalSnapshot" WHERE "id" = ? AND "companyId" = ?`,
      params.snapshotId, params.id
    )
    if (!rows.length)
      return NextResponse.json({ error: 'Snapshot não encontrado.' }, { status: 404 })

    const current = rows[0]

    const merged: Record<string, any> = {
      headcountInitialActive:     ni(body.headcountInitialActive)     ?? ni(current.headcountInitialActive)     ?? ni(current.headcountActive),
      headcountInitialApprentice: ni(body.headcountInitialApprentice) ?? ni(current.headcountInitialApprentice) ?? ni(current.headcountApprentice),
      headcountInitialIntern:     ni(body.headcountInitialIntern)     ?? ni(current.headcountInitialIntern)     ?? ni(current.headcountIntern),
      headcountInitialOnLeave:    ni(body.headcountInitialOnLeave)    ?? ni(current.headcountInitialOnLeave)    ?? ni(current.headcountOnLeave),
      admissionsClt:        n0(body.admissionsClt        ?? current.admissionsClt),
      admissionsApprentice: n0(body.admissionsApprentice ?? current.admissionsApprentice),
      admissionsIntern:     n0(body.admissionsIntern     ?? current.admissionsIntern),
      entriesClt:           n0(body.entriesClt           ?? current.entriesClt),
      entriesApprentice:    n0(body.entriesApprentice    ?? current.entriesApprentice),
      entriesIntern:        n0(body.entriesIntern        ?? current.entriesIntern),
      terminationsClt:      n0(body.terminationsClt      ?? current.terminationsClt),
      terminationsApprentice: n0(body.terminationsApprentice ?? current.terminationsApprentice),
      terminationsIntern:   n0(body.terminationsIntern   ?? current.terminationsIntern),
      exitsClt:             n0(body.exitsClt             ?? current.exitsClt),
      exitsApprentice:      n0(body.exitsApprentice      ?? current.exitsApprentice),
      exitsIntern:          n0(body.exitsIntern          ?? current.exitsIntern),
      newLeaves:            n0(body.newLeaves            ?? current.newLeaves),
      returnFromLeave:      n0(body.returnFromLeave      ?? current.returnFromLeave),
    }

    const validErr = validateMovements(merged)
    if (validErr) return NextResponse.json({ error: validErr }, { status: 422 })

    const final = computeFinal(merged)

    const wasInitial = current.status === 'INICIAL' || current.status === 'PRE_CALCULADA'
    const newStatus = body.status ?? (wasInitial ? 'EM_PREENCHIMENTO' : current.status ?? 'EM_PREENCHIMENTO')

    const now = new Date().toISOString()
    await prisma.$executeRawUnsafe(`
      UPDATE "CompanyOperationalSnapshot" SET
        "headcountInitialActive"     = ?,
        "headcountInitialApprentice" = ?,
        "headcountInitialIntern"     = ?,
        "headcountInitialOnLeave"    = ?,
        "admissionsClt"              = ?,
        "admissionsApprentice"       = ?,
        "admissionsIntern"           = ?,
        "entriesClt"                 = ?,
        "entriesApprentice"          = ?,
        "entriesIntern"              = ?,
        "terminationsClt"            = ?,
        "terminationsApprentice"     = ?,
        "terminationsIntern"         = ?,
        "exitsClt"                   = ?,
        "exitsApprentice"            = ?,
        "exitsIntern"                = ?,
        "newLeaves"                  = ?,
        "returnFromLeave"            = ?,
        "headcountFinalActive"       = ?,
        "headcountFinalApprentice"   = ?,
        "headcountFinalIntern"       = ?,
        "headcountFinalOnLeave"      = ?,
        "status"                     = ?,
        "observations"               = ?,
        "updatedAt"                  = ?
      WHERE "id" = ?
    `,
      merged.headcountInitialActive, merged.headcountInitialApprentice,
      merged.headcountInitialIntern, merged.headcountInitialOnLeave,
      merged.admissionsClt, merged.admissionsApprentice, merged.admissionsIntern,
      merged.entriesClt, merged.entriesApprentice, merged.entriesIntern,
      merged.terminationsClt, merged.terminationsApprentice, merged.terminationsIntern,
      merged.exitsClt, merged.exitsApprentice, merged.exitsIntern,
      merged.newLeaves, merged.returnFromLeave,
      final.headcountFinalActive, final.headcountFinalApprentice,
      final.headcountFinalIntern, final.headcountFinalOnLeave,
      newStatus,
      body.observations !== undefined ? (body.observations?.trim() || null) : current.observations,
      now, params.snapshotId
    )

    // Verifica competência seguinte
    const nextComp = nextMonth(current.competence)
    const nextRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "CompanyOperationalSnapshot" WHERE "companyId" = ? AND "competence" = ?`,
      params.id, nextComp
    )

    let conflict: object | null = null

    if (nextRows.length) {
      const next = nextRows[0]
      const currentNextInitActive = ni(next.headcountInitialActive) ?? ni(next.headcountActive)
      const expectedInitActive    = final.headcountFinalActive

      if (body.cascade === true) {
        await cascadeRecalculate(params.id, current.competence, final)
      } else if (next.status === 'PRE_CALCULADA') {
        await cascadeRecalculate(params.id, current.competence, final)
      } else if (currentNextInitActive !== expectedInitActive) {
        const hasMovements = n0(next.admissionsClt) + n0(next.terminationsClt) +
          n0(next.entriesClt) + n0(next.exitsClt) + n0(next.newLeaves) > 0
        conflict = {
          nextCompetence: nextComp,
          currentInitial: currentNextInitActive,
          expectedInitial: expectedInitActive,
          hasMovements,
          nextStatus: next.status,
        }
      }
    }

    const updated = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "CompanyOperationalSnapshot" WHERE "id" = ?`, params.snapshotId
    )
    return NextResponse.json({ snapshot: updated[0], conflict })
  } catch (e) {
    console.error('[operational/[snapshotId] PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar snapshot' }, { status: 500 })
  }
}

// ─── DELETE /api/gestao-equipe/companies/[id]/operational/[snapshotId] ────────

export async function DELETE(
  _: Request,
  { params }: { params: { id: string; snapshotId: string } }
) {
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "CompanyOperationalSnapshot" WHERE "id" = ? AND "companyId" = ?`,
      params.snapshotId, params.id
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[operational/[snapshotId] DELETE]', e)
    return NextResponse.json({ error: 'Erro ao deletar snapshot' }, { status: 500 })
  }
}
