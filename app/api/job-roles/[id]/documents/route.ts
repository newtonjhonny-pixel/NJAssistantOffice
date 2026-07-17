import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

const ALLOWED = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png', 'image/jpeg', 'image/webp',
]
const MAX_SIZE = 10 * 1024 * 1024

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const docs = await prisma.jobDocument.findMany({
    where: { jobRoleId: params.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(docs)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const role = await prisma.jobRole.findUnique({ where: { id: params.id } })
  if (!role) return NextResponse.json({ error: 'Cargo não encontrado' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Arquivo excede 10 MB' }, { status: 400 })

  const rand     = randomBytes(6).toString('hex')
  const safeName = `jobrole-${params.id.slice(0, 8)}-${rand}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const dir      = join(process.cwd(), 'public', 'uploads', 'job-roles')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, safeName), Buffer.from(await file.arrayBuffer()))

  const doc = await prisma.jobDocument.create({
    data: {
      jobRoleId: params.id,
      fileName:  file.name,
      fileType:  file.type,
      fileSize:  file.size,
      filePath:  `/uploads/job-roles/${safeName}`,
    },
  })
  return NextResponse.json(doc, { status: 201 })
}
