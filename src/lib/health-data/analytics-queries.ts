// Camada de consulta — Sprint 28 Parte 3. Único ponto de entrada que motores
// consumidores futuros (Readiness/Recovery/Fatigue/Coach — Parte 4) devem
// usar. Eles nunca precisam saber de deduplicação, conflitos, qualidade ou
// baseline por dentro — só recebem consultas prontas, determinísticas e
// explicáveis. Todas as consultas aceitam o mesmo vocabulário de período já
// usado pelo módulo de Analytics (`7d/30d/90d/6m/1y/all`).

import { filterByDateRange, resolvePeriodRange } from '../analytics/helpers'
import type { AnalyticsPeriod, DateRange } from '../analytics/types'
import { buildDailySummaries, buildDailySummaryForDate } from './aggregation'
import { computeMetricBaseline } from './baseline'
import { detectConflicts } from './conflicts'
import { getAllHealthRecords } from './queries'
import { computeMetricTrend } from './trends'
import type {
  DailyHealthSummary,
  HealthDataConflict,
  HealthDataQuality,
  HealthDataRecord,
  HealthMetricBaseline,
  HealthMetricTrend,
  HealthMetricType,
} from './types'

const PERIOD_DAY_ESTIMATE: Record<AnalyticsPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '6m': 182,
  '1y': 365,
  all: 0,
}

/**
 * Para períodos fixos, usa a estimativa em dias corridos. Para `'all'`, não
 * há duração fixa — usa o intervalo real entre o primeiro e o último dia com
 * dado no conjunto filtrado, que é o número que faz sentido mostrar na UI.
 */
function resolvePeriodDays(period: AnalyticsPeriod, summaries: readonly DailyHealthSummary[]): number {
  if (period !== 'all') return PERIOD_DAY_ESTIMATE[period]
  if (summaries.length === 0) return 0

  const times = summaries.map((s) => new Date(s.date).getTime())
  const spanMs = Math.max(...times) - Math.min(...times)
  return Math.round(spanMs / 86_400_000) + 1
}

function getRecordsForPeriod(period: AnalyticsPeriod, now: Date, range: DateRange = resolvePeriodRange(period, now)): HealthDataRecord[] {
  return filterByDateRange(getAllHealthRecords(), range, (r) => r.recordedAt)
}

/** Resumos diários de um período, mais recente primeiro. */
export function getSummaryRange(period: AnalyticsPeriod, now: Date = new Date()): DailyHealthSummary[] {
  return buildDailySummaries(getRecordsForPeriod(period, now))
}

/** Resumo de um único dia (`YYYY-MM-DD`), considerando todo o histórico — não é limitado por período. */
export function getDailySummary(date: string): DailyHealthSummary | null {
  return buildDailySummaryForDate(getAllHealthRecords(), date)
}

/** O resumo mais recente disponível, ou `null` quando não há nenhum registro de saúde ainda. */
export function getLatestSummary(): DailyHealthSummary | null {
  const summaries = buildDailySummaries(getAllHealthRecords())
  return summaries[0] ?? null
}

/** Conflitos entre fontes detectados dentro de um período. */
export function getConflicts(period: AnalyticsPeriod, now: Date = new Date()): HealthDataConflict[] {
  return detectConflicts(getRecordsForPeriod(period, now))
}

/** Qualidade agregada de um dia específico, ou `null` quando não há resumo para essa data. */
export function getQuality(date: string): HealthDataQuality | null {
  return getDailySummary(date)?.quality ?? null
}

/** Baseline de uma métrica dentro de um período — `null` quando a amostra válida está abaixo do mínimo exigido (ver `baseline.ts`). */
export function getMetricBaseline(
  metric: HealthMetricType,
  period: AnalyticsPeriod,
  now: Date = new Date()
): HealthMetricBaseline | null {
  const summaries = getSummaryRange(period, now)
  return computeMetricBaseline(summaries, metric, resolvePeriodDays(period, summaries))
}

/** Tendência de uma métrica dentro de um período (ver `trends.ts`). */
export function getMetricTrend(metric: HealthMetricType, period: AnalyticsPeriod, now: Date = new Date()): HealthMetricTrend {
  const summaries = getSummaryRange(period, now)
  return computeMetricTrend(summaries, metric, resolvePeriodDays(period, summaries))
}
