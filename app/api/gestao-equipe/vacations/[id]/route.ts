import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const {
      companyName,
      acquisitionStartDate,
      acquisitionEndDate,
      concessionStartDate,
      concessionEndDate,
      availableDays,
      vacationDays,
      hasBonus,
      bonusDays,
      startDate,
      endDate,
      returnDate,
      status,
      substitute,
      observations,
    } = body

    // Business validation
    const dir = availableDays != null ? Number(availableDays) : null
    const vac = vacationDays  != null ? Number(vacationDays)  : null
    const bon = hasBonus && bonusDays ? Number(bonusDays) : 0
    if (dir !== null && vac !== null && (vac + bon) > dir) {
      return NextResponse.json(
        { error: `Dias de férias (${vac}) + abono (${bon}) não podem exceder os dias de direito (${dir}).` },
        { status: 400 }
      )
    }

    const prev = await prisma.teamVacation.findUnique({
      where: { id: params.id },
      include: { member: { select: { name: true } } },
    })

    const v = await prisma.teamVacation.update({
      where: { id: params.id },
      data: {
        ...(companyName          !== undefined && { companyName: companyName || null }),
        ...(acquisitionStartDate !== undefined && { acquisitionStartDate: acquisitionStartDate ? new Date(acquisitionStartDate) : null }),
        ...(acquisitionEndDate   !== undefined && { acquisitionEndDate:   acquisitionEndDate   ? new Date(acquisitionEndDate)   : null }),
        ...(concessionStartDate  !== undefined && { concessionStartDate:  concessionStartDate  ? new Date(concessionStartDate)  : null }),
        ...(concessionEndDate    !== undefined && { concessionEndDate:    concessionEndDate    ? new Date(concessionEndDate)    : null }),
        ...(availableDays != null && { availableDays: Number(availableDays) }),
        ...(vacationDays  != null && { vacationDays:  Number(vacationDays) }),
        ...(hasBonus !== undefined && { hasBonus: Boolean(hasBonus) }),
        ...(bonusDays != null ? { bonusDays: Number(bonusDays) } : hasBonus === false ? { bonusDays: null } : {}),
        ...(startDate  !== undefined && { startDate:  startDate  ? new Date(startDate)  : null }),
        ...(endDate    !== undefined && { endDate:    endDate    ? new Date(endDate)    : null }),
        ...(returnDate !== undefined && { returnDate: returnDate ? new Date(returnDate) : null }),
        ...(status     !== undefined && { status }),
        ...(substitute  !== undefined && { substitute:  substitute  || null }),
        ...(observations !== undefined && { observations: observations || null }),
      },
      include: { member: { select: { id: true, name: true, role: true } } },
    })

    const changes: string[] = []
    if (status && prev?.status !== status) changes.push(`Status: ${prev?.status} → ${status}`)
    if (companyName !== undefined && prev?.companyName !== companyName) changes.push(`Empresa: ${companyName}`)

    await prisma.teamHistory.create({
      data: {
        memberId:    v.memberId,
        type:        "FERIAS",
        title:       changes.length ? `Férias editada — ${changes.join(", ")}` : "Férias editada",
        description: v.member.name,
      },
    })

    return NextResponse.json(v)
  } catch (err) {
    console.error("[vacations PATCH]", err)
    return NextResponse.json({ error: "Erro interno ao editar férias." }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const v = await prisma.teamVacation.findUnique({
    where: { id: params.id },
    include: { member: { select: { id: true, name: true } } },
  })
  await prisma.teamVacation.delete({ where: { id: params.id } })
  if (v) {
    await prisma.teamHistory.create({
      data: {
        memberId:    v.memberId,
        type:        "FERIAS",
        title:       "Férias excluída",
        description: v.member.name,
      },
    })
  }
  return NextResponse.json({ ok: true })
}
