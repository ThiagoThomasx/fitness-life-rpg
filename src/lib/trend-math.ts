// Motor compartilhado de classificação de tendência — Sprint 19.
// Usado por `body-progress-trends.ts` e `wellness-trends.ts` para evitar
// duplicar a mesma lógica de "classificar uma série numérica ao longo do
// tempo" em dois domínios. Método único e documentado: regressão linear
// simples sobre uma janela recente, com detecção de irregularidade por
// inversões de direção. Nunca produz causalidade — apenas classifica o
// formato da série (`increasing`/`stable`/`decreasing`/`irregular`).

export interface TrendPoint {
  date: string
  value: number
}

export interface TrendClassificationConfig {
  minimumSamples: number
  recentWindowEntries: number
  stableTolerancePercentage: number
  /** Fração (0–1) de inversões de direção na janela recente acima da qual a série é `irregular`. */
  irregularityThreshold: number
}

export type TrendClassification = 'increasing' | 'stable' | 'decreasing' | 'irregular' | 'insufficient_data'

export interface TrendResult {
  trend: TrendClassification
  sampleSize: number
  windowedAverage: number | null
  slopePerEntry: number | null
}

export const DEFAULT_TREND_CONFIG: TrendClassificationConfig = {
  minimumSamples: 3,
  recentWindowEntries: 5,
  stableTolerancePercentage: 2,
  irregularityThreshold: 0.5,
}

/** Regressão linear (mínimos quadrados) de `value` sobre o índice (0..n-1) — janela igualmente espaçada por ordem, não por tempo real. */
function linearRegressionSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const xMean = (n - 1) / 2
  const yMean = values.reduce((sum, v) => sum + v, 0) / n

  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += (i - xMean) ** 2
  }
  return denominator === 0 ? 0 : numerator / denominator
}

function countDirectionFlips(values: number[]): number {
  let flips = 0
  let lastSign = 0
  for (let i = 1; i < values.length; i++) {
    const delta = values[i] - values[i - 1]
    const sign = delta > 0 ? 1 : delta < 0 ? -1 : 0
    if (sign !== 0 && lastSign !== 0 && sign !== lastSign) flips++
    if (sign !== 0) lastSign = sign
  }
  return flips
}

/**
 * Classifica a tendência recente de uma série cronológica. A série de entrada
 * não precisa estar ordenada — é ordenada internamente por `date`.
 */
export function classifyTrend(
  series: TrendPoint[],
  config: TrendClassificationConfig = DEFAULT_TREND_CONFIG
): TrendResult {
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date))
  const sampleSize = sorted.length

  if (sampleSize < config.minimumSamples) {
    return { trend: 'insufficient_data', sampleSize, windowedAverage: null, slopePerEntry: null }
  }

  const windowed = sorted.slice(-config.recentWindowEntries)
  const values = windowed.map((p) => p.value)
  const windowedAverage = values.reduce((sum, v) => sum + v, 0) / values.length

  const slope = linearRegressionSlope(values)
  const totalChange = slope * (values.length - 1)
  const percentChange = windowedAverage !== 0 ? (totalChange / windowedAverage) * 100 : 0

  // Estabilidade tem prioridade sobre irregularidade: ruído pequeno em torno
  // de uma linha praticamente reta não deve ser tratado como "irregular".
  if (Math.abs(percentChange) <= config.stableTolerancePercentage) {
    return { trend: 'stable', sampleSize, windowedAverage, slopePerEntry: slope }
  }

  const flips = countDirectionFlips(values)
  const flipRatio = values.length > 2 ? flips / (values.length - 2) : 0
  if (flipRatio >= config.irregularityThreshold) {
    return { trend: 'irregular', sampleSize, windowedAverage, slopePerEntry: null }
  }

  return {
    trend: slope > 0 ? 'increasing' : 'decreasing',
    sampleSize,
    windowedAverage,
    slopePerEntry: slope,
  }
}
