import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import { ensureImportSchema, MODULES } from '../_utils'

export const dynamic = 'force-dynamic'

// GET /api/importacoes/profiles
export async function GET(_: NextRequest) {
  try {
    await ensureImportSchema()
    const profiles = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ImportSourceProfile" WHERE "active" = 1 ORDER BY "usageCount" DESC, "name" ASC`
    )
    return NextResponse.json({ profiles })
  } catch (e) {
    console.error('[importacoes profiles GET]', e)
    return NextResponse.json({ error: 'Erro ao listar perfis' }, { status: 500 })
  }
}

// POST /api/importacoes/profiles
// Body: { name, module, fileType, mappingJson, sampleHeadersJson }
export async function POST(req: NextRequest) {
  try {
    await ensureImportSchema()
    const body = await req.json()
    const { name, module: mod, fileType, mappingJson, sampleHeadersJson } = body

    if (!name || !mod || !fileType)
      return NextResponse.json({ error: 'name, module e fileType são obrigatórios.' }, { status: 400 })

    const validModules = MODULES.map(m => m.id)
    if (!validModules.includes(mod))
      return NextResponse.json({ error: 'Módulo inválido.' }, { status: 400 })

    const now = new Date().toISOString()
    const id = randomUUID()
    await prisma.$executeRawUnsafe(`
      INSERT INTO "ImportSourceProfile" (
        "id","name","module","fileType","mappingJson","sampleHeadersJson",
        "confidence","usageCount","active","createdAt","updatedAt"
      ) VALUES (?,?,?,?,?,?,0,0,1,?,?)
    `,
      id, name, mod, fileType,
      typeof mappingJson === 'string' ? mappingJson : JSON.stringify(mappingJson ?? []),
      typeof sampleHeadersJson === 'string' ? sampleHeadersJson : JSON.stringify(sampleHeadersJson ?? []),
      now, now
    )

    const profile = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ImportSourceProfile" WHERE "id" = ?`, id
    )
    return NextResponse.json({ profile: profile[0] })
  } catch (e) {
    console.error('[importacoes profiles POST]', e)
    return NextResponse.json({ error: 'Erro ao criar perfil' }, { status: 500 })
  }
}
