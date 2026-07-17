import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const memberId   = searchParams.get("memberId")
  const status     = searchParams.get("status")
  const company    = searchParams.get("company")
  const month      = searchParams.get("month")
  const year       = searchParams.get("year")
  const hasBonus   = searchParams.get("hasBonus")

  const vacations = await prisma.teamVacation.findMany({
    where: {
      ...(memberId && { memberId }),
      ...(status   && { status }),
      ...(company  && { companyName: { contains: company } }),
      ...(hasBonus === "SIM" && { hasBonus: true }),
      ...(hasBonus === "NAO" && { hasBonus: false }),
    },
    include: { member: { select: { id: true, name: true, role: true, sector: true } } },
    orderBy: { createdAt: "desc" },
  })

  // Filter by month/year of startDate in JS (SQLite limitation)
  let result = vacations
  if (month || year) {
    result = vacations.filter(v => {
      if (!v.startDate) return false
      const d = new Date(v.startDate)
      if (month && String(d.getMonth() + 1).padStart(2, "0") !== month) return false
      if (year  && String(d.getFullYear()) !== year) return false
      return true
    })
  }

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      memberId,
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

    // Required field validation
    if (!memberId)            return NextResponse.json({ error: "Colaborador é obrigatório." },              { status: 400 })
    if (!companyName?.trim()) return NextResponse.json({ error: "Empresa é obrigatória." },                 { status: 400 })
    if (!acquisitionStartDate) return NextResponse.json({ error: "Início do período aquisitivo é obrigatório." }, { status: 400 })
    if (!acquisitionEndDate)   return NextResponse.json({ error: "Fim do período aquisitivo é obrigatório." },    { status: 400 })
    if (!concessionStartDate)  return NextResponse.json({ error: "Início do período concessivo é obrigatório." }, { status: 400 })
    if (!concessionEndDate)    return NextResponse.json({ error: "Fim do período concessivo é obrigatório." },    { status: 400 })
    if (!availableDays)        return NextResponse.json({ error: "Dias de direito é obrigatório." },         { status: 400 })
    if (!vacationDays)         return NextResponse.json({ error: "Dias de férias gozadas é obrigatório." },  { status: 400 })
    if (!startDate)            return NextResponse.json({ error: "Início das férias é obrigatório." },       { status: 400 })
    if (!endDate)              return NextResponse.json({ error: "Fim das férias é obrigatório." },          { status: 400 })
    if (!returnDate)           return NextResponse.json({ error: "Retorno ao trabalho é obrigatório." },     { status: 400 })

    // Business validation
    const dir = Number(availableDays)
    const vac = Number(vacationDays)
    const bon = hasBonus && bonusDays ? Number(bonusDays) : 0
    if (vac + bon > dir) {
      return NextResponse.json(
        { error: `Dias de férias (${vac}) + abono (${bon}) não podem exceder os dias de direito (${dir}).` },
        { status: 400 }
      )
    }
    if (acquisitionEndDate < acquisitionStartDate) {
      return NextResponse.json({ error: "Fim do período aquisitivo não pode ser anterior ao início." }, { status: 400 })
    }
    if (concessionEndDate < concessionStartDate) {
      return NextResponse.json({ error: "Fim do período concessivo não pode ser anterior ao início." }, { status: 400 })
    }
    if (returnDate < endDate) {
      return NextResponse.json({ error: "Retorno ao trabalho não pode ser anterior ao fim das férias." }, { status: 400 })
    }

    const vacation = await prisma.teamVacation.create({
      data: {
        memberId,
        companyName:          companyName.trim(),
        acquisitionStartDate: new Date(acquisitionStartDate),
        acquisitionEndDate:   new Date(acquisitionEndDate),
        concessionStartDate:  new Date(concessionStartDate),
        concessionEndDate:    new Date(concessionEndDate),
        availableDays:        dir,
        vacationDays:         vac,
        hasBonus:             Boolean(hasBonus),
        bonusDays:            hasBonus && bonusDays ? Number(bonusDays) : null,
        startDate:            new Date(startDate),
        endDate:              new Date(endDate),
        returnDate:           new Date(returnDate),
        status:               status || "A_PROGRAMAR",
        substitute:           substitute   || null,
        observations:         observations || null,
      },
      include: { member: { select: { id: true, name: true, role: true } } },
    })

    await prisma.teamHistory.create({
      data: {
        memberId,
        type:        "FERIAS",
        title:       "Férias cadastrada",
        description: `${vacation.member.name} — ${companyName.trim()}`,
      },
    })

    return NextResponse.json(vacation, { status: 201 })
  } catch (err) {
    console.error("[vacations POST]", err)
    return NextResponse.json({ error: "Erro interno ao salvar férias." }, { status: 500 })
  }
}
