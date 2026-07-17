import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const role = await prisma.jobRole.findUnique({
    where: { id: params.id },
    include: {
      processes: {
        orderBy: { order: 'asc' },
        include: { checklistItems: { orderBy: { order: 'asc' } } },
      },
      documents: { orderBy: { createdAt: 'desc' } },
      versions:  { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!role) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(role)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()

  const current = await prisma.jobRole.findUnique({ where: { id: params.id } })
  if (!current) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  // Bump version
  const [major, minor] = (current.version ?? '1.0').split('.').map(Number)
  const newVersion = body.majorUpdate
    ? `${major + 1}.0`
    : `${major}.${(minor ?? 0) + 1}`

  const role = await prisma.jobRole.update({
    where: { id: params.id },
    data: {
      name:               body.name              ?? current.name,
      department:         body.department        ?? current.department,
      manager:            body.manager           ?? current.manager,
      cbo:                body.cbo               ?? current.cbo,
      workSchedule:       body.workSchedule      ?? current.workSchedule,
      contractType:       body.contractType      ?? current.contractType,
      workLocation:       body.workLocation      ?? current.workLocation,
      version:            newVersion,
      status:             body.status            ?? current.status,
      objective:          body.objective         ?? current.objective,
      mission:            body.mission           ?? current.mission,
      responsibilities:   body.responsibilities  ?? current.responsibilities,
      dailyActivities:    body.dailyActivities   ?? current.dailyActivities,
      weeklyActivities:   body.weeklyActivities  ?? current.weeklyActivities,
      monthlyActivities:  body.monthlyActivities ?? current.monthlyActivities,
      eventualActivities: body.eventualActivities?? current.eventualActivities,
      technicalSkills:    body.technicalSkills   ?? current.technicalSkills,
      behavioralSkills:   body.behavioralSkills  ?? current.behavioralSkills,
      requiredKnowledge:  body.requiredKnowledge ?? current.requiredKnowledge,
      toolsUsed:          body.toolsUsed         ?? current.toolsUsed,
      kpis:               body.kpis              ?? current.kpis,
    },
  })

  await prisma.jobVersion.create({
    data: {
      jobRoleId:  role.id,
      version:    newVersion,
      snapshot:   JSON.stringify(role),
      changedBy:  body.changedBy  || null,
      changeNote: body.changeNote || 'Atualização',
    },
  })

  return NextResponse.json(role)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.jobRole.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
