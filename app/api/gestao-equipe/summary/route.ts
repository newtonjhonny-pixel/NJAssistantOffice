import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const now = new Date()
  const in7days = new Date(now.getTime() + 7 * 86400000)
  const in30days = new Date(now.getTime() + 30 * 86400000)

  const [
    totalMembers,
    activeMembers,
    totalFeedbacks,
    totalDirections,
    totalVacations,
    totalTrainings,
    totalActivities,
    totalGuidelines,
    upcomingVacations,
    onVacation,
    overdueActivities,
    pendingActivities,
    vacationConflicts,
  ] = await Promise.all([
    prisma.teamMember.count(),
    prisma.teamMember.count({ where: { status: "ATIVO" } }),
    prisma.teamFeedback.count(),
    prisma.teamActivityDirection.count({ where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] } } }),
    prisma.teamVacation.count({ where: { status: { in: ["PROGRAMADA", "EM_FERIAS"] } } }),
    prisma.teamTraining.count({ where: { status: { notIn: ["CONCLUIDO", "CANCELADO"] } } }),
    prisma.teamActivity.count({ where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] } } }),
    prisma.teamGuideline.count({ where: { status: "ATIVA" } }),
    prisma.teamVacation.findMany({
      where: {
        startDate: { gte: now, lte: in30days },
        status: { in: ["PROGRAMADA"] },
      },
      include: { member: { select: { name: true } } },
      orderBy: { startDate: "asc" },
      take: 5,
    }),
    prisma.teamVacation.findMany({
      where: { status: "EM_FERIAS" },
      include: { member: { select: { name: true } } },
      orderBy: { returnDate: "asc" },
    }),
    prisma.teamActivity.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ["CONCLUIDA", "CANCELADA"] },
      },
      include: { member: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.teamActivity.count({
      where: { status: "PENDENTE" },
    }),
    prisma.teamVacation.findMany({
      where: {
        startDate: { gte: now, lte: in7days },
        status: "PROGRAMADA",
      },
      include: { member: { select: { name: true } } },
    }),
  ])

  return NextResponse.json({
    counts: {
      totalMembers,
      activeMembers,
      totalFeedbacks,
      totalDirections,
      totalVacations,
      totalTrainings,
      totalActivities,
      totalGuidelines,
      pendingActivities,
    },
    alerts: {
      upcomingVacations,
      onVacation,
      overdueActivities,
      vacationConflicts,
    },
  })
}
