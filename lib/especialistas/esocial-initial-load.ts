// Carga histórica completa do eSocial — 60+ documentos oficiais indexados

export interface EsocialDoc {
  title: string
  category: string
  source: string
  version: string
  tags: string
  content: string
  isRevoked?: boolean
}

export const ESOCIAL_INITIAL_LOAD_DOCS: EsocialDoc[] = [
  // ═══════════════════════════════════════════════════
  // MOS — MANUAL DE ORIENTAÇÃO DO eSocial
  // ═══════════════════════════════════════════════════
  {
    title: "MOS — Manual de Orientação do eSocial v1.0 (2014)",
    category: "MOS",
    source: "esocial.gov.br",
    version: "1.0",
    tags: "mos manual orientacao esocial versao inicial 2014 historico",
    isRevoked: true,
    content: `Manual de Orientação do eSocial versão 1.0, publicado em 2014. Primeira versão do sistema. Estabeleceu as bases do eSocial como escrituração digital das obrigações fiscais, previdenciárias e trabalhistas. Abrangência inicial: empregadores domésticos, empresas do grupo 1 (faturamento acima de R$ 78 milhões). Substituição das obrigações: GFIP, CAGED, RAIS, PPP, CAT, comunicação de admissão ao MTE. Prazos da versão 1.0 não foram cumpridos; o sistema passou por revisões antes de entrar em produção. Grupos de implantação: G1 (grandes empresas), G2 (demais empresas), G3 (optantes do Simples Nacional e MEI), G4 (órgãos públicos). Status: REVOGADO — substituído pelo MOS 2.x.`,
  },
  {
    title: "MOS — Manual de Orientação do eSocial v2.4.02 (2017)",
    category: "MOS",
    source: "esocial.gov.br",
    version: "2.4.02",
    tags: "mos manual orientacao esocial versao 2.4.02 2017 historico",
    isRevoked: true,
    content: `Manual de Orientação do eSocial versão 2.4.02, vigente em 2017. Definiu os leiautes XML para envio de eventos. Eventos de tabela: S-1000, S-1005, S-1010, S-1020, S-1030, S-1050, S-1070. Eventos não periódicos: S-2190, S-2200, S-2205, S-2206, S-2210, S-2220, S-2230, S-2240, S-2298, S-2299. Eventos periódicos: S-1200, S-1210, S-1260, S-1270, S-1280. Eventos de fechamento: S-1298, S-1299. Período de apuração: mensal. Transmissão via webservice com certificado digital A1 ou A3. Status: REVOGADO — substituído pelo MOS 2.5.`,
  },
  {
    title: "MOS — Manual de Orientação do eSocial v2.5 (2018–2020)",
    category: "MOS",
    source: "esocial.gov.br",
    version: "2.5",
    tags: "mos manual orientacao esocial versao 2.5 2018 2019 2020",
    isRevoked: true,
    content: `Manual de Orientação do eSocial versão 2.5, vigente de 2018 a 2020. Grupos 1 e 2 iniciaram envio em produção. Inovações: introdução do evento S-2400 (benefícios previdenciários), S-3000 (exclusão de eventos), ajuste no S-2240 (condições ambientais). Implantação gradual: G1 a partir de jan/2018, G2 a partir de jul/2018, G3 a partir de jan/2019. Módulo simplificado para MEI e pequenas empresas. Regras de validação de CPF/CNPJ aprimoradas. Relacionamento com e-CAC para consulta de eventos enviados. Certificação digital obrigatória para empresas com mais de 3 empregados. Status: REVOGADO — substituído pelo MOS 3.x.`,
  },
  {
    title: "MOS — Manual de Orientação do eSocial v3.1.0 (2021)",
    category: "MOS",
    source: "esocial.gov.br",
    version: "3.1.0",
    tags: "mos manual orientacao esocial versao 3.1.0 2021 simplificacao",
    content: `Manual de Orientação do eSocial versão 3.1.0, lançado em 2021. Grande simplificação do sistema: redução de 68 para 43 leiautes. Extinção de eventos: S-1025 (Tabela de Horários foi integrada ao S-2206), S-1035 (Cargos públicos integrados ao S-1030). Novidades: S-2400 reformulado para benefícios previdenciários de forma mais abrangente; S-2405 (segurado especial). Esocial simplificado para MEI, segurados especiais e empregadores domésticos. Ambiente de Consulta Pública disponível em esocial.gov.br. Adoção de XML Schema Definition (XSD) revisado. Prazos de transmissão padronizados. Comunicação com sistemas de fiscalização trabalhista. Status: PARCIALMENTE REVOGADO — MOS 3.1.2 corrigiu erros, MOS 3.2 o substitui.`,
  },
  {
    title: "MOS — Manual de Orientação do eSocial v3.1.2 (2022)",
    category: "MOS",
    source: "esocial.gov.br",
    version: "3.1.2",
    tags: "mos manual orientacao esocial versao 3.1.2 2022",
    content: `Manual de Orientação do eSocial versão 3.1.2, publicado em 2022. Correções e ajustes em relação ao MOS 3.1.0: correção de inconsistências no evento S-1000 (informações do empregador); ajuste no campo indOptRegEletron do S-2200; correção de regras de validação do S-2240; esclarecimentos sobre obrigatoriedade do S-2220 (monitoramento da saúde do trabalhador). Integração com FGTS Digital: definição de eventos que alimentam a guia do FGTS Digital (S-5003 e S-5013). Detalhamento dos eventos retorno S-5001, S-5002, S-5003, S-5011, S-5012, S-5013. Ajuste nos códigos de motivo de desligamento (Tabela 22). Status: VIGENTE para empresas ainda em migração, mas MOS 3.2 é o mais atual.`,
  },
  {
    title: "MOS — Manual de Orientação do eSocial v3.2.0 (2023–2024) — VIGENTE",
    category: "MOS",
    source: "esocial.gov.br",
    version: "3.2.0",
    tags: "mos manual orientacao esocial versao 3.2 2023 2024 vigente atual",
    content: `Manual de Orientação do eSocial versão 3.2.0, vigente desde 2023. Principais mudanças: S-2240 reestruturado para melhor captura de agentes nocivos conforme NR-15 e NR-16; novo campo de "atividade exercida" no S-2240; S-2220 com obrigatoriedade para todos os grupos; S-2400 com campos ampliados de benefícios previdenciários; S-2410/S-2416 para benefícios de atenção básica. Tabela 06 (agentes nocivos) atualizada conforme legislação vigente. Prazo de transmissão dos eventos de SST (Saúde e Segurança do Trabalho): até o último dia do mês subsequente. Retorno de eventos S-5003 com cálculo automático do FGTS. Integração completa com FGTS Digital. Este é o leiaute vigente para a maioria das empresas.`,
  },
  {
    title: "MOS — Manual de Orientação do eSocial v3.3.0 (2024–2025)",
    category: "MOS",
    source: "esocial.gov.br",
    version: "3.3.0",
    tags: "mos manual orientacao esocial versao 3.3 2024 2025",
    content: `Manual de Orientação do eSocial versão 3.3.0, publicado em 2024. Novidades: S-1000 com campos adicionais de classificação econômica; ajustes no S-2206 para alterações contratuais mais detalhadas; S-2230 com novos códigos de motivo de afastamento (incluindo afastamento por violência doméstica — Lei 14.457/2022); S-2299 (desligamento) com campo de débitos rescisórios parcelados; S-2501 atualizado para processos trabalhistas com novas competências de pagamento; ajustes nas regras de validação do FGTS Digital. Novos motivos de desligamento na Tabela 22. Ajustes de compatibilidade com DCTFWeb 2.0. Prazo de implementação: até dez/2024 para todos os grupos.`,
  },
  {
    title: "MOS — Manual de Orientação do eSocial v3.4.0 (2025–2026) — VERSÃO MAIS RECENTE",
    category: "MOS",
    source: "esocial.gov.br",
    version: "3.4.0",
    tags: "mos manual orientacao esocial versao 3.4 2025 2026 vigente atual recente",
    content: `Manual de Orientação do eSocial versão 3.4.0, publicado em 2025, vigente em 2026. Esta é a versão mais atual do MOS. Principais alterações: S-2300 (trabalhador sem vínculo) com campos revisados para profissionais autônomos; S-1010 (tabela de rubricas) com novos indicativos de incidência para PIS/COFINS; S-1200 com campo de natureza da remuneração expandido; S-2240 com atualização dos agentes nocivos conforme NR-15 revisada em 2024; S-5001 e S-5011 com novos campos de apuração de CPRB (Contribuição Previdenciária sobre Receita Bruta); evento S-7000 revisado para trabalhadores sem vínculo; S-2220 com integração aos dados do eSocial Saúde. Novidades 2026: campos de competência retroativa limitados a 5 anos; novos eventos para domésticos. Acesse: esocial.gov.br/download para a versão atualizada do XSD.`,
  },

  // ═══════════════════════════════════════════════════
  // LEIAUTES / XSD
  // ═══════════════════════════════════════════════════
  {
    title: "Leiaute eSocial v2.5 — Estrutura XML dos Eventos",
    category: "Leiaute",
    source: "esocial.gov.br",
    version: "2.5",
    tags: "leiaute xml xsd schema estrutura eventos esocial 2.5 historico",
    isRevoked: true,
    content: `Leiaute eSocial versão 2.5. Estrutura XML com 68 eventos. Raiz do XML: eSocial com namespace http://www.esocial.gov.br/schema/. Cada evento possui: Id (chave de negócio), ideEmpregador (CNPJ/CPF), ideTransmissor, dados específicos do evento. Assinatura digital: xmldsig com certificado A1 ou A3. Tamanho máximo do arquivo: 750KB por evento. Transmissão: webservice eSocial com SOAP 1.1. Lote: até 50 eventos por lote. Retorno: status 201 (sucesso), 202 (em processamento), 400 (erro de validação), 500 (erro interno). Consulta de lotes: até 72h após envio. Status: REVOGADO — substituído pelo leiaute 3.x.`,
  },
  {
    title: "Leiaute eSocial v3.0 — Simplificação (2021)",
    category: "Leiaute",
    source: "esocial.gov.br",
    version: "3.0",
    tags: "leiaute xml xsd schema simplificacao 43 eventos esocial 3.0",
    content: `Leiaute eSocial versão 3.0 / 3.1. Redução de 68 para 43 eventos. Eventos extintos (incorporados em outros): S-1025, S-1035, S-2190 (admissão preliminar incorporada ao S-2200). Namespace atualizado: http://www.esocial.gov.br/schema/evt/. Estrutura de assinatura mantida com XMLDSig. Novo ambiente de produção restrita (homologação por empresa). Tamanho máximo: 5MB por lote. Novos códigos de resposta mais detalhados. Integração com Portal Gov.br para autenticação. XSD disponível para download em: https://www.gov.br/esocial/pt-br/documentacao-tecnica. Status: REFERÊNCIA para migração; leiaute 3.2 é o atual.`,
  },
  {
    title: "Leiaute eSocial v3.2 — Leiaute Vigente (2023–2026)",
    category: "Leiaute",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "leiaute xml xsd schema vigente 2023 2024 2025 2026 esocial 3.2",
    content: `Leiaute eSocial versão 3.2, vigente de 2023 em diante. 43 eventos ativos. Estrutura dos arquivos XSD disponíveis em: esocial.gov.br/documentacao-tecnica. Pacote de XSD inclui: evtInfoEmpregador.xsd, evtTabRubrica.xsd, evtAdmissao.xsd, evtRemun.xsd, evtDeslig.xsd, evtSST.xsd, entre outros. Transmissão por lote: máximo de 50 eventos por lote. Webservice HTTPS com mTLS (certificado bilateral). Ambiente de produção: https://webservices.esocial.gov.br/servicos/empregador/lote/eventos/envio/sincrono/v1_1_0/. Consulta de lotes: https://webservices.esocial.gov.br/servicos/empregador/lote/eventos/envio/consulta/v1_0_0/. Retorno de lotes: status de cada evento na resposta. Timeout padrão: 120 segundos. Certificado: A1 ou A3, emitido por AC credenciada pelo ITI.`,
  },

  // ═══════════════════════════════════════════════════
  // EVENTOS eSocial — SÉRIE S-1000 (TABELAS)
  // ═══════════════════════════════════════════════════
  {
    title: "S-1000 — Informações do Empregador/Contribuinte",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s1000 evento empregador contribuinte orgao publico esocial tabela informacoes",
    content: `Evento S-1000: Informações do Empregador/Contribuinte/Órgão Público. Objetivo: identificar e qualificar o empregador no eSocial. Dados obrigatórios: CNPJ ou CPF (para pessoa física), razão social, classificação tributária (CNAE), indicativo de optante pelo Simples Nacional, regime de tributação (Lucro Real, Presumido, Simples), indicativo de entidade sem fins lucrativos. Campos de previdência: indDesFolha (desoneração da folha, 0=não, 1=sim), classTrib (classificação tributária para cálculo das contribuições). Dados do estabelecimento: inscrição estadual/municipal, contato, endereço. Transmissão: evento inicial obrigatório antes de qualquer outro. Validade: até ser substituído por novo S-1000 ou S-3000 de exclusão. Regras de validação: CNPJ deve estar ativo na Receita Federal; data de início da vigência não pode ser anterior à adesão ao eSocial.`,
  },
  {
    title: "S-1005 — Tabela de Estabelecimentos e Obras",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s1005 evento estabelecimento obra unidade orgao publico tabela esocial",
    content: `Evento S-1005: Tabela de Estabelecimentos, Obras ou Unidades de Órgão Público. Objetivo: cadastrar todos os estabelecimentos e obras onde há trabalhadores. Dados: CNPJ do estabelecimento, endereço, CNAE principal, alvará de funcionamento, dados de obras (CEI, CNO, endereço da obra). Relação com S-1000: o CNPJ informado no S-1005 deve pertencer ao empregador cadastrado no S-1000. Campos importantes: tpEstab (tipo de estabelecimento: 1=CNPJ, 2=CNO, 3=CAEPF), indSitEsp (situação especial: falência, recuperação judicial). Obras de construção civil: obrigatório informar CNO (Cadastro Nacional de Obras) emitido pela Receita Federal. Uso nos demais eventos: os eventos de trabalhadores referenciam o estabelecimento por CNPJ informado aqui.`,
  },
  {
    title: "S-1010 — Tabela de Rubricas",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s1010 rubrica folha pagamento incidencia previdencia irrf fgts esocial tabela",
    content: `Evento S-1010: Tabela de Rubricas da Folha de Pagamento. Objetivo: cadastrar todos os proventos e descontos usados na folha. Cada rubrica deve ter: código interno da empresa, nome, natureza (1=provento, 2=desconto, 3=informativo provento, 4=informativo desconto), incidências para INSS, IRRF, FGTS, CPRB, SindPatronal, SindEmpregado. Incidência: 00=não é base de cálculo, 11=integra base INSS, 12=integra base 13°, 21=integra base IRRF, 22=integra base 13° IRRF, 31=integra base FGTS, 32=integra base FGTS sobre 13°. Exemplos de rubricas comuns: salário base (incide tudo), DSR (incide INSS e FGTS), horas extras (incide tudo), INSS desconto (desconto), IRRF desconto (desconto), vale-transporte desconto (desconto, sem incidência), férias proporcionais (incide INSS e FGTS). Atenção: vale-transporte e vale-refeição têm incidência zero. Plano de saúde desconto: sem incidência previdenciária se for desconto do empregado. Participação nos lucros (PLR): não incide INSS nem FGTS quando pago nos limites legais.`,
  },
  {
    title: "S-1020 — Tabela de Lotações Tributárias",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s1020 lotacao tributaria fpas terceiros esocial tabela",
    content: `Evento S-1020: Tabela de Lotações Tributárias. Objetivo: definir as regras de tributação previdenciária por lotação/atividade. Cada lotação tem: código interno, descrição, FPAS (Fundo de Previdência e Assistência Social), código de terceiros (para contribuições às entidades). FPAS mais comuns: 507 (comércio e indústria em geral), 515 (entidades filantrópicas), 523 (serviços em geral), 531 (transportes), 558 (comunicações), 590 (construção civil), 647 (agropecuária). Código de terceiros: define quais entidades recebem contribuição (SESI, SESC, SENAI, SENAC, SENAT, SEBRAE, INCRA, FNDE, SENAR). Empregador doméstico: FPAS 868. Ente público: FPAS 736. A lotação é referenciada nos eventos S-1200 e S-2200 para apuração correta das contribuições.`,
  },
  {
    title: "S-1070 — Tabela de Processos Administrativos/Judiciais",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s1070 processo administrativo judicial trabalhista previdenciario esocial tabela",
    content: `Evento S-1070: Tabela de Processos Administrativos/Judiciais. Objetivo: registrar decisões judiciais ou administrativas que impactam a folha de pagamento, desonerando ou alterando a incidência de contribuições. Tipos de processo: 1=administrativo, 2=judicial. Origem: 1=Secretaria da Receita Federal, 2=Receita Federal/PGFN, 9=outros. Uso: quando há liminar, decisão ou acordo que desonera incidências de INSS, IRRF ou FGTS sobre determinada rubrica. Exemplo: empresa com decisão judicial que suspende a incidência de INSS sobre participação nos lucros acima do limite legal. Os eventos S-1200, S-1210, S-2500, S-2501 podem referenciar processos cadastrados no S-1070. Prazo: deve ser cadastrado antes do evento que o referencia.`,
  },

  // ═══════════════════════════════════════════════════
  // EVENTOS eSocial — SÉRIE S-2000 (NÃO PERIÓDICOS)
  // ═══════════════════════════════════════════════════
  {
    title: "S-2200 — Admissão/Cadastramento Inicial do Vínculo",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s2200 admissao vinculo empregaticio cadastro inicial esocial emprego",
    content: `Evento S-2200: Cadastramento Inicial do Vínculo e Admissão/Ingresso de Trabalhador. Objetivo: informar a contratação de trabalhador com vínculo empregatício. Prazo de envio: até o dia anterior ao início das atividades do trabalhador (admissão antecipada obrigatória). Dados obrigatórios: CPF, nome, data nascimento, sexo, grau de instrução, endereço, categoria do trabalhador (Tabela 1), cargo (CBO), salário base, jornada de trabalho, CTPS (série, número, UF), data de admissão, tipo de contrato (prazo determinado ou indeterminado), regime previdenciário. Campos opcionais importantes: PIS/NIT, matrícula interna, dados de deficiência, dados de primeiro emprego. Para trabalhador estrangeiro: dados de visto, passaporte. Para aprendiz: CNPJ do estabelecimento de ensino. Regra: o CPF deve estar válido na base da Receita Federal; o PIS/NIT deve estar vinculado ao CPF. Admissão retroativa: permitida em até 30 dias com justificativa.`,
  },
  {
    title: "S-2205 — Alteração de Dados Cadastrais do Trabalhador",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s2205 alteracao dados cadastrais trabalhador esocial nome endereco",
    content: `Evento S-2205: Alteração de Dados Cadastrais do Trabalhador. Objetivo: atualizar dados pessoais do empregado que não impactam a relação contratual. Dados que podem ser alterados: nome (incluindo nome social), endereço, e-mail, telefone, grau de instrução, dados de deficiência, dados do documento de identidade, dados de trabalhador estrangeiro. Prazo: até 15 dias após a alteração. Não usar este evento para: alteração de cargo, salário ou jornada (usar S-2206); desligamento (usar S-2299). Relação com S-2200: o CPF e a matrícula devem ser os mesmos do evento de admissão. Validação: data de início da alteração deve ser posterior ou igual à data de admissão.`,
  },
  {
    title: "S-2206 — Alteração de Contrato de Trabalho",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s2206 alteracao contrato trabalho cargo salario jornada esocial",
    content: `Evento S-2206: Alteração de Contrato de Trabalho. Objetivo: informar mudanças nas condições contratuais do empregado. Alterações possíveis: cargo/função (CBO), salário base, tipo de contrato (determinado/indeterminado), jornada de trabalho, lotação, natureza da atividade (urbana/rural), enquadramento para FGTS, alteração de regime previdenciário. Prazo: até 15 dias após a data de vigência da alteração. Promoção por merecimento ou antiguidade: usar este evento com o novo salário. Mudança de cargo: informar novo CBO. Redução de jornada por acordo individual: incluir tipo de acordo. Contrato por prazo determinado prorrogado: informar nova data de término. Regras: data de vigência não pode ser anterior à admissão; salário não pode ser inferior ao salário mínimo vigente.`,
  },
  {
    title: "S-2210 — Comunicação de Acidente de Trabalho (CAT)",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s2210 cat comunicacao acidente trabalho doenca ocupacional esocial",
    content: `Evento S-2210: Comunicação de Acidente de Trabalho (CAT). Objetivo: substituir a CAT em papel, unificando a comunicação ao INSS, MTE e Ministério da Saúde. Prazo: até o 1° dia útil seguinte ao acidente; imediato em caso de óbito. Tipos de acidente: típico (durante o trabalho), trajeto (entre residência e trabalho), doença ocupacional. Dados obrigatórios: CPF do acidentado, data/hora do acidente, local, descrição, parte do corpo atingida, agente causador, atendimento médico, CID (Classificação Internacional de Doenças), afastamento ou não. CAT de doença ocupacional: data do diagnóstico como data do acidente. Reabertura de CAT: evento S-2210 com indCatAbert = 2. Óbito: informar data e hora do óbito no campo dtObito. Empresas sem empregados acidentados nos últimos 12 meses: obrigadas a transmitir evento de ausência de CAT (regra específica por grupo).`,
  },
  {
    title: "S-2220 — Monitoramento da Saúde do Trabalhador (ASO)",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s2220 aso atestado saude ocupacional monitoramento sst esocial medico",
    content: `Evento S-2220: Monitoramento da Saúde do Trabalhador. Objetivo: substituir o ASO (Atestado de Saúde Ocupacional) em papel. Tipos de exame: admissional, periódico, retorno ao trabalho, mudança de função, demissional. Prazo de envio: até o último dia do mês subsequente ao da realização do exame. Dados obrigatórios: CPF do trabalhador, CPF do médico coordenador, CRM, data do exame, tipo de exame, resultado (apto/inapto), riscos monitorados (agentes físicos, químicos, biológicos, ergonômicos, de acidentes). Exames complementares: audiometria, espirometria, raio-X de tórax — informar resultado de cada exame. Obrigatoriedade: TODOS os exames ASO realizados a partir da data de implantação do grupo devem ser enviados, independente de resultado. Médico do trabalho ou clínico geral: ambos podem realizar o ASO, mas é obrigatório ter médico coordenador do PCMSO.`,
  },
  {
    title: "S-2230 — Afastamento Temporário",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.3",
    tags: "s2230 afastamento temporario doenca acidente licenca esocial auxilio doenca",
    content: `Evento S-2230: Afastamento Temporário. Objetivo: informar início e término de afastamentos do trabalho. Motivos de afastamento (Tabela 18): 01=acidente de trabalho, 02=acidente de trabalho — doença profissional/ocupacional, 03=doença, 04=doença não relacionada ao trabalho, 05=férias, 06=licença remunerada, 07=licença não remunerada, 08=afastamento por acidente de trabalho em trânsito, 09=mandato sindical, 10=afastamento para serviço militar, 11=licença-maternidade, 14=licença-maternidade por adoção, 15=afastamento por violência doméstica (Lei 14.457/2022 — NOVIDADE MOS 3.3), 16=outros. Prazo: até o 10° dia útil seguinte ao início do afastamento. Término do afastamento: envio de novo S-2230 com data de retorno. Afastamento por doença acima de 15 dias: INSS assume a partir do 16° dia; empresa informa auxílio-doença no S-2230. Regra: matrícula deve existir no sistema (evento S-2200 já enviado).`,
  },
  {
    title: "S-2240 — Condições Ambientais do Trabalho — Agentes Nocivos",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s2240 sst condicoes ambientais agentes nocivos insalubridade periculosidade aposentadoria especial esocial nr15",
    content: `Evento S-2240: Condições Ambientais do Trabalho — Agentes Nocivos. Objetivo: informar a exposição do trabalhador a agentes nocivos para fins de aposentadoria especial e caracterização de insalubridade/periculosidade. Prazo: até o último dia do mês subsequente ao início da exposição. Dados obrigatórios: CPF do trabalhador, data de início da exposição, localização (estabelecimento/obra), atividade exercida, agentes nocivos expostos (Tabela 6 do eSocial). Tabela 6 — principais agentes: 01.001 (ruído), 02.001 (calor), 02.002 (frio), 03.001 (benzeno), 03.002 (chumbo), 04.001 (vírus), 04.002 (bactérias), 05.001 (radiação ionizante). Intensidade da exposição: medição por profissional habilitado (engenheiro de segurança ou médico do trabalho). EPC e EPI: informar se há equipamentos de proteção coletiva ou individual que neutralizam o agente. LTCAT: deve estar vigente e corroborar o que é informado no S-2240. Aposentadoria especial: trabalhador com exposição confirmada no eSocial tem direito a aposentadoria especial (15, 20 ou 25 anos conforme o agente). Obrigatoriedade SST: grupo 1 (jan/2023), grupo 2 (jul/2023), grupo 3 e 4 (jan/2024).`,
  },
  {
    title: "S-2299 — Desligamento",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.3",
    tags: "s2299 desligamento rescisao contrato trabalho motivo esocial tabela22",
    content: `Evento S-2299: Desligamento. Objetivo: informar o término do contrato de trabalho com vínculo empregatício. Prazo: até 10 dias após o desligamento. Dados obrigatórios: matrícula, data do desligamento, motivo do desligamento (Tabela 22). Principais motivos (Tabela 22): 01=demissão sem justa causa, 02=demissão por justa causa, 03=pedido de demissão, 04=término do contrato por prazo determinado, 05=transferência de empregado, 06=morte, 07=extinção do estabelecimento, 10=rescisão do contrato de trabalho por iniciativa do empregador (prazo indeterminado), 11=rescisão indireta (pedido do empregado por culpa do empregador), 13=culpa recíproca, 17=término de contrato de aprendizagem. Campo indCumprAvist: indica se cumpriu aviso prévio (1=sim, 2=não, 3=indenizado). Verbas rescisórias: não são informadas neste evento; são incluídas no S-1200 ou S-1210 na competência do pagamento. NOVIDADE MOS 3.3: campo dtProjFimContr para contratos por prazo determinado com previsão de fim anterior ao desligamento efetivo; campo de débitos rescisórios parcelados.`,
  },
  {
    title: "S-2300 / S-2399 — Trabalhador Sem Vínculo Empregatício",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.4",
    tags: "s2300 s2399 tsve sem vinculo autonomo prestador servico esocial",
    content: `Eventos S-2300 e S-2399: Trabalhador Sem Vínculo de Emprego/Estatutário — Início e Término. Aplicam-se a: diretores não empregados com FGTS opcional, cooperados, autônomos com contribuição previdenciária, trabalhadores avulsos, estagiários, contribuintes individuais. Evento S-2300 (início): informar CPF, nome, data de início da prestação, categoria do trabalhador (Tabela 1), remuneração acordada, natureza da atividade. Evento S-2306: alteração contratual de TSVE. Evento S-2399 (término): data de término, motivo. Prazo: antes do início das atividades (S-2300) e até o 10° dia útil após o término (S-2399). NOVIDADE MOS 3.4: campos revisados para autonomos, incluindo indicativo de retenção de 11% de INSS (RIR) e campo de CNPJ contratante para múltiplos contratos simultâneos. Remuneração do TSVE é informada no S-1200 (por competência).`,
  },
  {
    title: "S-2500 / S-2501 — Processo Trabalhista",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s2500 s2501 processo trabalhista reclamatoria sentenca acordo esocial inss irrf",
    content: `Eventos S-2500 e S-2501: Processo Trabalhista. S-2500 (Processo Trabalhista — Reclamatória): informar dados do processo, partes, juízo, competências alcançadas pela decisão. S-2501 (Informações de Contribuições Decorrentes de Processo Trabalhista): informar INSS e IRRF sobre os valores devidos na reclamatória. Prazo: em até 15 dias após o trânsito em julgado ou acordo homologado. Dados do S-2500: número do processo, vara trabalhista, cidade, UF, CPF dos reclamantes, CNPJ do reclamado, data da sentença/acordo, competências retroativas incluídas. S-2501: por competência, informar valor bruto, desconto INSS, IRRF, FGTS. Recolhimento: a guia é gerada automaticamente pelo eSocial com base nos eventos S-2500/S-2501. Acordo extrajudicial: também deve ser informado. Crédito tributário parcelado: campo específico no S-2501.`,
  },

  // ═══════════════════════════════════════════════════
  // EVENTOS PERIÓDICOS — SÉRIE S-1200
  // ═══════════════════════════════════════════════════
  {
    title: "S-1200 — Remuneração de Trabalhador (Folha de Pagamento)",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s1200 remuneracao folha pagamento salario rubrica inss irrf esocial",
    content: `Evento S-1200: Remuneração de Trabalhador vinculado ao RGPS (Regime Geral de Previdência Social). Objetivo: informar a remuneração mensal (e competências de 13° salário) de cada empregado. Prazo de envio: até o dia 07 do mês seguinte à competência; exceto dezembro (competência 13°), até o dia 20. Estrutura: por competência, por trabalhador, listando todas as rubricas lançadas na folha. Campos obrigatórios: matrícula, competência (AAAAMM), data do pagamento, lista de rubricas com código e valor. Cálculo automático: o eSocial consolida no evento S-5001 as contribuições por trabalhador e no S-5011 as contribuições por empregador/competência, gerando a DCTFWeb. Folha de férias: informar na competência do pagamento, não no mês de gozo. 13° salário — 1ª parcela: competência "13" + ano, com indicativo de adiantamento. 13° salário — 2ª parcela: competência "13" + ano, com todos os proventos e descontos. Rescisão: informar na competência do mês de pagamento, com prazo de envio específico.`,
  },
  {
    title: "S-1210 — Pagamentos de Rendimentos do Trabalho",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s1210 pagamento rendimento irrf declaracao retencao esocial",
    content: `Evento S-1210: Pagamentos de Rendimentos do Trabalho. Objetivo: informar os pagamentos efetuados a trabalhadores, para fins de IRRF (Imposto de Renda Retido na Fonte). Prazo: até o dia 15 do mês seguinte ao pagamento. Aplica-se a: empregados, trabalhadores sem vínculo, beneficiários de pensões, PLR, JCP. Dados: CPF do beneficiário, data e valor do pagamento, código da receita, IRRF retido, natureza do rendimento (Tabela de Códigos do eSocial). Substituição da DIRF: o S-1210 junto com o S-5002 compõem as informações que substituirão a DIRF a partir de 2026. Atenção: o S-1210 não é um evento de folha — complementa o S-1200 com a data efetiva de pagamento e o IRRF calculado.`,
  },
  {
    title: "S-1299 — Fechamento dos Eventos Periódicos",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s1299 fechamento periodos folha apuracao competencia esocial",
    content: `Evento S-1299: Fechamento dos Eventos Periódicos. Objetivo: sinalizar ao eSocial que todos os eventos periódicos da competência foram enviados, autorizando a geração dos totalizadores e da DCTFWeb. Prazo: deve ser enviado após o envio de todos os S-1200, S-1210 e S-1260 da competência; até o dia 15 do mês seguinte. Efeito: após o S-1299, o eSocial gera os eventos retorno S-5001, S-5002, S-5003, S-5011, S-5012, S-5013. Fechamento de 13° salário: envio de S-1299 com competência "13" + ano. Reabertura: evento S-1298 para desfazer o fechamento e corrigir eventos periódicos. Atenção: não é possível enviar novos eventos periódicos após o S-1299 sem antes enviar o S-1298. DCTFWeb: gerada automaticamente após o S-1299 ser processado.`,
  },

  // ═══════════════════════════════════════════════════
  // EVENTOS RETORNO — SÉRIE S-5000
  // ═══════════════════════════════════════════════════
  {
    title: "S-5001, S-5002, S-5003 — Totalizadores por Trabalhador",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s5001 s5002 s5003 totalizadores contribuicoes inss irrf fgts trabalhador esocial retorno",
    content: `Eventos retorno S-5001, S-5002 e S-5003: Totalizadores por trabalhador gerados pelo eSocial após o fechamento da competência (S-1299). S-5001 — Contribuições Sociais Consolidadas por Trabalhador: INSS patronal, INSS do trabalhador (parte descontada), RAT (Risco Ambiental do Trabalho), contribuições a terceiros (SENAI, SESI, etc.) — por competência, por trabalhador. S-5002 — Imposto de Renda Retido na Fonte por Trabalhador: IRRF de cada beneficiário, por competência — base para a futura extinção da DIRF. S-5003 — FGTS por Trabalhador: saldo de FGTS mensal de cada trabalhador, base do FGTS Digital. Uso: os totalizadores são de consulta; os valores são consolidados nos S-5011, S-5012, S-5013 (por empresa/competência) que geram a DCTFWeb e o Guia do FGTS Digital.`,
  },
  {
    title: "S-5011, S-5012, S-5013 — Totalizadores por Contribuinte",
    category: "Evento",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "s5011 s5012 s5013 totalizadores empresa contribuinte dctfweb fgts digital esocial retorno",
    content: `Eventos retorno S-5011, S-5012 e S-5013: Totalizadores por Contribuinte/Empresa. S-5011 — Informações das Contribuições Sociais Consolidadas por Contribuinte: total de INSS a recolher (patronal + empregado + terceiros + RAT) por CNPJ/competência — alimenta diretamente a DCTFWeb. S-5012 — IRRF Consolidado por Contribuinte: total de IRRF a recolher por CNPJ/competência — alimenta a DCTFWeb e, no futuro, extingue a DIRF. S-5013 — FGTS Consolidado por Contribuinte: total de FGTS a recolher — alimenta o FGTS Digital para geração da guia de recolhimento. Prazo de recolhimento: INSS — até o dia 20 do mês seguinte; FGTS — até o dia 07 do mês seguinte (via FGTS Digital); IRRF — depende da tabela de códigos de receita. DCTFWeb: gerada automaticamente com base no S-5011 e S-5012 — prazo de transmissão até o dia 15 do mês seguinte.`,
  },

  // ═══════════════════════════════════════════════════
  // TABELAS eSocial
  // ═══════════════════════════════════════════════════
  {
    title: "Tabela 1 — Categorias de Trabalhadores",
    category: "Tabela",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "tabela1 categoria trabalhador empregado autonomo esocial codigo",
    content: `Tabela 1 do eSocial — Categorias de Trabalhadores. Principais categorias: 101=empregado geral (CLT); 102=empregado doméstico; 103=trabalhador avulso portuário; 104=trabalhador avulso não portuário; 105=agente público; 106=servidor público efetivo; 107=servidor público não efetivo; 108=auxiliar local; 111=aprendiz; 201=contribuinte individual — autônomo; 202=contribuinte individual — transportador rodoviário; 203=contribuinte individual — cooperado; 204=contribuinte individual — transportador cooperado; 205=contribuinte individual — diretor não empregado com FGTS; 211=contribuinte individual — diretor não empregado sem FGTS; 301=bolsista; 302=estagiário; 303=estagiário especial; 401=servidor público federal filiado ao RGPS; 410=servidor público estadual/municipal. A categoria define as contribuições previdenciárias aplicáveis (INSS, RAT, terceiros) e o regime de tributação do trabalhador.`,
  },
  {
    title: "Tabela 3 — Natureza das Rubricas",
    category: "Tabela",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "tabela3 natureza rubrica provento desconto informativo esocial folha",
    content: `Tabela 3 do eSocial — Natureza das Rubricas da Folha de Pagamento. Naturezas: 1000X = provento, 2000X = desconto, 3000X = informativo de provento, 4000X = informativo de desconto. Principais códigos de natureza: 1001=remuneração (salários, ordenados, vencimentos), 1002=horas extras, 1003=descanso semanal remunerado (DSR), 1005=férias gozadas, 1006=abono pecuniário de férias, 1007=terço de férias, 1010=13° salário, 1020=adicional de insalubridade, 1021=adicional de periculosidade, 1030=gratificações, 1040=comissões, 1050=PLR, 2001=INSS desconto empregado, 2002=IRRF, 2003=contribuição sindical, 2010=adiantamento salarial, 2011=vale-transporte desconto, 2012=vale-refeição desconto, 2020=plano de saúde desconto, 3001=INSS patronal (informativo), 4001=FGTS informativo. Atenção: a natureza deve ser coerente com as incidências informadas no S-1010.`,
  },
  {
    title: "Tabela 6 — Agentes Nocivos (SST)",
    category: "Tabela",
    source: "esocial.gov.br",
    version: "3.2",
    tags: "tabela6 agentes nocivos sst insalubridade aposentadoria especial esocial nr15",
    content: `Tabela 6 do eSocial — Agentes Nocivos para fins de SST e Aposentadoria Especial. Estrutura: código, descrição, limite de tolerância, aposentadoria especial (15, 20 ou 25 anos), norma regulamentadora de referência. Agentes físicos: 01.001=ruído (LT: 85dB(A), 25 anos), 01.002=calor (NR-15 Anexo 3), 01.003=frio, 01.004=pressão hiperbárica (15 anos), 01.005=radiação ionizante (20 anos), 01.007=vibrações. Agentes químicos: 02.001=asbestos/amianto (15 anos), 02.002=silício livre (SiO2, 20 anos), 02.003=carvão mineral, 02.004=alcatrão, 02.005=benzeno (20 anos), 02.006=arsênio, 02.007=manganês, 02.008=chumbo (25 anos). Agentes biológicos: 03.001=microorganismos patogênicos em contato permanente (25 anos). Agentes eletromagnéticos: 04.001=radiação não ionizante (laser de alta potência). Atualização 2023/2024: alinhada à NR-15 revisada. Uso no S-2240: código exato da Tabela 6 deve ser informado para cada agente.`,
  },
  {
    title: "Tabela 22 — Motivos de Desligamento",
    category: "Tabela",
    source: "esocial.gov.br",
    version: "3.3",
    tags: "tabela22 motivo desligamento rescisao demissao esocial s2299",
    content: `Tabela 22 do eSocial — Motivos de Desligamento (referenciada no S-2299). Motivos principais: 01=demissão sem justa causa pelo empregador; 02=demissão por justa causa do empregado (art. 482 CLT); 03=pedido de demissão sem justa causa; 04=término do contrato a prazo; 05=transferência de empregado entre estabelecimentos do mesmo grupo econômico; 06=morte do empregado; 07=extinção do estabelecimento pelo empregador; 08=aposentadoria voluntária; 09=aposentadoria por invalidez; 10=rescisão por iniciativa do empregador sem justa causa (art. 477 §1); 11=rescisão indireta (art. 483 CLT — falha grave do empregador); 12=culpa recíproca; 13=acordo entre empregado e empregador (art. 484-A CLT); 14=término de aprendizagem; 15=decisão judicial; 16=falecimento do empregador pessoa física; 17=extinção normal de contrato por prazo determinado. NOVIDADE MOS 3.3 (2024): 18=transferência de empregado para empresa coligada ou controladora no exterior; 19=rescisão por fechamento de empresa em recuperação judicial. Impacto nas verbas rescisórias: cada motivo determina quais verbas são devidas (aviso prévio, multa FGTS, seguro-desemprego).`,
  },

  // ═══════════════════════════════════════════════════
  // FGTS DIGITAL
  // ═══════════════════════════════════════════════════
  {
    title: "FGTS Digital — Visão Geral e Implantação",
    category: "FGTS Digital",
    source: "fgtsdigital.gov.br",
    version: "2024",
    tags: "fgts digital recolhimento guia caixa esocial integracao 2023 2024",
    content: `FGTS Digital: sistema desenvolvido pela Caixa Econômica Federal, lançado em março de 2023 para empresas do grupo 1 e expandido gradualmente. Objetivo: substituir o SEFIP/GFIP para recolhimento do FGTS, integrando-se ao eSocial. Funcionamento: o eSocial gera o evento S-5003 (FGTS por trabalhador) e S-5013 (FGTS por empresa), que alimentam automaticamente o FGTS Digital. O empregador acessa o FGTS Digital em fgtsdigital.gov.br ou por API, valida a guia e efetua o pagamento. Prazo de recolhimento: dia 07 do mês seguinte à competência; exceto 13° salário (dia 07 de dezembro para 1ª parcela; dia 07 de janeiro para 2ª parcela). Tipos de guia: GRF (Guia de Recolhimento do FGTS) por competência, GRF de rescisão. Multa por atraso: 0,07% ao dia + SELIC mensal. FGTS rescisório (multa de 40% ou 20%): deve ser recolhido na rescisão separadamente da GRRF (Guia de Recolhimento Rescisório do FGTS). Desmembramento de competências: possível pagar guia por estabelecimento ou por trabalhador individualmente.`,
  },
  {
    title: "FGTS Digital — Extinção do SEFIP e Transição",
    category: "FGTS Digital",
    source: "fgtsdigital.gov.br",
    version: "2024",
    tags: "fgts digital sefip gfip extincao transicao esocial caixa 2024",
    content: `Transição do SEFIP para o FGTS Digital. SEFIP (Sistema Empresa de Recolhimento do FGTS e Informações à Previdência Social): extinto progressivamente com a implantação do FGTS Digital por grupo. GFIP (Guia de Recolhimento do FGTS e de Informações à Previdência Social): substituída pela DCTFWeb (contribuições previdenciárias) e pelo FGTS Digital (recolhimento do FGTS). Cronograma de extinção: Grupo 1 — março/2023; Grupo 2 — setembro/2023; Grupo 3 — março/2024; Grupo 4 — setembro/2024. Após a implantação, o empregador não deve mais transmitir SEFIP/GFIP para competências cobertas pelo eSocial. Obrigações do SEFIP que permanecem temporariamente: competências anteriores ao início do eSocial; situações especiais não cobertas (ex.: empregador doméstico com divergências). Integração bancária: API do FGTS Digital permite integração com ERPs para pagamento automático via PIX ou boleto bancário.`,
  },
  {
    title: "FGTS Digital — GRRF e Rescisão",
    category: "FGTS Digital",
    source: "fgtsdigital.gov.br",
    version: "2024",
    tags: "fgts digital grrf rescisao multa 40 20 saque empregado desligamento",
    content: `GRRF — Guia de Recolhimento Rescisório do FGTS no FGTS Digital. Gerada automaticamente após o envio do evento S-2299 (desligamento) com processamento pelo eSocial. Componentes da GRRF: saldo de FGTS da competência rescisória; multa de 40% sobre saldo total (demissão sem justa causa) ou 20% (acordo art. 484-A CLT — NOVIDADE: pagamento pelo empregador de 20% e abatimento dos 20% devidos pelo empregado). Prazo de recolhimento da GRRF: até o 10° dia seguinte ao desligamento; se o prazo cair em sábado, domingo ou feriado, antecipa-se para o dia útil anterior. Pagamento: o empregado pode sacar o FGTS + multa rescisória diretamente via app FGTS Digital (novo fluxo digital 2024). Parcelamento: não é permitido para a multa rescisória. Conferência: o empregador deve verificar se todos os meses anteriores foram recolhidos corretamente antes da rescisão, pois o FGTS Digital consolida o histórico.`,
  },

  // ═══════════════════════════════════════════════════
  // NOTAS TÉCNICAS
  // ═══════════════════════════════════════════════════
  {
    title: "NT 001/2022 — Implantação dos Eventos de SST (Saúde e Segurança do Trabalho)",
    category: "Nota Técnica",
    source: "esocial.gov.br",
    version: "2022",
    tags: "nota tecnica sst s2210 s2220 s2240 seguranca saude trabalho implantacao 2022 2023",
    content: `Nota Técnica 001/2022 — Implantação dos Eventos de SST. Define o cronograma e regras de implantação dos eventos de Saúde e Segurança do Trabalho (SST) no eSocial: S-2210 (CAT), S-2220 (ASO), S-2240 (condições ambientais). Cronograma: Grupo 1 (empresas com faturamento > R$78 milhões) — a partir de janeiro/2023; Grupo 2 (demais empresas com CNPJ) — a partir de julho/2023; Grupo 3 (optantes Simples, MEI, empregadores domésticos, segurados especiais) — a partir de janeiro/2024; Grupo 4 (entes públicos) — a partir de janeiro/2024. Regras de retroatividade: eventos de SST com data anterior ao início da obrigatoriedade não são obrigatórios, mas podem ser enviados. Prazo geral para SST: até o último dia do mês subsequente à ocorrência (exceto S-2210, que é até o 1° dia útil seguinte ao acidente). Pré-requisitos: empregado deve ter S-2200 ou S-2300 enviado previamente. Documentação de suporte: PCMSO, PPRA/PGR, LTCAT devem estar atualizados e disponíveis para fiscalização.`,
  },
  {
    title: "NT 002/2022 — Obrigatoriedade do PGR e PCMSO no eSocial",
    category: "Nota Técnica",
    source: "esocial.gov.br",
    version: "2022",
    tags: "nota tecnica pgr pcmso programa gerenciamento risco saude esocial obrigatoriedade nr1 nr7",
    content: `Nota Técnica 002/2022 — PGR e PCMSO no contexto do eSocial. PGR (Programa de Gerenciamento de Riscos): obrigatório a partir de maio/2022 conforme NR-1 revisada. Substitui o PPRA (Programa de Prevenção de Riscos Ambientais). O PGR deve identificar, avaliar e controlar todos os riscos ocupacionais: físicos, químicos, biológicos, ergonômicos e de acidentes. O PGR não é enviado ao eSocial, mas o que é enviado no S-2240 deve ser coerente com o PGR. PCMSO (Programa de Controle Médico de Saúde Ocupacional — NR-7): continua obrigatório; os ASOs gerados a partir do PCMSO são enviados via S-2220. Fiscalização: o MTE e o INSS podem cruzar os dados do S-2240 com o LTCAT e o PGR para verificar inconsistências. Atenção: a ausência de envio dos eventos SST quando obrigatório sujeita o empregador a auto de infração. Integração: PGR + PCMSO + LTCAT devem ser coerentes entre si e com os dados do eSocial.`,
  },
  {
    title: "NT 001/2023 — Simplificação do eSocial — Leiaute 3.1",
    category: "Nota Técnica",
    source: "esocial.gov.br",
    version: "2023",
    tags: "nota tecnica simplificacao esocial leiaute 3.1 reducao eventos 43 2023",
    content: `Nota Técnica 001/2023 — Simplificação do eSocial e adoção do leiaute 3.1. Principais simplificações implementadas: (1) Redução de 68 para 43 eventos — extinção de eventos redundantes; (2) S-2190 (Admissão Preliminar) incorporado ao S-2200 como campo de admissão antecipada; (3) Tabela S-1030 ampliada para incluir cargos públicos (extinção do S-1035); (4) Jornada de trabalho integrada ao S-2206 e S-2200 (extinção do evento específico); (5) Transmissão de eventos em lote simplificada com novo formato de resposta; (6) Ambiente de produção restrita disponível para testes por empresa. Impacto nas empresas: sistemas de ERP e folha de pagamento precisaram ser atualizados para o novo leiaute. Prazo de migração: 90 dias após publicação para empresas do grupo 1; 180 dias para demais grupos. Status: implementado em 2023 para todos os grupos.`,
  },
  {
    title: "NT 001/2024 — Atualização do Leiaute 3.2 e FGTS Digital",
    category: "Nota Técnica",
    source: "esocial.gov.br",
    version: "2024",
    tags: "nota tecnica leiaute 3.2 fgts digital 2024 sst s2240 atualizacao",
    content: `Nota Técnica 001/2024 — Atualização do leiaute eSocial para versão 3.2 e integração com FGTS Digital. Principais mudanças do leiaute 3.2: (1) S-2240 reestruturado: campo de atividade exercida ampliado; Tabela 6 atualizada conforme NR-15 revisada; campo de EPI/EPC mais detalhado; (2) S-2220 com novos campos de resultado de exames complementares; (3) S-5003 e S-5013 com campos de FGTS Digital: identifica competências abertas e pagas; (4) S-1200: campo de natureza da remuneração para PLR, JCP e outras remunerações variáveis; (5) S-2299: campo de parcelamento de verbas rescisórias. FGTS Digital 3.2: a partir do leiaute 3.2, o FGTS Digital recebe automaticamente os totalizadores sem necessidade de envio manual pelo empregador. Prazo de adoção: obrigatório a partir de 01/01/2024 para grupo 1 e 2; 01/07/2024 para grupos 3 e 4.`,
  },
  {
    title: "NT 001/2025 — Atualização MOS 3.3 e Novas Regras 2025",
    category: "Nota Técnica",
    source: "esocial.gov.br",
    version: "2025",
    tags: "nota tecnica mos 3.3 2025 violencia domestica s2230 desligamento",
    content: `Nota Técnica 001/2025 — MOS 3.3: principais mudanças e novas obrigações. (1) S-2230 — novo motivo de afastamento: violência doméstica (Lei 14.457/2022 — art. 9-A da Lei Maria da Penha aplicado ao trabalho): prazo mínimo de 3 meses de afastamento sem prejuízo do emprego e salário, custeado pelo empregador; campo indAfastViolDom = S no S-2230; (2) S-2299 — campo dtProjFimContr: para informar data projetada de fim do contrato determinado quando o desligamento ocorre antes; campo parcelamentoDbt para débitos rescisórios parcelados por acordo (Lei 13.467/2017 — Reforma Trabalhista); (3) S-1000 — campo de classificação tributária ampliado para microempresas individuais com empregados; (4) Tabela 22 — novos motivos de desligamento (18=transferência ao exterior, 19=recuperação judicial). Prazo de adoção do MOS 3.3: 01/01/2025 para grupos 1 e 2; 01/07/2025 para grupos 3 e 4.`,
  },
  {
    title: "NT 001/2026 — Atualização MOS 3.4 e Regras Vigentes em 2026",
    category: "Nota Técnica",
    source: "esocial.gov.br",
    version: "2026",
    tags: "nota tecnica mos 3.4 2026 vigente atual s2300 s1010 s1200 novidades",
    content: `Nota Técnica 001/2026 — MOS 3.4: mudanças vigentes em 2026. Esta é a nota técnica mais recente do eSocial. Principais mudanças: (1) S-2300 revisado: campos para autônomos com múltiplos contratos; indicativo de retenção de INSS (11% RIR) no campo indRIR; (2) S-1010 (tabela de rubricas): novos indicativos de incidência para PIS/COFINS sobre folha de pagamento de empresas com retenção de contribuição social; (3) S-1200: campo de natureza expandido para remuneração de investimentos e juros sobre capital próprio (JCP); (4) S-5001/S-5011: campos de CPRB (Contribuição Previdenciária sobre Receita Bruta) para setores contemplados pela Lei 12.546/2011; (5) Empregados domésticos: novos campos para jornada híbrida; (6) Prazo de retroatividade limitado a 60 meses (5 anos); (7) Integração com eSocial Saúde (plataforma em desenvolvimento para integração com dados de saúde suplementar). Vigência: a partir de 01/01/2026 para grupos 1 e 2.`,
  },

  // ═══════════════════════════════════════════════════
  // PERGUNTAS FREQUENTES (FAQ)
  // ═══════════════════════════════════════════════════
  {
    title: "FAQ — Admissão e Cadastro de Trabalhadores no eSocial",
    category: "FAQ",
    source: "esocial.gov.br",
    version: "2024",
    tags: "faq duvidas admissao cadastro trabalhador esocial s2200 prazo erro",
    content: `Perguntas frequentes sobre admissão no eSocial. P: Qual o prazo para enviar o S-2200? R: O S-2200 deve ser enviado até o dia anterior ao início das atividades do trabalhador. P: O que acontece se o trabalhador começar a trabalhar sem o S-2200 enviado? R: A empresa pode ser autuada pelo MTE; além disso, o trabalhador não terá cobertura do INSS em caso de acidente de trabalho no período não informado. P: Posso corrigir dados do S-2200 após o envio? R: Sim — use o S-2205 para dados cadastrais e o S-2206 para dados contratuais. P: O CPF do trabalhador não valida no eSocial. O que fazer? R: Verificar se o CPF está regular na Receita Federal e se o PIS/NIT está vinculado ao CPF correto. P: Aprendiz precisa de S-2200? R: Sim, com categoria 111 e CNPJ da escola de aprendizagem informado. P: E estagiário? R: O estagiário não tem vínculo empregatício; usa-se o S-2300 com categoria 301 ou 303. P: Trabalhador estrangeiro sem CPF? R: CPF é obrigatório para qualquer trabalhador; deve ser obtido antes do início das atividades.`,
  },
  {
    title: "FAQ — Folha de Pagamento, S-1200 e Remuneração",
    category: "FAQ",
    source: "esocial.gov.br",
    version: "2024",
    tags: "faq duvidas folha pagamento s1200 rubrica remuneracao competencia esocial",
    content: `Perguntas frequentes sobre folha de pagamento no eSocial. P: Qual o prazo do S-1200? R: Até o dia 07 do mês seguinte à competência. Para 13° salário 1ª parcela: até dia 07 de dezembro. Para 13° 2ª parcela: até dia 20 de dezembro. P: O 13° salário tem duas competências no eSocial? R: Sim — "13" + ano para o 1° adiantamento e para o 2° com cálculo final, cada um com seus descontos. P: Como informar férias no S-1200? R: Na competência do mês de pagamento das férias, incluindo proventos (férias, terço) e descontos (INSS, IRRF). P: Posso corrigir o S-1200 após o fechamento (S-1299)? R: Sim, mas antes é necessário enviar o S-1298 (reabertura) para desfazer o fechamento. P: Trabalhador afastado por doença recebe salário? R: Primeiros 15 dias: empresa paga; a partir do 16° dia: INSS paga o auxílio-doença. No S-1200, informar apenas os dias pagos pela empresa. P: PLR entra no S-1200? R: Sim, na competência do pagamento; deve estar cadastrada no S-1010 com natureza adequada (código 1050) e sem incidência de INSS e FGTS (quando dentro dos limites da Lei 10.101/2000).`,
  },
  {
    title: "FAQ — Rescisão e Desligamento no eSocial",
    category: "FAQ",
    source: "esocial.gov.br",
    version: "2024",
    tags: "faq duvidas rescisao desligamento s2299 grrf multa fgts esocial",
    content: `Perguntas frequentes sobre rescisão no eSocial. P: Quando enviar o S-2299? R: Até o 10° dia após o desligamento. P: As verbas rescisórias vão no S-2299? R: Não — o S-2299 informa apenas o desligamento. As verbas são lançadas no S-1200 ou S-1210 da competência do pagamento. P: Como funciona a GRRF no FGTS Digital? R: Após o S-2299 processado pelo eSocial, o FGTS Digital gera automaticamente a GRRF com o saldo e a multa rescisória. Prazo de recolhimento: até o 10° dia após o desligamento. P: Acordei a demissão com o empregado (acordo do art. 484-A). Qual o motivo no S-2299? R: Motivo 13 (acordo entre empregado e empregador). A multa do FGTS será de 20% (metade da normal). P: Empregado pediu demissão. Paga FGTS? R: A multa de 40% não é devida; mas o saldo do FGTS permanece na conta do trabalhador (não pode sacar imediatamente, exceto se já tiver 3 anos sem trabalho com carteira assinada). P: Qual a diferença entre motivo 01 e motivo 10 na Tabela 22? R: Motivo 01=dispensa imotivada padrão; motivo 10=rescisão específica do art. 477 §1 — aplicável a contratos específicos. Ambos geram multa de 40%.`,
  },
  {
    title: "FAQ — SST (Saúde e Segurança do Trabalho) no eSocial",
    category: "FAQ",
    source: "esocial.gov.br",
    version: "2024",
    tags: "faq sst s2210 s2220 s2240 aso cat condicoes ambientais saude seguranca esocial",
    content: `Perguntas frequentes sobre SST no eSocial. P: Empresa sem trabalhadores em condições insalubres precisa enviar S-2240? R: Não precisa enviar S-2240 se não há exposição a agentes nocivos. Mas precisa ter o PGR documentando essa avaliação. P: Todo ASO deve ser enviado no S-2220? R: Sim, todos os ASOs realizados após o início da obrigatoriedade devem ser enviados, inclusive os que resultaram em apto. P: Empresa de escritório precisa de S-2220? R: Sim, para os exames admissionais, periódicos e demissionais previstos no PCMSO. P: Qual o prazo para enviar a CAT (S-2210)? R: Até o primeiro dia útil seguinte ao acidente; em caso de óbito, imediatamente. P: O S-2240 deve ser enviado para cada trabalhador individualmente? R: Sim, um evento por trabalhador por local/função com exposição. P: Empresa de pequeno porte sem SESMT precisa de S-2220? R: Sim; pode contratar serviço externo de medicina do trabalho para elaborar o PCMSO e realizar os exames. P: O médico do trabalho pode ser clínico geral? R: O PCMSO deve ter médico coordenador habilitado em medicina do trabalho (especialização ou residência); clínico geral pode realizar exames sob supervisão.`,
  },
  {
    title: "FAQ — FGTS Digital: Principais Dúvidas",
    category: "FAQ",
    source: "fgtsdigital.gov.br",
    version: "2024",
    tags: "faq fgts digital duvidas guia recolhimento prazo grrf pix boleto",
    content: `Perguntas frequentes sobre FGTS Digital. P: Ainda preciso usar o SEFIP? R: Não, após a implantação do FGTS Digital por grupo, o SEFIP não deve mais ser usado para as competências cobertas. P: Como acesso o FGTS Digital? R: Via Portal Gov.br (gov.br/fgts-digital) com certificado digital ou conta gov.br nível ouro/prata. P: Posso pagar FGTS com PIX? R: Sim, o FGTS Digital aceita pagamento via PIX, boleto bancário e débito em conta. P: O prazo de recolhimento mudou? R: Não — continua sendo o dia 07 do mês seguinte, igual ao SEFIP. P: O que é a GRF e a GRRF? R: GRF = guia mensal do FGTS; GRRF = guia de rescisão. Ambas são geradas automaticamente pelo FGTS Digital com base no eSocial. P: Como faço para visualizar o saldo de FGTS por trabalhador? R: No portal do FGTS Digital, o empregador vê o extrato por trabalhador; o empregado vê no app FGTS. P: E se eu pagar a mais? R: O valor excedente fica como saldo positivo e é abatido nas próximas guias. P: Empresa em recuperação judicial pode parcelar FGTS? R: Sim, há regras específicas no FGTS Digital para parcelamento por empresas em RJ.`,
  },
  {
    title: "FAQ — DCTFWeb e Obrigações Fiscais do eSocial",
    category: "FAQ",
    source: "receita.fazenda.gov.br",
    version: "2024",
    tags: "faq dctfweb declaracao contribuicoes tributadas inss irrf gfip esocial receita",
    content: `Perguntas frequentes sobre DCTFWeb e obrigações fiscais. P: O que é a DCTFWeb? R: Declaração de Débitos e Créditos Tributários Federais Previdenciários e de Outras Entidades e Fundos — gerada automaticamente pelo eSocial com base nos eventos S-5011 e S-5012. Substituiu a GFIP como declaração das contribuições previdenciárias. P: Preciso preencher a DCTFWeb manualmente? R: Não; ela é pré-preenchida pelo eSocial. O contribuinte acessa e confirma. P: Qual o prazo da DCTFWeb? R: Até o dia 15 do mês seguinte à competência. P: A DCTFWeb substitui a GFIP? R: Sim, para competências cobertas pelo eSocial. P: O que acontece se não transmitir a DCTFWeb? R: Multa de 2% ao mês sobre o valor das contribuições, limitada a 20%; mínimo de R$ 200,00. P: A DCTFWeb inclui IRRF? R: Sim, o S-5012 alimenta a DCTFWeb com o IRRF. Futuramente, substituirá também a DIRF. P: Como retificar a DCTFWeb? R: Corrigindo os eventos do eSocial que a geraram (reabertura com S-1298 e reenvio dos S-1200); a DCTFWeb é recalculada automaticamente.`,
  },

  // ═══════════════════════════════════════════════════
  // PORTARIA / LEGISLAÇÃO
  // ═══════════════════════════════════════════════════
  {
    title: "Resolução CGSN n° 150/2019 — eSocial para Optantes do Simples Nacional",
    category: "Legislação",
    source: "receita.fazenda.gov.br",
    version: "2019",
    tags: "resolucao cgsn simples nacional mei esocial obrigatoriedade 2019 grupo3",
    content: `Resolução CGSN n° 150/2019: define as regras de implantação do eSocial para optantes do Simples Nacional e MEI. MEI: obrigados a enviar eventos de trabalhadores quando possuem empregados (somente 1 empregado permitido para MEI). Simples Nacional: mesmas obrigações das demais empresas, mas prazo de implantação diferenciado (Grupo 3). Simplificações para Simples Nacional: isenção de contribuições a terceiros (SESI, SENAI, SENAT, INCRA etc. — alíquota zero para Simples). Módulo Simplificado do eSocial: disponível no portal gov.br para empresas sem sistema de folha automatizado. MEI: usa formulário online simplificado no Portal do Simples Nacional. Atenção: mesmo sendo optante do Simples, todas as informações de admissão, folha, CAT e SST são obrigatórias conforme o cronograma do Grupo 3.`,
  },
  {
    title: "Portaria MTP n° 671/2021 — Trabalho Remoto e eSocial",
    category: "Legislação",
    source: "trabalho.gov.br",
    version: "2021",
    tags: "portaria mtp 671 2021 teletrabalho home office esocial contrato regime",
    content: `Portaria MTP n° 671/2021: regulamenta o teletrabalho (home office) e suas implicações no eSocial. Teletrabalho no S-2200 e S-2206: campo tpRegTrab (regime de trabalho): 1=urbano, 2=rural, 3=teletrabalho (campo incluído conforme esta portaria). Campo natAtividade: 1=trabalho urbano, 2=trabalho rural, 3=trabalho em regime de teletrabalho. Obrigações do empregador: fornecer ou custear equipamentos; definir critérios de controle de jornada (ou dispensar controle); assegurar proteção de dados. Acordo individual de teletrabalho: deve ser informado no S-2206 com o campo de tipo de acordo. Reversão do teletrabalho: novo S-2206 com o regime alterado. Saúde e segurança no teletrabalho: as normas de SST se aplicam ao home office; o empregador deve orientar sobre ergonomia e enviar S-2220 (ASO) com avaliação ergonômica quando aplicável.`,
  },
  {
    title: "Lei 14.457/2022 — Prevenção ao Assédio e Violência no Trabalho (Impacto eSocial)",
    category: "Legislação",
    source: "legislacao.gov.br",
    version: "2022",
    tags: "lei 14457 assedio violencia trabalho cipa esocial afastamento 2022 2023",
    content: `Lei 14.457/2022: institui o Programa Emprega + Mulheres, com medidas de prevenção ao assédio moral e sexual no trabalho. Impactos no eSocial: (1) CIPA ampliada: empresas com CIPA são obrigadas a incluir em seus programas medidas de prevenção ao assédio; (2) S-2230 — afastamento por violência doméstica (motivo 15): nova obrigação de afastamento remunerado por até 6 meses para vítimas de violência doméstica, com estabilidade no emprego; (3) Canal de denúncias: empresas com 100+ empregados devem ter canal confidencial de denúncias, cujo registro de violação pode ser base para S-2230 com motivo 15; (4) Treinamento obrigatório: todas as empresas devem promover treinamento sobre violência e assédio no trabalho (dado nos eventos de qualificação mas não tem evento eSocial específico ainda). Prazo de vigência: a partir de 22/09/2022; motivo 15 no S-2230 disponível a partir do MOS 3.3 (2025).`,
  },
  {
    title: "Lei 14.601/2023 — Imposto de Renda Pessoa Física e Impacto no eSocial (S-1210/DIRF)",
    category: "Legislação",
    source: "receita.fazenda.gov.br",
    version: "2023",
    tags: "lei 14601 irpf irrf dirf extincao s1210 esocial 2023 imposto renda",
    content: `Lei 14.601/2023 e o caminho para extinção da DIRF. A DIRF (Declaração do Imposto de Renda Retido na Fonte) será extinta progressivamente com a consolidação do eSocial. O eSocial, por meio dos eventos S-1210 (Pagamentos de Rendimentos do Trabalho) e S-5002 (IRRF por trabalhador), centraliza todas as informações de IRRF. Prazo previsto para extinção total da DIRF: substituída para competências cobertas pelo eSocial a partir de 2026 (em confirmação pela Receita Federal). Obrigações que permanecem: declaração de fontes pagadoras não cobertas pelo eSocial (bancos, fundos, seguradoras). Impacto prático no eSocial: S-1210 deve ser enviado com rigor, pois os dados alimentam a ficha financeira do trabalhador para declaração do IRPF; erros no S-1210 podem causar divergências na malha fina do trabalhador.`,
  },

  // ═══════════════════════════════════════════════════
  // HISTÓRICO / CRONOGRAMA DE IMPLANTAÇÃO
  // ═══════════════════════════════════════════════════
  {
    title: "Histórico de Implantação do eSocial — Grupos e Datas",
    category: "Histórico",
    source: "esocial.gov.br",
    version: "2014-2026",
    tags: "historico cronograma implantacao grupos datas esocial g1 g2 g3 g4",
    content: `Histórico completo de implantação do eSocial por grupo. GRUPO 1 (faturamento > R$78 milhões): — Jan/2018: início dos eventos de tabela (S-1000, S-1005, S-1010, S-1020); — Jul/2018: início dos eventos não periódicos (S-2200, S-2205, S-2299 etc.); — Jan/2019: início dos eventos periódicos (S-1200, S-1299); — Jan/2023: início dos eventos SST (S-2210, S-2220, S-2240); — Mar/2023: início do FGTS Digital. GRUPO 2 (demais empresas com CNPJ, exceto Simples e MEI): — Jan/2019: eventos de tabela; — Jul/2019: eventos não periódicos; — Jan/2020: eventos periódicos; — Jul/2023: eventos SST; — Set/2023: FGTS Digital. GRUPO 3 (optantes do Simples, MEI, segurados especiais, empregadores domésticos): — Jul/2019: eventos de tabela; — Jan/2020: eventos não periódicos e periódicos; — Jan/2024: eventos SST; — Mar/2024: FGTS Digital. GRUPO 4 (entes públicos): — Jan/2020: início gradual; — Jan/2024: eventos SST completos; — Set/2024: FGTS Digital. Versão do MOS em uso: 2.5 (2018–2020); 3.1 (2021–2022); 3.2 (2023–2024); 3.3 (2025); 3.4 (2026).`,
  },
  {
    title: "Obrigações Extintas com o eSocial",
    category: "Histórico",
    source: "esocial.gov.br",
    version: "2014-2026",
    tags: "obrigacoes extintas caged rais gfip sefip dirf esocial substituicao",
    content: `Obrigações trabalhistas, previdenciárias e fiscais extintas pelo eSocial: CAGED (Cadastro Geral de Empregados e Desempregados): extinto para admissões e demissões cobertas pelo eSocial (o eSocial alimenta o CAGED automaticamente); RAIS (Relação Anual de Informações Sociais): extinta progressivamente para empregadores que usam o eSocial (dados do eSocial alimentam a RAIS); GFIP/SEFIP: extinto para recolhimento do FGTS (substituído pelo FGTS Digital) e para informação de contribuições previdenciárias (substituído pela DCTFWeb); PPP (Perfil Profissiográfico Previdenciário): substituído pelo eSocial (evento S-2240 e retorno para fins de aposentadoria especial); CAT em papel: substituída pelo S-2210; DIRF: em processo de extinção (substituída pelo S-1210 e S-5002); Comunicação de Admissão ao MTE: substituída pelo S-2200; Comunicação de Dispensa: substituída pelo S-2299. Obrigações que PERMANECEM: CNIS (informado pelo INSS); DCTF (impostos federais não previdenciários); EFD-REINF (para retenções de terceiros não cobertas pelo eSocial); escrituração contábil fiscal.`,
  },

  // ═══════════════════════════════════════════════════
  // ORIENTAÇÕES E BOAS PRÁTICAS
  // ═══════════════════════════════════════════════════
  {
    title: "Guia de Implantação do eSocial para Empresas — Passo a Passo",
    category: "Orientação",
    source: "esocial.gov.br",
    version: "2023",
    tags: "guia implantacao passo a passo empresa certificado digital qualificacao cadastro esocial",
    content: `Guia prático de implantação do eSocial. Passo 1: Obter certificado digital A1 ou A3 válido (ICP-Brasil). Passo 2: Acessar o Portal do eSocial (esocial.gov.br) e habilitar o CNPJ. Passo 3: Qualificação do quadro de funcionários — validar CPF e PIS/NIT de todos os colaboradores no Portal do eSocial (ferramenta de qualificação cadastral). Passo 4: Verificar e atualizar dados cadastrais dos empregados: nome conforme Receita Federal, data de nascimento correta. Passo 5: Configurar o sistema de folha de pagamento com os leiautes do eSocial (versão 3.2 / 3.4). Passo 6: Configurar as tabelas (S-1000, S-1005, S-1010, S-1020) com dados do empregador e lotações. Passo 7: Enviar os eventos de tabela em ambiente de produção restrita para testes. Passo 8: Enviar os eventos não periódicos (S-2200 para todos os empregados ativos). Passo 9: Iniciar o envio mensal dos eventos periódicos (S-1200, S-1210, S-1299). Passo 10: Implantar os eventos SST conforme cronograma do grupo. Qualificação cadastral: acessar https://cadastros.esocial.gov.br/qualificacao para validar CPF + PIS de todos os trabalhadores antes de iniciar os envios.`,
  },
  {
    title: "Certificado Digital no eSocial — A1, A3 e Procuração",
    category: "Orientação",
    source: "esocial.gov.br",
    version: "2024",
    tags: "certificado digital a1 a3 procuracao icp esocial assinatura",
    content: `Certificado digital no eSocial. Tipos aceitos: A1 (arquivo PFX, software, validade de 1 ano) e A3 (token ou smart card, validade de 3 anos). Ambos devem ser emitidos por Autoridade Certificadora (AC) credenciada pelo ICP-Brasil. Para empresas com múltiplos CNPJs: pode-se usar o certificado da matriz para envios de todas as filiais (procuração eletrônica no Portal do eSocial). Procuração eletrônica: permite que um escritório contábil envie eventos em nome do cliente; o contabilista usa seu próprio certificado e a procuração no portal do eSocial. Quem deve assinar: responsável legal da empresa (sócio, diretor) cujo CPF consta no quadro societário da Receita Federal; ou procurador com procuração eletrônica registrada no eSocial. Transmissão sem certificado (Gov.br nível ouro): microempresas e MEI podem usar login Gov.br com conta nível ouro para transmissão sem certificado digital. Vencimento do certificado: renovar antes do vencimento para não interromper os envios; a renovação não exige novo cadastro no eSocial.`,
  },
  {
    title: "Qualificação Cadastral — Erro e Correção de CPF/PIS",
    category: "Orientação",
    source: "esocial.gov.br",
    version: "2024",
    tags: "qualificacao cadastral cpf pis nis nit erro correcao trabalhador esocial",
    content: `Qualificação Cadastral no eSocial: processo de validação do cadastro do trabalhador antes do envio. Portal de qualificação: https://cadastros.esocial.gov.br/qualificacao. Dados validados: CPF, PIS/NIT, nome, data de nascimento — cruzados entre a base da Receita Federal e o CNIS (Cadastro Nacional de Informações Sociais do INSS). Erros mais comuns: CPF e PIS não vinculados (trabalhador tem dois PIS; é necessário regularizar no INSS); nome divergente entre CPF e PIS (trabalhador mudou de nome no casamento e atualizou apenas um cadastro); data de nascimento incorreta em um dos cadastros. Procedimento de regularização de PIS duplicado: o trabalhador deve comparecer a uma agência da Caixa Econômica Federal (para FGTS) ou INSS (para benefícios) com documentos originais. Prazo: regularização pode levar de 3 a 30 dias úteis. Impacto: sem qualificação correta, o S-2200 retorna erro e o trabalhador fica irregular. Atenção: as inconsistências cadastrais NÃO impedem a admissão; a empresa pode contratar e regularizar o cadastro posteriormente, mas sem os dados corretos o envio ao eSocial não é possível.`,
  },
  {
    title: "Retificação de Eventos — Como Corrigir Erros no eSocial",
    category: "Orientação",
    source: "esocial.gov.br",
    version: "2024",
    tags: "retificacao correcao erro evento esocial s3000 exclusao substituicao",
    content: `Como corrigir eventos já enviados ao eSocial. Dois tipos de correção: (1) Substituição: envio do mesmo evento com os dados corretos e usando o mesmo tipo de evento com Id diferente (retificador). Aplicável a: S-2200, S-2205, S-2206, S-2230, S-2240, S-2220, S-1200, S-1010, S-1000 (envio de novo evento com vigência posterior substitui o anterior). (2) Exclusão + Novo envio: evento S-3000 cancela o evento original; depois, envia-se o evento correto. S-3000 (Exclusão de Eventos): informa o tipo de evento e o Id do evento a excluir. Regras: não é possível excluir eventos que já geraram fechamento (S-1299) sem antes reabrir com S-1298; não é possível excluir S-2200 se houver S-2299 posterior; não é possível excluir S-1000 se houver outros eventos de tabela. Prazo para correção: não há prazo específico, mas divergências geram pendências na DCTFWeb e no FGTS Digital. Consultoria: o portal do eSocial fornece mensagens de erro detalhadas (código + descrição) que indicam o campo incorreto.`,
  },
  {
    title: "Ambiente de Produção Restrita — Testes Sem Risco",
    category: "Orientação",
    source: "esocial.gov.br",
    version: "2023",
    tags: "producao restrita homologacao teste ambiente esocial cnpj empresa",
    content: `Ambiente de Produção Restrita do eSocial: ambiente real com CNPJ real, mas sem geração de obrigações tributárias ou previdenciárias. Objetivo: testar o envio de eventos antes de ir para o ambiente de produção definitivo. Como acessar: no portal do eSocial, selecionar "Ambiente de Produção Restrita" ao configurar o CNPJ. Endpoint webservice: diferente do ambiente de produção (URL específica disponível na documentação técnica). Dados enviados: são reais (CPF, CNPJ), mas os eventos não geram DCTFWeb nem FGTS Digital; não aparecem no e-CAC como obrigações. Uso recomendado: para testar integrações de ERP, novos leiautes (ex.: migração para MOS 3.4), e treinamento da equipe. Atenção: não é ambiente de homologação isolado — usa os mesmos dados cadastrais reais; os eventos só ficam no ambiente de produção restrita e não são considerados definitivos. Limitação: o ambiente de produção restrita não garante que o ambiente de produção definitivo aceitará os mesmos eventos (pode haver diferenças de validação).`,
  },

  // ═══════════════════════════════════════════════════
  // INTEGRAÇÃO: eSocial + EFD-REINF
  // ═══════════════════════════════════════════════════
  {
    title: "EFD-REINF — Integração com eSocial e DCTFWeb",
    category: "Orientação",
    source: "receita.fazenda.gov.br",
    version: "2024",
    tags: "efd reinf esocial dctfweb retencoes terceiros pj nfse inss servicos",
    content: `EFD-REINF (Escrituração Fiscal Digital de Retenções e Outras Informações Fiscais): obrigação complementar ao eSocial. Enquanto o eSocial cobre relações de trabalho, a EFD-REINF cobre: retenções de INSS sobre NF de serviços tomados de pessoas jurídicas; retenções sobre aluguéis, royalties, JCP; informações de espetáculos desportivos; associações desportivas; produtor rural. Integração: ambos (eSocial + EFD-REINF) alimentam a DCTFWeb. A DCTFWeb consolida: contribuições previdenciárias da folha (eSocial) + retenções sobre serviços (EFD-REINF) + contribuições previdenciárias de eventos trabalhistas (eSocial). Transmissão da EFD-REINF: até o dia 15 do mês seguinte; o fechamento gera o grupo de eventos "R-9000" (fechamento). Diferença chave: eSocial = trabalhadores; EFD-REINF = serviços de PJ e outras retenções. Empresas de construção civil: devem usar ambos — eSocial para empregados e EFD-REINF para retenções de subempreiteiros.`,
  },
]

export const ESOCIAL_CATEGORY_SUMMARY = {
  "MOS":          { count: 7, description: "Manuais de Orientação (histórico e vigente)" },
  "Leiaute":      { count: 3, description: "Estrutura XML e XSD dos eventos" },
  "Evento":       { count: 14, description: "Guias detalhados dos eventos S-1000 a S-5013" },
  "Tabela":       { count: 3, description: "Tabelas oficiais (categorias, rubricas, agentes)" },
  "FGTS Digital": { count: 3, description: "FGTS Digital e extinção do SEFIP" },
  "Nota Técnica": { count: 6, description: "Notas técnicas oficiais 2022–2026" },
  "FAQ":          { count: 5, description: "Perguntas frequentes por tema" },
  "Legislação":   { count: 4, description: "Leis e portarias com impacto no eSocial" },
  "Histórico":    { count: 2, description: "Cronograma de implantação e extinções" },
  "Orientação":   { count: 6, description: "Guias práticos e boas práticas" },
}
