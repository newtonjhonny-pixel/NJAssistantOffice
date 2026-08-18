import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import { join, extname } from 'path'
import { ensureImportSchema, sha256, parseFile, MODULES } from '../_utils'

export const dynamic = 'force-dynamic'

const ALLOWED_EXT = ['.xlsx', '.xls', '.csv', '.pdf', '.docx']
const MAX_SIZE    = 30 * 1024 * 1024 // 30 MB

// GET /api/importacoes/sessions
// Query: ?module=PONTO_DIARIO&status=CONCLUIDO&limit=50&offset=0
export async function GET(req: NextRequest) {
  try {
    await ensureImportSchema()
    const { searchParams } = new URL(req.url)
    const module  = searchParams.get('module') ?? ''
    const status  = searchParams.get('status') ?? ''
    const limit   = Math.min(Number(searchParams.get('limit') ?? 50), 200)
    const offset  = Number(searchParams.get('offset') ?? 0)

    let where = '1=1'
    const args: unknown[] = []
    if (module) { where += ' AND s."module" = ?'; args.push(module) }
    if (status) { where += ' AND s."status" = ?'; args.push(status) }

    const rawRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT s.*,
        (SELECT COUNT(*) FROM "ImportRecord" r WHERE r."sessionId" = s."id") AS totalRows,
        (SELECT COUNT(*) FROM "ImportRecord" r WHERE r."sessionId" = s."id" AND r."status" = 'IMPORTADO') AS importedRows,
        (SELECT COUNT(*) FROM "ImportRecord" r WHERE r."sessionId" = s."id" AND r."status" = 'INVALIDO') AS errorRows,
        (SELECT COUNT(*) FROM "ImportRecord" r WHERE r."sessionId" = s."id" AND r."status" = 'CONFLITO') AS conflictRows,
        p."name" AS profileName
       FROM "ImportSession" s
       LEFT JOIN "ImportSourceProfile" p ON p."id" = s."sourceProfileId"
       WHERE ${where}
       ORDER BY s."createdAt" DESC
       LIMIT ? OFFSET ?`,
      ...args, limit, offset
    )

    // BigInt → Number (COUNT subqueries retornam BigInt no SQLite)
    const rows = rawRows.map(r => ({
      ...r,
      totalRows:    Number(r.totalRows    ?? 0),
      importedRows: Number(r.importedRows ?? 0),
      errorRows:    Number(r.errorRows    ?? 0),
      conflictRows: Number(r.conflictRows ?? 0),
      fileSize:     Number(r.fileSize     ?? 0),
    }))

    const total = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) AS n FROM "ImportSession" s WHERE ${where}`,
      ...args
    )

    return NextResponse.json({ sessions: rows, total: Number(total[0]?.n ?? 0), modules: MODULES })
  } catch (e) {
    console.error('[importacoes sessions GET]', e)
    return NextResponse.json({ error: 'Erro ao listar sessões' }, { status: 500 })
  }
}

// POST /api/importacoes/sessions
// FormData: file (File), module (string)
export async function POST(req: NextRequest) {
  try {
    await ensureImportSchema()
    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    const module   = String(formData.get('module') ?? '').toUpperCase()

    if (!file)   return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    if (!module) return NextResponse.json({ error: 'Módulo não informado.' },  { status: 400 })

    const validModules = MODULES.map(m => m.id)
    if (!validModules.includes(module as any))
      return NextResponse.json({ error: `Módulo inválido. Use: ${validModules.join(', ')}` }, { status: 400 })

    const ext = extname(file.name).toLowerCase()
    if (!ALLOWED_EXT.includes(ext))
      return NextResponse.json({ error: `Formato não suportado. Use: ${ALLOWED_EXT.join(', ')}` }, { status: 400 })

    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: `Arquivo muito grande (máx. 30 MB).` }, { status: 400 })

    const buf  = Buffer.from(await file.arrayBuffer())
    const hash = sha256(buf)

    // Verifica duplicata (mesmo hash e módulo já importado com sucesso)
    const dup = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id","status" FROM "ImportSession" WHERE "fileHash" = ? AND "module" = ? AND "status" = 'CONCLUIDO'`,
      hash, module
    )
    if (dup.length)
      return NextResponse.json({ error: 'Este arquivo já foi importado com sucesso para este módulo.', duplicateSessionId: dup[0].id }, { status: 409 })

    // Salva arquivo
    const dir      = join(process.cwd(), 'public', 'uploads', 'importacoes')
    await mkdir(dir, { recursive: true })
    const safeName = `import-${randomUUID()}${ext}`
    const filePath = join(dir, safeName)
    await writeFile(filePath, buf)

    // Extrai cabeçalhos, amostra, metadados e estrutura
    let headers: string[] = []
    let sampleRows: Record<string, string>[] = []
    let metadata: Record<string, string> = {}
    let structure: unknown = null
    let parseError: string | null = null

    try {
      const parsed = await parseFile(buf, ext)
      headers    = parsed.headers
      sampleRows = parsed.rows.slice(0, 5)
      metadata   = parsed.metadata ?? {}
      structure  = parsed.structure ?? null
    } catch (err: any) {
      parseError = String(err?.message ?? err)
      console.warn('[importacoes sessions POST] parse error:', parseError)
    }

    const now = new Date().toISOString()
    const id  = randomUUID()

    await prisma.$executeRawUnsafe(`
      INSERT INTO "ImportSession" (
        "id","fileName","fileType","fileSize","fileHash","filePath","module",
        "status","totalRows","rawHeaders","sampleJson","metadataJson","structureJson","errorMessage","createdAt","updatedAt"
      ) VALUES (?,?,?,?,?,?,?,'PENDENTE',?,?,?,?,?,?,?,?)
    `,
      id, file.name, ext, file.size, hash,
      `/uploads/importacoes/${safeName}`,
      module,
      sampleRows.length,
      JSON.stringify(headers),
      JSON.stringify(sampleRows),
      JSON.stringify(metadata),
      JSON.stringify(structure),
      parseError,
      now, now
    )

    const session = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ImportSession" WHERE "id" = ?`, id
    )

    return NextResponse.json({ session: session[0], headers, sampleRows, metadata, structure })
  } catch (e) {
    console.error('[importacoes sessions POST]', e)
    return NextResponse.json({ error: 'Erro ao criar sessão de importação' }, { status: 500 })
  }
}
