// Tendências — Sprint 28 Parte 3. Reaproveita o motor de classificação já
// usado por Body Progress e Wellness (`trend-math.ts`) em vez de reimplementar
// regressão linear para saúde — a série de entrada é apenas a métrica
// extraída dos resumos diários já agregados (ver `HEALTH-DATA-TRENDS.md`).

import { METRIC_LABELS, summaryMetricValue } from './aggregation-shared'
import { DEFAULT_TREND_CONFIG, classifyTrend } from '../trend-math'
import type { TrendPoint } from '../trend-math'
import type { DailyHealthSummary, HealthMetricTrend, HealthMetricType, HealthTrendDirection } from './types'

function buildSeries(summaries: readonly DailyHealthSummary[], metric: HealthMetricType): TrendPoint[] {
  const points: TrendPoint[] = []
  for (const summary of summaries) {
    const value = summaryMetricValue(summary, metric)
    if (value !== undefined) points.push({ date: summary.date, value })
  }
  return points
}

function buildEvidence(
  metric: HealthMetricType,
  periodDays: number,
  sampleSize: number,
  direction: HealthTrendDirection,
  changeAbsolute: number | null
): string {
  const label = METRIC_LABELS[metric]

  if (direction === 'insufficient_data') {
    return `${label}: dados insuficientes nos últimos ${periodDays} dias (${sampleSize} dia(s) com registro).`
  }
  if (direction === 'irregular') {
    return `${label}: variação irregular nos últimos ${periodDays} dias (${sampleSize} amostra(s)), sem direção clara.`
  }

  const directionLabel = direction === 'increasing' ? 'crescente' : direction === 'decreasing' ? 'decrescente' : 'estável'
  const changeLabel = changeAbsolute !== null && Math.abs(changeAbsolute) >= 0.01 ? ` (${changeAbsolute > 0 ? '+' : ''}${changeAbsolute.toFixed(1)})` : ''

  return `${label}: tendência ${directionLabel} nos últimos ${periodDays} dias (${sampleSize} amostra(s))${changeLabel}.`
}

/**
 * Classifica a tendência de uma métrica a partir dos resumos diários de um
 * período (ver `analytics-queries.ts` para a resolução do período). Nunca
 * atribui causalidade — apenas descreve o formato da série recente.
 */
export function computeMetricTrend(
  summaries: readonly DailyHealthSummary[],
  metric: HealthMetricType,
  periodDays: number
): HealthMetricTrend {
  const series = buildSeries(summaries, metric)
  const result = classifyTrend(series)

  const windowSize = Math.min(result.sampleSize, DEFAULT_TREND_CONFIG.recentWindowEntries)
  const changeAbsolute = result.slopePerEntry !== null ? result.slopePerEntry * (windowSize - 1) : null

  return {
    metric,
    periodDays,
    direction: result.trend,
    sampleSize: result.sampleSize,
    windowedAverage: result.windowedAverage,
    changeAbsolute,
    evidence: buildEvidence(metric, periodDays, result.sampleSize, result.trend, changeAbsolute),
  }
}
