import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import { ensureTimesheetSchema } from '../../members/[id]/timesheet/_utils'
import {
  getNationalHolidays,
  getStateHolidays,
  getMunicipalHolidays,
  getMunicipalHolidaysByName,
  type HolidayEntry,
} from '@/lib/holiday-provider'

export const dynamic = 'force-dynamic'

// ─── GET /api/gestao-equipe/work-calendar/gerar?year=2026 ────────────────────
// Preview: retorna localidades únicas das empresas + empresas sem endereço

export async function GET(req: Request) {
  try {
    await ensureTimesheetSchema()
    const { searchParams } = new URL(req.url)
    const year = Number(searchParams.get('year') ?? new Date().getFullYear())

    if (!year || year < 2020 || year > 2100)
      return NextResponse.json({ error: 'Ano inválido.' }, { status: 400 })

    const result = await buildLocalities()
    return NextResponse.json({ year, ...result })
  } catch (e) {
    console.error('[work-calendar/gerar GET]', e)
    return NextResponse.json({ error: 'Erro ao listar localidades' }, { status: 500 })
  }
}

// ─── POST /api/gestao-equipe/work-calendar/gerar ─────────────────────────────
// Gera feriados para o ano informado baseado nas empresas cadastradas

export async function POST(req: Request) {
  try {
    await ensureTimesheetSchema()
    const body = await req.json().catch(() => ({}))
    const year = Number(body.year ?? new Date().getFullYear())
    const generatedBy: string = body.generatedBy ?? 'sistema'

    if (!year || year < 2020 || year > 2100)
      return NextResponse.json({ error: 'Ano inválido (mínimo 2020, máximo 2100).' }, { status: 400 })

    // 1. Coleta localidades únicas das empresas
    const { localities, companiesPending } = await buildLocalities()

    // 2. Gera todos os feriados por localidade
    const allHolidays: HolidayEntry[] = []

    // Nacional sempre
    const national = await getNationalHolidays(year)
    allHolidays.push(...national)

    // Estaduais e municipais por localidade única
    for (const loc of localities) {
      // Estaduais da UF
      const state = getStateHolidays(loc.uf, year)
      allHolidays.push(...state)

      // Municipais
      let municipal: HolidayEntry[] = []
      if (loc.ibgeCode) {
        municipal = getMunicipalHolidays(loc.ibgeCode, year)
      } else if (loc.city) {
        municipal = getMunicipalHolidaysByName(loc.city, loc.uf, year)
      }
      allHolidays.push(...municipal)
    }

    // 3. Deduplicar por (date + type + uf + ibgeCode/municipio)
    const deduped = deduplicateHolidays(allHolidays)

    // 4. Upsert no banco — preserva entradas MANUAIS (origin = 'MANUAL')
    let created = 0, updated = 0, skipped = 0
    const now = new Date().toISOString()

    for (const h of deduped) {
      const yearNum = Number(h.date.slice(0, 4))

      // Busca entrada existente com mesma chave (date + type + escopo)
      const existing = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id", "origin" FROM "WorkCalendarEntry"
         WHERE "date" = ?
           AND "type" = ?
           AND COALESCE("uf",       '') = COALESCE(?, '')
           AND COALESCE("ibgeCode", '') = COALESCE(?, '')
           AND COALESCE("municipio",'') = COALESCE(?, '')
           AND ("companyId" IS NULL)
         LIMIT 1`,
        h.date, h.type,
        h.uf       ?? null,
        h.ibgeCode ?? null,
        h.municipio ?? null
      )

      if (existing.length) {
        const ent = existing[0]
        // Preserva entradas manuais — não sobrescreve
        if (ent.origin === 'MANUAL') {
          skipped++
          continue
        }
        // Atualiza entradas oficiais/importadas
        await prisma.$executeRawUnsafe(`
          UPDATE "WorkCalendarEntry" SET
            "description" = ?, "origin" = ?, "active" = 1, "updatedAt" = ?
          WHERE "id" = ?
        `, h.description, h.origin, now, ent.id)
        updated++
      } else {
        // Cria nova entrada
        const id = randomUUID()
        await prisma.$executeRawUnsafe(`
          INSERT INTO "WorkCalendarEntry" (
            "id","date","year","description","type",
            "uf","municipio","ibgeCode","country",
            "companyId","unitId","isWorked","observations",
            "origin","active","createdAt","updatedAt"
          ) VALUES (?,?,?,?,?,?,?,?,?,NULL,NULL,0,NULL,?,1,?,?)
        `,
          id, h.date, yearNum, h.description, h.type,
          h.uf ?? null, h.municipio ?? null, h.ibgeCode ?? null,
          'Brasil',
          h.origin, now, now
        )
        created++
      }
    }

    // 5. Grava histórico de geração
    const genId = randomUUID()
    await prisma.$executeRawUnsafe(`
      INSERT INTO "HolidayCalendarGeneration" (
        "id","year","generatedAt","generatedBy",
        "localitiesCount","entriesCreated","entriesUpdated","entriesSkipped",
        "companiesPending","status","summary","createdAt"
      ) VALUES (?,?,?,?,?,?,?,?,?,'CONCLUIDO',?,?)
    `,
      genId, year, now, generatedBy,
      localities.length, created, updated, skipped,
      companiesPending,
      JSON.stringify({ localities: localities.map(l => `${l.city ?? ''}/${l.uf}`), total: deduped.length }),
      now
    )

    return NextResponse.json({
      year,
      localitiesCount: localities.length,
      companiesPending,
      entriesCreated: created,
      entriesUpdated: updated,
      entriesSkipped: skipped,
      totalProcessed: deduped.length,
      generationId: genId,
    })
  } catch (e) {
    console.error('[work-calendar/gerar POST]', e)
    return NextResponse.json({ error: 'Erro ao gerar calendário' }, { status: 500 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface Locality {
  uf: string
  city: string | null
  ibgeCode: string | null
  companyCount: number
  companyIds: string[]
}

async function buildLocalities(): Promise<{
  localities: Locality[]
  companiesPending: number
  pendingCompanies: Array<{ id: string; code: string | null; name: string }>
}> {
  // Busca todas as empresas ativas com endereço
  const companies = await prisma.$queryRawUnsafe<any[]>(`
    SELECT "id", "code", "name", "city", "state", "ibgeCode"
    FROM "ClientCompany"
    WHERE "active" = true
    ORDER BY "state" ASC, "city" ASC
  `)

  const pending: Array<{ id: string; code: string | null; name: string }> = []
  const localityMap = new Map<string, Locality>()

  for (const c of companies) {
    const uf   = (c.state ?? '').toUpperCase().trim()
    const city = (c.city  ?? '').trim() || null

    if (!uf) {
      pending.push({ id: c.id, code: c.code, name: c.name })
      continue
    }

    // Chave de deduplicação: ibgeCode se disponível, senão uf+city (normalizado)
    const ibge = (c.ibgeCode ?? '').trim() || null
    const key  = ibge ? `ibge:${ibge}` : `uf:${uf}:${normaliz(city ?? '')}`

    if (localityMap.has(key)) {
      const loc = localityMap.get(key)!
      loc.companyCount++
      loc.companyIds.push(c.id)
    } else {
      localityMap.set(key, {
        uf,
        city: city || null,
        ibgeCode: ibge,
        companyCount: 1,
        companyIds: [c.id],
      })
    }
  }

  const localities = Array.from(localityMap.values())
    .sort((a, b) => a.uf.localeCompare(b.uf) || (a.city ?? '').localeCompare(b.city ?? ''))

  return {
    localities,
    companiesPending: pending.length,
    pendingCompanies: pending,
  }
}

function normaliz(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/**
 * Remove duplicatas por (date + type + uf + ibgeCode/municipio).
 * Em caso de duplicata, mantém a mais específica (com mais campos preenchidos).
 */
function deduplicateHolidays(holidays: HolidayEntry[]): HolidayEntry[] {
  const map = new Map<string, HolidayEntry>()
  for (const h of holidays) {
    const key = [
      h.date,
      h.type,
      (h.uf       ?? '').toUpperCase(),
      (h.ibgeCode ?? ''),
      normaliz(h.municipio ?? ''),
    ].join('|')
    if (!map.has(key)) {
      map.set(key, h)
    }
    // Mantém o primeiro (ordem: nacional > estadual > municipal)
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}
