import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "MemberSalary" WHERE "memberId" = ${params.id}
    `
    return NextResponse.json(rows[0] ?? null)
  } catch (e) {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const {
      baseSalary, fixedAdditions, gratification, trustFunction,
      commission, otherFixed, estimatedMonthly, estimatedCharges, estimatedCost,
      validFrom, lastAdjustment, adjustmentReason, observations,
    } = body

    const now = new Date().toISOString()
    const validFromVal  = validFrom     ? new Date(validFrom).toISOString()     : null
    const lastAdjVal    = lastAdjustment ? new Date(lastAdjustment).toISOString() : null

    // Auto-calculate estimatedMonthly if not provided
    const calcSum = (baseSalary ?? 0) + (fixedAdditions ?? 0) + (gratification ?? 0) +
      (trustFunction ?? 0) + (commission ?? 0) + (otherFixed ?? 0)
    const calcMonthly = estimatedMonthly ?? (calcSum > 0 ? calcSum : null)

    // Upsert
    const existing = await prisma.$queryRaw<any[]>`
      SELECT "id" FROM "MemberSalary" WHERE "memberId" = ${params.id}
    `

    if (existing.length) {
      await prisma.$executeRaw`
        UPDATE "MemberSalary" SET
          "baseSalary"       = ${baseSalary ?? null},
          "fixedAdditions"   = ${fixedAdditions ?? null},
          "gratification"    = ${gratification ?? null},
          "trustFunction"    = ${trustFunction ?? null},
          "commission"       = ${commission ?? null},
          "otherFixed"       = ${otherFixed ?? null},
          "estimatedMonthly" = ${calcMonthly},
          "estimatedCharges" = ${estimatedCharges ?? null},
          "estimatedCost"    = ${estimatedCost ?? null},
          "validFrom"        = ${validFromVal},
          "lastAdjustment"   = ${lastAdjVal},
          "adjustmentReason" = ${adjustmentReason ?? null},
          "observations"     = ${observations ?? null},
          "updatedAt"        = ${now}
        WHERE "memberId" = ${params.id}
      `
    } else {
      const id = randomUUID()
      await prisma.$executeRaw`
        INSERT INTO "MemberSalary" (
          "id","memberId",
          "baseSalary","fixedAdditions","gratification","trustFunction","commission","otherFixed",
          "estimatedMonthly","estimatedCharges","estimatedCost",
          "validFrom","lastAdjustment","adjustmentReason","observations",
          "createdAt","updatedAt"
        ) VALUES (
          ${id}, ${params.id},
          ${baseSalary ?? null}, ${fixedAdditions ?? null}, ${gratification ?? null},
          ${trustFunction ?? null}, ${commission ?? null}, ${otherFixed ?? null},
          ${calcMonthly}, ${estimatedCharges ?? null}, ${estimatedCost ?? null},
          ${validFromVal}, ${lastAdjVal}, ${adjustmentReason ?? null}, ${observations ?? null},
          ${now}, ${now}
        )
      `
    }

    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "MemberSalary" WHERE "memberId" = ${params.id}
    `
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error('[salary PUT]', e)
    return NextResponse.json({ error: 'Erro ao salvar remuneraÃ§Ã£o' }, { status: 500 })
  }
}
