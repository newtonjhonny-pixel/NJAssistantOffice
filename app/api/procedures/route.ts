import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type       = searchParams.get('type')
  const search     = searchParams.get('search')
  const department = searchParams.get('department')
  const responsible= searchParams.get('responsible')

  const docs = await prisma.procedureDocument.findMany({
    where: {
      ...(type        ? { type }        : {}),
      ...(department  ? { department }  : {}),
      ...(responsible ? { responsible } : {}),
      ...(search ? {
        OR: [
          { title:       { contains: search } },
          { process:     { contains: search } },
          { description: { contains: search } },
        ],
      } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { steps: true, checklistItems: true } },
    },
  })
  return NextResponse.json(docs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const doc = await prisma.procedureDocument.create({
    data: {
      type:            body.type,
      title:           body.title,
      process:         body.process         || null,
      department:      body.department      || null,
      responsible:     body.responsible     || null,
      objective:       body.objective       || null,
      application:     body.application     || null,
      systemsUsed:     body.systemsUsed     || null,
      description:     body.description     || null,
      responsibilities:body.responsibilities|| null,
      attentionPoints: body.attentionPoints || null,
      risks:           body.risks           || null,
      expectedResult:  body.expectedResult  || null,
      notes:           body.notes           || null,
    },
  })
  return NextResponse.json(doc, { status: 201 })
}
