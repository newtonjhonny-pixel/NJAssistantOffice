import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import {
  ensureImportSchema, parseFile, normalizeDate, normalizeTime,
  SYSTEM_FIELDS, ModuleId
} from '../../../_utils'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

// POST /api/importacoes/sessions/[id]/import
// Executa importação linha a linha após revisão do usuário.
// source = 'IMPORTACAO' em todos os registros criados.
// NUNCA sobrescreve registros fechados sem autorização explícita.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureImportSchema()
    const body = await req.json().catch(() => ({}))

    const sessions = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ImportSession" WHERE "id" = ?`, params.id
    )
    if (!sessions.length) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
    const session = sessions[0]

    if (!['AGUARDANDO_REVISAO'].includes(session.status))
      return NextResponse.json({ error: `Sessão não está pronta para importação (status: ${session.status})` }, { status: 409 })

    if (!session.mappingJson)
      return NextResponse.json({ error: 'Mapeamento não configurado.' }, { status: 400 })

    const mappings: { source: string; system: string | null }[] = JSON.parse(session.mappingJson)
    const systemFields = SYSTEM_FIELDS[session.module as ModuleId] ?? []
    const requiredFields = systemFields.filter(f => f.required).map(f => f.key)

    // Metadados do relatório (empresa, colaborador, etc.) — injetados em cada linha
    let sessionMetadata: Record<string, string> = {}
    try { sessionMetadata = JSON.parse(session.metadataJson ?? '{}') } catch { sessionMetadata = {} }

    // Mapeamento de metadados → campos do sistema (para relatórios mono-pessoa)
    const METADATA_FIELD_MAP: Record<string, string> = {
      nome:      'nome',
      matricula: 'matricula',
      cpf:       'cpf',
      empresa:   'empresa',
      cnpj:      'cnpj',
    }

    // Marca como IMPORTANDO
    const now = new Date().toISOString()
    await prisma.$executeRawUnsafe(
      `UPDATE "ImportSession" SET "status" = 'IMPORTANDO', "updatedAt" = ? WHERE "id" = ?`,
      now, params.id
    )

    // Lê arquivo
    const filePath = join(process.cwd(), 'public', session.filePath)
    const buf = await readFile(filePath)
    const { rows } = await parseFile(buf, session.fileType)

    let importedRows = 0, errorRows = 0, conflictRows = 0, validRows = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNow = new Date().toISOString()

      // Aplica mapeamento
      const mapped: Record<string, string> = {}
      // Injeta metadados do relatório (nome/matricula/empresa etc.)
      for (const [metaKey, sysKey] of Object.entries(METADATA_FIELD_MAP)) {
        if (sessionMetadata[metaKey]) mapped[sysKey] = sessionMetadata[metaKey]
      }
      // Aplica mapeamento de colunas (sobrescreve metadados se a coluna existir)
      for (const m of mappings) {
        if (m.system && m.source && row[m.source] !== undefined) mapped[m.system] = row[m.source] ?? ''
      }

      // Normaliza
      for (const k of Object.keys(mapped)) {
        if (['data','inicioGozo','fimGozo','inicioAquisitivo','fimAquisitivo','dataAdmissao','dataPlano','dataConclusao'].includes(k)) {
          const norm = normalizeDate(mapped[k])
          if (norm) mapped[k] = norm
        }
        if (['entrada1','saida1','entrada2','saida2','entrada3','saida3','entrada4','saida4'].includes(k)) {
          const norm = normalizeTime(mapped[k])
          if (norm) mapped[k] = norm
        }
      }

      // Valida obrigatórios
      const errors: string[] = []
      for (const req of requiredFields) {
        if (!mapped[req]?.trim()) errors.push(`Campo obrigatório "${req}" ausente`)
      }

      const recordId = randomUUID()

      if (errors.length) {
        errorRows++
        await prisma.$executeRawUnsafe(`
          INSERT INTO "ImportRecord" ("id","sessionId","rowIndex","status","sourceValuesJson","mappedValuesJson","errorMessage","createdAt")
          VALUES (?,?,?,'INVALIDO',?,?,?,?)
        `, recordId, params.id, i + 2,
           JSON.stringify(row), JSON.stringify(mapped), errors.join('; '), rowNow)
        continue
      }

      // Importa conforme o módulo
      try {
        const result = await importRow(session.module as ModuleId, mapped, params.id, recordId, rowNow)

        // Linha ignorada (ex: fim de semana sem batidas)
        if (result.entityType === 'SKIP') { validRows++; continue }

        if (result.conflict) {
          conflictRows++
          await prisma.$executeRawUnsafe(`
            INSERT INTO "ImportRecord" ("id","sessionId","rowIndex","status","memberId","companyId","sourceValuesJson","mappedValuesJson","conflictType","conflictDetail","resolution","createdAt")
            VALUES (?,?,?,'CONFLITO',?,?,?,?,?,?,'PENDENTE',?)
          `, recordId, params.id, i + 2,
             result.memberId ?? null, result.companyId ?? null,
             JSON.stringify(row), JSON.stringify(mapped),
             result.conflictType, result.conflictDetail, rowNow)

          // Salva conflito
          await prisma.$executeRawUnsafe(`
            INSERT INTO "ImportConflict" ("id","sessionId","recordId","conflictType","description","existingValue","incomingValue","createdAt")
            VALUES (?,?,?,?,?,?,?,?)
          `, randomUUID(), params.id, recordId,
             result.conflictType, result.conflictDetail,
             result.existingValue ?? '', result.incomingValue ?? '', rowNow)
        } else {
          importedRows++
          validRows++
          await prisma.$executeRawUnsafe(`
            INSERT INTO "ImportRecord" ("id","sessionId","rowIndex","status","memberId","companyId","sourceValuesJson","mappedValuesJson","importedEntityId","importedEntity","createdAt")
            VALUES (?,?,?,'IMPORTADO',?,?,?,?,?,?,?)
          `, recordId, params.id, i + 2,
             result.memberId ?? null, result.companyId ?? null,
             JSON.stringify(row), JSON.stringify(mapped),
             result.entityId ?? null, result.entityType ?? null, rowNow)

          // Audit log
          if (result.auditEntries?.length) {
            for (const a of result.auditEntries) {
              await prisma.$executeRawUnsafe(`
                INSERT INTO "ImportAuditLog" ("id","sessionId","recordId","entityType","entityId","fieldName","oldValue","newValue","action","createdAt")
                VALUES (?,?,?,?,?,?,?,?,?,?)
              `, randomUUID(), params.id, recordId,
                 a.entityType, a.entityId, a.fieldName, a.oldValue ?? null, a.newValue ?? null, a.action, rowNow)
            }
          }
        }
      } catch (rowErr: any) {
        errorRows++
        await prisma.$executeRawUnsafe(`
          INSERT INTO "ImportRecord" ("id","sessionId","rowIndex","status","sourceValuesJson","mappedValuesJson","errorMessage","createdAt")
          VALUES (?,?,?,'INVALIDO',?,?,?,?)
        `, recordId, params.id, i + 2,
           JSON.stringify(row), JSON.stringify(mapped),
           rowErr?.message ?? 'Erro inesperado', rowNow)
      }
    }

    // Finaliza sessão
    const finalStatus = rows.length === 0 ? 'CONCLUIDO'
      : importedRows + conflictRows > 0 ? 'CONCLUIDO' : 'ERRO'

    await prisma.$executeRawUnsafe(`
      UPDATE "ImportSession" SET
        "status" = ?, "totalRows" = ?, "validRows" = ?,
        "errorRows" = ?, "conflictRows" = ?, "importedRows" = ?,
        "updatedAt" = ?
      WHERE "id" = ?
    `, finalStatus, rows.length, validRows, errorRows, conflictRows, importedRows,
       new Date().toISOString(), params.id)

    return NextResponse.json({ ok: true, total: rows.length, importedRows, errorRows, conflictRows })
  } catch (e) {
    console.error('[importacoes import POST]', e)
    await prisma.$executeRawUnsafe(
      `UPDATE "ImportSession" SET "status" = 'ERRO', "errorMessage" = ?, "updatedAt" = ? WHERE "id" = ?`,
      String((e as any)?.message ?? 'Erro'), new Date().toISOString(), params.id
    ).catch(() => {})
    return NextResponse.json({ error: 'Erro durante importação' }, { status: 500 })
  }
}

// ─── IMPORTADORES POR MÓDULO ──────────────────────────────────────────────────

interface ImportResult {
  conflict?: boolean
  conflictType?: string
  conflictDetail?: string
  existingValue?: string
  incomingValue?: string
  entityId?: string
  entityType?: string
  memberId?: string
  companyId?: string
  auditEntries?: { entityType: string; entityId: string; fieldName: string; oldValue?: string; newValue?: string; action: string }[]
}

async function importRow(
  module: ModuleId,
  mapped: Record<string, string>,
  sessionId: string,
  recordId: string,
  now: string
): Promise<ImportResult> {
  switch (module) {
    case 'PONTO_DIARIO':   return importPontoDiario(mapped, now)
    case 'COLABORADORES':  return importColaborador(mapped, now)
    case 'FERIAS':         return importFerias(mapped, now)
    case 'BANCO_HORAS':    return importBancoHoras(mapped, now)
    case 'TREINAMENTOS':   return importTreinamento(mapped, now)
    case 'OPERACIONAL':    return importOperacional(mapped, now)
    case 'EMPRESAS':       return importEmpresa(mapped, now)
    default:               throw new Error(`Módulo não implementado: ${module}`)
  }
}

// ─── PONTO DIÁRIO ─────────────────────────────────────────────────────────────

async function importPontoDiario(mapped: Record<string, string>, now: string): Promise<ImportResult> {
  // Resolve membro
  const member = await resolveMember(mapped)
  if (!member) throw new Error(`Colaborador não encontrado: CPF=${mapped.cpf ?? '?'} Nome=${mapped.nome ?? '?'}`)

  const date = mapped.data
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error(`Data inválida: "${mapped.data}"`)

  const competence = date.slice(0, 7) // YYYY-MM

  // Verifica se o dia já existe
  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "DailyTimeRecord" WHERE "memberId" = ? AND "date" = ?`,
    member.id, date
  )

  if (existing.length && existing[0].status === 'FECHADO') {
    return {
      conflict: true,
      conflictType: 'FECHADO',
      conflictDetail: `Dia ${date} já fechado para ${member.name}`,
      existingValue: existing[0].status,
      incomingValue: 'IMPORTACAO',
      memberId: member.id,
    }
  }

  // Detecta "BANCO H" / "BANCO" nas células de marcação → justificativa
  const BANCO_H_PATTERN = /^banco\s*h?/i
  function isbancoH(v: string | undefined): boolean {
    return !!v && BANCO_H_PATTERN.test(v.trim())
  }
  const hasBancoH = [mapped.entrada1, mapped.saida1, mapped.entrada2, mapped.saida2].some(isbancoH)
  const justificativa = hasBancoH
    ? 'BANCO DE HORAS'
    : (mapped.justificativa || null)

  // Monta campos de marcação (anula valores "BANCO H")
  const entry1  = isbancoH(mapped.entrada1) ? null : (mapped.entrada1 || null)
  const exit1   = isbancoH(mapped.saida1)   ? null : (mapped.saida1   || null)
  const entry2  = isbancoH(mapped.entrada2) ? null : (mapped.entrada2 || null)
  const exit2   = isbancoH(mapped.saida2)   ? null : (mapped.saida2   || null)
  const entry3  = isbancoH(mapped.entrada3) ? null : (mapped.entrada3 || null)
  const exit3   = isbancoH(mapped.saida3)   ? null : (mapped.saida3   || null)
  const entry4  = isbancoH(mapped.entrada4) ? null : (mapped.entrada4 || null)
  const exit4   = isbancoH(mapped.saida4)   ? null : (mapped.saida4   || null)

  // Calcula workedMinutes
  function hhmm2min(s: string | null): number {
    if (!s) return 0
    const [h, m] = s.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }
  function pairMin(e: string | null, x: string | null) {
    if (!e || !x) return 0
    const d = hhmm2min(x) - hhmm2min(e)
    return d > 0 ? d : 0
  }

  const totalFromMapped = mapped.totalMinutos ? parseInt(mapped.totalMinutos) : null
  const workedMinutes = totalFromMapped ?? (
    pairMin(entry1, exit1) + pairMin(entry2, exit2) +
    pairMin(entry3, exit3) + pairMin(entry4, exit4)
  )

  // Dia da semana (0=Dom, 6=Sáb)
  const dow = new Date(date + 'T12:00:00Z').getDay()
  const dayType = dow === 0 ? 'DOMINGO' : dow === 6 ? 'SABADO' : 'UTIL'

  // Linhas sem nenhuma batida e sem justificativa → pula (ex: fim de semana sem marcação)
  if (!entry1 && !exit1 && !entry2 && !exit2 && !justificativa && dayType !== 'UTIL') {
    // Não gera erro, apenas ignora silenciosamente
    return { entityId: '', entityType: 'SKIP', memberId: member.id, auditEntries: [] }
  }

  const auditEntries: ImportResult['auditEntries'] = []

  if (existing.length) {
    // UPDATE
    const old = existing[0]
    await prisma.$executeRawUnsafe(`
      UPDATE "DailyTimeRecord" SET
        "entry1"=?,"exit1"=?,"entry2"=?,"exit2"=?,
        "entry3"=?,"exit3"=?,"entry4"=?,"exit4"=?,
        "workedMinutes"=?,"balanceMinutes"=?,
        "entryMode"='IMPORTACAO',"source"='IMPORTACAO',
        "status"='PREENCHIDO',"justification"=?,"observations"=?,"updatedAt"=?
      WHERE "memberId"=? AND "date"=?
    `,
      entry1, exit1, entry2, exit2, entry3, exit3, entry4, exit4,
      workedMinutes, workedMinutes - (old.plannedMinutes ?? 0),
      justificativa, mapped.observacoes || null, now,
      member.id, date
    )
    auditEntries.push({ entityType: 'DailyTimeRecord', entityId: existing[0].id, fieldName: 'workedMinutes', oldValue: String(old.workedMinutes), newValue: String(workedMinutes), action: 'UPDATE' })
    return { entityId: existing[0].id, entityType: 'DailyTimeRecord', memberId: member.id, auditEntries }
  } else {
    // INSERT
    const id = randomUUID()
    await prisma.$executeRawUnsafe(`
      INSERT INTO "DailyTimeRecord" (
        "id","memberId","date","dayOfWeek","competence","dayType",
        "entryMode","entry1","exit1","entry2","exit2","entry3","exit3","entry4","exit4",
        "workedMinutes","balanceMinutes","plannedMinutes",
        "classification","status","source","justification","observations","createdAt","updatedAt"
      ) VALUES (?,?,?,?,?,?,'IMPORTACAO',?,?,?,?,?,?,?,?,?,0,0,'SEM_EFEITO','PREENCHIDO','IMPORTACAO',?,?,?,?)
    `,
      id, member.id, date, dow, competence, dayType,
      entry1, exit1, entry2, exit2, entry3, exit3, entry4, exit4,
      workedMinutes,
      justificativa, mapped.observacoes || null,
      now, now
    )
    auditEntries.push({ entityType: 'DailyTimeRecord', entityId: id, fieldName: 'workedMinutes', oldValue: undefined, newValue: String(workedMinutes), action: 'CREATE' })
    return { entityId: id, entityType: 'DailyTimeRecord', memberId: member.id, auditEntries }
  }
}

// ─── COLABORADORES ────────────────────────────────────────────────────────────

async function importColaborador(mapped: Record<string, string>, now: string): Promise<ImportResult> {
  const cpf = mapped.cpf?.replace(/\D/g, '')
  if (!cpf) throw new Error('CPF obrigatório')

  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "TeamMember" WHERE "cpf" = ? LIMIT 1`, cpf
  )

  const auditEntries: ImportResult['auditEntries'] = []

  if (existing.length) {
    const old = existing[0]
    await prisma.$executeRawUnsafe(`
      UPDATE "TeamMember" SET
        "name"=COALESCE(NULLIF(?,''),name),
        "role"=COALESCE(NULLIF(?,''),role),
        "sector"=COALESCE(NULLIF(?,''),sector),
        "unit"=COALESCE(NULLIF(?,''),unit),
        "email"=COALESCE(NULLIF(?,''),email),
        "phone"=COALESCE(NULLIF(?,''),phone),
        "status"=COALESCE(NULLIF(?,''),status),
        "updatedAt"=?
      WHERE "id"=?
    `,
      mapped.nome, mapped.cargo, mapped.setor, mapped.unidade,
      mapped.email, mapped.telefone,
      mapped.status === 'ATIVO' || mapped.status === 'INATIVO' ? mapped.status : null,
      now, old.id
    )
    auditEntries.push({ entityType: 'TeamMember', entityId: old.id, fieldName: 'imported', oldValue: 'exists', newValue: 'updated', action: 'UPDATE' })
    return { entityId: old.id, entityType: 'TeamMember', memberId: old.id, auditEntries }
  } else {
    const id = randomUUID()
    await prisma.$executeRawUnsafe(`
      INSERT INTO "TeamMember" ("id","cpf","name","role","sector","unit","email","phone","status","joinedAt","createdAt","updatedAt")
      VALUES (?,?,?,?,?,?,?,?,'ATIVO',?,?,?)
    `,
      id, cpf,
      mapped.nome || 'Sem nome',
      mapped.cargo || 'Sem cargo',
      mapped.setor || null, mapped.unidade || null,
      mapped.email || null, mapped.telefone || null,
      mapped.dataAdmissao || null, now, now
    )
    auditEntries.push({ entityType: 'TeamMember', entityId: id, fieldName: 'cpf', oldValue: undefined, newValue: cpf, action: 'CREATE' })
    return { entityId: id, entityType: 'TeamMember', memberId: id, auditEntries }
  }
}

// ─── FÉRIAS ───────────────────────────────────────────────────────────────────

async function importFerias(mapped: Record<string, string>, now: string): Promise<ImportResult> {
  const member = await resolveMember(mapped)
  if (!member) throw new Error(`Colaborador não encontrado: CPF=${mapped.cpf ?? '?'}`)

  const startDate = mapped.inicioGozo
  if (!startDate) throw new Error('Data de início do gozo obrigatória')

  // Verifica duplicata
  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "id" FROM "TeamVacation" WHERE "memberId"=? AND "concessionStartDate"=?`,
    member.id, startDate
  )
  if (existing.length) {
    return {
      conflict: true, conflictType: 'DUPLICATA',
      conflictDetail: `Férias com início ${startDate} já existe para ${member.name}`,
      existingValue: existing[0].id,
      incomingValue: startDate,
      memberId: member.id,
    }
  }

  const id = randomUUID()
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TeamVacation" (
      "id","memberId","acquisitionStartDate","acquisitionEndDate",
      "concessionStartDate","concessionEndDate","vacationDays","hasBonus","bonusDays",
      "status","observations","createdAt","updatedAt"
    ) VALUES (?,?,?,?,?,?,?,?,?,'AGENDADO',?,?,?)
  `,
    id, member.id,
    mapped.inicioAquisitivo || null, mapped.fimAquisitivo || null,
    startDate, mapped.fimGozo || null,
    mapped.diasFerias ? parseInt(mapped.diasFerias) : null,
    mapped.abono?.toUpperCase() === 'S' ? 1 : 0,
    mapped.diasAbono ? parseInt(mapped.diasAbono) : null,
    mapped.observacoes || null, now, now
  )
  return { entityId: id, entityType: 'TeamVacation', memberId: member.id }
}

// ─── BANCO DE HORAS ───────────────────────────────────────────────────────────

async function importBancoHoras(mapped: Record<string, string>, now: string): Promise<ImportResult> {
  const member = await resolveMember(mapped)
  if (!member) throw new Error(`Colaborador não encontrado: CPF=${mapped.cpf ?? '?'}`)

  const competence = mapped.competencia
  if (!competence) throw new Error('Competência obrigatória')

  const id = randomUUID()
  await prisma.$executeRawUnsafe(`
    INSERT INTO "HourBankEntry" (
      "id","memberId","entryDate","competence","type",
      "creditMinutes","debitMinutes","responsible","observations","status","createdAt","updatedAt"
    ) VALUES (?,?,?,?,?,?,?,?,?,'ATIVO',?,?)
  `,
    id, member.id, now, competence,
    mapped.tipo || 'AJUSTE',
    mapped.creditoMinutos ? parseInt(mapped.creditoMinutos) : 0,
    mapped.debitoMinutos  ? parseInt(mapped.debitoMinutos)  : 0,
    mapped.responsavel || 'Importação',
    mapped.observacoes || null,
    now, now
  )
  return { entityId: id, entityType: 'HourBankEntry', memberId: member.id }
}

// ─── TREINAMENTOS ─────────────────────────────────────────────────────────────

async function importTreinamento(mapped: Record<string, string>, now: string): Promise<ImportResult> {
  const member = await resolveMember(mapped)
  if (!member) throw new Error(`Colaborador não encontrado: CPF=${mapped.cpf ?? '?'}`)

  const id = randomUUID()
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TeamTraining" (
      "id","memberId","topic","objective","plannedDate","completedDate",
      "status","responsible","expectedResult","evaluation","observations","createdAt","updatedAt"
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `,
    id, member.id,
    mapped.topico, mapped.objetivo || null,
    mapped.dataPlano || null, mapped.dataConclusao || null,
    mapped.status || 'PLANEJADO',
    mapped.responsavel || null,
    mapped.resultado || null,
    mapped.avaliacao || null,
    mapped.observacoes || null,
    now, now
  )
  return { entityId: id, entityType: 'TeamTraining', memberId: member.id }
}

// ─── DADOS OPERACIONAIS ───────────────────────────────────────────────────────

async function importOperacional(mapped: Record<string, string>, now: string): Promise<ImportResult> {
  const company = await resolveCompany(mapped)
  if (!company) throw new Error(`Empresa não encontrada: ${mapped.empresa ?? '?'}`)

  const competence = mapped.competencia
  if (!competence) throw new Error('Competência obrigatória')

  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "id" FROM "CompanyOperationalSnapshot" WHERE "companyId"=? AND "competence"=?`,
    company.id, competence
  )

  const id = existing.length ? existing[0].id : randomUUID()
  const saldoInicial    = parseInt(mapped.saldoInicial  ?? '0') || 0
  const admissoes       = parseInt(mapped.admissoes     ?? '0') || 0
  const demissoes       = parseInt(mapped.demissoes     ?? '0') || 0
  const transferencias  = parseInt(mapped.transferencias ?? '0') || 0
  const saldoFinal      = mapped.saldoFinal
    ? parseInt(mapped.saldoFinal)
    : saldoInicial + admissoes - demissoes + transferencias

  if (existing.length) {
    await prisma.$executeRawUnsafe(`
      UPDATE "CompanyOperationalSnapshot" SET
        "openingBalance"=?,"admissions"=?,"dismissals"=?,"transfers"=?,
        "closingBalance"=?,"observations"=?,"updatedAt"=?
      WHERE "id"=?
    `, saldoInicial, admissoes, demissoes, transferencias, saldoFinal,
       mapped.observacoes || null, now, id)
  } else {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "CompanyOperationalSnapshot" (
        "id","companyId","competence","openingBalance","admissions","dismissals","transfers","closingBalance","observations","createdAt","updatedAt"
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `, id, company.id, competence, saldoInicial, admissoes, demissoes, transferencias, saldoFinal,
       mapped.observacoes || null, now, now)
  }
  return { entityId: id, entityType: 'CompanyOperationalSnapshot', companyId: company.id }
}

// ─── EMPRESAS ─────────────────────────────────────────────────────────────────

async function importEmpresa(mapped: Record<string, string>, now: string): Promise<ImportResult> {
  const cnpj = mapped.cnpj?.replace(/\D/g, '') || ''
  if (!cnpj) throw new Error('CNPJ obrigatório')

  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "ClientCompany" WHERE "cnpj"=? LIMIT 1`, cnpj
  )

  if (existing.length) {
    const old = existing[0]
    await prisma.$executeRawUnsafe(`
      UPDATE "ClientCompany" SET
        "name"=COALESCE(NULLIF(?,''),name),
        "code"=COALESCE(NULLIF(?,''),code),
        "city"=COALESCE(NULLIF(?,''),city),
        "state"=COALESCE(NULLIF(?,''),state),
        "updatedAt"=?
      WHERE "id"=?
    `,
      mapped.nome, mapped.codigo, mapped.municipio, mapped.uf, now, old.id
    )
    return { entityId: old.id, entityType: 'ClientCompany', companyId: old.id }
  } else {
    const id = randomUUID()
    await prisma.$executeRawUnsafe(`
      INSERT INTO "ClientCompany" (
        "id","cnpj","name","code","city","state","country","active","active",
        "zipCode","street","number","neighborhood","establishmentType",
        "createdAt","updatedAt"
      ) VALUES (?,?,?,?,?,?,?,1,1,?,?,?,?,'MATRIZ',?,?)
    `, id, cnpj, mapped.nome || 'Empresa', mapped.codigo || null,
       mapped.municipio || null, mapped.uf || null, 'Brasil',
       '00000-000', 'Não informado', 'S/N', 'Não informado',
       now, now)
    return { entityId: id, entityType: 'ClientCompany', companyId: id }
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function resolveMember(mapped: Record<string, string>) {
  const cpf = mapped.cpf?.replace(/\D/g, '')
  const mat  = mapped.matricula?.trim()
  const nome = mapped.nome?.trim()

  if (cpf) {
    const r = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "TeamMember" WHERE "cpf"=? LIMIT 1`, cpf)
    if (r.length) return r[0]
  }
  if (mat) {
    const r = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "TeamMember" WHERE "registration"=? LIMIT 1`, mat)
    if (r.length) return r[0]
  }
  if (nome) {
    const r = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "TeamMember" WHERE lower("name")=lower(?) LIMIT 1`, nome)
    if (r.length) return r[0]
  }
  return null
}

async function resolveCompany(mapped: Record<string, string>) {
  const cnpj   = mapped.cnpj?.replace(/\D/g, '')
  const codigo = mapped.empresa?.trim()

  if (cnpj) {
    const r = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "ClientCompany" WHERE "cnpj"=? LIMIT 1`, cnpj)
    if (r.length) return r[0]
  }
  if (codigo) {
    const r = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "ClientCompany" WHERE "code"=? OR lower("name")=lower(?) LIMIT 1`, codigo, codigo)
    if (r.length) return r[0]
  }
  return null
}

// randomUUID imported from 'crypto' at top of file
