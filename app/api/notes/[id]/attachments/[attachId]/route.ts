import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _: Request,
  { params }: { params: { id: string; attachId: string } }
) {
  const attachment = await prisma.noteAttachment.findUnique({
    where: { id: params.attachId },
  })
  if (!attachment) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  // Delete file from disk (best-effort)
  try {
    const filename = attachment.filePath.split('/').pop()!
    await unlink(join(process.cwd(), 'public', 'uploads', 'notes', filename))
  } catch { /* ignore if already gone */ }

  await prisma.noteAttachment.delete({ where: { id: params.attachId } })
  return NextResponse.json({ ok: true })
}
