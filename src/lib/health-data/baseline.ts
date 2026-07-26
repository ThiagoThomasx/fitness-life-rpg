// Baseline — Sprint 28 Parte 3. Calcula uma linha de base por métrica a
// partir dos resumos diários já agregados (nunca dos registros brutos
// diretamente — reaproveita a mesma agregação usada por conflitos/qualidade).
// Nunca gera baseline com amostra insuficiente (ver `HEALTH-DATA-BASELINES.md`
// para a tabela de mínimos e a justificativa de cada limiar).

import { summaryMetricValue } from './aggregation-shared'
import { mean, median, standardDeviation } from './stats'
import type { DailyHealthSummary, HealthDataQuality, HealthMetricBaseline, HealthMetricType } from './types'

/**
 * Amostra mínima de dias com dado válido para gerar um baseline confiável por
 * métrica. Sono, FC de repouso e passos exigem uma semana cheia (variam por
 * dia da semana); peso muda devagar, então 5 dias já é representativo. As
 * demais métricas usam o mesmo piso de peso (5) por padrão, na ausência de um
 * limiar específico definido pelo produto.
 */
const MIN_BASELINE_SAMPLES: Record<HealthMetricType, number> = {
  sleep_duration: 7,
  resting_heart_rate: 7,
  steps: 7,
  weight: 5,
  sleep_quality: 5,
  active_calories: 5,
  activity_duration: 5,
  distance: 5,
  wellness_energy: 5,
  wellness_soreness: 5,
  wellness_motivation: 5,
}

/**
 * Confiança relativa ao mínimo da própria métrica, não ao limiar genérico de
 * `sampleConfidence` (`analytics/helpers.ts`) — aquele é calibrado para
 * contagem de sessões de treino (0-6+), faixa incompatível com os 7-365 dias
 * relevantes para baseline de saúde. Uma amostra apenas no mínimo exigido é
 * `medium`; o dobro do mínimo (mais uma semana extra de dados) já é `high`.
 */
function baselineQuality(sampleSize: number, minSamples: number): HealthDataQuality {
  const reasons = [`${sampleSize} dia(s) com dado válido (mínimo exigido: ${minSamples})`]
  const level = sampleSize >= minSamples * 2 ? 'high' : 'medium'
  return { level, reasons }
}

/**
 * Calcula o baseline de uma métrica a partir de resumos diários já
 * construídos (ver `aggregation.ts`). Retorna `null` quando a amostra válida
 * está abaixo do mínimo exigido para a métrica — nunca um baseline de baixa
 * confiança silencioso.
 */
export function computeMetricBaseline(
  summaries: readonly DailyHealthSummary[],
  metric: HealthMetricType,
  periodDays: number
): HealthMetricBaseline | null {
  const values = summaries
    .map((s) => summaryMetricValue(s, metric))
    .filter((v): v is number => v !== undefined)

  const minSamples = MIN_BASELINE_SAMPLES[metric]
  if (values.length < minSamples) return null

  return {
    metric,
    periodDays,
    value: mean(values),
    median: median(values),
    standardDeviation: standardDeviation(values),
    sampleSize: values.length,
    quality: baselineQuality(values.length, minSamples),
  }
}

export function getMinimumBaselineSamples(metric: HealthMetricType): number {
  return MIN_BASELINE_SAMPLES[metric]
}
