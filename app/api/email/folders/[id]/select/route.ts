import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { isSelected } = await req.json()
  const folder = await prisma.emailFolder.update({
    where: { id: params.id },
    data: { isSelected: Boolean(isSelected) },
  })
  return NextResponse.json(folder)
}
