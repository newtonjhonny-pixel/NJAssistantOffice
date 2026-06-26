import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/integrations/disconnect
// Body: { accountId: string }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { accountId } = body

  if (!accountId) {
    return NextResponse.json({ error: 'accountId obrigatório' }, { status: 400 })
  }

  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
    select: { id: true },
  })

  if (!account) {
    return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  // Desativa conta e limpa tokens — não exclui dados sincronizados
  await prisma.emailAccount.update({
    where: { id: accountId },
    data: {
      isActive: false,
      accessToken: '',
      refreshToken: null,
      expiresAt: null,
    },
  })

  return NextResponse.json({ ok: true })
}
