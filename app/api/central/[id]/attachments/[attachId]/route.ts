import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; attachId: string } }
) {
  const att = await prisma.centralAttachment.findUnique({ where: { id: params.attachId } })
  if (!att) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await unlink(join(process.cwd(), 'public', att.filePath))
  } catch { /* file may already be gone */ }

  await prisma.centralAttachment.delete({ where: { id: params.attachId } })

  await prisma.centralHistory.create({
    data: { itemId: params.id, action: 'ANEXO_REMOVIDO', detail: att.fileName },
  })

  return NextResponse.json({ ok: true })
}
