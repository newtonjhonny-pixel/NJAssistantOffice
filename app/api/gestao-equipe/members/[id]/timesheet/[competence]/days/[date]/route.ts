import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import {
  ensureTimesheetSchema, calcWorked, autoClassify, n0,
  dateToDayOfWeek, getPlannedMinutes
} from '../../../_utils'

export const dynamic = 'force-dynamic'

// PATCH /api/gestao-equipe/members/[id]/timesheet/[competence]/days/[date]
// Body: { entryMode?, entry1..exit4?, totalMinutes?, classification?, justification?,
//         justificationDesc?, status?, observations?, hasAttachment? }
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; competence: string; date: string } }
) {
  try {
    await ensureTimesheetSchema()
    const body = await req.json()

    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date))
      return NextResponse.json({ error: 'date deve ser YYYY-MM-DD.' }, { status: 400 })

    // Verifica competência
    const compRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "MonthlyTimeCompetence" WHERE "memberId" = ? AND "competence" = ?`,
      params.id, params.competence
    )
    if (compRows.length && compRows[0].status === 'FECHADA')
      return NextResponse.json({ error: 'Competência fechada.' }, { status: 409 })

    // Busca ou cria o registro do dia
    let rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "DailyTimeRecord" WHERE "memberId" = ? AND "date" = ?`,
      params.id, params.date
    )

    const now = new Date().toISOString()

    if (!rows.length) {
      // Cria registro on-the-fly
      const dow = dateToDayOfWeek(params.date)
      const { plannedMinutes, dayType, calendarEntryId, scheduleId } = await getPlannedMinutes(params.id, params.date)
      const id = randomUUID()
      await prisma.$executeRawUnsafe(`
        INSERT INTO "DailyTimeRecord" (
          "id","memberId","date","dayOfWeek","competence","dayType",
          "calendarEntryId","scheduleId","plannedMinutes",
          "entryMode","workedMinutes","balanceMinutes",
          "classification","status","source","createdAt","updatedAt"
        ) VALUES (?,?,?,?,?,?,?,?,?,'MARCACAO',0,0,'SEM_EFEITO','NAO_PREENCHIDO','MANUAL',?,?)
      `,
        id, params.id, params.date, dow, params.competence, dayType,
        calendarEntryId ?? null, scheduleId ?? null, plannedMinutes, now, now
      )
      rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "DailyTimeRecord" WHERE "id" = ?`, id
      )
    }

    const current = rows[0]

    if (current.status === 'FECHADO')
      return NextResponse.json({ error: 'Dia fechado. Não é possível editar.' }, { status: 409 })

    // Merge dos campos
    const merged = {
      entryMode:         body.entryMode         ?? current.entryMode         ?? 'MARCACAO',
      entry1:            body.entry1  !== undefined ? (body.entry1 || null)  : current.entry1,
      exit1:             body.exit1   !== undefined ? (body.exit1  || null)  : current.exit1,
      entry2:            body.entry2  !== undefined ? (body.entry2 || null)  : current.entry2,
      exit2:             body.exit2   !== undefined ? (body.exit2  || null)  : current.exit2,
      entry3:            body.entry3  !== undefined ? (body.entry3 || null)  : current.entry3,
      exit3:             body.exit3   !== undefined ? (body.exit3  || null)  : current.exit3,
      entry4:            body.entry4  !== undefined ? (body.entry4 || null)  : current.entry4,
      exit4:             body.exit4   !== undefined ? (body.exit4  || null)  : current.exit4,
      totalMinutes:      body.totalMinutes  !== undefined ? (body.totalMinutes  ?? null) : current.totalMinutes,
      plannedMinutes:    body.plannedMinutes !== undefined ? n0(body.plannedMinutes) : n0(current.plannedMinutes),
      justification:     body.justification     ?? current.justification,
      justificationDesc: body.justificationDesc ?? current.justificationDesc,
      hasAttachment:     body.hasAttachment      ?? (current.hasAttachment === 1 || current.hasAttachment === true),
      observations:      body.observations       ?? current.observations,
    }

    const workedMinutes = calcWorked(merged)
    const balanceMinutes = workedMinutes - merged.plannedMinutes

    // Classificação:
    // - Se o usuário escolheu explicitamente algo diferente de PENDENTE → respeita
    // - Se está PENDENTE (padrão / não alterado) ou não enviado → auto-classifica
    //   pela regra de tolerância: |saldo| ≤ 10 min → SEM_EFEITO, > 10 min → BANCO
    const bodyClass = body.classification
    const classification = (bodyClass && bodyClass !== 'PENDENTE')
      ? bodyClass
      : autoClassify(balanceMinutes, current.dayType, merged.plannedMinutes, workedMinutes)

    // Status: usa o do body se enviado, senão deriva
    let status = body.status ?? deriveStatus(
      workedMinutes, merged.plannedMinutes, classification, merged.justification
    )

    // Source
    const source = body.source ?? (current.source === 'MANUAL' ? 'MANUAL' : current.source ?? 'MANUAL')

    await prisma.$executeRawUnsafe(`
      UPDATE "DailyTimeRecord" SET
        "entryMode" = ?, "entry1" = ?, "exit1" = ?, "entry2" = ?, "exit2" = ?,
        "entry3" = ?, "exit3" = ?, "entry4" = ?, "exit4" = ?,
        "totalMinutes" = ?, "plannedMinutes" = ?,
        "workedMinutes" = ?, "balanceMinutes" = ?,
        "classification" = ?, "justification" = ?, "justificationDesc" = ?,
        "hasAttachment" = ?, "status" = ?, "source" = ?,
        "observations" = ?, "updatedAt" = ?
      WHERE "memberId" = ? AND "date" = ?
    `,
      merged.entryMode, merged.entry1, merged.exit1, merged.entry2, merged.exit2,
      merged.entry3, merged.exit3, merged.entry4, merged.exit4,
      merged.totalMinutes ?? null, merged.plannedMinutes,
      workedMinutes, balanceMinutes,
      classification, merged.justification ?? null, merged.justificationDesc ?? null,
      merged.hasAttachment ? 1 : 0, status, source,
      merged.observations ?? null, now,
      params.id, params.date
    )

    const updated = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "DailyTimeRecord" WHERE "memberId" = ? AND "date" = ?`,
      params.id, params.date
    )
    return NextResponse.json(updated[0])
  } catch (e) {
    console.error('[timesheet days PATCH]', e)
    return NextResponse.json({ error: 'Erro ao salvar ponto' }, { status: 500 })
  }
}

// DELETE /api/gestao-equipe/members/[id]/timesheet/[competence]/days/[date]
// Reseta o registro do dia para NAO_PREENCHIDO (não exclui o registro)
export async function DELETE(
  _: Request,
  { params }: { params: { id: string; competence: string; date: string } }
) {
  try {
    const now = new Date().toISOString()
    await prisma.$executeRawUnsafe(`
      UPDATE "DailyTimeRecord" SET
        "entryMode" = 'MARCACAO', "entry1" = NULL, "exit1" = NULL,
        "entry2" = NULL, "exit2" = NULL, "entry3" = NULL, "exit3" = NULL,
        "entry4" = NULL, "exit4" = NULL, "totalMinutes" = NULL,
        "workedMinutes" = 0, "balanceMinutes" = 0,
        "classification" = 'SEM_EFEITO', "justification" = NULL,
        "justificationDesc" = NULL, "hasAttachment" = 0,
        "status" = 'NAO_PREENCHIDO', "observations" = NULL, "updatedAt" = ?
      WHERE "memberId" = ? AND "date" = ?
    `, now, params.id, params.date)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[timesheet days DELETE]', e)
    return NextResponse.json({ error: 'Erro ao limpar dia' }, { status: 500 })
  }
}

function deriveStatus(
  worked: number, planned: number,
  classification: string, justification?: string | null
): string {
  if (worked === 0 && planned === 0) return 'NAO_PREENCHIDO'
  if (worked > 0) return 'PREENCHIDO'
  if (justification) return 'JUSTIFICADO'
  return 'PENDENTE'
}
