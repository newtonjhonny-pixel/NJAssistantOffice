import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  let cfg = await prisma.centralConfig.findFirst()
  if (!cfg) cfg = await prisma.centralConfig.create({ data: {} })
  return NextResponse.json(cfg)
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  let cfg = await prisma.centralConfig.findFirst()
  if (!cfg) cfg = await prisma.centralConfig.create({ data: {} })
  const updated = await prisma.centralConfig.update({
    where: { id: cfg.id },
    data: {
      folderPath:          body.folderPath          ?? undefined,
      folderEnabled:       body.folderEnabled        ?? undefined,
      folderIntervalMin:   body.folderIntervalMin    ?? undefined,
      folderMoveProcessed: body.folderMoveProcessed  ?? undefined,
      folderProcessedPath: body.folderProcessedPath  ?? undefined,
      emailAddress:        body.emailAddress          ?? undefined,
      emailEnabled:        body.emailEnabled          ?? undefined,
    },
  })
  return NextResponse.json(updated)
}
