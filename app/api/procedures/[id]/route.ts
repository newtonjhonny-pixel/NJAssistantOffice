import { NextRequest, NextResponse } from 'next/server'
import { prismaSqlite as prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const docs = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureDocument" WHERE id = ?`, params.id
  )
  if (!docs.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const doc = docs[0]

  const steps = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureStep" WHERE "documentId" = ? ORDER BY "order" ASC`, params.id
  )
  const checklistItems = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureChecklistItem" WHERE "documentId" = ? ORDER BY "order" ASC`, params.id
  )
  const attachments = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureAttachment" WHERE "documentId" = ? ORDER BY "createdAt" ASC`, params.id
  )

  return NextResponse.json({ ...doc, steps, checklistItems, attachments })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const now  = new Date()

  // type sÃ³ Ã© atualizado quando explicitamente enviado (migraÃ§Ã£o de legado)
  const typeClause = body.type ? ', type = ?' : ''
  const typeParam  = body.type ? [body.type] : []

  // Snap do documento atual para o histÃ³rico
  const before = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT workflowStatus, status, version FROM "ProcedureDocument" WHERE id = ?`, params.id
  )
  const prev = before[0] ?? {}

  await prisma.$executeRawUnsafe(
    `UPDATE "ProcedureDocument" SET
      title = ?, process = ?, department = ?, responsible = ?,
      objective = ?, application = ?, "systemsUsed" = ?, description = ?,
      responsibilities = ?, "attentionPoints" = ?, risks = ?, "expectedResult" = ?,
      notes = ?, "processId" = ?, status = ?, version = ?,
      subtitle = ?, category = ?, macroprocess = ?, unit = ?, company = ?,
      "targetAudience" = ?, scope = ?, "infoClassification" = ?,
      "legalBasis" = ?, "retentionPeriod" = ?, "revisionNumber" = ?,
      "elaborationDate" = ?, "approvalDate" = ?, "effectiveDate" = ?,
      "reviewPeriodicity" = ?, "creationReason" = ?, "revisionReason" = ?,
      "replacedDocument" = ?, "successorDocument" = ?, tags = ?, keywords = ?,
      "elaboratedBy" = ?, "technicalReviewer" = ?, "qualityReviewer" = ?,
      "legalReviewer" = ?, "processOwner" = ?, "publicationResponsible" = ?,
      substitute = ?, "approvalCommittee" = ?, "approvalLevel" = ?,
      "approvalDeadline" = ?, "workflowStatus" = ?,
      "nextReview" = ?, reviewer = ?, approver = ?,
      code = ?${typeClause}, "updatedAt" = ?
    WHERE id = ?`,
    body.title             ?? null,
    body.process           ?? null,
    body.department        ?? null,
    body.responsible       ?? null,
    body.objective         ?? null,
    body.application       ?? null,
    body.systemsUsed       ?? null,
    body.description       ?? null,
    body.responsibilities  ?? null,
    body.attentionPoints   ?? null,
    body.risks             ?? null,
    body.expectedResult    ?? null,
    body.notes             ?? null,
    body.processId         || null,
    body.status            ?? 'VIGENTE',
    body.version           ?? 'v1.0',
    // Fase 1 â€” IdentificaÃ§Ã£o
    body.subtitle          ?? null,
    body.category          ?? null,
    body.macroprocess      ?? null,
    body.unit              ?? null,
    body.company           ?? null,
    body.targetAudience    ?? null,
    body.scope             ?? null,
    body.infoClassification ?? 'USO_INTERNO',
    body.legalBasis        ?? null,
    body.retentionPeriod   ?? null,
    body.revisionNumber    ?? 0,
    body.elaborationDate   ?? null,
    body.approvalDate      ?? null,
    body.effectiveDate     ?? null,
    body.reviewPeriodicity ?? null,
    body.creationReason    ?? null,
    body.revisionReason    ?? null,
    body.replacedDocument  ?? null,
    body.successorDocument ?? null,
    body.tags              ?? null,
    body.keywords          ?? null,
    // Fase 1 â€” GovernanÃ§a
    body.elaboratedBy            ?? null,
    body.technicalReviewer       ?? null,
    body.qualityReviewer         ?? null,
    body.legalReviewer           ?? null,
    body.processOwner            ?? null,
    body.publicationResponsible  ?? null,
    body.substitute              ?? null,
    body.approvalCommittee       ?? null,
    body.approvalLevel           ?? null,
    body.approvalDeadline        ?? null,
    body.workflowStatus          ?? 'RASCUNHO',
    body.nextReview        ?? null,
    body.reviewer          ?? null,
    body.approver          ?? null,
    body.code              ?? null,
    ...typeParam,
    now,
    params.id,
  )

  // Registrar no histÃ³rico se workflowStatus mudou
  if (body.workflowStatus && body.workflowStatus !== prev.workflowStatus) {
    const hid = randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ProcedureHistory"
        (id, "documentId", "userName", action, "oldWorkflowStatus", "newWorkflowStatus", version, comment)
       VALUES (?, ?, ?, 'STATUS', ?, ?, ?, ?)`,
      hid, params.id,
      body._userName   ?? 'Sistema',
      prev.workflowStatus ?? null,
      body.workflowStatus,
      body.version     ?? prev.version ?? null,
      body._comment    ?? null,
    )
  }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureDocument" WHERE id = ?`, params.id
  )
  const steps = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureStep" WHERE "documentId" = ? ORDER BY "order" ASC`, params.id
  )
  const checklistItems = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureChecklistItem" WHERE "documentId" = ? ORDER BY "order" ASC`, params.id
  )
  const attachments = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureAttachment" WHERE "documentId" = ? ORDER BY "createdAt" ASC`, params.id
  )
  return NextResponse.json({ ...rows[0], steps, checklistItems, attachments })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const now  = new Date()

  const before = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT workflowStatus, status, version, title, objective, description, risks, responsibilities
     FROM "ProcedureDocument" WHERE id = ?`, params.id
  )
  if (!before.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const prev = before[0]

  const fields: string[]  = []
  const values: unknown[] = []

  if (body.status !== undefined) { fields.push('status = ?');         values.push(body.status) }
  if (body.workflowStatus !== undefined) { fields.push('"workflowStatus" = ?'); values.push(body.workflowStatus) }
  if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

  fields.push('"updatedAt" = ?')
  values.push(now)
  values.push(params.id)

  await prisma.$executeRawUnsafe(
    `UPDATE "ProcedureDocument" SET ${fields.join(', ')} WHERE id = ?`,
    ...values,
  )

  if (body.workflowStatus && body.workflowStatus !== prev.workflowStatus) {
    const hid = randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ProcedureHistory"
        (id, "documentId", "userName", action, "oldWorkflowStatus", "newWorkflowStatus", version, comment)
       VALUES (?, ?, ?, 'STATUS', ?, ?, ?, ?)`,
      hid, params.id,
      body._userName          ?? 'Sistema',
      prev.workflowStatus     ?? null,
      body.workflowStatus,
      body.version ?? prev.version ?? null,
      body._comment           ?? null,
    )

    // Quando publica para VIGENTE: grava snapshot dos campos principais
    if (body.workflowStatus === 'VIGENTE') {
      const snap = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT title, version, objective, description, risks, responsibilities
         FROM "ProcedureDocument" WHERE id = ?`,
        params.id,
      )
      if (snap.length) {
        const snapId = randomUUID()
        await prisma.$executeRawUnsafe(
          `INSERT INTO "ProcedureHistory"
            (id, "documentId", "userName", action, "oldWorkflowStatus", "newWorkflowStatus", version, "newValue")
           VALUES (?, ?, ?, 'VERSAO', ?, 'VIGENTE', ?, ?)`,
          snapId, params.id,
          body._userName ?? 'Sistema',
          prev.workflowStatus ?? null,
          (snap[0].version as string) ?? null,
          JSON.stringify({
            title:            snap[0].title,
            version:          snap[0].version,
            objective:        snap[0].objective,
            description:      snap[0].description,
            risks:            snap[0].risks,
            responsibilities: snap[0].responsibilities,
          }),
        )
      }
    }
  }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureDocument" WHERE id = ?`, params.id
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM "ProcedureDocument" WHERE id = ?`, params.id)
  return NextResponse.json({ ok: true })
}
