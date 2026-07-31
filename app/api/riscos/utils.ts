export function calcLevel(prob: number, impact: number): string {
  const score = prob * impact
  if (score >= 15) return 'CRITICO'
  if (score >= 9)  return 'ALTO'
  if (score >= 4)  return 'MEDIO'
  return 'BAIXO'
}
