import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/integrations/folders/select
// Body: { folderId: string, isSelected: boolean }
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { folderId, isSelected } = body

  if (!folderId || isSelected === undefined) {
    return NextResponse.json({ error: 'folderId e isSelected são obrigatórios' }, { status: 400 })
  }

  const folder = await prisma.emailFolder.update({
    where: { id: folderId },
    data: { isSelected: Boolean(isSelected) },
  })

  return NextResponse.json(folder)
}
