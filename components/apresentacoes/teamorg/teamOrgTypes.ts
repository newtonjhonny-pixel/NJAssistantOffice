// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TeamOrgResponsibility {
  id:           string
  name:         string
  icon:         string   // kebab-case lucide name
  category:     string
  order:        number
  active:       boolean
  observation?: string
}

export interface TeamOrgCollaborator {
  id:                string
  segmentId:         string
  name:              string
  role:              string
  unit:              string
  state?:            string
  companiesCount:    number
  responsibilityIds: string[]
  color?:            string
  order:             number
  active:            boolean
}

export interface TeamOrgSegment {
  id:           string
  name:         string
  description?: string
  color:        string
  order:        number
  active:       boolean
}

export interface TeamOrgContent {
  title:         string
  segments:      TeamOrgSegment[]
  collaborators: TeamOrgCollaborator[]
  library:       TeamOrgResponsibility[]
}

// ─── Colors ───────────────────────────────────────────────────────────────────

export const ORG_COLORS = [
  { value: "#1e40af", label: "Azul" },
  { value: "#dc2626", label: "Vermelho" },
  { value: "#7f1d1d", label: "Vinho" },
  { value: "#14532d", label: "Verde" },
  { value: "#1e3a5f", label: "Azul Marinho" },
  { value: "#92400e", label: "Marrom" },
  { value: "#4c1d95", label: "Roxo" },
  { value: "#0f766e", label: "Teal" },
  { value: "#334155", label: "Ardósia" },
  { value: "#b45309", label: "Âmbar" },
]

// ─── Default library ──────────────────────────────────────────────────────────

export const DEFAULT_LIBRARY: TeamOrgResponsibility[] = [
  { id: "lib-01", name: "Admissão",                  icon: "user-plus",   category: "Pessoal",     order: 1,  active: true },
  { id: "lib-02", name: "Folha de pagamento",         icon: "dollar-sign", category: "Financeiro",  order: 2,  active: true },
  { id: "lib-03", name: "Rescisões",                  icon: "user-minus",  category: "Pessoal",     order: 3,  active: true },
  { id: "lib-04", name: "Férias",                     icon: "umbrella",    category: "Pessoal",     order: 4,  active: true },
  { id: "lib-05", name: "Encargos",                   icon: "calculator",  category: "Financeiro",  order: 5,  active: true },
  { id: "lib-06", name: "Controle de ponto",          icon: "clock",       category: "Operacional", order: 6,  active: true },
  { id: "lib-07", name: "Atendimento",                icon: "phone",       category: "Operacional", order: 7,  active: true },
  { id: "lib-08", name: "Campanha (Pix e Bônus)",     icon: "gift",        category: "Financeiro",  order: 8,  active: true },
  { id: "lib-09", name: "Vale-transporte",            icon: "bus",         category: "Benefícios",  order: 9,  active: true },
  { id: "lib-10", name: "Lançamento Holmes",          icon: "monitor",     category: "Sistema",     order: 10, active: true },
  { id: "lib-11", name: "Comissão",                   icon: "percent",     category: "Financeiro",  order: 11, active: true },
  { id: "lib-12", name: "Benefícios",                 icon: "shield",      category: "Benefícios",  order: 12, active: true },
  { id: "lib-13", name: "Suporte às unidades",        icon: "help-circle", category: "Operacional", order: 13, active: true },
  { id: "lib-14", name: "Viagem para outra unidade",  icon: "map-pin",     category: "Operacional", order: 14, active: true },
  { id: "lib-15", name: "Vale-refeição",              icon: "utensils",    category: "Benefícios",  order: 15, active: true },
  { id: "lib-16", name: "Plano de saúde",             icon: "heart",       category: "Benefícios",  order: 16, active: true },
  { id: "lib-17", name: "Plano odontológico",         icon: "smile",       category: "Benefícios",  order: 17, active: true },
  { id: "lib-18", name: "Seguro de vida",             icon: "shield-check",category: "Benefícios",  order: 18, active: true },
  { id: "lib-19", name: "eSocial",                    icon: "file-text",   category: "Sistema",     order: 19, active: true },
  { id: "lib-20", name: "FGTS Digital",               icon: "database",    category: "Sistema",     order: 20, active: true },
  { id: "lib-21", name: "DCTFWeb",                    icon: "file-check",  category: "Sistema",     order: 21, active: true },
  { id: "lib-22", name: "Relatórios",                 icon: "bar-chart-2", category: "Operacional", order: 22, active: true },
  { id: "lib-23", name: "Auditorias",                 icon: "search",      category: "Operacional", order: 23, active: true },
  { id: "lib-24", name: "Homologações",               icon: "check-circle",category: "Pessoal",     order: 24, active: true },
]

// ─── Factory ──────────────────────────────────────────────────────────────────

let _cnt = Date.now()
export function makeOrgId(): string { return `org-${++_cnt}` }

export function defaultTeamOrgContent(): TeamOrgContent {
  const s1 = makeOrgId(), s2 = makeOrgId()
  const c1 = makeOrgId(), c2 = makeOrgId(), c3 = makeOrgId()
  return {
    title: "DEPARTAMENTO DE ADMINISTRAÇÃO DE PESSOAS",
    segments: [
      { id: s1, name: "Segmento 1", color: "#1e40af", order: 0, active: true },
      { id: s2, name: "Segmento 2", color: "#dc2626", order: 1, active: true },
    ],
    collaborators: [
      {
        id: c1, segmentId: s1,
        name: "Nome do Colaborador", role: "Analista Administrativo de Pessoas",
        unit: "Unidade PA", companiesCount: 1,
        responsibilityIds: ["lib-01","lib-02","lib-03","lib-04","lib-05","lib-06"],
        order: 0, active: true,
      },
      {
        id: c2, segmentId: s1,
        name: "Colaborador 2", role: "Assistente Administrativo de Pessoas",
        unit: "Unidade MA", companiesCount: 2,
        responsibilityIds: ["lib-01","lib-06","lib-07","lib-09","lib-13"],
        order: 1, active: true,
      },
      {
        id: c3, segmentId: s2,
        name: "Nome do Colaborador", role: "Analista Administrativo de Pessoas",
        unit: "Unidade MT", companiesCount: 5,
        responsibilityIds: ["lib-01","lib-06","lib-07","lib-09","lib-10","lib-12"],
        order: 0, active: true,
      },
    ],
    library: DEFAULT_LIBRARY,
  }
}

export function parseTeamOrg(raw: string | null): TeamOrgContent {
  if (raw) {
    try {
      const p = JSON.parse(raw)
      if (p?.segments && p?.collaborators) return p
    } catch { /* ignore */ }
  }
  return defaultTeamOrgContent()
}
