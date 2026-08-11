import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; versionId: string } },
) {
  try {
    const version = await prisma.presentationVersion.findUnique({
      where: { id: params.versionId },
    })
    if (!version) return NextResponse.json({ error: "Versão não encontrada" }, { status: 404 })

    await prisma.presentation.update({
      where: { id: params.id },
      data:  { content: version.content, status: "editing" },
    })

    await prisma.presentationHistory.create({
      data: {
        presentationId: params.id,
        action:         "RESTAURACAO",
        description:    `Restaurado para: ${version.label ?? "versão sem título"}`,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
