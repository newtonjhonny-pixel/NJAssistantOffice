/**
 * POST /api/gestao-equipe/importacoes/empresas/confirm
 * Efetiva a importação de empresas aprovadas no preview.
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma-sqlite'
import type { EmpresaPreview } from '../route'

export const dynamic = 'force-dynamic'

function normCnpj(v: string): string {
  return (v ?? '').replace(/\D/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const body    = await req.json().catch(() => ({}))
    const empresas: EmpresaPreview[] = body.empresas ?? []

    const validas = empresas.filter(e => e._action === 'criar' || e._action === 'atualizar')
    if (!validas.length)
      return NextResponse.json({ criadas: 0, atualizadas: 0, erros: 0 })

    const now = new Date().toISOString()
    let criadas = 0, atualizadas = 0, erros = 0

    for (const emp of validas) {
      try {
        const cnpj   = normCnpj(emp.cnpj)
        const codigo = emp.codigo?.trim() || null

        if (emp._action === 'criar') {
          await prisma.$executeRawUnsafe(`
            INSERT INTO "ClientCompany"
              ("id","cnpj","name","tradeName","code","city","state","country","active",
               "zipCode","street","number","neighborhood","establishmentType",
               "createdAt","updatedAt")
            VALUES (?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?)
          `,
            randomUUID(),
            cnpj || null,
            emp.razaoSocial || 'Empresa',
            emp.nomeFantasia || null,
            codigo,
            emp.municipio || null,
            emp.uf || null,
            'Brasil',
            '00000-000', 'Não informado', 'S/N', 'Não informado',
            emp.tipo || 'MATRIZ',
            now, now
          )
          criadas++
        } else {
          // Localiza pelo CNPJ ou código
          let id: string | null = null
          if (cnpj) {
            const r = await prisma.$queryRawUnsafe<any[]>(
              `SELECT "id" FROM "ClientCompany" WHERE "cnpj"=? LIMIT 1`, cnpj
            )
            if (r.length) id = r[0].id
          }
          if (!id && codigo) {
            const r = await prisma.$queryRawUnsafe<any[]>(
              `SELECT "id" FROM "ClientCompany" WHERE "code"=? LIMIT 1`, codigo
            )
            if (r.length) id = r[0].id
          }
          if (!id) { erros++; continue }

          await prisma.$executeRawUnsafe(`
            UPDATE "ClientCompany" SET
              "name"      = COALESCE(NULLIF(?,''), "name"),
              "tradeName" = COALESCE(NULLIF(?,''), "tradeName"),
              "code"      = COALESCE(NULLIF(?,''), "code"),
              "city"      = COALESCE(NULLIF(?,''), "city"),
              "state"     = COALESCE(NULLIF(?,''), "state"),
              "updatedAt" = ?
            WHERE "id" = ?
          `,
            emp.razaoSocial, emp.nomeFantasia, codigo,
            emp.municipio, emp.uf, now, id
          )
          atualizadas++
        }
      } catch (rowErr: any) {
        console.warn('[empresas/confirm] linha erro:', rowErr?.message)
        erros++
      }
    }

    return NextResponse.json({ criadas, atualizadas, erros })
  } catch (e: any) {
    console.error('[importacoes/empresas/confirm POST]', e)
    return NextResponse.json({ error: e.message ?? 'Erro ao importar empresas' }, { status: 500 })
  }
}
