const LINK_ID = '529c8e1d-4b28-4e03-81d1-1a9d69d68450'
const BASE    = 'http://localhost:3000'

const atividades = [
  // FOLHA DE PAGAMENTO
  { processCode: 'FOLHA',     activityName: 'Lançar variáveis de folha (horas extras, faltas, DSR)', executionType: 'MANUAL',              volume: 200, avgTimeMinutes: 3,   requiredLevel: 'ANALISTA'   },
  { processCode: 'FOLHA',     activityName: 'Conferir e fechar folha de pagamento',                   executionType: 'ASSISTIDA',           volume: 1,   avgTimeMinutes: 180, requiredLevel: 'ANALISTA'   },
  { processCode: 'FOLHA',     activityName: 'Processar folha no sistema (Domínio RM)',                executionType: 'AUTOMATIZADA',        volume: 1,   avgTimeMinutes: 30,  requiredLevel: 'ASSISTENTE' },
  { processCode: 'FOLHA',     activityName: 'Coletar e lançar atestados médicos',                     executionType: 'MANUAL',              volume: 15,  avgTimeMinutes: 8,   requiredLevel: 'ASSISTENTE' },
  // ADMISSÃO
  { processCode: 'ADMISSAO',  activityName: 'Coletar e conferir documentos de admissão',             executionType: 'MANUAL',              volume: 5,   avgTimeMinutes: 45,  requiredLevel: 'ASSISTENTE' },
  { processCode: 'ADMISSAO',  activityName: 'Registrar admissão no eSocial (S-2200)',                executionType: 'MANUAL',              volume: 5,   avgTimeMinutes: 20,  requiredLevel: 'ANALISTA'   },
  { processCode: 'ADMISSAO',  activityName: 'Cadastrar colaborador no sistema e ponto',              executionType: 'AUTOMATICA_EXCECOES', volume: 5,   avgTimeMinutes: 10,  requiredLevel: 'ASSISTENTE' },
  // RESCISÃO
  { processCode: 'RESCISAO',  activityName: 'Calcular verbas rescisórias',                           executionType: 'ASSISTIDA',           volume: 5,   avgTimeMinutes: 60,  requiredLevel: 'ANALISTA'   },
  { processCode: 'RESCISAO',  activityName: 'Emitir TRCT e guias (FGTS, INSS)',                     executionType: 'AUTOMATIZADA',        volume: 5,   avgTimeMinutes: 15,  requiredLevel: 'ANALISTA'   },
  // FÉRIAS
  { processCode: 'FERIAS',    activityName: 'Programar e calcular férias',                           executionType: 'ASSISTIDA',           volume: 5,   avgTimeMinutes: 20,  requiredLevel: 'ASSISTENTE' },
  { processCode: 'FERIAS',    activityName: 'Emitir recibo de férias e avisar financeiro',           executionType: 'AUTOMATIZADA',        volume: 5,   avgTimeMinutes: 10,  requiredLevel: 'ASSISTENTE' },
  // ESOCIAL
  { processCode: 'ESOCIAL',   activityName: 'Monitorar pendências e inconsistências eSocial',        executionType: 'MANUAL',              volume: 1,   avgTimeMinutes: 90,  requiredLevel: 'ANALISTA'   },
  { processCode: 'ESOCIAL',   activityName: 'Enviar eventos periódicos eSocial (S-1200, S-1210)',    executionType: 'AUTOMATICA_EXCECOES', volume: 1,   avgTimeMinutes: 20,  requiredLevel: 'ANALISTA'   },
  // PONTO
  { processCode: 'PONTO',     activityName: 'Tratar inconsistências de ponto eletrônico',            executionType: 'MANUAL',              volume: 200, avgTimeMinutes: 2,   requiredLevel: 'ASSISTENTE' },
  { processCode: 'PONTO',     activityName: 'Fechar espelho de ponto e encaminhar para aprovação',   executionType: 'ASSISTIDA',           volume: 1,   avgTimeMinutes: 60,  requiredLevel: 'ANALISTA'   },
  // BENEFÍCIOS
  { processCode: 'BENEFICIOS', activityName: 'Inclusão/exclusão de beneficiários (VA, VR, VT)',      executionType: 'MANUAL',              volume: 8,   avgTimeMinutes: 15,  requiredLevel: 'ASSISTENTE' },
  { processCode: 'BENEFICIOS', activityName: 'Conferir faturas de plano de saúde e odontológico',   executionType: 'ASSISTIDA',           volume: 1,   avgTimeMinutes: 60,  requiredLevel: 'ANALISTA'   },
]

let ok = 0
for (const a of atividades) {
  const r = await fetch(BASE + '/api/gestao-equipe/dp-activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ linkId: LINK_ID, ...a }),
  })
  const d = await r.json()
  if (r.ok) { ok++; console.log('OK', a.processCode, a.activityName) }
  else console.log('ERRO', a.activityName, JSON.stringify(d))
}
console.log('Criadas: ' + ok + '/' + atividades.length)
