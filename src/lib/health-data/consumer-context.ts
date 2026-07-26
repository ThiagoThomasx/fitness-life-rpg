// Health Context Adapter — Sprint 28 Parte 4. Única porta de entrada que
// Readiness/Recovery/Fatigue/Coach devem usar para consumir Health Data.
// Eles nunca acessam `aggregation.ts`/`conflicts.ts`/`baseline.ts`/`trends.ts`
// nem `analytics-queries.ts` diretamente — só recebem um `HealthContext` já
// filtrado por qualidade, conflito, amostra e obsolescência (ver
// `HEALTH-DATA-CONSUMERS.md`). Nunca lança para "sem dados" — retorna
// sinais `undefined` e `hasSufficientData: false`, para que o comportamento
// sem Health Data permaneça idêntico ao anterior à Sprint 28.

import {
  getConflicts,
  getDailySummary,
  getMetricBaseline,
  getMetricTrend,
} from './analytics-queries'
import { summaryMetricValue } from './aggregation-shared'
import type { AnalyticsPeriod } from '../analytics/types'
import type {
  DailyHealthSummary,
  HealthDataConflict,
  HealthDataQuality,
  HealthMetricType,
  HealthTrendDirection,
} from './types'

/** Dado é considerado obsoleto para contexto "de hoje" além desse número de dias. */
const OBSOLETE_AFTER_DAYS = 2

export interface HealthMetricSignal {
  value: number
  date: string
  baselineValue?: number
  delta?: number
  trend?: HealthTrendDirection
  quality: HealthDataQuality
  sampleSize: number
  /** `true` somente quando o sinal atende a todos os critérios da regra 8 (CLAUDE.md do brief): válido, qualidade mínima, sem conflito grave, amostra suficiente quando aplicável, e não obsoleto. */
  reliable: boolean
  /** Motivos pelos quais o sinal não é `reliable`, em pt-BR, prontos para exibição. Vazio quando `reliable` é `true`. */
  reasons: string[]
}

export interface HealthContext {
  date: string
  period: AnalyticsPeriod
  sleepMinutes?: HealthMetricSignal
  restingHeartRate?: HealthMetricSignal
  steps?: HealthMetricSignal
  activityMinutes?: HealthMetricSignal
  conflicts: HealthDataConflict[]
  /** `true` quando ao menos um sinal é `reliable` — motores devem só enriquecer quando isto for `true`. */
  hasSufficientData: boolean
}

function daysBetween(date: string, now: Date): number {
  const target = new Date(`${date}T00:00:00.000Z`).getTime()
  const reference = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`).getTime()
  return Math.round((reference - target) / 86_400_000)
}

function buildMetricSignal(
  metric: HealthMetricType,
  summary: DailyHealthSummary,
  period: AnalyticsPeriod,
  now: Date
): HealthMetricSignal | undefined {
  const value = summaryMetricValue(summary, metric)
  if (value === undefined) return undefined

  const metricConflicts = summary.conflicts.filter((c) => c.metric === metric)
  const hasBlockingConflict = metricConflicts.some((c) => c.severity === 'medium' || c.severity === 'high')
  const baseline = getMetricBaseline(metric, period, now)
  const trend = getMetricTrend(metric, period, now)
  const isObsolete = daysBetween(summary.date, now) > OBSOLETE_AFTER_DAYS

  const reasons: string[] = []
  if (summary.quality.level === 'low') reasons.push('Qualidade dos dados baixa nesse dia.')
  if (hasBlockingConflict) reasons.push('Conflito entre fontes detectado para esta métrica neste dia.')
  if (!baseline) reasons.push('Amostra insuficiente para calcular uma linha de base confiável.')
  if (isObsolete) reasons.push('Dado desatualizado para o período analisado.')

  return {
    value,
    date: summary.date,
    baselineValue: baseline?.value,
    delta: baseline ? value - baseline.value : undefined,
    trend: trend.sampleSize > 0 ? trend.direction : undefined,
    quality: summary.quality,
    sampleSize: baseline?.sampleSize ?? 0,
    reliable: reasons.length === 0,
    reasons,
  }
}

/**
 * Constrói o contexto de saúde de um dia específico (`YYYY-MM-DD`). `period`
 * define a janela usada para baseline/tendência (padrão `30d`, alinhado ao
 * mínimo de amostra da maioria das métricas — ver `baseline.ts`).
 *
 * Retorna sempre um objeto válido, mesmo sem nenhum registro de saúde — os
 * campos de métrica ficam `undefined` e `hasSufficientData` é `false`. Isso é
 * o que garante que Readiness/Recovery/Fatigue/Coach continuem funcionando
 * de forma idêntica para quem nunca usou Health Data.
 */
export function buildHealthContext(date: string, period: AnalyticsPeriod = '30d', now: Date = new Date()): HealthContext {
  const summary = getDailySummary(date)

  if (!summary) {
    return {
      date,
      period,
      conflicts: [],
      hasSufficientData: false,
    }
  }

  const sleepMinutes = buildMetricSignal('sleep_duration', summary, period, now)
  const restingHeartRate = buildMetricSignal('resting_heart_rate', summary, period, now)
  const steps = buildMetricSignal('steps', summary, period, now)
  const activityMinutes = buildMetricSignal('activity_duration', summary, period, now)

  const hasSufficientData = [sleepMinutes, restingHeartRate, steps, activityMinutes].some((s) => s?.reliable)

  return {
    date,
    period,
    sleepMinutes,
    restingHeartRate,
    steps,
    activityMinutes,
    conflicts: summary.conflicts,
    hasSufficientData,
  }
}

/**
 * Contexto do dia de `now`, pronto para consumidores que só se importam com
 * "hoje" (Readiness, Recovery) — evita duplicar a lógica de gating em cada
 * motor. Retorna `undefined` quando não há dados confiáveis o suficiente,
 * para que o comportamento sem Health Data permaneça idêntico.
 */
export function buildTodayHealthContext(period: AnalyticsPeriod = '30d', now: Date = new Date()): HealthContext | undefined {
  const dateKey = now.toISOString().slice(0, 10)
  const context = buildHealthContext(dateKey, period, now)
  return context.hasSufficientData ? context : undefined
}

/**
 * Conflitos relevantes de um período — usado por Coach para decidir se deve
 * rebaixar confiança de uma regra inteira mesmo quando o dia individual não
 * tem conflito (ex.: conflito recorrente na mesma métrica ao longo da semana).
 */
export function getRecentConflicts(period: AnalyticsPeriod, now: Date = new Date()): HealthDataConflict[] {
  return getConflicts(period, now)
}
