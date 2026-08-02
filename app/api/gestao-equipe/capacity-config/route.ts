import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'



export async function GET() {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "CapacityConfig" WHERE "active" = 1 LIMIT 1
    `
    return NextResponse.json(rows[0] ?? null)
  } catch (e) {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const now = new Date().toISOString()
    await prisma.$executeRaw`
      UPDATE "CapacityConfig" SET
        "weightEmployee"   = COALESCE(${body.weightEmployee   ?? null}, "weightEmployee"),
        "weightCompany"    = COALESCE(${body.weightCompany    ?? null}, "weightCompany"),
        "weightProcess"    = COALESCE(${body.weightProcess    ?? null}, "weightProcess"),
        "weightVolume"     = COALESCE(${body.weightVolume     ?? null}, "weightVolume"),
        "weightComplexity" = COALESCE(${body.weightComplexity ?? null}, "weightComplexity"),
        "weightManual"     = COALESCE(${body.weightManual     ?? null}, "weightManual"),
        "weightCritical"   = COALESCE(${body.weightCritical   ?? null}, "weightCritical"),
        "capacityRef"      = COALESCE(${body.capacityRef      ?? null}, "capacityRef"),
        "bandGreen"        = COALESCE(${body.bandGreen        ?? null}, "bandGreen"),
        "bandBlue"         = COALESCE(${body.bandBlue         ?? null}, "bandBlue"),
        "bandYellow"       = COALESCE(${body.bandYellow       ?? null}, "bandYellow"),
        "bandOrange"       = COALESCE(${body.bandOrange       ?? null}, "bandOrange"),
        "updatedAt"        = ${now}
      WHERE "active" = 1
    `
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "CapacityConfig" WHERE "active" = 1 LIMIT 1`
    return NextResponse.json(rows[0])
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao salvar configuraÃ§Ã£o' }, { status: 500 })
  }
}
