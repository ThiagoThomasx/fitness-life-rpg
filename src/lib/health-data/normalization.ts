// Normalização — Sprint 28. Converte unidades de entrada para a unidade
// canônica interna (`METRIC_UNITS`) e monta o `HealthDataRecord` final.
// Conversão só acontece aqui; o resto do domínio assume unidade canônica.

import { METRIC_UNITS } from './types'
import type { HealthDataQualityLevel, HealthDataRecord, HealthMetricType, NewHealthDataRecordInput } from './types'

/** Unidades alternativas aceitas na entrada, por métrica, e o fator para a unidade canônica. */
const UNIT_CONVERSIONS: Partial<Record<HealthMetricType, Record<string, number>>> = {
  weight: { kg: 1, lb: 0.45359237 },
  distance: { km: 1, m: 0.001, mi: 1.609344 },
  sleep_duration: { minutes: 1, hours: 60, seconds: 1 / 60 },
  activity_duration: { minutes: 1, hours: 60, seconds: 1 / 60 },
  active_calories: { kcal: 1, cal: 0.001 },
}

export interface NormalizedValue {
  value: number
  unit: string
  originalUnit?: string
}

/**
 * Converte `value`/`unit` de entrada para a unidade canônica da métrica.
 * Unidade ausente ou já canônica não faz conversão. Unidade desconhecida
 * é rejeitada (retorna `null`) — nunca aceita silenciosamente.
 */
export function normalizeUnit(
  metric: HealthMetricType,
  value: number,
  unit?: string
): NormalizedValue | null {
  const canonicalUnit = METRIC_UNITS[metric]
  if (!unit || unit === canonicalUnit) {
    return { value, unit: canonicalUnit }
  }

  const conversions = UNIT_CONVERSIONS[metric]
  const factor = conversions?.[unit]
  if (factor === undefined) return null

  return { value: value * factor, unit: canonicalUnit, originalUnit: unit }
}

function generateRecordId(metric: HealthMetricType): string {
  return `health-${metric}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Monta o `HealthDataRecord` final a partir de um input já validado e de uma
 * unidade já normalizada. `quality` é calculado separadamente (`quality.ts`)
 * para manter as duas responsabilidades isoladas e testáveis.
 */
export function buildHealthDataRecord(
  input: NewHealthDataRecordInput,
  normalized: NormalizedValue,
  quality: HealthDataQualityLevel
): HealthDataRecord {
  const metadata =
    normalized.originalUnit !== undefined
      ? { ...input.metadata, originalUnit: normalized.originalUnit }
      : input.metadata

  return {
    id: generateRecordId(input.metric),
    metric: input.metric,
    value: normalized.value,
    unit: normalized.unit,
    recordedAt: input.recordedAt,
    startAt: input.startAt,
    endAt: input.endAt,
    source: input.source,
    externalId: input.externalId,
    importedAt: new Date().toISOString(),
    quality,
    metadata,
  }
}
