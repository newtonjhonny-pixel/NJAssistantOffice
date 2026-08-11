import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

// PATCH /api/procedures/[id]/link — atualiza processId (vinculação)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { processId } = await req.json()
  await prisma.$executeRawUnsafe(
    `UPDATE "ProcedureDocument" SET "processId" = ?, "updatedAt" = ? WHERE id = ?`,
    processId ?? null,
    new Date().toISOString(),
    params.id,
  )
  return NextResponse.json({ ok: true })
}
