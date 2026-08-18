/**
 * Holiday Provider — dados determinísticos de feriados brasileiros
 * Nacional: BrasilAPI (com fallback offline)
 * Estadual/Municipal: dados curados embutidos
 * SEM IA — 100% determinístico e testável
 */

export type HolidayEntry = {
  date: string       // YYYY-MM-DD
  description: string
  type: 'FERIADO_NACIONAL' | 'FERIADO_ESTADUAL' | 'FERIADO_MUNICIPAL'
  uf?: string
  municipio?: string
  ibgeCode?: string  // código IBGE do município
  origin: 'OFICIAL' | 'MANUAL'
}

// Cache em memória por sessão
const cache = new Map<string, HolidayEntry[]>()

// ─── Cálculo de Páscoa (algoritmo de Butcher / Gregoriano) ───────────────────

function calcEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function ym(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

// ─── FERIADOS NACIONAIS — fallback offline ────────────────────────────────────

function nationalFallback(year: number): HolidayEntry[] {
  const easter = calcEaster(year)
  return [
    { date: ym(year,1,1),   description: 'Confraternização Universal',       type: 'FERIADO_NACIONAL', origin: 'OFICIAL' },
    { date: addDays(easter,-48), description: 'Carnaval (2ª-feira)',          type: 'FERIADO_NACIONAL', origin: 'OFICIAL' },
    { date: addDays(easter,-47), description: 'Carnaval (3ª-feira)',          type: 'FERIADO_NACIONAL', origin: 'OFICIAL' },
    { date: addDays(easter,-2),  description: 'Paixão de Cristo',             type: 'FERIADO_NACIONAL', origin: 'OFICIAL' },
    { date: ym(year,4,21),   description: 'Tiradentes',                       type: 'FERIADO_NACIONAL', origin: 'OFICIAL' },
    { date: ym(year,5,1),    description: 'Dia do Trabalho',                  type: 'FERIADO_NACIONAL', origin: 'OFICIAL' },
    { date: addDays(easter,60),  description: 'Corpus Christi',               type: 'FERIADO_NACIONAL', origin: 'OFICIAL' },
    { date: ym(year,9,7),    description: 'Independência do Brasil',          type: 'FERIADO_NACIONAL', origin: 'OFICIAL' },
    { date: ym(year,10,12),  description: 'Nossa Senhora Aparecida',          type: 'FERIADO_NACIONAL', origin: 'OFICIAL' },
    { date: ym(year,11,2),   description: 'Finados',                          type: 'FERIADO_NACIONAL', origin: 'OFICIAL' },
    { date: ym(year,11,15),  description: 'Proclamação da República',         type: 'FERIADO_NACIONAL', origin: 'OFICIAL' },
    { date: ym(year,11,20),  description: 'Dia da Consciência Negra',         type: 'FERIADO_NACIONAL', origin: 'OFICIAL' },
    { date: ym(year,12,25),  description: 'Natal',                            type: 'FERIADO_NACIONAL', origin: 'OFICIAL' },
  ]
}

// ─── FERIADOS ESTADUAIS — curados por UF ─────────────────────────────────────
// Formato: { month, day, description }

const STATE_HOLIDAYS: Record<string, Array<{ month: number; day: number; description: string }>> = {
  AC: [{ month:6,  day:15, description:'Aniversário do Estado do Acre' },
       { month:9,  day:5,  description:'Dia do Seringueiro' },
       { month:11, day:17, description:'Assinatura do Tratado de Petrópolis' }],
  AL: [{ month:9,  day:16, description:'Emancipação Política de Alagoas' },
       { month:11, day:20, description:'Dia da Consciência Negra (AL)' }],
  AM: [{ month:9,  day:5,  description:'Elevação do Amazonas ao Estado' },
       { month:11, day:20, description:'Dia da Consciência Negra (AM)' }],
  AP: [{ month:3,  day:19, description:'São José (Macapá)' },
       { month:9,  day:13, description:'Criação do Território do Amapá' }],
  BA: [{ month:7,  day:2,  description:'Independência da Bahia' }],
  CE: [{ month:3,  day:25, description:'Data Magna do Ceará' },
       { month:11, day:20, description:'Dia da Consciência Negra (CE)' }],
  DF: [{ month:4,  day:21, description:'Fundação de Brasília' },
       { month:11, day:30, description:'Dia do Evangélico' }],
  ES: [{ month:5,  day:23, description:'Aniversário do Espírito Santo' },
       { month:10, day:28, description:'São Judas Tadeu (padroeiro)' }],
  GO: [{ month:10, day:24, description:'Aniversário de Goiás' }],
  MA: [{ month:7,  day:28, description:'Adesão do Maranhão à Independência do Brasil' }],
  MT: [{ month:11, day:20, description:'Dia da Consciência Negra (MT)' }],
  MS: [{ month:10, day:11, description:'Criação do Mato Grosso do Sul' },
       { month:11, day:20, description:'Dia da Consciência Negra (MS)' }],
  MG: [{ month:11, day:20, description:'Dia da Consciência Negra (MG)' }],
  PA: [{ month:8,  day:15, description:'Adesão do Pará à Independência do Brasil' }],
  PB: [{ month:7,  day:26, description:'Homenagem a Santa Ana' }],
  PE: [{ month:3,  day:6,  description:'Revolução Pernambucana de 1817' },
       { month:6,  day:24, description:'São João (PE)' }],
  PI: [{ month:10, day:19, description:'Aniversário do Piauí' }],
  PR: [{ month:12, day:19, description:'Emancipação do Paraná' }],
  RJ: [{ month:4,  day:23, description:'Dia de São Jorge' },
       { month:11, day:20, description:'Dia da Consciência Negra (RJ)' }],
  RN: [{ month:10, day:3,  description:'Mártires de Cunhaú e Uruaçú' },
       { month:12, day:8,  description:'Nossa Senhora da Conceição (RN)' }],
  RO: [{ month:1,  day:4,  description:'Criação do Estado de Rondônia' },
       { month:6,  day:18, description:'Aniversário do Estado de Rondônia' }],
  RR: [{ month:10, day:5,  description:'Criação do Estado de Roraima' }],
  RS: [{ month:9,  day:20, description:'Revolução Farroupilha' }],
  SC: [{ month:8,  day:11, description:'Criação da Capitania (SC)' }],
  SE: [{ month:7,  day:8,  description:'Aniversário de Sergipe' }],
  SP: [{ month:7,  day:9,  description:'Revolução Constitucionalista de 1932' }],
  TO: [{ month:3,  day:18, description:'Aniversário da Capital Palmas' },
       { month:10, day:5,  description:'Criação do Estado do Tocantins' }],
}

// ─── FERIADOS MUNICIPAIS — curados por código IBGE ───────────────────────────
// Incluídas: capitais estaduais + maiores municípios

const MUNICIPAL_HOLIDAYS: Record<string, Array<{ month: number; day: number; description: string; municipio: string; uf: string }>> = {
  // ── ACRE ──
  '1200401': [{ month:9,  day:5,  description:'Aniversário de Rio Branco',     municipio:'Rio Branco',    uf:'AC' }],
  // ── ALAGOAS ──
  '2704302': [{ month:12, day:16, description:'Aniversário de Maceió',         municipio:'Maceió',        uf:'AL' }],
  // ── AMAPÁ ──
  '1600303': [{ month:2,  day:4,  description:'Aniversário de Macapá',         municipio:'Macapá',        uf:'AP' }],
  // ── AMAZONAS ──
  '1302603': [{ month:10, day:24, description:'Aniversário de Manaus',         municipio:'Manaus',        uf:'AM' },
              { month:7,  day:15, description:'Adesão do AM ao Brasil',         municipio:'Manaus',        uf:'AM' }],
  // ── BAHIA ──
  '2927408': [{ month:3,  day:29, description:'Aniversário de Salvador',       municipio:'Salvador',      uf:'BA' },
              { month:12, day:8,  description:'Nossa Senhora da Conceição (SSA)',municipio:'Salvador',     uf:'BA' }],
  // ── CEARÁ ──
  '2304400': [{ month:4,  day:25, description:'Aniversário de Fortaleza',      municipio:'Fortaleza',     uf:'CE' }],
  // ── DISTRITO FEDERAL ──
  '5300108': [{ month:4,  day:21, description:'Aniversário de Brasília',       municipio:'Brasília',      uf:'DF' },
              { month:11, day:30, description:'Dia do Evangélico',              municipio:'Brasília',      uf:'DF' }],
  // ── ESPÍRITO SANTO ──
  '3205309': [{ month:9,  day:8,  description:'Nossa Senhora da Penha (Vitória)',municipio:'Vitória',     uf:'ES' }],
  // ── GOIÁS ──
  '5208707': [{ month:10, day:24, description:'Aniversário de Goiânia',        municipio:'Goiânia',       uf:'GO' }],
  // ── MARANHÃO ──
  '2111300': [{ month:9,  day:8,  description:'Fundação de São Luís',          municipio:'São Luís',      uf:'MA' },
              { month:11, day:20, description:'Consciência Negra (São Luís)',   municipio:'São Luís',      uf:'MA' }],
  // ── MATO GROSSO ──
  '5103403': [{ month:4,  day:8,  description:'Aniversário de Cuiabá',         municipio:'Cuiabá',        uf:'MT' }],
  // ── MATO GROSSO DO SUL ──
  '5002704': [{ month:8,  day:26, description:'Aniversário de Campo Grande',   municipio:'Campo Grande',  uf:'MS' }],
  // ── MINAS GERAIS ──
  '3106200': [{ month:8,  day:15, description:'Assunção de Nossa Sra. (BH)',   municipio:'Belo Horizonte',uf:'MG' },
              { month:12, day:8,  description:'Nossa Senhora da Conceição (BH)',municipio:'Belo Horizonte',uf:'MG' }],
  '3170206': [{ month:6,  day:13, description:'Aniversário de Uberlândia',     municipio:'Uberlândia',    uf:'MG' }],
  '3118601': [{ month:12, day:8,  description:'Nossa Senhora Conceição',       municipio:'Contagem',      uf:'MG' }],
  // ── PARÁ ──
  '1501402': [{ month:9,  day:7,  description:'Independência do Brasil',        municipio:'Belém',        uf:'PA' },
              { month:10, day:12, description:'Nossa Senhora de Nazaré (Círio)',municipio:'Belém',         uf:'PA' },
              { month:11, day:15, description:'Adesão do Pará',                 municipio:'Belém',         uf:'PA' }],
  // ── PARAÍBA ──
  '2507507': [{ month:8,  day:5,  description:'Fundação de João Pessoa',       municipio:'João Pessoa',   uf:'PB' }],
  // ── PARANÁ ──
  '4106902': [{ month:3,  day:29, description:'Aniversário de Curitiba',       municipio:'Curitiba',      uf:'PR' }],
  '4113700': [{ month:10, day:5,  description:'Aniversário de Londrina',       municipio:'Londrina',      uf:'PR' }],
  '4115200': [{ month:7,  day:4,  description:'Aniversário de Maringá',        municipio:'Maringá',       uf:'PR' }],
  // ── PERNAMBUCO ──
  '2611606': [{ month:3,  day:12, description:'Aniversário de Recife',         municipio:'Recife',        uf:'PE' },
              { month:11, day:20, description:'Consciência Negra (Recife)',     municipio:'Recife',        uf:'PE' }],
  '2609600': [{ month:1,  day:1,  description:'Aniversário de Caruaru',        municipio:'Caruaru',       uf:'PE' }],
  // ── PIAUÍ ──
  '2211001': [{ month:8,  day:24, description:'Nossa Sra. das Graças (Teresina)',municipio:'Teresina',    uf:'PI' }],
  // ── RIO DE JANEIRO ──
  '3304557': [{ month:1,  day:20, description:'Dia de São Sebastião (RJ)',     municipio:'Rio de Janeiro',uf:'RJ' },
              { month:11, day:2,  description:'Aniversário do Rio de Janeiro',  municipio:'Rio de Janeiro',uf:'RJ' },
              { month:11, day:20, description:'Consciência Negra (Rio)',        municipio:'Rio de Janeiro',uf:'RJ' }],
  '3303302': [{ month:3,  day:22, description:'Aniversário de Niterói',        municipio:'Niterói',       uf:'RJ' }],
  '3303500': [{ month:4,  day:15, description:'Aniversário de Nova Iguaçu',    municipio:'Nova Iguaçu',   uf:'RJ' }],
  // ── RIO GRANDE DO NORTE ──
  '2408102': [{ month:12, day:25, description:'Aniversário de Natal',          municipio:'Natal',         uf:'RN' }],
  // ── RIO GRANDE DO SUL ──
  '4314902': [{ month:3,  day:26, description:'Aniversário de Porto Alegre',   municipio:'Porto Alegre',  uf:'RS' },
              { month:11, day:20, description:'Consciência Negra (POA)',        municipio:'Porto Alegre',  uf:'RS' }],
  '4304606': [{ month:8,  day:25, description:'Aniversário de Caxias do Sul',  municipio:'Caxias do Sul', uf:'RS' }],
  // ── RONDÔNIA ──
  '1100205': [{ month:1,  day:4,  description:'Aniversário de Porto Velho',    municipio:'Porto Velho',   uf:'RO' }],
  // ── RORAIMA ──
  '1400100': [{ month:10, day:9,  description:'Aniversário de Boa Vista',      municipio:'Boa Vista',     uf:'RR' }],
  // ── SANTA CATARINA ──
  '4205407': [{ month:3,  day:23, description:'Aniversário de Florianópolis',  municipio:'Florianópolis', uf:'SC' },
              { month:10, day:28, description:'Nossa Sra. do Desterro',        municipio:'Florianópolis', uf:'SC' }],
  '4202404': [{ month:3,  day:12, description:'Aniversário de Blumenau',       municipio:'Blumenau',      uf:'SC' }],
  '4216602': [{ month:7,  day:22, description:'Aniversário de São José',       municipio:'São José',      uf:'SC' }],
  // ── SÃO PAULO ──
  '3550308': [{ month:1,  day:25, description:'Aniversário de São Paulo',      municipio:'São Paulo',     uf:'SP' },
              { month:7,  day:9,  description:'Revolução Constitucionalista (SP)',municipio:'São Paulo',   uf:'SP' },
              { month:11, day:20, description:'Consciência Negra (SP)',         municipio:'São Paulo',     uf:'SP' }],
  '3509502': [{ month:6,  day:19, description:'Aniversário de Campinas',       municipio:'Campinas',      uf:'SP' }],
  '3543402': [{ month:4,  day:8,  description:'Aniversário de Ribeirão Preto', municipio:'Ribeirão Preto',uf:'SP' }],
  '3548500': [{ month:4,  day:16, description:'Aniversário de Santos',         municipio:'Santos',        uf:'SP' }],
  '3552205': [{ month:8,  day:12, description:'Aniversário de Sorocaba',       municipio:'Sorocaba',      uf:'SP' }],
  '3547809': [{ month:8,  day:11, description:'Aniversário de São Bernardo',   municipio:'São Bernardo do Campo',uf:'SP' }],
  '3518800': [{ month:12, day:27, description:'Aniversário de Guarulhos',      municipio:'Guarulhos',     uf:'SP' }],
  // ── SERGIPE ──
  '2800308': [{ month:3,  day:8,  description:'Aniversário de Aracaju',        municipio:'Aracaju',       uf:'SE' }],
  // ── TOCANTINS ──
  '1721000': [{ month:5,  day:20, description:'Aniversário de Palmas',         municipio:'Palmas',        uf:'TO' }],
}

// ─── FERIADOS NACIONAIS via BrasilAPI ────────────────────────────────────────

async function fetchNationalOnline(year: number): Promise<HolidayEntry[]> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: Array<{ date: string; localName: string; name?: string }> = await res.json()
    return data.map(h => ({
      date: h.date.slice(0, 10),
      description: h.localName || h.name || 'Feriado Nacional',
      type: 'FERIADO_NACIONAL' as const,
      origin: 'OFICIAL' as const,
    }))
  } catch {
    return []
  }
}

// ─── API PÚBLICA ─────────────────────────────────────────────────────────────

/** Retorna feriados nacionais do Brasil para o ano informado. */
export async function getNationalHolidays(year: number): Promise<HolidayEntry[]> {
  const key = `nacional-${year}`
  if (cache.has(key)) return cache.get(key)!

  // Tenta online primeiro, cai para offline se falhar
  let holidays = await fetchNationalOnline(year)
  if (holidays.length === 0) {
    holidays = nationalFallback(year)
  }

  cache.set(key, holidays)
  return holidays
}

/** Retorna feriados estaduais para uma UF e ano. */
export function getStateHolidays(uf: string, year: number): HolidayEntry[] {
  const key = `estadual-${uf}-${year}`
  if (cache.has(key)) return cache.get(key)!

  const defs = STATE_HOLIDAYS[uf.toUpperCase()] ?? []
  const holidays: HolidayEntry[] = defs.map(d => ({
    date: ym(year, d.month, d.day),
    description: d.description,
    type: 'FERIADO_ESTADUAL' as const,
    uf: uf.toUpperCase(),
    origin: 'OFICIAL' as const,
  }))

  cache.set(key, holidays)
  return holidays
}

/** Retorna feriados municipais para um código IBGE e ano. */
export function getMunicipalHolidays(ibgeCode: string, year: number): HolidayEntry[] {
  const key = `municipal-${ibgeCode}-${year}`
  if (cache.has(key)) return cache.get(key)!

  const defs = MUNICIPAL_HOLIDAYS[ibgeCode] ?? []
  const holidays: HolidayEntry[] = defs.map(d => ({
    date: ym(year, d.month, d.day),
    description: d.description,
    type: 'FERIADO_MUNICIPAL' as const,
    uf: d.uf,
    municipio: d.municipio,
    ibgeCode,
    origin: 'OFICIAL' as const,
  }))

  cache.set(key, holidays)
  return holidays
}

/**
 * Retorna feriados municipais por nome de cidade + UF (quando não há código IBGE).
 * Busca nas entradas municipais curadas.
 */
export function getMunicipalHolidaysByName(city: string, uf: string, year: number): HolidayEntry[] {
  const normaliz = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const normCity = normaliz(city)
  const normUF   = uf.toUpperCase()

  for (const [code, defs] of Object.entries(MUNICIPAL_HOLIDAYS)) {
    if (!defs.length) continue
    if (defs[0].uf !== normUF) continue
    const normMun = normaliz(defs[0].municipio)
    if (normMun === normCity || normMun.includes(normCity) || normCity.includes(normMun)) {
      return getMunicipalHolidays(code, year)
    }
  }
  return []
}

/** Limpa o cache (útil para testes ou forçar re-fetch). */
export function clearHolidayCache() {
  cache.clear()
}

/** Retorna lista de IBGE codes com dados municipais curados. */
export function getCuratedIbgeCodes(): string[] {
  return Object.keys(MUNICIPAL_HOLIDAYS)
}
