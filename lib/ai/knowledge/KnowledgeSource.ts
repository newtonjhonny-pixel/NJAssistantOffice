// ─── Camada de Conhecimento · Definição de Fontes por Especialista ───────────
// Cada especialista possui um mapa declarativo de suas categorias de conhecimento.
// Usado pelo KnowledgeLoader para filtrar e priorizar documentos.

import type { SpecialistId } from '@/lib/ai/specialists/types'
import type { KnowledgeCategory } from './KnowledgeTypes'

export interface KnowledgeSourceDef {
  label: string            // nome legível
  category: KnowledgeCategory | string
  priority: number         // 1 (mais alto) → 10 (mais baixo)
  description: string
  officialSource?: string  // URL ou nome do portal oficial
}

export type SpecialistKnowledgeSources = Record<string, KnowledgeSourceDef[]>

// ─── Base de conhecimento por especialista ────────────────────────────────────

export const SPECIALIST_KNOWLEDGE_SOURCES: Partial<Record<SpecialistId, KnowledgeSourceDef[]>> & Record<string, KnowledgeSourceDef[]> = {

  // ── Departamento Pessoal ────────────────────────────────────────────────────
  departamento_pessoal: [
    { label: 'CLT',                  category: 'clt',             priority: 1, description: 'Consolidação das Leis do Trabalho',            officialSource: 'planalto.gov.br' },
    { label: 'Constituição Federal', category: 'constituicao',    priority: 1, description: 'Art. 7º e demais direitos trabalhistas',       officialSource: 'planalto.gov.br' },
    { label: 'FGTS',                 category: 'fgts',            priority: 2, description: 'Lei 8.036/90 e normas FGTS',                   officialSource: 'caixa.gov.br' },
    { label: 'INSS',                 category: 'inss',            priority: 2, description: 'Tabela progressiva INSS e normas previdenciárias', officialSource: 'gov.br/previdencia' },
    { label: 'IRRF',                 category: 'irrf',            priority: 2, description: 'Tabela progressiva IRRF e deduções',           officialSource: 'receita.fazenda.gov.br' },
    { label: 'eSocial',              category: 'mos',             priority: 2, description: 'Manual de Orientação do eSocial',              officialSource: 'esocial.gov.br' },
    { label: 'Convenções Coletivas', category: 'convencao',       priority: 3, description: 'CCTs e ACTs da categoria',                     officialSource: 'mte.gov.br' },
    { label: 'Portarias MTE',        category: 'portaria',        priority: 3, description: 'Portarias do Ministério do Trabalho',           officialSource: 'mte.gov.br' },
    { label: 'Súmulas TST',          category: 'sumula',          priority: 3, description: 'Súmulas do Tribunal Superior do Trabalho',     officialSource: 'tst.jus.br' },
    { label: 'OJs TST',              category: 'oj',              priority: 3, description: 'Orientações Jurisprudenciais do TST',          officialSource: 'tst.jus.br' },
    { label: 'Jurisprudências',      category: 'jurisprudencia',  priority: 4, description: 'Decisões relevantes de TRTs e TST' },
    { label: 'Modelos Internos',     category: 'modelo_interno',  priority: 5, description: 'Modelos de documentos internos da empresa' },
    { label: 'POP / IT',             category: 'pop',             priority: 5, description: 'Procedimentos Operacionais Padrão de DP' },
    { label: 'Checklists',           category: 'checklist',       priority: 5, description: 'Checklists de rotinas de DP' },
    { label: 'Documentos do Usuário',category: 'documento_usuario',priority: 6, description: 'Documentos enviados pelo usuário' },
  ],

  // ── eSocial ─────────────────────────────────────────────────────────────────
  esocial: [
    { label: 'MOS — Manual de Orientação', category: 'mos',           priority: 1, description: 'Manual oficial do eSocial',                 officialSource: 'esocial.gov.br' },
    { label: 'Notas Técnicas',            category: 'nota_tecnica',   priority: 1, description: 'Notas técnicas e circulares eSocial',       officialSource: 'esocial.gov.br' },
    { label: 'Leiautes',                  category: 'leiaute',        priority: 2, description: 'Estrutura XML dos eventos eSocial',          officialSource: 'esocial.gov.br' },
    { label: 'FAQ Oficial',               category: 'faq_esocial',    priority: 2, description: 'Perguntas frequentes do portal eSocial',     officialSource: 'esocial.gov.br' },
    { label: 'FGTS Digital',              category: 'fgts_digital',   priority: 2, description: 'Guias e normas do FGTS Digital',             officialSource: 'fgtsdigital.gov.br' },
    { label: 'Eventos eSocial',           category: 'evento_esocial', priority: 2, description: 'Descrição e regras de cada evento S-xxxx' },
    { label: 'Tabelas eSocial',           category: 'tabela_esocial', priority: 3, description: 'Tabelas de domínio e codificações eSocial' },
    { label: 'Histórico de Versões',      category: 'nota_tecnica',   priority: 3, description: 'Changelog das versões do leiaute eSocial' },
    { label: 'Documentos do Usuário',     category: 'documento_usuario', priority: 6, description: 'Documentos enviados pelo usuário' },
  ],

  // ── Jurídico Trabalhista ─────────────────────────────────────────────────────
  juridico_trabalhista: [
    { label: 'CLT',                  category: 'clt',            priority: 1, description: 'Consolidação das Leis do Trabalho',   officialSource: 'planalto.gov.br' },
    { label: 'Constituição Federal', category: 'constituicao',   priority: 1, description: 'Direitos e garantias fundamentais',   officialSource: 'planalto.gov.br' },
    { label: 'Súmulas TST',          category: 'sumula',         priority: 2, description: 'Súmulas vinculantes do TST',          officialSource: 'tst.jus.br' },
    { label: 'OJs TST',              category: 'oj',             priority: 2, description: 'Orientações Jurisprudenciais',        officialSource: 'tst.jus.br' },
    { label: 'Acórdãos TST',         category: 'acordao',        priority: 3, description: 'Acórdãos relevantes do TST',         officialSource: 'tst.jus.br' },
    { label: 'Jurisprudência TRTs',  category: 'trt',            priority: 3, description: 'Decisões dos Tribunais Regionais',   officialSource: 'trt.jus.br' },
    { label: 'STF — Trabalhista',    category: 'stf',            priority: 3, description: 'Decisões do STF em matéria trabalhista', officialSource: 'stf.jus.br' },
    { label: 'Documentos do Usuário',category: 'documento_usuario', priority: 6, description: 'Documentos enviados pelo usuário' },
  ],

  // ── Segurança do Trabalho ────────────────────────────────────────────────────
  seguranca_trabalho: [
    { label: 'NRs (todas)',           category: 'nr',              priority: 1, description: 'Normas Regulamentadoras MTE (NR-01 a NR-38)', officialSource: 'mte.gov.br' },
    { label: 'LTCAT',                 category: 'ltcat',           priority: 2, description: 'Laudo Técnico das Condições Ambientais' },
    { label: 'PPP',                   category: 'ppp',             priority: 2, description: 'Perfil Profissiográfico Previdenciário' },
    { label: 'PGR',                   category: 'pgr',             priority: 2, description: 'Programa de Gerenciamento de Riscos (NR-01)' },
    { label: 'CAT',                   category: 'cat',             priority: 2, description: 'Comunicação de Acidente de Trabalho' },
    { label: 'PCMSO',                 category: 'pcmso',           priority: 2, description: 'Programa de Controle Médico de Saúde Ocupacional' },
    { label: 'Eventos SST eSocial',   category: 'evento_esocial',  priority: 3, description: 'Eventos S-2210, S-2220, S-2240 e SST' },
    { label: 'Documentos do Usuário', category: 'documento_usuario', priority: 6, description: 'Documentos enviados pelo usuário' },
  ],

  // ── Medicina do Trabalho ─────────────────────────────────────────────────────
  medicina_trabalho: [
    { label: 'NR-07',                 category: 'nr',              priority: 1, description: 'Programa de Controle Médico de Saúde Ocupacional', officialSource: 'mte.gov.br' },
    { label: 'PCMSO',                 category: 'pcmso',           priority: 1, description: 'Estrutura e elaboração do PCMSO' },
    { label: 'ASO',                   category: 'aso',             priority: 2, description: 'Atestado de Saúde Ocupacional — tipos e prazos' },
    { label: 'Exames Ocupacionais',   category: 'aso',             priority: 2, description: 'Exames admissionais, periódicos, demissionais' },
    { label: 'CID-10 / CID-11',      category: 'laudo',           priority: 3, description: 'Classificação Internacional de Doenças' },
    { label: 'Afastamentos INSS',     category: 'inss',            priority: 3, description: 'B31, B91, B94 e processo de afastamento' },
    { label: 'INSS — Previdência',    category: 'inss',            priority: 3, description: 'Normas previdenciárias relativas à saúde' },
    { label: 'Documentos do Usuário', category: 'documento_usuario', priority: 6, description: 'Documentos enviados pelo usuário' },
  ],

  // ── Processos ────────────────────────────────────────────────────────────────
  processos: [
    { label: 'BPM / BPMN',           category: 'bpm',             priority: 1, description: 'Business Process Management e notação BPMN' },
    { label: 'Fluxogramas',           category: 'fluxograma',      priority: 2, description: 'Modelagem e documentação de fluxos' },
    { label: 'POP',                   category: 'pop',             priority: 2, description: 'Procedimentos Operacionais Padrão' },
    { label: 'IT — Instrução de Trabalho', category: 'it',         priority: 2, description: 'Instruções de Trabalho detalhadas' },
    { label: 'Checklists',            category: 'checklist',       priority: 3, description: 'Checklists de processo e conformidade' },
    { label: 'Mapeamento de Processos', category: 'bpm',           priority: 2, description: 'Análise AS-IS / TO-BE' },
    { label: 'Indicadores (KPIs)',    category: 'indicador',       priority: 3, description: 'Métricas e indicadores de desempenho' },
    { label: 'PDCA',                  category: 'indicador',       priority: 3, description: 'Metodologia Plan-Do-Check-Act' },
    { label: '5W2H',                  category: 'indicador',       priority: 3, description: 'Plano de ação estruturado' },
    { label: 'Documentos do Usuário', category: 'documento_usuario', priority: 6, description: 'Documentos enviados pelo usuário' },
  ],

  // ── Qualidade ────────────────────────────────────────────────────────────────
  qualidade: [
    { label: 'ISO 9001',              category: 'iso',             priority: 1, description: 'Sistema de Gestão da Qualidade',              officialSource: 'iso.org' },
    { label: 'ISO 45001',             category: 'iso',             priority: 1, description: 'Sistema de Gestão de SST',                   officialSource: 'iso.org' },
    { label: 'POP',                   category: 'pop',             priority: 2, description: 'Procedimentos Operacionais Padrão' },
    { label: 'IT — Instrução de Trabalho', category: 'it',         priority: 2, description: 'Instruções de trabalho' },
    { label: 'Fluxogramas',           category: 'fluxograma',      priority: 3, description: 'Fluxogramas de processo' },
    { label: 'Auditorias',            category: 'iso',             priority: 2, description: 'Auditoria interna e externa' },
    { label: 'Padronização',          category: 'pop',             priority: 3, description: 'Normas de padronização interna' },
    { label: 'Documentos do Usuário', category: 'documento_usuario', priority: 6, description: 'Documentos enviados pelo usuário' },
  ],

  // ── Recrutamento e Seleção ───────────────────────────────────────────────────
  recrutamento_selecao: [
    { label: 'R&S — Metodologias',    category: 'competencia',     priority: 1, description: 'Metodologias de recrutamento e seleção' },
    { label: 'Competências',          category: 'competencia',     priority: 2, description: 'Mapeamento e avaliação de competências' },
    { label: 'Técnicas de Entrevista', category: 'competencia',    priority: 2, description: 'Entrevista por competências, STAR, etc.' },
    { label: 'Onboarding',            category: 'onboarding',      priority: 3, description: 'Integração e ambientação de novos colaboradores' },
    { label: 'Desligamentos',         category: 'desligamento',    priority: 3, description: 'Processo de offboarding' },
    { label: 'Plano de Carreira',     category: 'plano_carreira',  priority: 3, description: 'Desenvolvimento e progressão de carreira' },
    { label: 'Documentos do Usuário', category: 'documento_usuario', priority: 6, description: 'Documentos enviados pelo usuário' },
  ],

  // ── Comportamental ───────────────────────────────────────────────────────────
  comportamento: [
    { label: 'Psicologia Comportamental', category: 'psicologia',  priority: 1, description: 'Behaviorismo, TCC, análise do comportamento' },
    { label: 'Hábitos e Neurociência', category: 'psicologia',     priority: 2, description: 'Formação de hábitos, dopamina, loops' },
    { label: 'Produtividade',          category: 'psicologia',     priority: 2, description: 'GTD, Pomodoro, deep work, flow' },
    { label: 'Disciplina',             category: 'psicologia',     priority: 2, description: 'Autodisciplina, controle de impulsos' },
    { label: 'Procrastinação',         category: 'psicologia',     priority: 2, description: 'Causas e técnicas de combate' },
    { label: 'Liderança',             category: 'competencia',     priority: 2, description: 'Estilos de liderança, liderança situacional' },
    { label: 'Comunicação',           category: 'competencia',     priority: 2, description: 'Comunicação não-violenta, assertividade' },
    { label: 'Gestão do Tempo',       category: 'psicologia',      priority: 3, description: 'Matriz de Eisenhower, time blocking' },
    { label: 'Alta Performance',      category: 'psicologia',      priority: 3, description: 'Mindset, resiliência, crescimento' },
    { label: 'Documentos do Usuário', category: 'documento_usuario', priority: 6, description: 'Documentos enviados pelo usuário' },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getSpecialistSources(specialistId: string): KnowledgeSourceDef[] {
  return SPECIALIST_KNOWLEDGE_SOURCES[specialistId] ?? []
}

export function getSourceCategories(specialistId: string): string[] {
  return getSpecialistSources(specialistId).map(s => s.category)
}

export function getSourcesByPriority(specialistId: string, maxPriority = 5): KnowledgeSourceDef[] {
  return getSpecialistSources(specialistId).filter(s => s.priority <= maxPriority)
}
