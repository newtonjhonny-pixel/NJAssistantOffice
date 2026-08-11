import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "MemberCompanyProcess" WHERE "linkId" = ${params.id} ORDER BY "processType"
    `
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[processes GET]', e)
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { processType, volume, complexity, automationLevel, avgTimeMinutes, isCritical, observations } = body

    if (!processType) return NextResponse.json({ error: 'processType obrigatório' }, { status: 400 })

    const existing = await prisma.$queryRaw<any[]>`
      SELECT "id" FROM "MemberCompanyProcess" WHERE "linkId" = ${params.id} AND "processType" = ${processType}
    `
    if (existing.length) {
      return NextResponse.json({ error: 'Processo já cadastrado para este vínculo' }, { status: 409 })
    }

    const id = randomUUID()
    const now = new Date().toISOString()
    const critical = Boolean(isCritical)

    await prisma.$executeRaw`
      INSERT INTO "MemberCompanyProcess" (
        "id","linkId","processType","volume","complexity","automationLevel","avgTimeMinutes","isCritical","observations","createdAt","updatedAt"
      ) VALUES (
        ${id}, ${params.id}, ${processType},
        ${volume ?? null}, ${complexity ?? null}, ${automationLevel ?? null},
        ${avgTimeMinutes ?? null}, ${critical}, ${observations ?? null},
        ${now}, ${now}
      )
    `

    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "MemberCompanyProcess" WHERE "id" = ${id}
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e) {
    console.error('[processes POST]', e)
    return NextResponse.json({ error: 'Erro ao adicionar processo' }, { status: 500 })
  }
}
