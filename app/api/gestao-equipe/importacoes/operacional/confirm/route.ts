/**
 * POST /api/gestao-equipe/importacoes/operacional/confirm
 * Efetiva a importação de headcount / movimentações aprovadas no preview.
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma-sqlite'
import type { HeadcountLinha } from '../route'

export const dynamic = 'force-dynamic'

function normCompetenciaToDb(v: string): string {
  // MM/YYYY → YYYY-MM
  const m = v.match(/^(\d{2})\/(\d{4})$/)
  return m ? `${m[2]}-${m[1]}` : v
}

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json().catch(() => ({}))
    const linhas: HeadcountLinha[] = body.linhas ?? []

    const validas = linhas.filter(l => l._action !== 'erro')
    if (!validas.length)
      return NextResponse.json({ criados: 0, atualizados: 0, erros: 0 })

    const now = new Date().toISOString()
    let criados = 0, atualizados = 0, erros = 0

    for (const linha of validas) {
      try {
        // Localiza empresa
        const co = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "id" FROM "ClientCompany"
           WHERE lower("code")=lower(?) OR lower("name")=lower(?) LIMIT 1`,
          linha.empresa, linha.empresa
        )
        if (!co.length) { erros++; continue }
        const companyId = co[0].id

        const competencia = normCompetenciaToDb(linha.competencia)
        const saldoInicial = linha.ativosClt  // usamos ativosClt como saldo inicial (headcount)
        const saldoFinal   = saldoInicial + linha.admissoes + linha.entradas
                           - linha.rescisoes - linha.saidas

        // Verifica se existe
        const snap = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "id" FROM "CompanyOperationalSnapshot"
           WHERE "companyId"=? AND ("competence"=? OR "competence"=?) LIMIT 1`,
          companyId, competencia, linha.competencia
        )

        if (snap.length) {
          await prisma.$executeRawUnsafe(`
            UPDATE "CompanyOperationalSnapshot" SET
              "openingBalance" = ?,
              "admissions"     = ?,
              "dismissals"     = ?,
              "transfers"      = ?,
              "closingBalance" = ?,
              "observations"   = ?,
              "updatedAt"      = ?
            WHERE "id" = ?
          `,
            saldoInicial,
            linha.admissoes + linha.entradas,
            linha.rescisoes + linha.saidas,
            linha.retornos - linha.afastamentosNovos,
            saldoFinal,
            `Aprendizes:${linha.aprendizes} | Estagiários:${linha.estagiarios} | Afastados:${linha.afastados}`,
            now,
            snap[0].id
          )
          atualizados++
        } else {
          await prisma.$executeRawUnsafe(`
            INSERT INTO "CompanyOperationalSnapshot"
              ("id","companyId","competence","openingBalance","admissions","dismissals",
               "transfers","closingBalance","observations","createdAt","updatedAt")
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
          `,
            randomUUID(), companyId, competencia,
            saldoInicial,
            linha.admissoes + linha.entradas,
            linha.rescisoes + linha.saidas,
            linha.retornos - linha.afastamentosNovos,
            saldoFinal,
            `Aprendizes:${linha.aprendizes} | Estagiários:${linha.estagiarios} | Afastados:${linha.afastados}`,
            now, now
          )
          criados++
        }
      } catch (rowErr: any) {
        console.warn('[operacional/confirm] linha erro:', rowErr?.message)
        erros++
      }
    }

    return NextResponse.json({ criados, atualizados, erros })
  } catch (e: any) {
    console.error('[importacoes/operacional/confirm POST]', e)
    return NextResponse.json({ error: e.message ?? 'Erro ao importar dados operacionais' }, { status: 500 })
  }
}
