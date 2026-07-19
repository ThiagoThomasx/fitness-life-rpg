// Motor de tendências de progresso corporal — Sprint 19.
// Módulo puro: nunca persiste nada, apenas deriva tendências e comparações a
// partir de `BodyProgressEntry[]` já carregadas. Nunca classifica corpos,
// nunca promete resultado, nunca declara um período "vencedor" — toda saída é
// descritiva (valores, variação, tendência), nunca prescritiva.

import { classifyTrend, DEFAULT_TREND_CONFIG, type TrendClassificationConfig, type TrendClassification } from './trend-math'
import type { BodyProgressEntry, MeasurementField } from './body-progress'

export type BodyMetricTrend = TrendClassification

export type BodyTrendConfig = TrendClassificationConfig

export const DEFAULT_BODY_TREND_CONFIG: BodyTrendConfig = DEFAULT_TREND_CONFIG

export interface BodyMetricSummary {
  metric: string
  firstValue?: number
  latestValue?: number
  absoluteChange?: number
  percentageChange?: number
  trend: BodyMetricTrend
  sampleSize: number
  firstRecordedAt?: string
  latestRecordedAt?: string
}

function insufficientSummary(metric: string, sampleSize = 0): BodyMetricSummary {
  return { metric, trend: 'insufficient_data', sampleSize }
}

function summarizeSeries(
  metric: string,
  points: { date: string; value: number }[],
  config: BodyTrendConfig
): BodyMetricSummary {
  if (points.length === 0) return insufficientSummary(metric)

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const classification = classifyTrend(sorted, config)
  const absoluteChange = last.value - first.value
  const percentageChange = first.value !== 0 ? (absoluteChange / first.value) * 100 : undefined

  return {
    metric,
    firstValue: first.value,
    latestValue: last.value,
    absoluteChange,
    percentageChange,
    trend: classification.trend,
    sampleSize: sorted.length,
    firstRecordedAt: first.date,
    latestRecordedAt: last.date,
  }
}

/** Tendência de peso corporal a partir de todos os registros com peso preenchido. */
export function summarizeWeightTrend(
  entries: BodyProgressEntry[],
  config: BodyTrendConfig = DEFAULT_BODY_TREND_CONFIG
): BodyMetricSummary {
  const points = entries
    .filter((e) => e.weightKg !== undefined)
    .map((e) => ({ date: e.recordedAt, value: e.weightKg as number }))
  return summarizeSeries('weight', points, config)
}

function extractMeasurementValue(entry: BodyProgressEntry, field: string): number | undefined {
  const measurements = entry.measurements
  if (!measurements) return undefined
  if (field in measurements && field !== 'custom') {
    return (measurements as unknown as Record<string, number | undefined>)[field]
  }
  return measurements.custom?.find((c) => c.id === field)?.valueCm
}

/** Tendência de uma medida específica (campo nomeado ou id de medida customizada). */
export function summarizeMeasurementTrend(
  entries: BodyProgressEntry[],
  field: MeasurementField | string,
  config: BodyTrendConfig = DEFAULT_BODY_TREND_CONFIG
): BodyMetricSummary {
  const points: { date: string; value: number }[] = []
  for (const entry of entries) {
    const value = extractMeasurementValue(entry, field)
    if (value !== undefined) points.push({ date: entry.recordedAt, value })
  }
  return summarizeSeries(field, points, config)
}

// ─── Comparação de períodos ──────────────────────────────────────────────────

export interface PeriodRange {
  startDate: string // YYYY-MM-DD, inclusivo
  endDate: string // YYYY-MM-DD, inclusivo
}

export interface PeriodSummary {
  startDate: string
  endDate: string
  entryCount: number
  weightAverage?: number
  weightFirst?: number
  weightLast?: number
  measurementAverages: Record<string, number>
}

function entriesInRange(entries: BodyProgressEntry[], range: PeriodRange): BodyProgressEntry[] {
  return entries
    .filter((e) => e.recordedAt >= range.startDate && e.recordedAt <= range.endDate)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
}

const MEASUREMENT_FIELD_NAMES: MeasurementField[] = [
  'waistCm', 'abdomenCm', 'chestCm', 'hipsCm',
  'rightArmCm', 'leftArmCm', 'rightThighCm', 'leftThighCm',
  'rightCalfCm', 'leftCalfCm', 'neckCm',
]

function summarizePeriod(entries: BodyProgressEntry[], range: PeriodRange): PeriodSummary {
  const inRange = entriesInRange(entries, range)
  const weights = inRange.filter((e) => e.weightKg !== undefined).map((e) => e.weightKg as number)

  const measurementAverages: Record<string, number> = {}
  for (const field of MEASUREMENT_FIELD_NAMES) {
    const values = inRange
      .map((e) => extractMeasurementValue(e, field))
      .filter((v): v is number => v !== undefined)
    if (values.length > 0) {
      measurementAverages[field] = values.reduce((sum, v) => sum + v, 0) / values.length
    }
  }

  return {
    startDate: range.startDate,
    endDate: range.endDate,
    entryCount: inRange.length,
    weightAverage: weights.length > 0 ? weights.reduce((sum, v) => sum + v, 0) / weights.length : undefined,
    weightFirst: weights.length > 0 ? weights[0] : undefined,
    weightLast: weights.length > 0 ? weights[weights.length - 1] : undefined,
    measurementAverages,
  }
}

export interface PeriodComparison {
  periodA: PeriodSummary
  periodB: PeriodSummary
}

/** Compara dois períodos lado a lado — nunca declara um "vencedor", só descreve. */
export function comparePeriods(
  entries: BodyProgressEntry[],
  rangeA: PeriodRange,
  rangeB: PeriodRange
): PeriodComparison {
  return {
    periodA: summarizePeriod(entries, rangeA),
    periodB: summarizePeriod(entries, rangeB),
  }
}
