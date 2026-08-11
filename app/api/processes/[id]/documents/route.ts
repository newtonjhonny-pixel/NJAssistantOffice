import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

// GET /api/processes/[id]/documents — documentos vinculados a este processo
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, type, title, process, department, responsible, "processId",
            "createdAt", "updatedAt",
            (SELECT COUNT(*) FROM "ProcedureStep" WHERE "documentId" = "ProcedureDocument".id) AS stepCount,
            (SELECT COUNT(*) FROM "ProcedureChecklistItem" WHERE "documentId" = "ProcedureDocument".id) AS itemCount,
            (SELECT COUNT(*) FROM "ProcedureFlow" WHERE "documentId" = "ProcedureDocument".id) AS flowCount
     FROM "ProcedureDocument"
     WHERE "processId" = ?
     ORDER BY "updatedAt" DESC`,
    params.id
  )
  return NextResponse.json(rows)
}
