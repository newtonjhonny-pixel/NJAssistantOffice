/**
 * POST /api/gestao-equipe/importacoes/colaboradores/confirm
 * Efetiva a importação de colaboradores aprovados no preview.
 * Ações: criar → INSERT TeamMember; atualizar → UPDATE TeamMember.
 * Duplicados e erros são ignorados (já filtrados no preview).
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma-sqlite'
import type { ColaboradorPreview } from '../route'

export const dynamic = 'force-dynamic'

function normCpf(v: string): string {
  return (v ?? '').replace(/\D/g, '')
}

function normalizeDate(v: string): string | null {
  if (!v?.trim()) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [d, m, y] = v.split('/')
    return `${y}-${m}-${d}`
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const colaboradores: ColaboradorPreview[] = body.colaboradores ?? []

    if (!colaboradores.length)
      return NextResponse.json({ error: 'Nenhum colaborador para importar.' }, { status: 400 })

    // Apenas criar e atualizar (filtrar erros e duplicados)
    const validos = colaboradores.filter(c => c._action === 'criar' || c._action === 'atualizar')
    if (!validos.length)
      return NextResponse.json({ criados: 0, atualizados: 0, erros: 0 })

    const now = new Date().toISOString()
    let criados = 0, atualizados = 0, erros = 0

    for (const col of validos) {
      try {
        const cpf = normCpf(col.cpf)
        const mat = col.matricula?.trim() || null
        const admissao = normalizeDate(col.admissao)

        if (col._action === 'criar') {
          await prisma.$executeRawUnsafe(`
            INSERT INTO "TeamMember"
              ("id","cpf","registration","name","role","sector","unit","email","phone",
               "status","joinedAt","createdAt","updatedAt")
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
          `,
            randomUUID(),
            cpf || null, mat,
            col.nome || 'Sem nome',
            col.cargo || null,
            col.departamento || null,
            col.unidade || null,
            col.email || null,
            null,
            col.status === 'ATIVO' || col.status === 'INATIVO' ? col.status : 'ATIVO',
            admissao,
            now, now
          )
          criados++
        } else {
          // atualizar — busca por CPF ou matrícula
          let memberId: string | null = null
          if (cpf) {
            const r = await prisma.$queryRawUnsafe<any[]>(
              `SELECT "id" FROM "TeamMember" WHERE "cpf"=? LIMIT 1`, cpf
            )
            if (r.length) memberId = r[0].id
          }
          if (!memberId && mat) {
            const r = await prisma.$queryRawUnsafe<any[]>(
              `SELECT "id" FROM "TeamMember" WHERE "registration"=? LIMIT 1`, mat
            )
            if (r.length) memberId = r[0].id
          }
          if (!memberId) { erros++; continue }

          await prisma.$executeRawUnsafe(`
            UPDATE "TeamMember" SET
              "name"         = COALESCE(NULLIF(?,''), "name"),
              "role"         = COALESCE(NULLIF(?,''), "role"),
              "sector"       = COALESCE(NULLIF(?,''), "sector"),
              "unit"         = COALESCE(NULLIF(?,''), "unit"),
              "email"        = COALESCE(NULLIF(?,''), "email"),
              "registration" = COALESCE(NULLIF(?,''), "registration"),
              "status"       = COALESCE(NULLIF(?,''), "status"),
              "updatedAt"    = ?
            WHERE "id" = ?
          `,
            col.nome, col.cargo, col.departamento, col.unidade,
            col.email, mat,
            col.status === 'ATIVO' || col.status === 'INATIVO' ? col.status : null,
            now, memberId
          )
          atualizados++
        }
      } catch (rowErr: any) {
        console.warn('[colaboradores/confirm] linha erro:', rowErr?.message)
        erros++
      }
    }

    return NextResponse.json({ criados, atualizados, erros })
  } catch (e: any) {
    console.error('[importacoes/colaboradores/confirm POST]', e)
    return NextResponse.json({ error: e.message ?? 'Erro ao importar colaboradores' }, { status: 500 })
  }
}
