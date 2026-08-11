/**
 * Testes unitários da função central calculateICO
 * Executar: npx tsx lib/team/capacity/__tests__/calculateICO.test.ts
 */

import { calcCompanyICO, calcBand, DEFAULT_BAND_CONFIG } from '../calculateICO'

// ─── Micro-framework de asserção ──────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(condition: boolean, message: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${message}`)
    passed++
  } else {
    console.error(`  ❌ FAIL: ${message}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

function approx(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance
}

function suite(name: string, fn: () => void) {
  console.log(`\n📦 ${name}`)
  fn()
}

// ─── Caso 1: caso da tela — 218 empregados, 5 admissões, 5 rescisões ─────────

suite('Caso 1 — caso real da tela (218 emp / 5 adm / 5 resc)', () => {
  const r = calcCompanyICO({
    headcountActive:  218,
    headcountOnLeave: 0,
    avgAdmissions:    5,
    avgTerminations:  5,
    avgVacations:     0,
    unions:           0,
    establishments:   1,
    memberRole:       'RESPONSAVEL',
    complexity:       'MEDIA',
    automationLevel:  'MEDIA',
  })

  // cargaBase = 5 + 21.8 + 7.5 + 10 + 0 + 0 + 0 + 1.5 = 45.8
  assert(approx(r.cargaBase, 45.8), 'cargaBase = 45.8', `obtido: ${r.cargaBase}`)
  assert(approx(r.fatorPapel, 1.00), 'fatorPapel Responsável = 1.00')
  assert(approx(r.fatorComplexidade, 1.00), 'fatorComplexidade Média = 1.00')
  assert(approx(r.fatorAutomacao, 1.00), 'fatorAutomação Média = 1.00')
  assert(approx(r.score, 45.8), `score = 45.8 pts`, `obtido: ${r.score}`)

  // Memória de cálculo
  const m = r.memoria
  assert(approx(m.componentes.find(c => c.label === 'Carga fixa')?.subtotal ?? 0, 5.0), 'componente carga fixa = 5.0')
  assert(approx(m.componentes.find(c => c.label === 'Empregados ativos')?.subtotal ?? 0, 21.8), 'componente empregados = 21.8')
  assert(approx(m.componentes.find(c => c.label === 'Admissões/mês')?.subtotal ?? 0, 7.5), 'componente admissões = 7.5')
  assert(approx(m.componentes.find(c => c.label === 'Rescisões/mês')?.subtotal ?? 0, 10.0), 'componente rescisões = 10.0')
  assert(approx(m.componentes.find(c => c.label === 'Estabelecimentos')?.subtotal ?? 0, 1.5), 'componente estabelecimentos = 1.5')
  assert(approx(m.scoreEmpresa, 45.8), 'memoria.scoreEmpresa = 45.8', `obtido: ${m.scoreEmpresa}`)
})

// ─── Caso 2: mesmo dado + papel Apoio ────────────────────────────────────────

suite('Caso 2 — papel Apoio (fator 0.45)', () => {
  const r = calcCompanyICO({
    headcountActive: 218,
    avgAdmissions:   5,
    avgTerminations: 5,
    establishments:  1,
    memberRole:      'APOIO',
    complexity:      'MEDIA',
    automationLevel: 'MEDIA',
  })

  // 45.8 × 0.45 = 20.61
  assert(approx(r.fatorPapel, 0.45), 'fatorPapel Apoio = 0.45')
  assert(approx(r.score, 20.61, 0.02), `score = 20.61 pts`, `obtido: ${r.score}`)
})

// ─── Caso 3: complexidade Alta (× 1.20) ──────────────────────────────────────

suite('Caso 3 — complexidade Alta (fator 1.20)', () => {
  const r = calcCompanyICO({
    headcountActive: 218,
    avgAdmissions:   5,
    avgTerminations: 5,
    establishments:  1,
    memberRole:      'RESPONSAVEL',
    complexity:      'ALTA',
    automationLevel: 'MEDIA',
  })

  // 45.8 × 1.00 × 1.20 × 1.00 = 54.96
  assert(approx(r.fatorComplexidade, 1.20), 'fatorComplexidade Alta = 1.20')
  assert(approx(r.score, 54.96, 0.02), `score = 54.96 pts`, `obtido: ${r.score}`)
})

// ─── Caso 4: automação Alta (× 0.80) ─────────────────────────────────────────

suite('Caso 4 — automação Alta (fator 0.80)', () => {
  const r = calcCompanyICO({
    headcountActive: 218,
    avgAdmissions:   5,
    avgTerminations: 5,
    establishments:  1,
    memberRole:      'RESPONSAVEL',
    complexity:      'MEDIA',
    automationLevel: 'ALTA',
  })

  // 45.8 × 1.00 × 1.00 × 0.80 = 36.64
  assert(approx(r.fatorAutomacao, 0.80), 'fatorAutomação Alta = 0.80')
  assert(approx(r.score, 36.64, 0.02), `score = 36.64 pts`, `obtido: ${r.score}`)
})

// ─── Caso 5: 3 empresas — soma correta ───────────────────────────────────────

suite('Caso 5 — 3 empresas, soma correta', () => {
  const e1 = calcCompanyICO({ headcountActive: 50, establishments: 1, memberRole: 'RESPONSAVEL', complexity: 'MEDIA', automationLevel: 'MEDIA' })
  const e2 = calcCompanyICO({ headcountActive: 30, establishments: 1, memberRole: 'CORRESPONSAVEL', complexity: 'BAIXA', automationLevel: 'ALTA' })
  const e3 = calcCompanyICO({ headcountActive: 10, establishments: 1, memberRole: 'APOIO', complexity: 'ALTA', automationLevel: 'MEDIA' })

  const ico = e1.score + e2.score + e3.score

  // e1: (5 + 5 + 1.5) × 1.0 × 1.0 × 1.0 = 11.5
  assert(approx(e1.cargaBase, 11.5), `empresa 1 cargaBase = 11.5`, `obtido: ${e1.cargaBase}`)
  // e2: (5 + 3 + 1.5) × 0.70 × 0.85 × 0.80
  const e2Expected = (5 + 3 + 1.5) * 0.70 * 0.85 * 0.80
  assert(approx(e2.score, e2Expected, 0.02), `empresa 2 score correto`, `esperado: ${e2Expected.toFixed(2)}, obtido: ${e2.score.toFixed(2)}`)
  assert(ico > 0 && !isNaN(ico), `ICO total positivo e válido: ${ico.toFixed(2)}`)
})

// ─── Caso 6: campos opcionais vazios — sem NaN, sem carga fantasma ────────────

suite('Caso 6 — campos opcionais nulos/vazios, sem NaN', () => {
  const r = calcCompanyICO({})  // tudo null/undefined

  assert(!isNaN(r.score), 'score não é NaN')
  assert(r.score > 0, `score > 0 (só carga fixa = 5.0)`, `obtido: ${r.score}`)
  assert(approx(r.score, 5.0), `score = 5.0 (só carga fixa)`, `obtido: ${r.score}`)
  assert(approx(r.fatorPapel, 1.00), 'fatorPapel default = 1.00')
  assert(approx(r.fatorComplexidade, 1.00), 'fatorComplexidade default = 1.00')
  assert(approx(r.fatorAutomacao, 1.00), 'fatorAutomação default = 1.00')
})

// ─── Faixas ───────────────────────────────────────────────────────────────────

suite('Faixas de capacidade', () => {
  const cfg = DEFAULT_BAND_CONFIG
  assert(calcBand(45.8, cfg) === 'green',    'ICO 45.8 → Capacidade disponível (green)')
  assert(calcBand(70.0, cfg) === 'green',    'ICO 70.0 → ainda green')
  assert(calcBand(70.1, cfg) === 'blue',     'ICO 70.1 → Capacidade adequada (blue)')
  assert(calcBand(85.1, cfg) === 'yellow',   'ICO 85.1 → Atenção (yellow)')
  assert(calcBand(100.1, cfg) === 'orange',  'ICO 100.1 → Sobrecarga (orange)')
  assert(calcBand(120.1, cfg) === 'critical','ICO 120.1 → Sobrecarga Crítica (critical)')
})

// ─── Resultado final ──────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`)
console.log(`Resultado: ${passed} aprovados, ${failed} reprovados`)
if (failed > 0) {
  console.error('❌ TESTES FALHARAM')
  process.exit(1)
} else {
  console.log('✅ TODOS OS TESTES PASSARAM')
}
