import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'

function onlyDigits(s: string) { return s.replace(/\D/g, '') }

function validateCnpj(raw: string | null): boolean {
  if (!raw) return true
  const d = onlyDigits(raw)
  if (d.length !== 14) return false
  if (/^(\d)\1+$/.test(d)) return false
  const calc = (d: string, len: number) => {
    let s = 0, p = len - 7
    for (let i = len; i >= 1; i--) {
      s += parseInt(d[len - i]) * p--
      if (p < 2) p = 9
    }
    return s % 11 < 2 ? 0 : 11 - (s % 11)
  }
  return calc(d, 12) === parseInt(d[12]) && calc(d, 13) === parseInt(d[13])
}

// ─── GET /api/gestao-equipe/companies/[id] ───────────────────────────────────

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT c.*, p."name" AS "parentName", p."code" AS "parentCode"
      FROM "ClientCompany" c
      LEFT JOIN "ClientCompany" p ON p."id" = c."parentCompanyId"
      WHERE c."id" = ?
    `, params.id)
    if (!rows.length) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    // Filiais vinculadas
    const branches = await prisma.$queryRawUnsafe<any[]>(`
      SELECT "id","code","name","active" FROM "ClientCompany"
      WHERE "parentCompanyId" = ? ORDER BY "code" ASC, "name" ASC
    `, params.id)

    return NextResponse.json({ ...rows[0], branches })
  } catch (e) {
    console.error('[companies/[id] GET]', e)
    return NextResponse.json({ error: 'Erro ao buscar empresa' }, { status: 500 })
  }
}

// ─── PATCH /api/gestao-equipe/companies/[id] ─────────────────────────────────

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()

    const {
      code, name, tradeName, segment, observations, active,
      establishmentType, parentCompanyId,
      zipCode, street, number, complement, neighborhood, city, state, country, ibgeCode,
    } = body
    const cnpjRaw = body.cnpj !== undefined ? (body.cnpj ? onlyDigits(String(body.cnpj)) : null) : undefined

    // ── Validações ────────────────────────────────────────────────────────────
    if (code !== undefined && !/^\d{4}$/.test((code ?? '').trim()))
      return NextResponse.json({ error: 'Código deve conter exatamente 4 dígitos numéricos.' }, { status: 400 })

    if (cnpjRaw !== undefined && cnpjRaw && !validateCnpj(cnpjRaw))
      return NextResponse.json({ error: 'CNPJ inválido — verifique os dígitos verificadores.' }, { status: 400 })

    // Código duplicado (excluindo a própria empresa)
    if (code !== undefined) {
      const codeCheck = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id" FROM "ClientCompany" WHERE "code" = ? AND "id" != ?`, code.trim(), params.id
      )
      if (codeCheck.length)
        return NextResponse.json({ error: `O código ${code} já está cadastrado para outra empresa.` }, { status: 400 })
    }

    // CNPJ duplicado (excluindo a própria empresa)
    if (cnpjRaw) {
      const cnpjCheck = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id" FROM "ClientCompany" WHERE "cnpj" = ? AND "id" != ?`, cnpjRaw, params.id
      )
      if (cnpjCheck.length)
        return NextResponse.json({ error: 'Este CNPJ já está cadastrado para outra empresa.' }, { status: 400 })
    }

    // Converter MATRIZ → FILIAL: verificar se tem filiais vinculadas
    if (establishmentType === 'FILIAL') {
      const branches = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id" FROM "ClientCompany" WHERE "parentCompanyId" = ?`, params.id
      )
      if (branches.length)
        return NextResponse.json({
          error: `Não é possível converter para Filial: há ${branches.length} filial(ais) vinculada(s). Corrija os vínculos primeiro.`
        }, { status: 400 })
    }

    // Auto-referência
    if (parentCompanyId === params.id)
      return NextResponse.json({ error: 'Uma empresa não pode ser vinculada a si mesma.' }, { status: 400 })

    // Validação da matriz
    if (parentCompanyId) {
      const parentRow = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "establishmentType", "active" FROM "ClientCompany" WHERE "id" = ?`, parentCompanyId
      )
      if (!parentRow.length)
        return NextResponse.json({ error: 'Empresa matriz não encontrada.' }, { status: 400 })
      if (parentRow[0].establishmentType !== 'MATRIZ')
        return NextResponse.json({ error: 'A empresa selecionada não é do tipo Matriz.' }, { status: 400 })
    }

    // ── Montar SET dinâmico ──────────────────────────────────────────────────
    const sets: string[] = []
    const vals: any[] = []

    const push = (col: string, val: any) => { sets.push(`"${col}" = ?`); vals.push(val) }

    if (code           !== undefined) push('code',              code.trim())
    if (name           !== undefined) push('name',              name.trim())
    if (tradeName      !== undefined) push('tradeName',         tradeName?.trim() || null)
    if (cnpjRaw        !== undefined) push('cnpj',              cnpjRaw || null)
    if (segment        !== undefined) push('segment',           segment?.trim() || null)
    if (observations   !== undefined) push('observations',      observations?.trim() || null)
    if (active         !== undefined) push('active',            Boolean(active))
    if (establishmentType !== undefined) push('establishmentType', establishmentType)
    if (parentCompanyId !== undefined) push('parentCompanyId',  parentCompanyId || null)
    if (zipCode        !== undefined) push('zipCode',           onlyDigits(zipCode?.trim() || '').slice(0, 8) || null)
    if (street         !== undefined) push('street',            street?.trim() || null)
    if (number         !== undefined) push('number',            number?.trim() || null)
    if (complement     !== undefined) push('complement',        complement?.trim() || null)
    if (neighborhood   !== undefined) push('neighborhood',      neighborhood?.trim() || null)
    if (city           !== undefined) push('city',              city?.trim() || null)
    if (state          !== undefined) push('state',             (state?.trim() || '').toUpperCase() || null)
    if (country        !== undefined) push('country',           country?.trim() || null)
    if (ibgeCode       !== undefined) push('ibgeCode',          ibgeCode?.trim() || null)

    if (sets.length === 0)
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })

    push('updatedAt', new Date())
    vals.push(params.id)

    await prisma.$executeRawUnsafe(
      `UPDATE "ClientCompany" SET ${sets.join(', ')} WHERE "id" = ?`,
      ...vals
    )

    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT c.*, p."name" AS "parentName", p."code" AS "parentCode"
      FROM "ClientCompany" c
      LEFT JOIN "ClientCompany" p ON p."id" = c."parentCompanyId"
      WHERE c."id" = ?
    `, params.id)
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error('[companies/[id] PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar empresa' }, { status: 500 })
  }
}

// Sem DELETE — inativação via PATCH { active: false }
