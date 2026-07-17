import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

const ALLOWED_MIME = [
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
]
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

function isImageMime(mime: string) {
  return mime.startsWith('image/')
}

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/png')
    return buffer[0] === 0x89 && buffer[1] === 0x50
  if (mimeType === 'image/jpeg')
    return buffer[0] === 0xff && buffer[1] === 0xd8
  if (mimeType === 'image/webp')
    return buffer[8] === 0x57 && buffer[9] === 0x45
  if (mimeType === 'image/gif')
    return buffer[0] === 0x47 && buffer[1] === 0x49
  if (mimeType === 'application/pdf')
    return buffer[0] === 0x25 && buffer[1] === 0x50
  return true // allow DOCX/XLSX without magic check
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const attachments = await prisma.noteAttachment.findMany({
    where: { noteId: params.id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(attachments)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const note = await prisma.note.findUnique({ where: { id: params.id } })
  if (!note) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })

  let formData: FormData
  try { formData = await req.formData() }
  catch { return NextResponse.json({ error: 'Erro ao processar arquivo.' }, { status: 400 }) }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0)
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })

  if (!ALLOWED_MIME.includes(file.type))
    return NextResponse.json({ error: 'Formato não permitido.' }, { status: 400 })

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'Arquivo excede 20 MB.' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  if (!validateMagicBytes(buffer, file.type))
    return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 400 })

  const extMap: Record<string, string> = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/msword': 'doc',
    'application/vnd.ms-excel': 'xls',
  }
  const ext       = extMap[file.type] ?? 'bin'
  const rand      = randomBytes(6).toString('hex')
  const safeName  = `note-${params.id.substring(0, 8)}-${rand}.${ext}`

  const uploadDir = join(process.cwd(), 'public', 'uploads', 'notes')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, safeName), buffer)

  const attachment = await prisma.noteAttachment.create({
    data: {
      noteId:   params.id,
      fileName: file.name || safeName,
      fileType: file.type,
      fileSize: file.size,
      filePath: `/uploads/notes/${safeName}`,
    },
  })

  // Log to history
  await prisma.noteHistory.create({
    data: {
      noteId: params.id,
      type: 'ANEXO',
      title: `Anexo adicionado: ${file.name}`,
    },
  })

  return NextResponse.json({ ...attachment, isImage: isImageMime(file.type) }, { status: 201 })
}
