import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const memberId = params.id
    const now = new Date().toISOString()

    const existing = await prisma.$queryRaw<any[]>`
      SELECT "id" FROM "HourBankConfig" WHERE "memberId" = ${memberId} LIMIT 1
    `
    if (existing.length > 0) {
      await prisma.$executeRaw`
        UPDATE "HourBankConfig" SET
          "compensationDays"   = ${body.compensationDays   ?? 180},
          "alertDaysBeforeExp" = ${body.alertDaysBeforeExp ?? 30},
          "maxCreditHours"     = ${body.maxCreditHours     ?? null},
          "negativeBalance"    = ${body.negativeBalance    ? 1 : 0},
          "observations"       = ${body.observations       ?? null},
          "updatedAt"          = ${now}
        WHERE "memberId" = ${memberId}
      `
    } else {
      await prisma.$executeRaw`
        INSERT INTO "HourBankConfig"
          ("id","memberId","compensationDays","alertDaysBeforeExp","maxCreditHours","negativeBalance","observations","createdAt","updatedAt")
        VALUES
          (${randomUUID()}, ${memberId}, ${body.compensationDays ?? 180}, ${body.alertDaysBeforeExp ?? 30},
           ${body.maxCreditHours ?? null}, ${body.negativeBalance ? 1 : 0}, ${body.observations ?? null}, ${now}, ${now})
      `
    }
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "HourBankConfig" WHERE "memberId" = ${memberId}`
    return NextResponse.json({ ...rows[0], negativeBalance: Boolean(rows[0].negativeBalance) })
  } catch (e) {
    console.error('[banco-horas config PUT]', e)
    return NextResponse.json({ error: 'Erro ao salvar configuraÃ§Ã£o' }, { status: 500 })
  }
}
