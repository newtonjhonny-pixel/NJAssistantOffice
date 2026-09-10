import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUpload, saveUpload, isImageMime } from '@/lib/uploads/attachments'

export const dynamic = 'force-dynamic'

// As políticas de MIME, tamanho, magic bytes e nomeação vivem em
// lib/uploads/attachments.ts e são compartilhadas com Pautas de Reuniões.

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

  const result = await validateUpload(formData.get('file') as File | null)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })

  const { upload } = result
  const { filePath, safeName } = await saveUpload(
    upload, 'notes', `note-${params.id.substring(0, 8)}`,
  )

  const attachment = await prisma.noteAttachment.create({
    data: {
      noteId:   params.id,
      fileName: upload.fileName || safeName,
      fileType: upload.fileType,
      fileSize: upload.fileSize,
      filePath,
    },
  })

  // Log to history
  await prisma.noteHistory.create({
    data: {
      noteId: params.id,
      type: 'ANEXO',
      title: `Anexo adicionado: ${upload.fileName}`,
    },
  })

  return NextResponse.json({ ...attachment, isImage: isImageMime(upload.fileType) }, { status: 201 })
}
