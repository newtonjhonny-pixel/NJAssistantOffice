import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const roles = await prisma.jobRole.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { processes: true, documents: true } },
    },
  })
  return NextResponse.json(roles)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const role = await prisma.jobRole.create({
    data: {
      name:         body.name,
      department:   body.department   || null,
      manager:      body.manager      || null,
      cbo:          body.cbo          || null,
      workSchedule: body.workSchedule || null,
      contractType: body.contractType || null,
      workLocation: body.workLocation || null,
    },
  })
  await prisma.jobVersion.create({
    data: {
      jobRoleId:  role.id,
      version:    '1.0',
      snapshot:   JSON.stringify(role),
      changeNote: 'Criação do cargo',
    },
  })
  return NextResponse.json(role, { status: 201 })
}
