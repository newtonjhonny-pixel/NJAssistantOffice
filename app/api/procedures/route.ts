import { NextRequest, NextResponse } from 'next/server'
import { prismaSqlite as prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'


// â”€â”€ Prefixos de cÃ³digo por tipo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CODE_PREFIX: Record<string, string> = {
  POP:         'POP',
  IT:          'IT',
  CHECKLIST:   'CHK',
  POLITICA:    'POL',
  NORMA:       'NOR',
  CONTINGENCIA:'PC',
  TERMO:       'TR',
  MANUAL:      'MAN',
}

async function generateCode(type: string, department?: string): Promise<string> {
  const prefix = CODE_PREFIX[type] ?? type.slice(0, 3).toUpperCase()
  const deptPart = department
    ? department.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3)
    : 'GRL'
  // Conta quantos docs deste tipo jÃ¡ existem para gerar nÃºmero sequencial
  const rows = await prisma.$queryRawUnsafe<{ cnt: number }[]>(
    `SELECT COUNT(*) as cnt FROM "ProcedureDocument" WHERE type = ?`, type
  )
  const next = (Number(rows[0]?.cnt ?? 0) + 1).toString().padStart(3, '0')
  return `${prefix}-${deptPart}-${next}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type        = searchParams.get('type')       || ''
  const search      = searchParams.get('search')     || ''
  const department  = searchParams.get('department') || ''
  const responsible = searchParams.get('responsible')|| ''

  let sql = `SELECT d.*,
    (SELECT COUNT(*) FROM "ProcedureStep" s WHERE s."documentId" = d.id) AS "stepCount",
    (SELECT COUNT(*) FROM "ProcedureChecklistItem" c WHERE c."documentId" = d.id) AS "checklistCount"
    FROM "ProcedureDocument" d WHERE 1=1`
  const params: unknown[] = []

  if (type)        { sql += ` AND d.type = ?`;               params.push(type) }
  if (department)  { sql += ` AND d.department = ?`;         params.push(department) }
  if (responsible) { sql += ` AND d.responsible = ?`;        params.push(responsible) }
  if (search) {
    const s = `%${search}%`
    sql += ` AND (d.title LIKE ? OR d.process LIKE ? OR d.description LIKE ? OR d.code LIKE ?)`
    params.push(s, s, s, s)
  }
  sql += ` ORDER BY d."updatedAt" DESC`

  const docs = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params)
  return NextResponse.json(docs.map(d => {
    const { stepCount, checklistCount, stepcount, checklistcount, ...rest } = d
    return {
      ...rest,
      _count: {
        steps: Number(stepCount ?? stepcount ?? 0),
        checklistItems: Number(checklistCount ?? checklistcount ?? 0),
      },
    }
  }))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const id   = randomUUID()
  const now  = new Date()

  // â”€â”€ CriaÃ§Ã£o a partir de template â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (body.templateId) {
    const tplRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "ProcedureDocument" WHERE id = ?`, body.templateId
    )
    if (!tplRows.length) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    const tpl = tplRows[0]

    const code = await generateCode(tpl.type as string, tpl.department as string | undefined)
    // Remove o marcador __template__ das tags clonadas
    const rawTags = tpl.tags as string | null
    const cleanTags = rawTags
      ? rawTags.split(',').map(t => t.trim()).filter(t => t && t !== '__template__').join(',') || null
      : null

    await prisma.$executeRawUnsafe(
      `INSERT INTO "ProcedureDocument"
        (id, type, title, process, department, responsible, code, status, "workflowStatus",
         version, objective, application, "systemsUsed", description, responsibilities,
         "attentionPoints", risks, "expectedResult", notes, tags,
         subtitle, category, macroprocess, unit, company, "targetAudience", scope,
         "infoClassification", "legalBasis", "retentionPeriod",
         "reviewPeriodicity", "approvalLevel",
         "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, 'RASCUNHO', 'RASCUNHO', 'v1.0',
               ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
               ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
               ?, ?,
               ?, ?)`,
      id, tpl.type,
      body.title || `CÃ³pia de ${tpl.title}`,
      tpl.process     || null,
      tpl.department  || null,
      tpl.responsible || null,
      code,
      tpl.objective        || null,
      tpl.application      || null,
      tpl.systemsUsed      || null,
      tpl.description      || null,
      tpl.responsibilities || null,
      tpl.attentionPoints  || null,
      tpl.risks            || null,
      tpl.expectedResult   || null,
      tpl.notes            || null,
      cleanTags,
      tpl.subtitle         || null,
      tpl.category         || null,
      tpl.macroprocess     || null,
      tpl.unit             || null,
      tpl.company          || null,
      tpl.targetAudience   || null,
      tpl.scope            || null,
      tpl.infoClassification || 'USO_INTERNO',
      tpl.legalBasis       || null,
      tpl.retentionPeriod  || null,
      tpl.reviewPeriodicity || null,
      tpl.approvalLevel    || null,
      now, now,
    )

    // Clonar passos (IT)
    const steps = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "ProcedureStep" WHERE "documentId" = ? ORDER BY "order" ASC`, body.templateId
    )
    for (const s of steps) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "ProcedureStep"
          (id, "documentId", "order", title, description, "imagePath", notes, "attentionPoint")
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
        randomUUID(), id, s.order, s.title, s.description || null, s.notes || null, s.attentionPoint || null,
      )
    }

    // Clonar itens de checklist
    const items = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "ProcedureChecklistItem" WHERE "documentId" = ? ORDER BY "order" ASC`, body.templateId
    )
    for (const item of items) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "ProcedureChecklistItem"
          (id, "documentId", "order", description, required, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        randomUUID(), id, item.order, item.description, item.required, item.notes || null,
      )
    }

    const hid = randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ProcedureHistory"
        (id, "documentId", "userName", action, "newWorkflowStatus", version, comment)
       VALUES (?, ?, 'Sistema', 'CRIACAO', 'RASCUNHO', 'v1.0', ?)`,
      hid, id, `Criado a partir do template: ${tpl.title}`,
    )

    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "ProcedureDocument" WHERE id = ?`, id
    )
    return NextResponse.json(rows[0], { status: 201 })
  }

  // â”€â”€ CriaÃ§Ã£o padrÃ£o (do zero) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const code = body.code || await generateCode(body.type, body.department)

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ProcedureDocument"
      (id, type, title, process, department, responsible, code, status, "workflowStatus",
       version, "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, 'RASCUNHO', 'RASCUNHO', 'v1.0', ?, ?)`,
    id,
    body.type,
    body.title || `Novo ${body.type}`,
    body.process     || null,
    body.department  || null,
    body.responsible || null,
    code,
    now, now,
  )

  const hid = randomUUID()
  await prisma.$executeRawUnsafe(
    `INSERT INTO "ProcedureHistory"
      (id, "documentId", "userName", action, "newWorkflowStatus", version)
     VALUES (?, ?, 'Sistema', 'CRIACAO', 'RASCUNHO', 'v1.0')`,
    hid, id,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureDocument" WHERE id = ?`, id
  )
  return NextResponse.json(rows[0], { status: 201 })
}
