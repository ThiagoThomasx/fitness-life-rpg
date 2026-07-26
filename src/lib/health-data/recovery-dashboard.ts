// Health Recovery Dashboard — Sprint 29 Parte 2. Agregador puro de página:
// compõe summaries, baselines, tendências, qualidade, conflitos e a série
// diária já prontos pelos motores da Parte 3 da Sprint 28 — não recalcula
// nada, não duplica lógica de `aggregation.ts`/`baseline.ts`/`trends.ts`.
// Uma única chamada por carregamento de página (`buildHealthRecoveryDashboard`),
// para evitar recomputar cada card separadamente (ver seção 31 do brief da
// Sprint 29 — performance).

import type { AnalyticsPeriod } from '../analytics/types'
import { summaryMetricValue } from './aggregation-shared'
import { getWeightRecordsFromBodyProgress } from './body-progress-adapter'
import { getConflicts, getMetricBaseline, getMetricTrend, getSummaryRange } from './analytics-queries'
import type {
  DailyHealthSummary,
  HealthDataConflict,
  HealthDataQualityLevel,
  HealthMetricBaseline,
  HealthMetricTrend,
  HealthMetricType,
} from './types'

export interface HealthRecoveryMetricView {
  metric: HealthMetricType
  latestValue: number | null
  latestDate: string | null
  baseline: HealthMetricBaseline | null
  trend: HealthMetricTrend
  deltaFromBaseline: number | null
  daysAboveBaseline: number
  daysBelowBaseline: number
  sampleDays: number
}

export interface HealthRecoveryWeightView {
  latestKg: number | null
  latestDate: string | null
  sampleSize: number
}

export interface HealthRecoveryQualityBreakdown {
  high: number
  medium: number
  low: number
  unknown: number
  daysWithData: number
}

export interface HealthRecoveryDashboard {
  period: AnalyticsPeriod
  generatedAt: string
  hasAnyData: boolean
  /** Ordem cronológica (mais antigo primeiro) — pronta para gráficos. */
  dailySeries: DailyHealthSummary[]
  sleep: HealthRecoveryMetricView
  restingHeartRate: HealthRecoveryMetricView
  steps: HealthRecoveryMetricView
  activityMinutes: HealthRecoveryMetricView
  activeCalories: HealthRecoveryMetricView
  distance: HealthRecoveryMetricView
  weight: HealthRecoveryWeightView
  conflicts: HealthDataConflict[]
  quality: HealthRecoveryQualityBreakdown
}

const DASHBOARD_METRICS: readonly HealthMetricType[] = [
  'sleep_duration',
  'resting_heart_rate',
  'steps',
  'activity_duration',
  'active_calories',
  'distance',
]

function buildMetricView(
  metric: HealthMetricType,
  summaries: readonly DailyHealthSummary[],
  period: AnalyticsPeriod,
  now: Date
): HealthRecoveryMetricView {
  const withValue = summaries.filter((s) => summaryMetricValue(s, metric) !== undefined)
  const latest = withValue[0] ?? null
  const baseline = getMetricBaseline(metric, period, now)
  const trend = getMetricTrend(metric, period, now)
  const latestValue = latest ? summaryMetricValue(latest, metric)! : null

  let daysAboveBaseline = 0
  let daysBelowBaseline = 0
  if (baseline) {
    for (const summary of withValue) {
      const value = summaryMetricValue(summary, metric)!
      if (value > baseline.value) daysAboveBaseline++
      else if (value < baseline.value) daysBelowBaseline++
    }
  }

  return {
    metric,
    latestValue,
    latestDate: latest?.date ?? null,
    baseline,
    trend,
    deltaFromBaseline: baseline && latestValue !== null ? latestValue - baseline.value : null,
    daysAboveBaseline,
    daysBelowBaseline,
    sampleDays: withValue.length,
  }
}

function buildWeightView(): HealthRecoveryWeightView {
  const records = getWeightRecordsFromBodyProgress()
  if (records.length === 0) return { latestKg: null, latestDate: null, sampleSize: 0 }

  const sorted = [...records].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
  return {
    latestKg: sorted[0].value,
    latestDate: sorted[0].recordedAt.slice(0, 10),
    sampleSize: records.length,
  }
}

function buildQualityBreakdown(summaries: readonly DailyHealthSummary[]): HealthRecoveryQualityBreakdown {
  const breakdown: HealthRecoveryQualityBreakdown = { high: 0, medium: 0, low: 0, unknown: 0, daysWithData: summaries.length }
  for (const summary of summaries) {
    breakdown[summary.quality.level as HealthDataQualityLevel]++
  }
  return breakdown
}

/**
 * Ponto de entrada único da experiência de Recuperação (Sprint 29 Parte 2).
 * Nunca lança para "sem dados" — todos os campos de métrica ficam com valores
 * `null`/vazios e `hasAnyData` é `false`, para que a página renderize um
 * estado vazio explícito em vez de quebrar.
 */
export function buildHealthRecoveryDashboard(
  period: AnalyticsPeriod = '30d',
  now: Date = new Date()
): HealthRecoveryDashboard {
  const summaries = getSummaryRange(period, now)
  const dailySeries = [...summaries].reverse()

  const sleep = buildMetricView('sleep_duration', summaries, period, now)
  const restingHeartRate = buildMetricView('resting_heart_rate', summaries, period, now)
  const steps = buildMetricView('steps', summaries, period, now)
  const activityMinutes = buildMetricView('activity_duration', summaries, period, now)
  const activeCalories = buildMetricView('active_calories', summaries, period, now)
  const distance = buildMetricView('distance', summaries, period, now)
  const weight = buildWeightView()

  const hasAnyData =
    summaries.length > 0 ||
    weight.sampleSize > 0

  return {
    period,
    generatedAt: now.toISOString(),
    hasAnyData,
    dailySeries,
    sleep,
    restingHeartRate,
    steps,
    activityMinutes,
    activeCalories,
    distance,
    weight,
    conflicts: getConflicts(period, now),
    quality: buildQualityBreakdown(summaries),
  }
}

export { DASHBOARD_METRICS }
