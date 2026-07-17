import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomBytes, createHash } from 'crypto'

export const dynamic = 'force-dynamic'

const ALLOWED_EXT = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv',
  '.jpg', '.jpeg', '.png', '.webp', '.txt', '.xml', '.zip',
]
const MAX_SIZE = 20 * 1024 * 1024

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const attachments = await prisma.centralAttachment.findMany({
    where: { itemId: params.id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(attachments)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const item = await prisma.centralItem.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]
  if (!files.length) return NextResponse.json({ error: 'Nenhum arquivo' }, { status: 400 })

  const dir = join(process.cwd(), 'public', 'uploads', 'central')
  await mkdir(dir, { recursive: true })

  const created = []
  for (const file of files) {
    const ext = extname(file.name).toLowerCase()
    if (!ALLOWED_EXT.includes(ext)) continue
    if (file.size > MAX_SIZE) continue

    const buffer   = Buffer.from(await file.arrayBuffer())
    const hash     = createHash('sha256').update(buffer).digest('hex').slice(0, 16)
    const safeName = `central-${randomBytes(4).toString('hex')}-${hash}${ext}`
    const filePath = join(dir, safeName)
    await writeFile(filePath, buffer)

    const att = await prisma.centralAttachment.create({
      data: {
        itemId:   params.id,
        fileName: file.name,
        fileType: file.type || ext,
        fileSize: file.size,
        filePath: `/uploads/central/${safeName}`,
      },
    })

    await prisma.centralHistory.create({
      data: {
        itemId: params.id,
        action: 'ANEXO_ADICIONADO',
        detail: `${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      },
    })

    created.push(att)
  }

  return NextResponse.json({ ok: true, attachments: created })
}
