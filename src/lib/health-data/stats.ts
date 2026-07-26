// Estatística básica — Sprint 28 Parte 3. Não existe um `stats.ts` compartilhado
// no projeto (cada domínio calcula média via `reduce` ad hoc) — este módulo
// fica local a `health-data/` porque baseline/agregação são os únicos
// consumidores de mediana/desvio padrão hoje (YAGNI: não promovido a um
// utilitário global especulativo).

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** Desvio padrão populacional (não amostral) — consistente com o uso descritivo, não inferencial, do baseline. */
export function standardDeviation(values: readonly number[]): number {
  if (values.length === 0) return 0
  const avg = mean(values)
  const variance = mean(values.map((v) => (v - avg) ** 2))
  return Math.sqrt(variance)
}

export function max(values: readonly number[]): number | null {
  return values.length === 0 ? null : Math.max(...values)
}

export interface TimeInterval {
  startMs: number
  endMs: number
}

/**
 * Soma a duração total (ms) de um conjunto de intervalos, mesclando os que se
 * sobrepõem para nunca contar o mesmo período duas vezes — usado por sono e
 * duração de atividade, onde duas fontes podem reportar o mesmo intervalo
 * (ex.: sono 23:00–07:00 registrado duas vezes não pode virar 16 horas).
 */
export function sumMergedIntervalsMs(intervals: readonly TimeInterval[]): number {
  if (intervals.length === 0) return 0
  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs)

  let total = 0
  let currentStart = sorted[0].startMs
  let currentEnd = sorted[0].endMs

  for (let i = 1; i < sorted.length; i++) {
    const interval = sorted[i]
    if (interval.startMs <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.endMs)
    } else {
      total += currentEnd - currentStart
      currentStart = interval.startMs
      currentEnd = interval.endMs
    }
  }
  total += currentEnd - currentStart

  return total
}
