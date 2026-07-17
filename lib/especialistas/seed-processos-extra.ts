// Documentos adicionais — Processos
import type { SeedDoc } from "./seed-data"

export const PROCESSOS_EXTRA_DOCS: SeedDoc[] = [
  {
    title: "BPMN 2.0 — Notação para Modelagem de Processos de Negócio",
    category: "metodologia",
    source: "OMG — Object Management Group; BPMN 2.0 Specification",
    version: "2025",
    tags: "bpmn,notacao,processo,negocio,eventos,atividades,gateways,pools,lanes,fluxo,modelagem,diagrama",
    content: `BPMN 2.0 — BUSINESS PROCESS MODEL AND NOTATION

PADRÃO: OMG (Object Management Group) — BPMN 2.0 (2011, referência até 2025)

O QUE É
BPMN é a notação padrão internacional para modelagem de processos de negócio. Permite comunicar processos de forma visual e padronizada entre áreas, TI e gestão.

ELEMENTOS PRINCIPAIS

EVENTOS (círculos)
- Evento de INÍCIO: círculo simples com borda fina → inicia o fluxo
- Evento INTERMEDIÁRIO: círculo duplo → ocorre durante o processo
- Evento de FIM: círculo com borda espessa → encerra o fluxo
- Tipos: temporizado (relógio), mensagem (envelope), erro (raio), sinal, etc.

ATIVIDADES (retângulos com cantos arredondados)
- TAREFA: atividade atômica (não subdividida no diagrama)
  Tipos: Manual, Usuário, Serviço, Script, Regra de Negócio
- SUB-PROCESSO: atividade com "+" que pode ser expandida (tem seu próprio fluxo)
- CHAMADA DE ATIVIDADE (Call Activity): reutiliza sub-processo externo

GATEWAYS (losangos)
- EXCLUSIVO (XOR — X): apenas um caminho é tomado
- PARALELO (AND — +): todos os caminhos são tomados simultaneamente
- INCLUSIVO (OR — O): um ou mais caminhos podem ser tomados
- BASEADO EM EVENTO: próxima ação depende de qual evento ocorrer primeiro

ARTEFATOS
- ANOTAÇÃO: comentários no diagrama
- GRUPO: agrupamento visual de atividades relacionadas
- DADO: representação de documentos/informações

PISCINAS (POOLS) E RAIAS (LANES)
- POOL: representa um participante (empresa, sistema, pessoa)
- LANE: divisão do pool (departamento, papel)
- Fluxo entre pools: MENSAGEM (linha tracejada com seta)
- Fluxo dentro do pool: SEQUÊNCIA (linha sólida com seta)

BOAS PRÁTICAS
- Nomear atividades com verbo + objeto ("Aprovar relatório", "Enviar e-mail")
- Usar swimlanes para mostrar responsabilidades
- Manter diagrama em 1-2 páginas (sub-processos para detalhar)
- Validar o diagrama com quem executa o processo

FERRAMENTAS GRATUITAS
- draw.io / diagrams.net (online, gratuito)
- Camunda Modeler (integra com motor de processo)
- Bizagi Modeler (free para modelagem)

FONTES: OMG BPMN 2.0 Specification; Object Management Group; BPMOffice`,
  },
  {
    title: "Mapeamento de Processos — AS-IS, TO-BE e Gap Analysis",
    category: "metodologia",
    source: "ABPMP CBOK; BPM — Gestão de Processos de Negócio",
    version: "2025",
    tags: "mapeamento,processo,asis,tobe,gap,analysis,fluxo,atual,futuro,melhoria,oportunidade,redesenho",
    content: `MAPEAMENTO AS-IS / TO-BE — METODOLOGIA

CONCEITO
O mapeamento de processos é a técnica de documentar como um processo funciona (AS-IS) e como ele deveria funcionar após melhoria (TO-BE), identificando o gap entre os dois estados.

ETAPAS DO MAPEAMENTO

1. ESCOPO E PLANEJAMENTO
- Definir o processo a ser mapeado (início e fim claros)
- Identificar os stakeholders (donos do processo, executores, clientes internos)
- Formar grupo de trabalho interdisciplinar

2. COLETA DE INFORMAÇÕES (AS-IS)
Técnicas:
- Entrevistas com executores (o que você faz, quem decide, o que acontece quando X)
- Observação in loco
- Análise de documentos, formulários, sistemas
- Workshop de processo (grupo validando juntos)

3. MODELAGEM DO AS-IS
- Desenhar o fluxo atual em BPMN ou fluxograma
- Incluir: responsáveis, tempos, volumes, sistemas
- Validar com quem executa (evitar o "como deveria ser")

4. ANÁLISE DE PROBLEMAS (GAP ANALYSIS)
Identificar no fluxo AS-IS:
- Gargalos (onde o processo para / demora)
- Retrabalhos (atividades executadas mais de uma vez)
- Atividades sem valor agregado (burocracia, aprovações desnecessárias)
- Falhas de comunicação entre áreas
- Desperdícios (MUDA — Lean)

5. MODELAGEM DO TO-BE
- Redesenhar o processo eliminando desperdícios
- Automatizar atividades repetitivas
- Redistribuir responsabilidades
- Simplificar aprovações e controles

6. PLANO DE IMPLEMENTAÇÃO
- Priorização das melhorias (impacto × esforço)
- Cronograma de implantação
- Responsáveis e recursos
- Indicadores de sucesso (KPIs)

MÉTRICAS DE MAPEAMENTO
- Lead Time: tempo total do início ao fim do processo
- Cycle Time: tempo de trabalho efetivo (sem esperas)
- Flow Efficiency: Cycle Time ÷ Lead Time (meta: > 25%)

FONTES: ABPMP CBOK v4; Lean Thinking — Womack; BPM Handbook — Dumas`,
  },
  {
    title: "SIPOC — Ferramenta de Definição de Escopo de Processo",
    category: "metodologia",
    source: "Six Sigma — DMAIC; ABPMP; ASQ",
    version: "2025",
    tags: "sipoc,fornecedores,entradas,processo,saidas,clientes,escopo,mapa,alto,nivel,define,sigma",
    content: `SIPOC — MAPA DE ALTO NÍVEL DO PROCESSO

ACRONIMO
S — Suppliers (Fornecedores)
I — Inputs (Entradas)
P — Process (Processo — etapas principais)
O — Outputs (Saídas)
C — Customers (Clientes — internos ou externos)

OBJETIVO
O SIPOC fornece uma visão macro do processo, definindo seu escopo sem entrar em detalhes. É usado no início de projetos de melhoria (fase Define do DMAIC) para alinhar o entendimento da equipe.

COMO CONSTRUIR UM SIPOC

1. CUSTOMERS (Clientes)
Quem recebe o output do processo? (interno ou externo)
→ Área de vendas, cliente final, outro departamento

2. OUTPUTS (Saídas)
O que o processo entrega para o cliente?
→ Relatório, produto, serviço, aprovação, dado

3. PROCESS (Processo — 4 a 7 etapas)
Quais são os passos principais?
→ Usar verbos de ação: Receber, Analisar, Aprovar, Enviar

4. INPUTS (Entradas)
O que é necessário para o processo funcionar?
→ Formulários, dados, materiais, informações, aprovações

5. SUPPLIERS (Fornecedores)
Quem fornece as entradas?
→ Área de compras, cliente (dados), sistema, parceiro externo

EXEMPLO — PROCESSO DE CONTAS A PAGAR

| S           | I               | P                  | O             | C         |
|-------------|----------------|--------------------|---------------|-----------|
| Fornecedor  | Nota fiscal    | 1. Receber NF      | Pagamento     | Fornecedor|
| TI          | Ordem de compra| 2. Conferir NF     | Comprovante   | Contabilidade|
| Compras     | Aprovação gestor| 3. Aprovar         | Relatório     | Auditoria |
|             |                | 4. Programar pgto  |               |           |
|             |                | 5. Executar pgto   |               |           |

QUANDO USAR
- Início de projetos Lean / Six Sigma / BPM
- Alinhamento de equipe interdisciplinar
- Definição de escopo antes de mapeamento detalhado

FONTES: ASQ (American Society for Quality); DMAIC Toolkit; Pyzdek — The Six Sigma Handbook`,
  },
  {
    title: "Value Stream Mapping — Mapeamento do Fluxo de Valor (Lean)",
    category: "metodologia",
    source: "Lean Thinking — Womack; Learning to See — Rother e Shook",
    version: "2025",
    tags: "vsm,value,stream,mapping,fluxo,valor,desperdicio,muda,tempo,agregado,lead,time,takt,time,kaizen",
    content: `VALUE STREAM MAPPING (VSM) — MAPEAMENTO DO FLUXO DE VALOR

BASE: Lean Manufacturing — Toyota Production System; "Learning to See" — Rother & Shook (1999)

O QUE É
O VSM é uma ferramenta Lean que mapeia o fluxo de materiais e informações desde o fornecedor até o cliente, identificando desperdícios e oportunidades de melhoria.

DIFERENÇA DO MAPEAMENTO BPMN
- BPMN: foca no fluxo de atividades e responsabilidades
- VSM: foca no fluxo de valor (tempo, estoque, espera, agregação de valor)

ÍCONES VSM
- Caixa de processo: atividade com dados de desempenho (tempo de ciclo, % retrabalho, turno)
- Triângulo de estoque: estoque entre processos
- Seta push: produção empurrada (produz sem pedido)
- Seta pull: produção puxada (produz conforme demanda — Kanban)
- Relâmpago (kaizen burst): oportunidade de melhoria identificada
- Caixa de dados: indica indicadores de cada processo

DADOS COLETADOS POR PROCESSO
- CT (Cycle Time / Tempo de Ciclo): tempo para completar uma unidade
- C/O (Changeover Time): tempo de setup entre produtos
- Uptime: % de disponibilidade do equipamento
- Nº operadores
- Turno(s) de trabalho

TAKT TIME
Takt = Tempo disponível de produção ÷ Demanda do cliente
→ Define o ritmo necessário para atender o cliente sem excesso ou falta.

ANÁLISE DO VSM
- Value-Added Time (VA): tempo em que o produto é efetivamente transformado
- Non-Value-Added Time (NVA): esperas, transportes, inspeções, retrabalho
- Flow Efficiency = VA ÷ (VA + NVA) — geralmente 2-10% em processos não-otimizados; meta: 30%+

MAPA FUTURO (TO-BE VSM)
- Implementar fluxo contínuo (eliminar estoques intermediários)
- Puxar a produção pelo cliente (Kanban / FIFO)
- Nivelar a produção (Heijunka)
- Identificar processo pacemaker (processo que dita o ritmo de toda a cadeia)

FONTES: Womack & Jones — Lean Thinking; Rother & Shook — Learning to See; LEI (Lean Enterprise Institute)`,
  },
  {
    title: "5S — Implementação e Sustentação do Programa de Organização",
    category: "metodologia",
    source: "Toyota Production System; Osada Takashi — The 5 S's; SEBRAE",
    version: "2025",
    tags: "5s,seiri,seiton,seiso,seiketsu,shitsuke,organizacao,limpeza,padronizacao,disciplina,implementacao,auditorias",
    content: `5S — PROGRAMA DE ORGANIZAÇÃO E DISCIPLINA

ORIGEM: Toyota Production System, Japão (décadas de 1950-60)

OS 5 SENSOS (5S)

1. SEIRI — SENSO DE UTILIZAÇÃO (Separar o necessário do desnecessário)
- Identificar e remover do ambiente tudo que não é necessário
- Método: etiqueta vermelha para itens questionáveis → definir destino (descarte, doação, realocação)
- Resultado: apenas o necessário permanece no posto de trabalho

2. SEITON — SENSO DE ORGANIZAÇÃO (Um lugar para cada coisa, cada coisa em seu lugar)
- Organizar os itens necessários de forma acessível e identificada
- Definir local fixo para cada item, com identificação visual (etiquetas, demarcações)
- Critério: frequência de uso → mais usados mais próximos

3. SEISO — SENSO DE LIMPEZA (Limpar e inspecionar)
- Limpar o local de trabalho + eliminar fontes de sujeira
- Cada colaborador é responsável por limpar sua área
- Limpeza como inspeção: detectar vazamentos, defeitos, desgastes

4. SEIKETSU — SENSO DE PADRONIZAÇÃO (Manter os 3 primeiros S's)
- Criar padrões visuais para manter o resultado dos 3S anteriores
- Gestão visual: cores, fotos, quadros, demarcações
- Procedimentos de organização e limpeza documentados

5. SHITSUKE — SENSO DE DISCIPLINA (Sustentar o que foi conquistado)
- Criar rotina de auditorias do 5S (semanal/mensal)
- Treinamento contínuo
- Cultura de manutenção dos padrões — não depende de supervisão

PLANO DE IMPLEMENTAÇÃO 5S

Semana 1-2: Treinamento da equipe
Semana 3: Grande dia do Seiri (descarte em toda a área)
Semana 4: Seiton (organização e identificação)
Semana 5: Seiso (limpeza profunda)
Semana 6: Seiketsu (padronização — fotos do estado ideal)
Mês 2+: Shitsuke — auditorias regulares com pontuação

AUDITORIA 5S
Checklist com itens por S, pontuação 0-4 por item, meta mínima definida.
Resultado publicado (quadro de avisos ou digital) para visibilidade.

FONTES: Osada Takashi — The 5 S's; SEBRAE 5S; Lean Institute Brasil`,
  },
  {
    title: "Kanban — Sistema de Gestão Visual do Fluxo de Trabalho",
    category: "metodologia",
    source: "David Anderson — Kanban: Successful Evolutionary Change; Toyota Kanban System",
    version: "2025",
    tags: "kanban,quadro,wip,limite,trabalho,em,andamento,pull,sistema,fluxo,cartao,coluna,lean,agil",
    content: `KANBAN — GESTÃO VISUAL DO FLUXO

ORIGEM: Toyota Production System (Taiichi Ohno). Adaptado para trabalho do conhecimento por David Anderson (2010).

PRINCÍPIOS DO KANBAN (Anderson)
1. Comece pelo que você faz agora
2. Aceite mudanças evolutivas e incrementais
3. Respeite os papéis e responsabilidades atuais
4. Encoraje atos de liderança em todos os níveis

PRÁTICAS CENTRAIS
1. Visualizar o fluxo de trabalho (quadro Kanban)
2. Limitar o WIP (Work In Progress — Trabalho em Andamento)
3. Gerenciar o fluxo
4. Tornar políticas explícitas
5. Implementar loops de feedback
6. Melhorar colaborativamente (Kaizen)

QUADRO KANBAN
Colunas básicas: A Fazer | Em Andamento | Concluído
Colunas avançadas: Backlog | Análise | Desenvolvimento | Teste | Entrega | Concluído

LIMITE DE WIP (Work In Progress Limit)
Regra mais importante do Kanban: limitar quantos itens podem estar em andamento simultaneamente em cada coluna.
→ Por quê? Reduz o tempo de entrega, elimina multitarefa, revela gargalos.
→ Como definir: número de pessoas na etapa × 1,5 (regra prática)

CARTÃO KANBAN
Cada trabalho é representado por um cartão com:
- Título da tarefa
- Responsável
- Prazo
- Prioridade (cor ou etiqueta)
- Tipo de trabalho (urgente, padrão, expedição)

MÉTRICAS KANBAN
- Lead Time: do pedido à entrega
- Cycle Time: de quando iniciou ao término
- Throughput: itens entregues por semana
- CFD (Cumulative Flow Diagram): visualiza fluxo ao longo do tempo

FERRAMENTAS DIGITAIS
- Trello (gratuito — simples)
- Jira (complexo — desenvolvimento de software)
- Azure DevOps
- Monday.com
- Asana

FONTES: Anderson — Kanban: Successful Evolutionary Change; Ohno — Toyota Production System; LKU (Lean Kanban University)`,
  },
  {
    title: "Six Sigma DMAIC — Metodologia de Melhoria de Processos",
    category: "metodologia",
    source: "ASQ (American Society for Quality); Pyzdek — The Six Sigma Handbook; GE Six Sigma",
    version: "2025",
    tags: "six,sigma,dmaic,definos,medir,analisar,melhorar,controlar,estatistica,dpmo,belt,projeto,qualidade",
    content: `SIX SIGMA — DMAIC

O QUE É SIX SIGMA
Metodologia orientada a dados para eliminação de defeitos e redução de variabilidade em processos. Meta: 3,4 DPMO (Defeitos Por Milhão de Oportunidades).

ESTRUTURA DE BELTS
- Yellow Belt: conhecimento básico — suporte a projetos
- Green Belt: projetos de menor escopo — dedicação parcial
- Black Belt: projetos complexos — dedicação exclusiva
- Master Black Belt: mentoria e liderança do programa

CICLO DMAIC

D — DEFINE (Definir)
- Project Charter (escopo, objetivo, cronograma, equipe)
- Voz do Cliente (VOC) → requisitos críticos para qualidade (CTQ)
- Mapeamento SIPOC
- Definição de Y (métrica do projeto) e meta

M — MEASURE (Medir)
- Plano de coleta de dados (O quê? Quem? Quando? Onde?)
- MSA — Measurement System Analysis (validade da medição)
- Baseline do processo: capacidade atual (Cp, Cpk, sigma)
- Data collection sheet

A — ANALYZE (Analisar)
- Identificar causas-raiz do problema
- Ferramentas: Ishikawa, Pareto, correlação, regressão, análise de variância (ANOVA)
- Validar hipóteses com dados

I — IMPROVE (Melhorar)
- Gerar soluções criativas (brainstorming, benchmarking)
- Priorizar soluções: impacto × esforço (matriz RICE ou PICK)
- Projeto piloto
- Quantificar ganhos (financeiro + qualidade)

C — CONTROL (Controlar)
- Plano de controle (Control Plan)
- SPC — Controle Estatístico de Processo (cartas de controle)
- Procedimentos atualizados
- Monitoramento de indicadores pós-melhoria
- Passagem para o dono do processo

INDICADORES-CHAVE
- DPMO: (Defeitos ÷ (Unidades × Oportunidades)) × 1.000.000
- Nível Sigma = (função inversa da normal para 1 - DPMO/1.000.000) + 1,5
- Cp / Cpk: capacidade do processo vs. especificação

FONTES: Pyzdek & Keller — The Six Sigma Handbook; ASQ; GE Six Sigma Toolkit`,
  },
  {
    title: "FMEA — Análise de Modos e Efeitos de Falhas",
    category: "metodologia",
    source: "AIAG-VDA FMEA Manual (2019); ASQ; ABNT NBR 5462",
    version: "2025",
    tags: "fmea,falha,modo,efeito,analise,npR,ocorrencia,severidade,deteccao,risco,acao,preventiva,produto,processo",
    content: `FMEA — ANÁLISE DE MODOS E EFEITOS DE FALHAS

PADRÃO: AIAG-VDA FMEA Manual 1ª edição (2019); ISO/TR 14001

OBJETIVO
Identificar proativamente modos potenciais de falha em produtos ou processos, avaliar seus efeitos e riscos, e priorizar ações preventivas antes da ocorrência.

TIPOS DE FMEA
- DFMEA (Design): avalia falhas no projeto do produto
- PFMEA (Process): avalia falhas no processo de fabricação/prestação de serviço
- SFMEA (System): analisa interações entre subsistemas

ESTRUTURA DA FMEA (AIAG-VDA 2019 — 7 etapas)
1. Planejamento e Preparação
2. Análise da Estrutura (estrutura do sistema)
3. Análise de Função (o que deve fazer)
4. Análise de Falha (o que pode dar errado)
5. Análise de Risco (probabilidade e impacto)
6. Otimização (ações de melhoria)
7. Documentação de Resultados

ÍNDICES DE AVALIAÇÃO (escala 1-10)
S — SEVERIDADE: quão grave é o efeito da falha para o cliente?
O — OCORRÊNCIA: com que frequência a causa de falha ocorre?
D — DETECÇÃO: quão bem os controles atuais detectam a falha antes de chegar ao cliente?

NPR — NÚMERO DE PRIORIDADE DE RISCO (modelo clássico — pré 2019)
NPR = S × O × D
→ Prioridade alta: NPR > 100 (ou conforme limiar definido)

AP — PRIORITY (AIAG-VDA 2019 — substitui NPR)
A nova abordagem não usa NPR, mas classifica as combinações S/O/D em:
- Alta Prioridade (H): ação obrigatória
- Média Prioridade (M): recomenda ações
- Baixa Prioridade (L): monitoramento

PLANO DE AÇÃO (Otimização)
Para cada item de alta/média prioridade:
- Ação preventiva (eliminar a causa)
- Ação de detecção (melhorar a identificação antes da ocorrência)
- Responsável e prazo

FONTES: AIAG-VDA FMEA Handbook (2019); ASQ; ABNT NBR 5462; Ford/GM/Chrysler FMEA Reference Manuals`,
  },
  {
    title: "Indicadores de Processo — KPIs, Monitoramento e Melhoria Contínua",
    category: "metodologia",
    source: "BSC — Balanced Scorecard; Norton & Kaplan; ABPMP CBOK",
    version: "2025",
    tags: "kpi,indicador,processo,meta,baseline,monitoramento,tendencia,frequencia,responsavel,painel,desempenho",
    content: `INDICADORES DE PROCESSO — KPIs E MONITORAMENTO

O QUE É UM KPI
KPI (Key Performance Indicator) é uma métrica que mede o desempenho de um processo em relação a uma meta estratégica ou operacional.

HIERARQUIA DE INDICADORES
- ESTRATÉGICOS (KGIs): medem resultado do negócio (ex.: receita, NPS, market share)
- TÁTICOS: medem resultado de processos departamentais (ex.: prazo de entrega, índice de retrabalho)
- OPERACIONAIS: medem atividades específicas (ex.: nº de pedidos processados por hora)

ATRIBUTOS DE UM BOM KPI (SMART aplicado a indicadores)
- Específico: mede algo concreto e mensurável
- Mensurável: tem fórmula clara e fonte de dados
- Atingível: meta realista dado o contexto
- Relevante: impacta decisões e resultado
- Temporal: frequência de medição definida

ESTRUTURA DE DOCUMENTAÇÃO DO KPI
| Atributo       | Conteúdo                                          |
|----------------|---------------------------------------------------|
| Nome           | Taxa de Entrega no Prazo                         |
| Fórmula        | (Pedidos entregues no prazo ÷ Total pedidos) × 100|
| Meta           | ≥ 95%                                            |
| Frequência     | Semanal                                          |
| Responsável    | Gerente de Logística                             |
| Fonte de dados | Sistema ERP — Módulo Logística                   |
| Baseline       | 88% (Dez/2024)                                   |

TIPOS DE INDICADORES POR NATUREZA
- LAGGING (resultado): medem o que já aconteceu (receita, qualidade, entrega)
- LEADING (direcionadores): preveem o que vai acontecer (leads gerados, satisfação prévia)

CICLO DE MONITORAMENTO (PDCA aplicado a KPIs)
P — Definir KPIs e metas
D — Coletar dados e medir
C — Analisar resultados vs. meta
A — Tomar ações corretivas ou de melhoria

DASHBOARD DE INDICADORES
- Atualização em tempo real (quando possível)
- Semáforo (verde/amarelo/vermelho): facilita visualização
- Tendência (gráfico de linha): mostra evolução
- Variação vs. meta: sinal de alerta imediato

FONTES: Kaplan & Norton — Balanced Scorecard; ABPMP CBOK; SEBRAE Indicadores`,
  },
  {
    title: "Automação RPA — Robotic Process Automation em Processos Administrativos",
    category: "metodologia",
    source: "UiPath; Automation Anywhere; Blue Prism; Gartner RPA Market Guide",
    version: "2025",
    tags: "rpa,automacao,robo,processo,uipath,power,automate,automatizar,tarefas,repetitivas,roi,bot,integracao",
    content: `RPA — ROBOTIC PROCESS AUTOMATION

DEFINIÇÃO
RPA é a tecnologia que permite configurar software ("robô") para imitar a interação humana com sistemas digitais, executando tarefas repetitivas e baseadas em regras.

QUANDO RPA É INDICADO — CRITÉRIOS
✅ Processo repetitivo e com alto volume
✅ Regras claras e estáveis (poucos julgamentos)
✅ Baseado em dados estruturados (formulários, planilhas, ERP)
✅ Múltiplos sistemas envolvidos (sem API de integração disponível)
❌ Processo que requer julgamento humano complexo
❌ Dados não-estruturados (imagens, texto livre, áudio)
❌ Processo instável (muda frequentemente)

CASOS DE USO COMUNS EM ADMINISTRATIVO/RH
- Extração de dados de NF fiscal → lançamento em ERP
- Geração e envio de holerites
- Conciliação bancária automatizada
- Onboarding digital (criação de usuários em múltiplos sistemas)
- Relatórios de compliance automáticos
- Triagem de e-mails e direcionamento para filas

ARQUITETURA RPA
- BOT ASSISTIDO (Attended): trabalha junto ao humano, na mesma máquina
- BOT NÃO-ASSISTIDO (Unattended): executa sozinho em servidores (24/7)
- ORQUESTRADOR: gerencia e monitora todos os bots

PRINCIPAIS FERRAMENTAS (2025)
- UiPath: líder de mercado, interface visual, suporte Python/AI
- Power Automate (Microsoft): integrado ao Office 365, acessível
- Automation Anywhere: foco enterprise com IA
- Blue Prism: foco enterprise e regulado

CÁLCULO DE ROI DO RPA
ROI = (Horas economizadas × Custo/hora × Meses) ÷ Custo total do RPA
→ Média mercado: ROI positivo em 6-12 meses

FONTES: Gartner RPA Market Guide 2024; UiPath Academy; Automation Anywhere University; Forrester Wave RPA`,
  },
  {
    title: "Gestão de Mudança — Modelo ADKAR e Implementação",
    category: "metodologia",
    source: "Prosci ADKAR; Kotter — 8 Steps; Bridges Transition Model",
    version: "2025",
    tags: "mudanca,adkar,prosci,awareness,desire,knowledge,ability,reinforcement,implementacao,resistencia,comunicacao",
    content: `GESTÃO DE MUDANÇA — MODELO ADKAR (PROSCI)

BASE: ADKAR — Prosci (Jeff Hiatt, 2006); aplicável a mudanças organizacionais de qualquer escala

POR QUE A MUDANÇA FALHA
70% das iniciativas de mudança falham (Kotter; McKinsey). Principal motivo: foco na mudança técnica sem gerenciar o lado humano.

MODELO ADKAR
Modelo sequencial — cada etapa é pré-requisito da seguinte.

A — AWARENESS (Consciência)
O colaborador entende por que a mudança é necessária?
→ Se não: comunicação sobre o porquê, urgência, impacto de não mudar

D — DESIRE (Desejo)
O colaborador quer participar da mudança?
→ Se não: engajamento, envolvimento, "what's in it for me" (WIIFM)

K — KNOWLEDGE (Conhecimento)
O colaborador sabe como mudar?
→ Se não: treinamento, instrução de trabalho, tutoriais, mentoria

A — ABILITY (Habilidade)
O colaborador consegue demonstrar a mudança na prática?
→ Se não: prática, coaching, remoção de barreiras (sistemas, processos, recursos)

R — REINFORCEMENT (Reforço)
A mudança é sustentada no tempo?
→ Se não: reconhecimento, monitoramento, correção de recaídas

PLANO DE GESTÃO DE MUDANÇA — ELEMENTOS
1. Análise de stakeholders (mapa de influência e impacto)
2. Plano de comunicação (mensagens por audiência, canal, frequência)
3. Plano de treinamento
4. Gestão de resistências
5. Monitoramento e feedback

RESISTÊNCIA À MUDANÇA — CAUSAS COMUNS
- Medo do desconhecido
- Perda de status ou controle
- Experiências negativas com mudanças passadas
- Falta de informação

FONTES: Jeff Hiatt — ADKAR; John Kotter — 8 Steps; William Bridges — Transition Model; Prosci Research`,
  },
  {
    title: "Matriz RACI — Definição de Papéis e Responsabilidades em Processos",
    category: "metodologia",
    source: "PMI PMBOK; ABPMP; Praktijkgids RACI",
    version: "2025",
    tags: "raci,matriz,responsavel,aprovador,consultado,informado,papeis,responsabilidades,processo,atividade,equipe",
    content: `MATRIZ RACI — RESPONSABILIDADES EM PROCESSOS

ACRONIMO
R — Responsible (Responsável): quem executa a atividade
A — Accountable (Aprovador): quem responde pelo resultado (um por atividade)
C — Consulted (Consultado): quem é consultado antes/durante
I — Informed (Informado): quem é notificado após a conclusão

REGRAS DA MATRIZ RACI
1. Cada atividade deve ter exatamente UM "A" (Accountable)
2. Cada atividade deve ter pelo menos UM "R"
3. O mesmo papel pode ser R e A na mesma atividade
4. Minimizar "C" (consultas geram espera e gargalo)
5. "I" é apenas notificação — sem necessidade de aprovação

VARIAÇÕES
- RASCI: adiciona S (Supportive — suporte adicional)
- RACI-VS: adiciona V (Verifier) e S (Signatory)

EXEMPLO — PROCESSO DE COMPRAS

| Atividade                  | Solicitante | Compras | Financeiro | Diretoria |
|----------------------------|-------------|---------|------------|-----------|
| Solicitar compra           | R/A         | I       | I          | —         |
| Avaliar fornecedores        | C           | R/A     | C          | I         |
| Aprovar cotação > R$10k    | C           | R       | C          | A         |
| Emitir pedido de compra     | I           | R/A     | C          | —         |
| Pagar fornecedor            | I           | I       | R/A        | I         |

QUANDO USAR
- Ao redesenhar um processo (eliminar ambiguidades)
- Em projetos com múltiplas áreas envolvidas
- Para documentar aprovações e fluxo de decisão
- No onboarding de novos colaboradores (quem aprova o quê)

ERROS COMUNS
- Muitos "A" por atividade: gera conflito de autoridade
- "A" ausente: ninguém responsabiliza
- Excesso de "C": processo torna-se lento
- Ignorar "I": gera ruído de comunicação

FONTES: PMI PMBOK v7; ABPMP CBOK; Hass — Stakeholder Management`,
  },
  {
    title: "Lean Office — Aplicação dos Princípios Lean em Processos Administrativos",
    category: "metodologia",
    source: "Lean Thinking — Womack; Don Tapping — Lean Office; Lean Institute Brasil",
    version: "2025",
    tags: "lean,office,administrativo,escritorio,desperdicio,muda,fluxo,valor,implementacao,kaizen,produtividade",
    content: `LEAN OFFICE — LEAN EM PROCESSOS ADMINISTRATIVOS

BASE: Lean Manufacturing adaptado para ambientes de escritório — Don Tapping (2003)

OS 8 DESPERDÍCIOS DO LEAN OFFICE (TIMWOODS)
T — Transportation (Transporte desnecessário de informações / documentos)
I — Inventory (Estoque de trabalho em andamento — e-mails não respondidos, relatórios pendentes)
M — Motion (Movimento desnecessário — busca de informações, deslocamentos)
W — Waiting (Espera por aprovações, respostas, sistemas lentos)
O — Overproduction (Produzir mais do que o necessário — relatórios não lidos, reuniões extras)
O — Overprocessing (Excesso de processamento — múltiplas aprovações, relatórios duplicados)
D — Defects (Retrabalho — erros em documentos, dados incorretos)
S — Skills (Subutilização de talentos — pessoas capacitadas em tarefas simples)

FERRAMENTAS LEAN OFFICE

5S DIGITAL
- Organizar pastas digitais
- Nomear arquivos com padrão (data + nome + versão)
- Limpar caixa de entrada regularmente

KAIZEN DE PROCESSO ADMINISTRATIVO
- Reunião de equipe (1-2h) para identificar e eliminar desperdícios
- Resultado imediato: mudança simples implementada no mesmo dia

FLUXO CONTÍNUO DE DOCUMENTOS
- Definir "fila única" para processamento
- FIFO (First In, First Out) para processar em ordem
- Limitar WIP de cada analista

GESTÃO A VISTA
- Quadro de gestão de tarefas (Kanban)
- Indicadores visíveis para toda a equipe
- Status de projetos e gargalos visíveis

REUNIÃO DIÁRIA (Daily Stand-up)
- 15 minutos em pé (sem cadeiras)
- O que fiz ontem? O que farei hoje? Algum impedimento?
- Foco em impedimentos — não em relatório de atividades

GANHOS TÍPICOS
- Redução de lead time: 30-60%
- Redução de retrabalho: 20-40%
- Aumento de produtividade: 15-25%

FONTES: Don Tapping — Lean Office; Lean Institute Brasil; Womack — Lean Thinking; Kaizen Institute`,
  },
  {
    title: "OKRs — Objectives and Key Results — Implementação e Boas Práticas",
    category: "metodologia",
    source: "John Doerr — Measure What Matters; Google OKR; Christina Wodtke",
    version: "2025",
    tags: "okr,objetivos,resultados,chave,quarterly,trimestral,check,in,alinhamento,cascata,autonomia,engajamento",
    content: `OKRs — OBJECTIVES AND KEY RESULTS

ORIGEM: Andy Grove (Intel), popularizado por John Doerr (Google).

O QUE SÃO OKRs
Ferramenta de definição de metas que combina objetivos qualitativos (inspiradores) com resultados-chave mensuráveis (verificáveis).

ESTRUTURA DOS OKRs

OBJECTIVE (Objetivo)
- Qualitativo, inspirador, memorável
- Responde: "Para onde quero ir?"
- Deve motivar e dar direção
- Ex.: "Ser a empresa referência em atendimento ao cliente no setor"

KEY RESULTS (Resultados-Chave)
- 2-5 por objetivo
- Quantitativos e verificáveis (0-100% de conclusão)
- Responde: "Como saberei que cheguei?"
- Ex.:
  → Aumentar NPS de 42 para 65 até 31/12
  → Reduzir tempo médio de resolução de chamados de 48h para 12h
  → Atingir 95% de satisfação nas pesquisas pós-atendimento

CARACTERÍSTICAS DO BOM OKR
- Ambicioso (não trivialmente atingível — meta 70% é considerada boa)
- Limitado em quantidade (3-5 objetivos por nível, máx. 5 KRs por objetivo)
- Transparente (todos veem os OKRs de todos)
- Não vinculado a bônus (separação de OKRs e compensação evita comportamento defensivo)

CADÊNCIA RECOMENDADA
- Horizonte: trimestral (3 meses)
- Check-in semanal: 15 min por equipe — progresso, bloqueios, ajustes
- Review no final: nota de 0 a 1 para cada KR + retrospectiva

ALINHAMENTO (CASCADE OU AUTONOMIA?)
- Cascade: OKRs da empresa → gerência → equipe → individual (top-down)
- Autonomia: empresa define objetivos; equipes criam seus próprios KRs alinhados (Google usa 60% bottom-up)

ERROS COMUNS
- Criar KRs que são apenas tarefas (devem ser resultados, não atividades)
- Ter OKRs demais (acima de 5 objetivos = foco zero)
- Marcar 100% todo trimestre (indica metas fáceis)
- Vincular ao bônus (gera gaming do sistema)

FONTES: John Doerr — Measure What Matters; Google OKR Guide; Christina Wodtke — Radical Focus`,
  },
  {
    title: "Análise de Causa Raiz — 5 Porquês e Ishikawa (Fishbone)",
    category: "metodologia",
    source: "Taiichi Ohno — Toyota Production System; Kaoru Ishikawa; ASQ",
    version: "2025",
    tags: "causa,raiz,5,porques,ishikawa,fishbone,espinha,peixe,6M,analise,problema,prevencao,recorrencia,acao",
    content: `ANÁLISE DE CAUSA RAIZ — 5 PORQUÊS E ISHIKAWA

PRINCÍPIO
Toda falha ou problema tem uma cadeia de causas. Tratar apenas os sintomas (causa imediata) leva à recorrência. A análise de causa raiz busca a causa fundamental para eliminar o problema definitivamente.

5 PORQUÊS (5 WHYS)
Técnica simples desenvolvida na Toyota por Taiichi Ohno.
Método: perguntar "Por quê?" repetidamente (tipicamente 5 vezes) até chegar à causa raiz.

EXEMPLO:
Problema: O cliente recebeu o produto com defeito.
Por quê 1? O produto passou pelo controle de qualidade com o defeito.
Por quê 2? O inspetor não identificou o defeito.
Por quê 3? O critério de inspeção não cobria esse tipo de defeito.
Por quê 4? O procedimento de inspeção não foi atualizado após a mudança no processo.
Por quê 5? Não há responsável definido pela revisão periódica do procedimento.
→ Causa raiz: ausência de processo de revisão de procedimentos

ISHIKAWA (FISHBONE / ESPINHA DE PEIXE)
Diagrama que organiza as causas potenciais de um problema em categorias.

CATEGORIAS DOS 6M (Manufatura)
- Máquina (equipamentos, ferramentas)
- Método (processos, procedimentos)
- Material (matéria-prima, componentes)
- Mão de obra (capacitação, comportamento)
- Medida (instrumentos, calibração)
- Meio ambiente (temperatura, ruído, espaço)

CATEGORIAS PARA PROCESSOS ADMINISTRATIVOS (4P ou 4S)
- Pessoas
- Processos
- Políticas
- Sistemas (tecnologia)

COMO USAR O ISHIKAWA
1. Definir o problema claramente (cabeça do peixe)
2. Brainstorming por categoria (cada espinha)
3. Votar nas causas mais prováveis
4. Validar com dados
5. Ação corretiva para as causas validadas

FONTES: Ohno — Toyota Production System; Ishikawa — Guide to Quality Control; ASQ Cause and Effect Diagram`,
  },
  {
    title: "Governança de Processos — BPM Office e Arquitetura de Processos",
    category: "metodologia",
    source: "ABPMP CBOK v4; Gartner BPM Market Guide; BPM — von Rosing",
    version: "2025",
    tags: "governança,processos,bpm,office,coe,arquitetura,donos,processo,ciclo,vida,portfolio,catalogo,modelo",
    content: `GOVERNANÇA DE PROCESSOS — BPM OFFICE E ARQUITETURA

GOVERNANÇA DE PROCESSOS
Conjunto de estruturas, papéis e mecanismos que garantem que os processos de negócio sejam definidos, monitorados e melhorados de forma sistemática e alinhada à estratégia.

BPM OFFICE (CENTER OF EXCELLENCE — CoE)
Área responsável por:
- Estabelecer e manter a metodologia BPM na empresa
- Padronizar a notação e as ferramentas de modelagem
- Treinar e certificar analistas de processos
- Gerenciar o portfólio de processos
- Apoiar projetos de melhoria

ARQUITETURA DE PROCESSOS
Hierarquia que organiza todos os processos da empresa em níveis:
- Nível 0: Cadeia de Valor (macro processos de negócio — ex.: Operar, Desenvolver, Suportar)
- Nível 1: Macroprocessos (ex.: Gestão de RH, Gestão Financeira)
- Nível 2: Processos (ex.: Recrutamento e Seleção, Contas a Pagar)
- Nível 3: Subprocessos (ex.: Triagem de Candidatos, Aprovação de Faturas)
- Nível 4: Atividades / Tarefas (nível operacional)

PAPÉIS NA GOVERNANÇA DE PROCESSOS
- DONO DO PROCESSO (Process Owner): responsável pelo desempenho e resultados do processo — geralmente um gestor de área
- ANALISTA DE PROCESSO: mapeia, documenta e analisa — geralmente do BPM Office
- EXECUTOR DO PROCESSO: quem realiza as atividades — área operacional

CICLO DE VIDA DO PROCESSO (ABPMP CBOK)
1. Planejamento
2. Análise
3. Desenho e Modelagem
4. Implementação
5. Monitoramento e Controle
6. Refinamento / Melhoria Contínua
→ Ciclo contínuo — nunca tem fim

PORTFÓLIO E CATÁLOGO DE PROCESSOS
Repositório central de todos os processos mapeados, com status (atual, obsoleto, em revisão), dono, versão, data de revisão.

FONTES: ABPMP CBOK v4; Gartner BPM Market Guide 2024; Michael Hammer — Beyond Reengineering`,
  },
]
