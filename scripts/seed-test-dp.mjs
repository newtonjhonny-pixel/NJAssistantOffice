/**
 * Seed de dados de teste — Dimensionamento DP
 * Cria: 4 colaboradores, 3 empresas, vínculos, processos e atividades DP
 * Roda: node scripts/seed-test-dp.mjs
 */

const BASE = 'http://localhost:3000'

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) } }
  catch { return { ok: res.ok, status: res.status, data: text } }
}

function log(msg) { console.log(`  ${msg}`) }
function section(msg) { console.log(`\n▶ ${msg}`) }

// ─── 1. COLABORADORES ────────────────────────────────────────────────────────
section('Criando colaboradores...')

const membros = [
  { name: 'Carlos Mendes',   role: 'Analista DP',    sector: 'Departamento Pessoal', unit: 'Matriz' },
  { name: 'Fernanda Rocha',  role: 'Analista DP',    sector: 'Departamento Pessoal', unit: 'Filial SP' },
  { name: 'Diego Santos',    role: 'Assistente DP',  sector: 'Departamento Pessoal', unit: 'Matriz' },
  { name: 'Juliana Ferreira',role: 'Assistente DP',  sector: 'Departamento Pessoal', unit: 'Filial SP' },
]

const memberIds = {}
for (const m of membros) {
  const r = await api('POST', '/api/gestao-equipe/members', { ...m, status: 'ATIVO' })
  if (r.ok) {
    memberIds[m.name] = r.data.member?.id ?? r.data.id
    log(`✅ ${m.name} (${m.role}) — id: ${memberIds[m.name]}`)
  } else {
    // já existe? tenta buscar
    const list = await api('GET', '/api/gestao-equipe/members')
    const found = list.data?.members?.find(x => x.name === m.name)
    if (found) { memberIds[m.name] = found.id; log(`⚠️  ${m.name} já existe — id: ${found.id}`) }
    else log(`❌ ${m.name}: ${JSON.stringify(r.data)}`)
  }
}

// ─── 2. EMPRESAS ─────────────────────────────────────────────────────────────
section('Criando empresas...')

const empresas = [
  { code: '0010', name: 'Indústria Alfa Ltda',    segment: 'Indústria',  establishmentType: 'MATRIZ',
    zipCode: '01310-100', street: 'Av. Paulista', number: '1000', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' },
  { code: '0020', name: 'Comércio Beta S/A',      segment: 'Comércio',   establishmentType: 'MATRIZ',
    zipCode: '20040-020', street: 'Rua da Quitanda', number: '86', neighborhood: 'Centro', city: 'Rio de Janeiro', state: 'RJ' },
  { code: '0030', name: 'Serviços Gama Eireli',   segment: 'Serviços',   establishmentType: 'MATRIZ',
    zipCode: '30130-110', street: 'Av. Afonso Pena', number: '400', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG' },
]

const companyIds = {}
for (const e of empresas) {
  const r = await api('POST', '/api/gestao-equipe/companies', e)
  if (r.ok) {
    companyIds[e.name] = r.data.company?.id ?? r.data.id
    log(`✅ ${e.name} — id: ${companyIds[e.name]}`)
  } else {
    const list = await api('GET', '/api/gestao-equipe/companies')
    const found = list.data?.companies?.find(x => x.name === e.name)
    if (found) { companyIds[e.name] = found.id; log(`⚠️  ${e.name} já existe — id: ${found.id}`) }
    else log(`❌ ${e.name}: ${JSON.stringify(r.data)}`)
  }
}

// ─── 3. VÍNCULOS (MemberCompanyLink) ─────────────────────────────────────────
section('Criando vínculos colaborador ↔ empresa...')

// Carlos: 2 empresas (alta carga)
// Fernanda: 1 empresa grande
// Diego: 1 empresa
// Juliana: 2 empresas
const vinculos = [
  { member: 'Carlos Mendes',    company: 'Indústria Alfa Ltda',  memberRole: 'RESPONSAVEL', complexity: 'ALTA',  automationLevel: 'BAIXO',  headcountActive: 350, headcountApprentice: 20, avgAdmissions: 8,  avgTerminations: 6,  avgVacations: 10, folhasProcessadas: 2, unions: 3, establishments: 2 },
  { member: 'Carlos Mendes',    company: 'Comércio Beta S/A',    memberRole: 'RESPONSAVEL', complexity: 'MEDIA', automationLevel: 'MEDIO',  headcountActive: 120, headcountApprentice: 5,  avgAdmissions: 3,  avgTerminations: 2,  avgVacations: 4,  folhasProcessadas: 1, unions: 1, establishments: 1 },
  { member: 'Fernanda Rocha',   company: 'Serviços Gama Eireli', memberRole: 'RESPONSAVEL', complexity: 'MEDIA', automationLevel: 'ALTO',   headcountActive: 95,  headcountApprentice: 0,  avgAdmissions: 2,  avgTerminations: 1,  avgVacations: 3,  folhasProcessadas: 1, unions: 1, establishments: 1 },
  { member: 'Diego Santos',     company: 'Indústria Alfa Ltda',  memberRole: 'ASSISTENTE',  complexity: 'ALTA',  automationLevel: 'BAIXO',  headcountActive: 350, headcountApprentice: 20, avgAdmissions: 8,  avgTerminations: 6,  avgVacations: 10, folhasProcessadas: 2, unions: 3, establishments: 2 },
  { member: 'Juliana Ferreira', company: 'Comércio Beta S/A',    memberRole: 'ASSISTENTE',  complexity: 'MEDIA', automationLevel: 'MEDIO',  headcountActive: 120, headcountApprentice: 5,  avgAdmissions: 3,  avgTerminations: 2,  avgVacations: 4,  folhasProcessadas: 1, unions: 1, establishments: 1 },
  { member: 'Juliana Ferreira', company: 'Serviços Gama Eireli', memberRole: 'APOIO',       complexity: 'BAIXA', automationLevel: 'ALTO',   headcountActive: 95,  headcountApprentice: 0,  avgAdmissions: 2,  avgTerminations: 1,  avgVacations: 3,  folhasProcessadas: 1, unions: 1, establishments: 1 },
]

const linkIds = {}
for (const v of vinculos) {
  const memberId  = memberIds[v.member]
  const companyId = companyIds[v.company]
  if (!memberId || !companyId) { log(`⚠️  Skipping vínculo ${v.member} ↔ ${v.company} (ID não encontrado)`); continue }

  const r = await api('POST', '/api/gestao-equipe/member-companies', {
    memberId, companyId,
    memberRole: v.memberRole, complexity: v.complexity, automationLevel: v.automationLevel,
    headcountActive: v.headcountActive, headcountApprentice: v.headcountApprentice,
    avgAdmissions: v.avgAdmissions, avgTerminations: v.avgTerminations, avgVacations: v.avgVacations,
    folhasProcessadas: v.folhasProcessadas, unions: v.unions, establishments: v.establishments,
  })

  const key = `${v.member}|${v.company}`
  if (r.ok) {
    linkIds[key] = r.data.link?.id ?? r.data.id
    log(`✅ ${v.member} ↔ ${v.company} — linkId: ${linkIds[key]}`)
  } else if (r.status === 409) {
    // já existe, busca
    const links = await api('GET', `/api/gestao-equipe/member-companies?memberId=${memberId}`)
    const found = links.data?.links?.find(x => x.companyId === companyId)
    if (found) { linkIds[key] = found.id; log(`⚠️  Vínculo já existe — linkId: ${found.id}`) }
    else log(`❌ ${v.member} ↔ ${v.company}: 409 mas não encontrou link`)
  } else {
    log(`❌ ${v.member} ↔ ${v.company}: ${JSON.stringify(r.data)}`)
  }
}

// ─── 4. ATIVIDADES DP ────────────────────────────────────────────────────────
section('Criando atividades DP...')

// Definição: { linkKey, processCode, activityName, executionType, volume, avgTimeMinutes, requiredLevel }
const atividades = [
  // ── Carlos / Alfa (Indústria, 350 func, alta complexidade) ────────────────
  { link: 'Carlos Mendes|Indústria Alfa Ltda', processCode: 'FOLHA',    activityName: 'Lançar variáveis de folha (horas extras, faltas)',  executionType: 'MANUAL',              volume: 350, avgTimeMinutes: 3,   requiredLevel: 'ANALISTA'   },
  { link: 'Carlos Mendes|Indústria Alfa Ltda', processCode: 'FOLHA',    activityName: 'Conferir e fechar folha de pagamento',               executionType: 'ASSISTIDA',           volume: 2,   avgTimeMinutes: 180, requiredLevel: 'ANALISTA'   },
  { link: 'Carlos Mendes|Indústria Alfa Ltda', processCode: 'FOLHA',    activityName: 'Processar folha no sistema (Domínio)',               executionType: 'AUTOMATIZADA',        volume: 2,   avgTimeMinutes: 30,  requiredLevel: 'ASSISTENTE' },
  { link: 'Carlos Mendes|Indústria Alfa Ltda', processCode: 'ADMISSAO', activityName: 'Coletar documentos de admissão',                     executionType: 'MANUAL',              volume: 8,   avgTimeMinutes: 45,  requiredLevel: 'ASSISTENTE' },
  { link: 'Carlos Mendes|Indústria Alfa Ltda', processCode: 'ADMISSAO', activityName: 'Registrar admissão no eSocial',                      executionType: 'MANUAL',              volume: 8,   avgTimeMinutes: 20,  requiredLevel: 'ANALISTA'   },
  { link: 'Carlos Mendes|Indústria Alfa Ltda', processCode: 'ADMISSAO', activityName: 'Enviar dados ao sistema de ponto',                   executionType: 'AUTOMATICA_EXCECOES', volume: 8,   avgTimeMinutes: 5,   requiredLevel: 'ASSISTENTE' },
  { link: 'Carlos Mendes|Indústria Alfa Ltda', processCode: 'RESCISAO', activityName: 'Calcular verbas rescisórias',                        executionType: 'ASSISTIDA',           volume: 6,   avgTimeMinutes: 60,  requiredLevel: 'ANALISTA'   },
  { link: 'Carlos Mendes|Indústria Alfa Ltda', processCode: 'RESCISAO', activityName: 'Homologar rescisão (sindicato)',                     executionType: 'MANUAL',              volume: 3,   avgTimeMinutes: 90,  requiredLevel: 'ANALISTA'   },
  { link: 'Carlos Mendes|Indústria Alfa Ltda', processCode: 'FERIAS',   activityName: 'Programar e calcular férias',                        executionType: 'ASSISTIDA',           volume: 10,  avgTimeMinutes: 20,  requiredLevel: 'ASSISTENTE' },
  { link: 'Carlos Mendes|Indústria Alfa Ltda', processCode: 'FERIAS',   activityName: 'Emitir recibo de férias e avisar financeiro',        executionType: 'AUTOMATIZADA',        volume: 10,  avgTimeMinutes: 10,  requiredLevel: 'ASSISTENTE' },
  { link: 'Carlos Mendes|Indústria Alfa Ltda', processCode: 'ESOCIAL',  activityName: 'Monitorar pendências eSocial (S-1200, S-2200)',      executionType: 'MANUAL',              volume: 1,   avgTimeMinutes: 120, requiredLevel: 'ANALISTA'   },
  { link: 'Carlos Mendes|Indústria Alfa Ltda', processCode: 'ESOCIAL',  activityName: 'Enviar eventos periódicos eSocial',                  executionType: 'AUTOMATICA_EXCECOES', volume: 4,   avgTimeMinutes: 15,  requiredLevel: 'ANALISTA'   },
  { link: 'Carlos Mendes|Indústria Alfa Ltda', processCode: 'PONTO',    activityName: 'Tratar inconsistências de ponto eletrônico',         executionType: 'MANUAL',              volume: 350, avgTimeMinutes: 2,   requiredLevel: 'ASSISTENTE' },
  { link: 'Carlos Mendes|Indústria Alfa Ltda', processCode: 'PONTO',    activityName: 'Fechar espelho de ponto',                            executionType: 'ASSISTIDA',           volume: 1,   avgTimeMinutes: 90,  requiredLevel: 'ANALISTA'   },

  // ── Carlos / Beta (Comércio, 120 func, média complexidade) ───────────────
  { link: 'Carlos Mendes|Comércio Beta S/A', processCode: 'FOLHA',    activityName: 'Lançar variáveis de folha',                          executionType: 'ASSISTIDA',           volume: 120, avgTimeMinutes: 2,   requiredLevel: 'ASSISTENTE' },
  { link: 'Carlos Mendes|Comércio Beta S/A', processCode: 'FOLHA',    activityName: 'Processar folha no sistema',                         executionType: 'AUTOMATIZADA',        volume: 1,   avgTimeMinutes: 20,  requiredLevel: 'ASSISTENTE' },
  { link: 'Carlos Mendes|Comércio Beta S/A', processCode: 'ADMISSAO', activityName: 'Registrar admissão',                                 executionType: 'MANUAL',              volume: 3,   avgTimeMinutes: 30,  requiredLevel: 'ANALISTA'   },
  { link: 'Carlos Mendes|Comércio Beta S/A', processCode: 'RESCISAO', activityName: 'Calcular rescisão',                                  executionType: 'ASSISTIDA',           volume: 2,   avgTimeMinutes: 45,  requiredLevel: 'ANALISTA'   },
  { link: 'Carlos Mendes|Comércio Beta S/A', processCode: 'ESOCIAL',  activityName: 'Monitorar e enviar eventos eSocial',                 executionType: 'AUTOMATICA_EXCECOES', volume: 1,   avgTimeMinutes: 60,  requiredLevel: 'ANALISTA'   },

  // ── Fernanda / Gama (Serviços, 95 func, automação alta) ──────────────────
  { link: 'Fernanda Rocha|Serviços Gama Eireli', processCode: 'FOLHA',    activityName: 'Lançar variáveis de folha',                      executionType: 'AUTOMATIZADA',        volume: 95,  avgTimeMinutes: 1,   requiredLevel: 'ASSISTENTE' },
  { link: 'Fernanda Rocha|Serviços Gama Eireli', processCode: 'FOLHA',    activityName: 'Processar folha no sistema',                     executionType: 'AUTOMATICA_EXCECOES', volume: 1,   avgTimeMinutes: 15,  requiredLevel: 'ASSISTENTE' },
  { link: 'Fernanda Rocha|Serviços Gama Eireli', processCode: 'FOLHA',    activityName: 'Conferir folha e aprovar pagamento',             executionType: 'ASSISTIDA',           volume: 1,   avgTimeMinutes: 45,  requiredLevel: 'ANALISTA'   },
  { link: 'Fernanda Rocha|Serviços Gama Eireli', processCode: 'ADMISSAO', activityName: 'Coletar e validar documentos',                   executionType: 'MANUAL',              volume: 2,   avgTimeMinutes: 30,  requiredLevel: 'ASSISTENTE' },
  { link: 'Fernanda Rocha|Serviços Gama Eireli', processCode: 'ADMISSAO', activityName: 'Registrar no sistema e eSocial',                 executionType: 'AUTOMATIZADA',        volume: 2,   avgTimeMinutes: 15,  requiredLevel: 'ANALISTA'   },
  { link: 'Fernanda Rocha|Serviços Gama Eireli', processCode: 'RESCISAO', activityName: 'Calcular e homologar rescisão',                  executionType: 'ASSISTIDA',           volume: 1,   avgTimeMinutes: 90,  requiredLevel: 'ANALISTA'   },
  { link: 'Fernanda Rocha|Serviços Gama Eireli', processCode: 'FERIAS',   activityName: 'Programar férias (RH automatizado)',             executionType: 'AUTOMATICA_EXCECOES', volume: 3,   avgTimeMinutes: 5,   requiredLevel: 'ASSISTENTE' },
  { link: 'Fernanda Rocha|Serviços Gama Eireli', processCode: 'ESOCIAL',  activityName: 'Envio automático eSocial',                       executionType: 'AUTOMATICA_EXCECOES', volume: 1,   avgTimeMinutes: 10,  requiredLevel: 'ANALISTA'   },

  // ── Diego / Alfa (Assistente, apoia Carlos) ────────────────────────────────
  { link: 'Diego Santos|Indústria Alfa Ltda', processCode: 'ADMISSAO', activityName: 'Coletar e organizar documentos de admissão',       executionType: 'MANUAL',              volume: 8,   avgTimeMinutes: 40,  requiredLevel: 'ASSISTENTE' },
  { link: 'Diego Santos|Indústria Alfa Ltda', processCode: 'PONTO',    activityName: 'Tratar inconsistências de ponto',                  executionType: 'MANUAL',              volume: 350, avgTimeMinutes: 2,   requiredLevel: 'ASSISTENTE' },
  { link: 'Diego Santos|Indústria Alfa Ltda', processCode: 'PONTO',    activityName: 'Distribuir contracheques',                         executionType: 'MANUAL',              volume: 350, avgTimeMinutes: 1,   requiredLevel: 'ASSISTENTE' },
  { link: 'Diego Santos|Indústria Alfa Ltda', processCode: 'FERIAS',   activityName: 'Notificar colaboradores sobre férias',             executionType: 'ASSISTIDA',           volume: 10,  avgTimeMinutes: 10,  requiredLevel: 'ASSISTENTE' },
  { link: 'Diego Santos|Indústria Alfa Ltda', processCode: 'FOLHA',    activityName: 'Coletar atestados e afastamentos',                 executionType: 'MANUAL',              volume: 30,  avgTimeMinutes: 5,   requiredLevel: 'ASSISTENTE' },
  { link: 'Diego Santos|Indústria Alfa Ltda', processCode: 'BENEFICIOS', activityName: 'Inclusão/exclusão de beneficiários (VA, VT)',   executionType: 'MANUAL',              volume: 12,  avgTimeMinutes: 15,  requiredLevel: 'ASSISTENTE' },
  { link: 'Diego Santos|Indústria Alfa Ltda', processCode: 'BENEFICIOS', activityName: 'Conferir fatura de plano de saúde',             executionType: 'ASSISTIDA',           volume: 1,   avgTimeMinutes: 60,  requiredLevel: 'ASSISTENTE' },

  // ── Juliana / Beta ─────────────────────────────────────────────────────────
  { link: 'Juliana Ferreira|Comércio Beta S/A', processCode: 'ADMISSAO', activityName: 'Coletar documentos de admissão',                executionType: 'MANUAL',              volume: 3,   avgTimeMinutes: 35,  requiredLevel: 'ASSISTENTE' },
  { link: 'Juliana Ferreira|Comércio Beta S/A', processCode: 'PONTO',    activityName: 'Tratar apontamentos de ponto',                  executionType: 'MANUAL',              volume: 120, avgTimeMinutes: 2,   requiredLevel: 'ASSISTENTE' },
  { link: 'Juliana Ferreira|Comércio Beta S/A', processCode: 'BENEFICIOS', activityName: 'Controle de VA/VR/VT',                       executionType: 'ASSISTIDA',           volume: 1,   avgTimeMinutes: 90,  requiredLevel: 'ASSISTENTE' },
  { link: 'Juliana Ferreira|Comércio Beta S/A', processCode: 'FOLHA',    activityName: 'Coletar atestados e inserir no sistema',        executionType: 'MANUAL',              volume: 15,  avgTimeMinutes: 8,   requiredLevel: 'ASSISTENTE' },

  // ── Juliana / Gama ─────────────────────────────────────────────────────────
  { link: 'Juliana Ferreira|Serviços Gama Eireli', processCode: 'ADMISSAO', activityName: 'Coletar documentos de admissão',             executionType: 'MANUAL',              volume: 2,   avgTimeMinutes: 30,  requiredLevel: 'ASSISTENTE' },
  { link: 'Juliana Ferreira|Serviços Gama Eireli', processCode: 'PONTO',    activityName: 'Tratar inconsistências de ponto',            executionType: 'MANUAL',              volume: 95,  avgTimeMinutes: 2,   requiredLevel: 'ASSISTENTE' },
  { link: 'Juliana Ferreira|Serviços Gama Eireli', processCode: 'BENEFICIOS', activityName: 'Gestão de benefícios',                    executionType: 'ASSISTIDA',           volume: 1,   avgTimeMinutes: 45,  requiredLevel: 'ASSISTENTE' },
]

let atividadesCriadas = 0
for (const a of atividades) {
  const linkId = linkIds[a.link]
  if (!linkId) { log(`⚠️  Link não encontrado: ${a.link}`); continue }

  const r = await api('POST', '/api/gestao-equipe/dp-activities', {
    linkId,
    processCode:    a.processCode,
    activityName:   a.activityName,
    executionType:  a.executionType,
    volume:         a.volume,
    avgTimeMinutes: a.avgTimeMinutes,
    requiredLevel:  a.requiredLevel,
  })

  if (r.ok) { atividadesCriadas++; log(`✅ [${a.link.split('|')[0].split(' ')[0]}/${a.processCode}] ${a.activityName}`) }
  else log(`❌ ${a.activityName}: ${JSON.stringify(r.data)}`)
}

// ─── RESUMO ───────────────────────────────────────────────────────────────────
console.log(`
════════════════════════════════════════════════
  SEED CONCLUÍDO
  Colaboradores : ${Object.keys(memberIds).length}
  Empresas      : ${Object.keys(companyIds).length}
  Vínculos      : ${Object.keys(linkIds).length}
  Atividades DP : ${atividadesCriadas}/${atividades.length}
════════════════════════════════════════════════
`)
