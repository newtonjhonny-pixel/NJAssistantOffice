export function calcStatus(val: number | null, target: number | null, min: number | null): string {
  if (val === null || val === undefined) return 'SEM_DADOS'
  if (target !== null && val >= target) return 'VERDE'
  if (min    !== null && val >= min)    return 'AMARELO'
  return 'VERMELHO'
}
