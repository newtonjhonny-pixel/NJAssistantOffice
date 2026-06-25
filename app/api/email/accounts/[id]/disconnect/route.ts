import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.emailAccount.update({
    where: { id: params.id },
    data: { isActive: false, accessToken: '', refreshToken: null },
  })
  return NextResponse.json({ ok: true })
}
