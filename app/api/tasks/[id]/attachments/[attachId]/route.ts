import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { unlink } from "fs/promises"
import { join } from "path"

export const dynamic = "force-dynamic"

export async function DELETE(
  _: Request,
  { params }: { params: { id: string; attachId: string } }
) {
  const attachment = await prisma.taskAttachment.findUnique({
    where: { id: params.attachId },
  })
  if (!attachment || attachment.taskId !== params.id) {
    return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 })
  }

  // Remover arquivo do disco
  try {
    const filePath = join(process.cwd(), "public", attachment.filePath)
    await unlink(filePath)
  } catch {
    // arquivo pode já ter sido removido; continua
  }

  await prisma.taskAttachment.delete({ where: { id: params.attachId } })
  return NextResponse.json({ ok: true })
}
