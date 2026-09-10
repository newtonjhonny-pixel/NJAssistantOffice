import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { logHistory, requirePermission } from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'
type Ctx = { params: { id: string; attachId: string } }

// ─── DELETE /api/meetings/[id]/attachments/[attachId] ────────────────────────
export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('edit')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const attachment = await prisma.meetingAttachment.findUnique({ where: { id: params.attachId } })
    if (!attachment || attachment.meetingId !== params.id)
      return NextResponse.json({ error: 'Anexo não encontrado nesta reunião.' }, { status: 404 })

    await prisma.meetingAttachment.delete({ where: { id: params.attachId } })

    // Remove o arquivo do disco; se já não existir, segue sem falhar.
    try {
      await unlink(join(process.cwd(), 'public', attachment.filePath.replace(/^\//, '')))
    } catch { /* arquivo ausente — registro já removido */ }

    await logHistory(params.id, 'ANEXO_REMOVIDO', 'Anexo removido', attachment.fileName)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[meetings/attachments DELETE]', e)
    return NextResponse.json({ error: 'Erro ao remover anexo' }, { status: 500 })
  }
}
