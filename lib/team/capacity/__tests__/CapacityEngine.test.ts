/**
 * Testes unitários do CapacityEngine — Fase de Correção Metodológica
 *
 * Executar: npx tsx lib/team/capacity/__tests__/CapacityEngine.test.ts
 *
 * Cobertura (§14 do spec):
 *  - manual 100/0
 *  - assistida 70/30
 *  - automatizada 30/70
 *  - automática/exceções 10/90
 *  - soma humano + automático = bruto (invariante §5)
 *  - humano% + automação% = 100 (invariante §6+§7)
 *  - conversão de minutos (§1)
 *  - conversão de segundos (§1)
 *  - jornada 220h
 *  - jornada diferente de 220h
 *  - reserva operacional
 *  - capacidade produtiva
 *  - utilização (§10: apenas esforço humano)
 *  - FTE (§11)
 *  - múltiplas atividades
 *  - múltiplos processos
 *  - múltiplas empresas
 *  - simulação de automação
 *  - interventionIndex/automationIndex (§6, §7)
 *  - distributionByType (§8)
 */

import {
  calculateActivityLoad,
  calculateProcessLoad,
  calculateCompanyLoad,
  calculateMemberCapacity,
  calcBandEngine,
  simulateAutomation,
  minutesToHHMM,
  secondsToHHMMSS,
  buildInterventionMap,
  DEFAULT_INTERVENTION_CONFIGS,
  DEFAULT_CAPACITY_SETTINGS,
  DP_PROCESS_MAP,
} from '../CapacityEngine'
import type { DpActivityInstance, CapacitySettings } from '../types'

// ─── Micro-framework ──────────────────────────────────────────────────────────

let passed = 0, failed = 0

function assert(cond: boolean, msg: string, detail?: string) {
  if (cond) { console.log(`  ✅ ${msg}`); passed++ }
  else       { console.error(`  ❌ FAIL: ${msg}${detail ? ` — ${detail}` : ''}`); failed++ }
}
function approx(a: number, b: number, tol = 0.01) { return Math.abs(a - b) <= tol }
function suite(name: string, fn: () => void) { console.log(`\n📦 ${name}`); fn() }

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const defaultMap = buildInterventionMap([])

function activity(overrides: Partial<DpActivityInstance> = {}): DpActivityInstance {
  return {
    id: 'test-id',
    linkId: 'link-1',
    processCode: 'FOLHA',
    activityName: 'Lançar horas extras',
    executionType: 'MANUAL',
    volume: 100,
    avgTimeMinutes: 2,
    requiredLevel: 'ASSISTENTE',
    ...overrides,
  }
}

// ─── Suite 1: calculateActivityLoad ──────────────────────────────────────────

suite('calculateActivityLoad — tipos de execução (§14)', () => {
  // MANUAL: 100% humano, 0% automatizado
  const manual = calculateActivityLoad(activity({ executionType: 'MANUAL', volume: 100, avgTimeMinutes: 2 }), 100)
  assert(manual.grossMinutes === 200,     'MANUAL: grossMinutes = 200')
  assert(manual.humanMinutes === 200,     'MANUAL: humanMinutes = 200 (100%)')
  assert(manual.automatedMinutes === 0,   'MANUAL: automatedMinutes = 0 (0%)')
  assert(manual.humanMinutes + manual.automatedMinutes === manual.grossMinutes,
    'MANUAL: humanMinutes + automatedMinutes = grossMinutes (invariante §5)')

  // ASSISTIDA: 70% humano, 30% automatizado
  const assistida = calculateActivityLoad(activity({ executionType: 'ASSISTIDA', volume: 100, avgTimeMinutes: 2 }), 70)
  assert(assistida.grossMinutes === 200,    'ASSISTIDA: grossMinutes = 200')
  assert(assistida.humanMinutes === 140,    'ASSISTIDA: humanMinutes = 140 (70%)')
  assert(assistida.automatedMinutes === 60, 'ASSISTIDA: automatedMinutes = 60 (30%)')
  assert(assistida.humanMinutes + assistida.automatedMinutes === assistida.grossMinutes,
    'ASSISTIDA: humanMinutes + automatedMinutes = grossMinutes (invariante §5)')

  // AUTOMATIZADA: 30% humano, 70% automatizado
  const auto = calculateActivityLoad(activity({ executionType: 'AUTOMATIZADA', volume: 100, avgTimeMinutes: 2 }), 30)
  assert(auto.grossMinutes === 200,    'AUTOMATIZADA: grossMinutes = 200')
  assert(auto.humanMinutes === 60,     'AUTOMATIZADA: humanMinutes = 60 (30%)')
  assert(auto.automatedMinutes === 140,'AUTOMATIZADA: automatedMinutes = 140 (70%)')
  assert(auto.humanMinutes + auto.automatedMinutes === auto.grossMinutes,
    'AUTOMATIZADA: humanMinutes + automatedMinutes = grossMinutes (invariante §5)')

  // AUTOMATICA_EXCECOES: 10% humano, 90% automatizado
  const exc = calculateActivityLoad(activity({ executionType: 'AUTOMATICA_EXCECOES', volume: 100, avgTimeMinutes: 2 }), 10)
  assert(exc.grossMinutes === 200,    'AUTOMATICA_EXCECOES: grossMinutes = 200')
  assert(exc.humanMinutes === 20,     'AUTOMATICA_EXCECOES: humanMinutes = 20 (10%)')
  assert(exc.automatedMinutes === 180,'AUTOMATICA_EXCECOES: automatedMinutes = 180 (90%)')
  assert(exc.humanMinutes + exc.automatedMinutes === exc.grossMinutes,
    'AUTOMATICA_EXCECOES: humanMinutes + automatedMinutes = grossMinutes (invariante §5)')
})

// ─── Suite 2: fórmula básica ──────────────────────────────────────────────────

suite('calculateActivityLoad — fórmula e valores (§3, §4, §5)', () => {
  // Spec §8: 100 lançamentos × 2 min × 100% = 200 min humanos
  const a1 = calculateActivityLoad(activity({ volume: 100, avgTimeMinutes: 2 }), 100)
  assert(a1.grossMinutes === 200, 'volume×tempo: 100×2 = 200')
  assert(a1.humanMinutes === 200, '100% intervenção: humano = 200')

  // Spec §8: 100 operações × 2 min × 30% = 60 min humanos
  const a2 = calculateActivityLoad(activity({ volume: 100, avgTimeMinutes: 2, executionType: 'AUTOMATIZADA' }), 30)
  assert(a2.grossMinutes === 200, 'volume×tempo: 100×2 = 200')
  assert(a2.humanMinutes === 60,  '30% intervenção: humano = 60')
  assert(a2.automatedMinutes === 140, 'automado = 140')

  // Spec §7: 218 × 0,25 min × 30% = 16,35 min humanos (importação benefícios)
  const a3 = calculateActivityLoad(
    activity({ volume: 218, avgTimeMinutes: 0.25, executionType: 'AUTOMATIZADA' }),
    30
  )
  assert(approx(a3.grossMinutes, 54.5),  '218×0.25min = 54.5 min brutos')
  assert(approx(a3.humanMinutes, 16.35), '54.5 × 30% = 16.35 min humanos')
  assert(approx(a3.automatedMinutes, 38.15), '54.5 × 70% = 38.15 min automatizados')
  assert(approx(a3.humanMinutes + a3.automatedMinutes, a3.grossMinutes, 0.01),
    'invariante: 16.35 + 38.15 ≈ 54.5')

  // Volume zero
  const a4 = calculateActivityLoad(activity({ volume: 0 }), 100)
  assert(a4.grossMinutes === 0,     'volume=0: grossMinutes=0')
  assert(a4.humanMinutes === 0,     'volume=0: humanMinutes=0')
  assert(a4.automatedMinutes === 0, 'volume=0: automatedMinutes=0')
})

// ─── Suite 3: calculateProcessLoad — índices §6 e §7 ────────────────────────

suite('calculateProcessLoad — interventionIndex e automationIndex (§6, §7)', () => {
  // Mix: MANUAL(100%) + AUTOMATIZADA(30%)
  // MANUAL:     100 × 2 = 200 bruto, 200 humano, 0 auto
  // AUTOMATIZADA: 100 × 2 = 200 bruto, 60 humano, 140 auto
  // Total: 400 bruto, 260 humano, 140 auto
  // interventionIndex = 260/400 × 100 = 65%
  // automationIndex   = 140/400 × 100 = 35%
  const acts = [
    activity({ id: 'a1', executionType: 'MANUAL',       volume: 100, avgTimeMinutes: 2 }),
    activity({ id: 'a2', executionType: 'AUTOMATIZADA',  volume: 100, avgTimeMinutes: 2 }),
  ]
  const p = calculateProcessLoad('FOLHA', 'Folha', acts, defaultMap)

  assert(p.grossMinutes === 400,          'processLoad: grossMinutes = 400')
  assert(p.humanMinutes === 260,          'processLoad: humanMinutes = 260')
  assert(p.automatedMinutes === 140,      'processLoad: automatedMinutes = 140')
  assert(p.humanMinutes + p.automatedMinutes === p.grossMinutes,
    'invariante processo: human + auto = bruto')
  assert(approx(p.interventionIndex, 65), 'interventionIndex = 260/400×100 = 65%')
  assert(approx(p.automationIndex, 35),   'automationIndex = 140/400×100 = 35%')
  assert(approx(p.interventionIndex + p.automationIndex, 100, 0.2),
    'invariante: interventionIndex + automationIndex ≈ 100% (§7)')
})

suite('calculateProcessLoad — distribuição por tipo §8', () => {
  // MANUAL(100) e ASSISTIDA(70) e AUTOMATIZADA(30) e AUTOMATICA_EXCECOES(10)
  // MANUAL: 50 × 2 = 100 bruto, 100 humano
  // ASSISTIDA: 50 × 2 = 100 bruto, 70 humano, 30 auto
  // AUTOMATIZADA: 50 × 2 = 100 bruto, 30 humano, 70 auto
  // AUTOMATICA: 50 × 2 = 100 bruto, 10 humano, 90 auto
  // Total: 400 bruto, 210 humano, 190 auto
  const acts = [
    activity({ id: 'a1', executionType: 'MANUAL',              volume: 50, avgTimeMinutes: 2 }),
    activity({ id: 'a2', executionType: 'ASSISTIDA',           volume: 50, avgTimeMinutes: 2 }),
    activity({ id: 'a3', executionType: 'AUTOMATIZADA',         volume: 50, avgTimeMinutes: 2 }),
    activity({ id: 'a4', executionType: 'AUTOMATICA_EXCECOES', volume: 50, avgTimeMinutes: 2 }),
  ]
  const p = calculateProcessLoad('FOLHA', 'Folha', acts, defaultMap)

  assert(p.grossMinutes === 400,  'distribuição: 400 brutos')
  assert(p.humanMinutes === 210,  'distribuição: 210 humanos')
  assert(p.automatedMinutes === 190, 'distribuição: 190 automatizados')
  assert(approx(p.interventionIndex, 52.5), 'interventionIndex = 210/400 = 52.5%')
  assert(approx(p.automationIndex, 47.5),   'automationIndex = 190/400 = 47.5%')
  assert(approx(p.interventionIndex + p.automationIndex, 100, 0.2),
    'invariante: intervenção + automação = 100%')

  // byExecution: cada tipo = 25% do bruto
  assert(approx(p.byExecution['MANUAL']?.grossPct ?? 0, 25),   'MANUAL grossPct = 25%')
  assert(approx(p.byExecution['ASSISTIDA']?.grossPct ?? 0, 25), 'ASSISTIDA grossPct = 25%')
  assert(approx(p.byExecution['AUTOMATIZADA']?.grossPct ?? 0, 25), 'AUTOMATIZADA grossPct = 25%')
  assert(approx(p.byExecution['AUTOMATICA_EXCECOES']?.grossPct ?? 0, 25), 'AUTOMATICA_EXCECOES grossPct = 25%')

  // humanPct: MANUAL = 100/210 ≈ 47.6%, AUTOMATIZADA = 30/210 ≈ 14.3%
  assert(approx(p.byExecution['MANUAL']?.humanPct ?? 0, 47.62, 0.1), 'MANUAL humanPct ≈ 47.6%')
  assert(approx(p.byExecution['AUTOMATIZADA']?.humanPct ?? 0, 14.29, 0.1), 'AUTOMATIZADA humanPct ≈ 14.3%')
})

// ─── Suite 4: calculateCompanyLoad ───────────────────────────────────────────

suite('calculateCompanyLoad — múltiplas atividades e processos', () => {
  const link = { id: 'link-1', companyId: 'co-1', companyName: 'Monaco Diesel' }

  // Dois processos distintos com tipos distintos
  const acts = [
    activity({ id: 'a1', processCode: 'FOLHA',    executionType: 'MANUAL',       volume: 100, avgTimeMinutes: 2 }),
    activity({ id: 'a2', processCode: 'FOLHA',    executionType: 'AUTOMATIZADA',  volume: 100, avgTimeMinutes: 2 }),
    activity({ id: 'a3', processCode: 'ADMISSAO', executionType: 'MANUAL',        volume: 10,  avgTimeMinutes: 5 }),
    activity({ id: 'a4', processCode: 'ADMISSAO', executionType: 'AUTOMATIZADA',  volume: 10,  avgTimeMinutes: 5 }),
  ]
  const c = calculateCompanyLoad(link, acts, defaultMap)

  // FOLHA: 400 bruto, 260 humano, 140 auto
  // ADMISSAO: 100 bruto, 65 humano (50 manual + 15 auto), 35 auto
  // Total: 500 bruto, 325 humano, 175 auto
  assert(c.totalGrossMinutes === 500,      'companyLoad: 500 brutos')
  assert(c.totalHumanMinutes === 325,      'companyLoad: 325 humanos')
  assert(c.totalAutomatedMinutes === 175,  'companyLoad: 175 automatizados')
  assert(c.totalHumanMinutes + c.totalAutomatedMinutes === c.totalGrossMinutes,
    'invariante empresa: human + auto = bruto')
  assert(approx(c.interventionIndex, 65),  'interventionIndex = 325/500 = 65%')
  assert(approx(c.automationIndex, 35),    'automationIndex = 175/500 = 35%')
  assert(approx(c.interventionIndex + c.automationIndex, 100, 0.2),
    'invariante: intervenção + automação ≈ 100%')
  assert(c.processes.length === 2,         'dois processos')
  assert(c.hasActivityData,                'hasActivityData = true')

  // manualityIndex é alias de interventionIndex
  assert(c.manualityIndex === c.interventionIndex, 'manualityIndex é alias de interventionIndex')
})

suite('calculateCompanyLoad — empresa sem atividades', () => {
  const link = { id: 'link-x', companyId: 'co-x', companyName: 'Vazia' }
  const c = calculateCompanyLoad(link, [], defaultMap)
  assert(c.totalGrossMinutes === 0,  'sem atividades: gross = 0')
  assert(c.totalHumanMinutes === 0,  'sem atividades: humano = 0')
  assert(c.totalAutomatedMinutes === 0, 'sem atividades: auto = 0')
  assert(c.interventionIndex === 0,  'sem atividades: interventionIndex = 0')
  assert(c.automationIndex === 0,    'sem atividades: automationIndex = 0')
  assert(!c.hasActivityData,         'hasActivityData = false')
})

// ─── Suite 5: calculateMemberCapacity — capacidade e jornada ─────────────────

suite('calculateMemberCapacity — jornada 220h, reserva 20% (§9, §16, §17)', () => {
  const link = { id: 'link-1', companyId: 'co-1', companyName: 'Empresa A' }
  const acts = [activity({ id: 'a1', executionType: 'MANUAL', volume: 100, avgTimeMinutes: 2 })]
  const companyLoad = calculateCompanyLoad(link, acts, defaultMap)
  const result = calculateMemberCapacity({ id: 'm1', name: 'Ana' }, [companyLoad], DEFAULT_CAPACITY_SETTINGS)

  // 220h × 80% = 176h capacidade produtiva
  assert(approx(result.productiveHours, 176), 'jornada 220h × 80% = 176h produtivos')
  // carga humana = 200 min = 3.33h
  assert(approx(result.totalHumanHours, 200 / 60), 'totalHumanHours ≈ 3.33h')
  // §10: utilização = somente esforço humano
  const expectedUtil = ((200 / 60) / 176) * 100
  assert(approx(result.utilizationPct, expectedUtil), `utilizationPct ≈ ${expectedUtil.toFixed(2)}%`)
})

suite('calculateMemberCapacity — jornada diferente de 220h (parametrizável §16)', () => {
  const settings: CapacitySettings = {
    ...DEFAULT_CAPACITY_SETTINGS,
    monthlyHours: 180,   // jornada diferente
    operationalReserve: 15,
  }
  const link = { id: 'link-1', companyId: 'co-1', companyName: 'Empresa B' }
  const acts = [activity({ id: 'a1', executionType: 'MANUAL', volume: 50, avgTimeMinutes: 2 })]
  const companyLoad = calculateCompanyLoad(link, acts, defaultMap)
  const result = calculateMemberCapacity({ id: 'm1', name: 'Carlos' }, [companyLoad], settings)

  // 180h × (1 - 15%) = 180 × 0.85 = 153h
  assert(approx(result.productiveHours, 153), '180h × 85% = 153h produtivos')
  assert(result.monthlyHours === 180, 'monthlyHours = 180')
})

suite('calculateMemberCapacity — reserva operacional (§16)', () => {
  // reserva 0%: capacidade = jornada integral
  const settingsZero: CapacitySettings = { ...DEFAULT_CAPACITY_SETTINGS, operationalReserve: 0 }
  const link = { id: 'link-1', companyId: 'co-1', companyName: 'Empresa C' }
  const companyLoad = calculateCompanyLoad(link, [], defaultMap)
  const r0 = calculateMemberCapacity({ id: 'm1', name: 'Test' }, [companyLoad], settingsZero)
  assert(approx(r0.productiveHours, 220), 'reserva 0%: 220h produtivos')

  // reserva 100%: capacidade = 0
  const settings100: CapacitySettings = { ...DEFAULT_CAPACITY_SETTINGS, operationalReserve: 100 }
  const r100 = calculateMemberCapacity({ id: 'm1', name: 'Test' }, [companyLoad], settings100)
  assert(approx(r100.productiveHours, 0), 'reserva 100%: 0h produtivos')
})

suite('calculateMemberCapacity — utilização usa somente esforço humano §10', () => {
  // Atividade 100% automatizada NÃO deve consumir capacidade do colaborador
  const link = { id: 'link-1', companyId: 'co-1', companyName: 'Empresa D' }
  const acts = [
    activity({ id: 'a1', executionType: 'AUTOMATICA_EXCECOES', volume: 1000, avgTimeMinutes: 10 }),
  ]
  // gross = 10000 min, human = 1000 min (10%), auto = 9000 min
  const companyLoad = calculateCompanyLoad(link, acts, defaultMap)
  const result = calculateMemberCapacity({ id: 'm1', name: 'Fernanda' }, [companyLoad], DEFAULT_CAPACITY_SETTINGS)

  // utilizationPct = humanHours / productiveHours = (1000/60) / 176 ≈ 9.47%
  const expectedUtil = ((1000 / 60) / 176) * 100
  assert(approx(result.utilizationPct, expectedUtil, 0.1),
    `§10: utilização = esforço humano / capacidade = ${expectedUtil.toFixed(2)}%`)
  assert(approx(result.totalAutomatedHours, 9000 / 60, 0.01),
    'totalAutomatedHours = 9000/60 = 150h')
  // automação não consome capacidade
  assert(result.availableHours > 100, 'automação pesada não consome capacidade disponível')
})

// ─── Suite 6: FTE — §11, §23 ─────────────────────────────────────────────────

suite('FTE — §11, §23 (Mônaco Diesel)', () => {
  // Analista: 144h/mês, Assistente: 114h/mês
  // Capacidade: 176h (220h × 80%)
  const link = { id: 'link-1', companyId: 'co-1', companyName: 'Monaco' }
  const acts = [
    // Analista: 144h = 8640 min humanos
    activity({ id: 'a1', executionType: 'MANUAL', volume: 86,  avgTimeMinutes: 100, requiredLevel: 'ANALISTA' }),
    // Assistente: 114h = 6840 min humanos
    activity({ id: 'a2', executionType: 'MANUAL', volume: 114, avgTimeMinutes: 60,  requiredLevel: 'ASSISTENTE' }),
  ]
  const companyLoad = calculateCompanyLoad(link, acts, defaultMap)
  const result = calculateMemberCapacity({ id: 'm1', name: 'Ana' }, [companyLoad], DEFAULT_CAPACITY_SETTINGS)

  // FTE analista = 8600/10560 ≈ 0.814
  assert(approx(result.ftAnalyst, 8600 / 10560, 0.01),   'ftAnalyst ≈ 0.814')
  // FTE assistente = 6840/10560 ≈ 0.648
  assert(approx(result.ftAssistant, 6840 / 10560, 0.01), 'ftAssistant ≈ 0.648')
})

suite('FTE — §23 exemplo spec (144h analista, 114h assistente)', () => {
  const link = { id: 'link-1', companyId: 'co-1', companyName: 'Test' }
  const acts = [
    activity({ id: 'a1', executionType: 'MANUAL', volume: 1, avgTimeMinutes: 8640, requiredLevel: 'ANALISTA' }),   // 144h
    activity({ id: 'a2', executionType: 'MANUAL', volume: 1, avgTimeMinutes: 6840, requiredLevel: 'ASSISTENTE' }), // 114h
  ]
  const companyLoad = calculateCompanyLoad(link, acts, defaultMap)
  const result = calculateMemberCapacity({ id: 'm1', name: 'Ana' }, [companyLoad], DEFAULT_CAPACITY_SETTINGS)

  // 176h produtivos = 10560 min
  assert(approx(result.ftAnalyst,   144 / 176, 0.01), `ftAnalyst ≈ ${(144/176).toFixed(3)} (144/176)`)
  assert(approx(result.ftAssistant, 114 / 176, 0.01), `ftAssistant ≈ ${(114/176).toFixed(3)} (114/176)`)
})

// ─── Suite 7: múltiplas empresas ─────────────────────────────────────────────

suite('calculateMemberCapacity — múltiplas empresas', () => {
  const linkA = { id: 'link-a', companyId: 'co-a', companyName: 'Empresa A' }
  const linkB = { id: 'link-b', companyId: 'co-b', companyName: 'Empresa B' }
  const actsA = [activity({ id: 'a1', volume: 100, avgTimeMinutes: 1, executionType: 'MANUAL' })]        // 100 min humanos
  const actsB = [activity({ id: 'b1', volume: 100, avgTimeMinutes: 2, executionType: 'AUTOMATIZADA' })]  // 400 bruto, 120 humano, 280 auto

  const clA = calculateCompanyLoad(linkA, actsA, defaultMap)
  const clB = calculateCompanyLoad(linkB, actsB, defaultMap)
  const result = calculateMemberCapacity({ id: 'm1', name: 'Diego' }, [clA, clB], DEFAULT_CAPACITY_SETTINGS)

  // Empresa A: MANUAL 100%  → gross=100, human=100, auto=0
  // Empresa B: AUTOMATIZADA 30% → volume=100, avg=2 → gross=200, human=60, auto=140
  // Total: 300 bruto, 160 humano, 140 auto
  assert(result.companies.length === 2,                      'duas empresas')
  assert(approx(result.totalHumanHours, 160 / 60),           'totalHumanHours ≈ 2.67h (160 min)')
  assert(approx(result.totalAutomatedHours, 140 / 60),       'totalAutomatedHours ≈ 2.33h (140 min)')
  // interventionIndex = 160/300 × 100 ≈ 53.33%
  assert(approx(result.interventionIndex, 53.33, 0.5),       'interventionIndex = 160/300 ≈ 53.33%')
  assert(approx(result.automationIndex, 46.67, 0.5),         'automationIndex = 140/300 ≈ 46.67%')
  assert(approx(result.interventionIndex + result.automationIndex, 100, 0.2),
    'invariante: intervenção + automação ≈ 100%')
})

// ─── Suite 8: calcBandEngine ──────────────────────────────────────────────────

suite('calcBandEngine — 7 faixas', () => {
  const s = DEFAULT_CAPACITY_SETTINGS
  assert(calcBandEngine(0, s)    === 'low',       '0% → low')
  assert(calcBandEngine(60, s)   === 'low',       '60% → low (limite)')
  assert(calcBandEngine(61, s)   === 'available', '61% → available')
  assert(calcBandEngine(75, s)   === 'available', '75% → available (limite)')
  assert(calcBandEngine(76, s)   === 'adequate',  '76% → adequate')
  assert(calcBandEngine(85, s)   === 'adequate',  '85% → adequate (limite)')
  assert(calcBandEngine(86, s)   === 'high',      '86% → high')
  assert(calcBandEngine(95, s)   === 'high',      '95% → high (limite)')
  assert(calcBandEngine(96, s)   === 'limit',     '96% → limit')
  assert(calcBandEngine(100, s)  === 'limit',     '100% → limit (limite)')
  assert(calcBandEngine(101, s)  === 'overload',  '101% → overload')
  assert(calcBandEngine(110, s)  === 'overload',  '110% → overload (limite)')
  assert(calcBandEngine(111, s)  === 'critical',  '111% → critical')
})

// ─── Suite 9: simulateAutomation — §26 ───────────────────────────────────────

suite('simulateAutomation — §26', () => {
  const act = activity({ executionType: 'MANUAL', volume: 100, avgTimeMinutes: 2 })
  // Atual: MANUAL 100% → 200 min humanos
  // Simulado: AUTOMATIZADA 30% → 60 min humanos
  // Economia: 140 min
  const sim = simulateAutomation(act, 'AUTOMATIZADA', defaultMap)
  assert(sim.currentHumanMinutes === 200,        'currentHumanMinutes = 200')
  assert(sim.simulatedHumanMinutes === 60,       'simulatedHumanMinutes = 60')
  assert(sim.savedMinutes === 140,               'savedMinutes = 140')
  assert(approx(sim.savedHours, 140 / 60),       'savedHours ≈ 2.33')
  assert(sim.reductionPct === 70,                'reductionPct = 70%')

  // Simular nenhuma mudança (MANUAL → MANUAL)
  const simNoop = simulateAutomation(act, 'MANUAL', defaultMap)
  assert(simNoop.savedMinutes === 0,             'MANUAL→MANUAL: sem economia')
  assert(simNoop.reductionPct === 0,             'MANUAL→MANUAL: reductionPct = 0%')
})

// ─── Suite 10: minutesToHHMM — §1 ────────────────────────────────────────────

suite('minutesToHHMM — conversão de minutos (§1)', () => {
  assert(minutesToHHMM(0)    === '0h00m',    '0 → 0h00m')
  assert(minutesToHHMM(60)   === '1h00m',    '60 → 1h00m')
  assert(minutesToHHMM(90)   === '1h30m',    '90 → 1h30m')
  assert(minutesToHHMM(125)  === '2h05m',    '125 → 2h05m')
  assert(minutesToHHMM(200)  === '3h20m',    '200 → 3h20m (spec §1)')
  // 16.35 minutos = 16 min 21 s → §1 exige mostrar segundos
  assert(minutesToHHMM(16.35) === '0h16m21s', '16.35 → 0h16m21s (spec §1)')
  // Negativos
  assert(minutesToHHMM(-60)  === '-1h00m',   '-60 → -1h00m')
  assert(minutesToHHMM(-16.35) === '-0h16m21s', '-16.35 → -0h16m21s')
})

// ─── Suite 11: secondsToHHMMSS — §1 ──────────────────────────────────────────

suite('secondsToHHMMSS — conversão de segundos (§1)', () => {
  // Spec §1: 981 segundos → 00h16m21s
  assert(secondsToHHMMSS(981)  === '0h16m21s', '981s → 0h16m21s (spec §1)')
  assert(secondsToHHMMSS(0)    === '0h00m',    '0s → 0h00m')
  assert(secondsToHHMMSS(60)   === '0h01m',    '60s → 0h01m')
  assert(secondsToHHMMSS(3600) === '1h00m',    '3600s → 1h00m')
  assert(secondsToHHMMSS(3661) === '1h01m01s', '3661s → 1h01m01s')
  // 3270 segundos = 54 min 30 s (Spec §7: carga bruta de 218 × 15s)
  assert(secondsToHHMMSS(3270) === '0h54m30s', '3270s → 0h54m30s')
  // 981 segundos × 30% = 294.3 s → carga humana do spec §7
  assert(secondsToHHMMSS(Math.round(981 * 0.3)) === '0h04m54s',
    '981×30%=294s → 0h04m54s')
})

// ─── Suite 12: buildInterventionMap ──────────────────────────────────────────

suite('buildInterventionMap', () => {
  const defaultMapLocal = buildInterventionMap([])
  assert(defaultMapLocal['MANUAL'] === 100,              'default MANUAL = 100%')
  assert(defaultMapLocal['ASSISTIDA'] === 70,            'default ASSISTIDA = 70%')
  assert(defaultMapLocal['AUTOMATIZADA'] === 30,         'default AUTOMATIZADA = 30%')
  assert(defaultMapLocal['AUTOMATICA_EXCECOES'] === 10,  'default AUTOMATICA_EXCECOES = 10%')

  // Override parcial
  const custom = buildInterventionMap([{ executionType: 'MANUAL', interventionPct: 90 }])
  assert(custom['MANUAL'] === 90,           'custom MANUAL = 90%')
  assert(custom['ASSISTIDA'] === 70,        'custom ASSISTIDA mantém default = 70%')
})

// ─── Suite 13: DEFAULT_INTERVENTION_CONFIGS ───────────────────────────────────

suite('DEFAULT_INTERVENTION_CONFIGS — 4 tipos (§4)', () => {
  assert(DEFAULT_INTERVENTION_CONFIGS.MANUAL.interventionPct === 100,              'MANUAL padrão = 100%')
  assert(DEFAULT_INTERVENTION_CONFIGS.ASSISTIDA.interventionPct === 70,            'ASSISTIDA padrão = 70%')
  assert(DEFAULT_INTERVENTION_CONFIGS.AUTOMATIZADA.interventionPct === 30,         'AUTOMATIZADA padrão = 30%')
  assert(DEFAULT_INTERVENTION_CONFIGS.AUTOMATICA_EXCECOES.interventionPct === 10,  'AUTOMATICA_EXCECOES padrão = 10%')
})

// ─── Suite 14: DEFAULT_CAPACITY_SETTINGS ─────────────────────────────────────

suite('DEFAULT_CAPACITY_SETTINGS — jornada e faixas (§16, §18)', () => {
  assert(DEFAULT_CAPACITY_SETTINGS.monthlyHours === 220,       'jornada padrão = 220h')
  assert(DEFAULT_CAPACITY_SETTINGS.operationalReserve === 20,  'reserva padrão = 20%')
  const produtivo = 220 * (1 - 20 / 100)
  assert(produtivo === 176,                                    '220×80% = 176h produtivos')
  assert(DEFAULT_CAPACITY_SETTINGS.bandLow === 60,             'bandLow = 60%')
  assert(DEFAULT_CAPACITY_SETTINGS.bandAvailable === 75,       'bandAvailable = 75%')
  assert(DEFAULT_CAPACITY_SETTINGS.bandAdequate === 85,        'bandAdequate = 85%')
  assert(DEFAULT_CAPACITY_SETTINGS.bandHigh === 95,            'bandHigh = 95%')
  assert(DEFAULT_CAPACITY_SETTINGS.bandLimit === 100,          'bandLimit = 100%')
})

// ─── Suite 15: DP_PROCESS_MAP ────────────────────────────────────────────────

suite('DP_PROCESS_MAP — catálogo de processos', () => {
  assert(DP_PROCESS_MAP['FOLHA']       === 'Folha de Pagamento',  'FOLHA mapeado')
  assert(DP_PROCESS_MAP['ADMISSAO']    === 'Admissão',             'ADMISSAO mapeado')
  assert(DP_PROCESS_MAP['ESOCIAL']     === 'eSocial',              'ESOCIAL mapeado')
  assert(DP_PROCESS_MAP['RESCISAO']    === 'Rescisão',             'RESCISAO mapeado')
  assert(DP_PROCESS_MAP['FERIAS']      === 'Férias',               'FERIAS mapeado')
  assert(DP_PROCESS_MAP['BENEFICIOS']  === 'Benefícios',           'BENEFICIOS mapeado')
  assert(Object.keys(DP_PROCESS_MAP).length >= 14, 'pelo menos 14 processos no catálogo')
})

// ─── Suite 16: interventionIndex vs antigo manualityIndex ─────────────────────

suite('interventionIndex — substitui manualityIndex binário (§2)', () => {
  // Cenário onde antigo e novo diferem radicalmente:
  // 9 atividades AUTOMATIZADA (100 min bruto cada) + 1 MANUAL (6000 min bruto)
  // Antigo: manualityIndex = manualHuman / totalHuman × 100
  //         = 6000 / (6000 + 9×30) = 6000/6270 ≈ 95.7%  (errado: "95% manual")
  // Novo interventionIndex = totalHuman / totalGross × 100
  //         = 6270 / (6000 + 9×100) = 6270/6900 ≈ 90.9% (correto)
  const link = { id: 'link-1', companyId: 'co-1', companyName: 'Test' }
  const acts: DpActivityInstance[] = [
    // 9 atividades automatizadas: 100 bruto, 30 humano, 70 auto
    ...Array.from({ length: 9 }, (_, i) => activity({
      id: `auto-${i}`, executionType: 'AUTOMATIZADA', volume: 50, avgTimeMinutes: 2
    })),
    // 1 atividade manual pesada: 6000 bruto, 6000 humano
    activity({ id: 'manual-heavy', executionType: 'MANUAL', volume: 100, avgTimeMinutes: 60 }),
  ]
  const c = calculateCompanyLoad(link, acts, defaultMap)
  // 9 auto: 900 bruto, 270 humano + 1 manual: 6000 bruto, 6000 humano
  // Total: 6900 bruto, 6270 humano, 630 auto
  const expectedIntervention = (6270 / 6900) * 100
  assert(approx(c.interventionIndex, expectedIntervention, 0.5),
    `interventionIndex ≈ ${expectedIntervention.toFixed(1)}% (ponderado por esforço)`)
  // IMPORTANTE: automationIndex NÃO pode ser 90% (9 de 10 atividades automatizadas)
  const expectedAutomation = (630 / 6900) * 100
  assert(approx(c.automationIndex, expectedAutomation, 0.5),
    `automationIndex ≈ ${expectedAutomation.toFixed(1)}% (ponderado por esforço, não contagem)`)
  assert(c.automationIndex < 15,
    '§10: 9 atividades auto não podem resultar em 90% automação quando a manual domina o esforço')
})

// ─── Resultado final ──────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(55))
console.log(`Resultado: ${passed} aprovados, ${failed} reprovados`)
if (failed === 0) console.log('✅ TODOS OS TESTES PASSARAM')
else { console.error(`❌ ${failed} TESTES FALHARAM`); process.exit(1) }
