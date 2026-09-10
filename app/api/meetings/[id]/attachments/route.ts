import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUpload, saveUpload, isImageMime } from '@/lib/uploads/attachments'
import { logHistory, requirePermission } from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'
type Ctx = { params: { id: string } }

// Reutiliza a MESMA infraestrutura de upload de Anotações
// (MIME permitido, limite de 20 MB, magic bytes e nomeação segura).

// ─── GET /api/meetings/[id]/attachments ──────────────────────────────────────
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const rows = await prisma.meetingAttachment.findMany({
      where: { meetingId: params.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(rows.map(a => ({ ...a, isImage: isImageMime(a.fileType) })))
  } catch (e) {
    console.error('[meetings/attachments GET]', e)
    return NextResponse.json({ error: 'Erro ao listar anexos' }, { status: 500 })
  }
}

// ─── POST /api/meetings/[id]/attachments ─────────────────────────────────────
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id }, select: { id: true },
    })
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 })

    let formData: FormData
    try { formData = await req.formData() }
    catch { return NextResponse.json({ error: 'Erro ao processar arquivo.' }, { status: 400 }) }

    const result = await validateUpload(formData.get('file') as File | null)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })

    const { upload } = result
    const { filePath, safeName } = await saveUpload(
      upload, 'meetings', `meeting-${params.id.substring(0, 8)}`,
    )

    const attachment = await prisma.meetingAttachment.create({
      data: {
        meetingId: params.id,
        fileName:  upload.fileName || safeName,
        fileType:  upload.fileType,
        fileSize:  upload.fileSize,
        filePath,
      },
    })

    await logHistory(params.id, 'ANEXO_ADICIONADO', 'Anexo adicionado', upload.fileName)

    return NextResponse.json({ ...attachment, isImage: isImageMime(upload.fileType) }, { status: 201 })
  } catch (e) {
    console.error('[meetings/attachments POST]', e)
    return NextResponse.json({ error: 'Erro ao anexar arquivo' }, { status: 500 })
  }
}
