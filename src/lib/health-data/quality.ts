// Qualidade dos dados — Sprint 28. Não é um score arbitrário único: retorna
// um nível (`high`/`medium`/`low`/`unknown`) mais as razões que levaram a ele,
// para que a UI e os motores consumidores possam explicar a classificação.

import { METRIC_RANGES } from './validation'
import type { HealthDataQuality, HealthDataSource, HealthMetricType, NewHealthDataRecordInput } from './types'

/** Fontes de entrada direta do usuário — tendem a ser mais confiáveis que import em lote. */
const DIRECT_SOURCES: readonly HealthDataSource[] = ['manual', 'wellness', 'body_progress', 'workout']

const INTERVAL_METRICS: readonly HealthMetricType[] = ['sleep_duration', 'activity_duration']

function isNearRangeEdge(metric: HealthMetricType, value: number): boolean {
  const range = METRIC_RANGES[metric]
  const span = range.max - range.min
  if (span <= 0) return false
  const margin = span * 0.03
  return value - range.min < margin || range.max - value < margin
}

/**
 * Calcula a qualidade de um único registro no momento da entrada/importação.
 * Não considera conflitos entre fontes ou duplicidade — isso é avaliado em
 * conjunto com os demais registros do mesmo dia (ver `aggregation.ts`, Parte 3).
 */
export function computeRecordQuality(input: NewHealthDataRecordInput): HealthDataQuality {
  const reasons: string[] = []

  const isDirectSource = DIRECT_SOURCES.includes(input.source)
  if (!isDirectSource) reasons.push(`fonte de importação (${input.source})`)

  const hasInterval = input.startAt !== undefined && input.endAt !== undefined
  if (INTERVAL_METRICS.includes(input.metric) && !hasInterval) {
    reasons.push('sem início/fim do intervalo')
  }

  if (isNearRangeEdge(input.metric, input.value)) {
    reasons.push('valor próximo ao limite plausível')
  }

  if (reasons.length === 0) {
    return { level: 'high', reasons: ['fonte direta, valor plausível, dados completos'] }
  }

  if (!isDirectSource && reasons.length > 1) {
    return { level: 'low', reasons }
  }

  return { level: 'medium', reasons }
}
