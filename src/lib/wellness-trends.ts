// Motor de tendências de bem-estar — Sprint 19.
// Consome `WorkoutReadinessCheckIn[]` (estendido com stress/mood na mesma
// sprint) em vez de um domínio de "wellness" separado — ver decisão
// documentada em `readiness-check-ins.ts`. Reaproveita `trend-math.ts` para
// classificar tendências, evitando duplicar a regressão/classificação já
// usada por `body-progress-trends.ts`.
//
// Toda associação com treino é apresentada como associação observada no
// próprio histórico, nunca como causa — ver Fase 20/21 do spec da Sprint 19.
// Abaixo de uma amostra mínima, a função sempre retorna uma mensagem de dados
// insuficientes em vez de uma associação especulativa.

import { classifyTrend, DEFAULT_TREND_CONFIG, type TrendClassificationConfig, type TrendClassification } from './trend-math'
import type { WorkoutReadinessCheckIn } from './readiness-check-ins'
import type { CompletedWorkout } from './workout-history'
import { getWeekStart } from './weekly-plan'

export type WellnessMetricTrend = TrendClassification

export interface WellnessMetricSummary {
  metric: 'energy' | 'soreness' | 'sleepQuality' | 'motivation' | 'stress' | 'mood' | 'sleepHours'
  average?: number
  trend: WellnessMetricTrend
  sampleSize: number
}

const WELLNESS_METRICS = ['energy', 'soreness', 'sleepQuality', 'motivation', 'stress', 'mood', 'sleepHours'] as const

function summarizeMetric(
  checkIns: WorkoutReadinessCheckIn[],
  metric: WellnessMetricSummary['metric'],
  config: TrendClassificationConfig
): WellnessMetricSummary {
  const points = checkIns
    .filter((c) => c[metric] !== undefined)
    .map((c) => ({ date: c.createdAt.slice(0, 10), value: c[metric] as number }))

  if (points.length === 0) return { metric, trend: 'insufficient_data', sampleSize: 0 }

  const classification = classifyTrend(points, config)
  const average = points.reduce((sum, p) => sum + p.value, 0) / points.length

  return { metric, average, trend: classification.trend, sampleSize: points.length }
}

/** Resumo de tendência para cada campo de bem-estar presente no histórico de check-ins. */
export function summarizeWellnessTrends(
  checkIns: WorkoutReadinessCheckIn[],
  config: TrendClassificationConfig = DEFAULT_TREND_CONFIG
): WellnessMetricSummary[] {
  return WELLNESS_METRICS.map((metric) => summarizeMetric(checkIns, metric, config))
}

// ─── Associações com treino ───────────────────────────────────────────────────

export interface WellnessAssociationConfig {
  minimumPairedSamples: number
  minimumWeeks: number
  /** Diferença percentual mínima entre os dois grupos comparados para valer a pena relatar. */
  meaningfulDifferenceThreshold: number
}

export const DEFAULT_WELLNESS_ASSOCIATION_CONFIG: WellnessAssociationConfig = {
  minimumPairedSamples: 8,
  minimumWeeks: 4,
  meaningfulDifferenceThreshold: 10,
}

export type AssociationStatus = 'insufficient_data' | 'no_clear_association' | 'association_found'

export interface AssociationResult {
  status: AssociationStatus
  message: string
  sampleSize: number
}

const INSUFFICIENT_DATA_MESSAGE = 'Ainda não há registros suficientes para comparar bem-estar e treino.'

function medianSplit<T>(items: T[], valueOf: (item: T) => number): { lower: T[]; higher: T[] } {
  const sorted = [...items].sort((a, b) => valueOf(a) - valueOf(b))
  const mid = Math.floor(sorted.length / 2)
  return { lower: sorted.slice(0, mid), higher: sorted.slice(mid) }
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * Associação entre horas de sono registradas e energia do check-in do mesmo
 * dia. Divide as amostras pela mediana de horas de sono e compara a energia
 * média dos dois grupos — nunca infere causa.
 */
export function computeSleepEnergyAssociation(
  checkIns: WorkoutReadinessCheckIn[],
  config: WellnessAssociationConfig = DEFAULT_WELLNESS_ASSOCIATION_CONFIG
): AssociationResult {
  const paired = checkIns.filter((c) => c.sleepHours !== undefined)
  if (paired.length < config.minimumPairedSamples) {
    return { status: 'insufficient_data', message: INSUFFICIENT_DATA_MESSAGE, sampleSize: paired.length }
  }

  const { lower, higher } = medianSplit(paired, (c) => c.sleepHours as number)
  if (lower.length === 0 || higher.length === 0) {
    return { status: 'insufficient_data', message: INSUFFICIENT_DATA_MESSAGE, sampleSize: paired.length }
  }

  const lowerEnergy = average(lower.map((c) => c.energy))
  const higherEnergy = average(higher.map((c) => c.energy))
  const diffPct = lowerEnergy !== 0 ? ((higherEnergy - lowerEnergy) / lowerEnergy) * 100 : 0

  if (Math.abs(diffPct) < config.meaningfulDifferenceThreshold) {
    return {
      status: 'no_clear_association',
      message: 'No seu histórico, não há uma diferença clara de energia entre noites com mais ou menos horas de sono.',
      sampleSize: paired.length,
    }
  }

  const direction = higherEnergy > lowerEnergy ? 'maior' : 'menor'
  return {
    status: 'association_found',
    message: `No seu histórico, os check-ins registrados após noites com mais horas de sono coincidiram com energia média ${direction}.`,
    sampleSize: paired.length,
  }
}

/**
 * Associação entre estresse médio semanal e frequência de treino na mesma
 * semana. Requer um número mínimo de semanas com dados de ambos os lados.
 */
export function computeStressFrequencyAssociation(
  checkIns: WorkoutReadinessCheckIn[],
  workoutHistory: CompletedWorkout[],
  config: WellnessAssociationConfig = DEFAULT_WELLNESS_ASSOCIATION_CONFIG
): AssociationResult {
  const stressByWeek = new Map<string, number[]>()
  for (const checkIn of checkIns) {
    if (checkIn.stress === undefined) continue
    const weekStart = getWeekStart(new Date(checkIn.createdAt))
    const list = stressByWeek.get(weekStart) ?? []
    list.push(checkIn.stress)
    stressByWeek.set(weekStart, list)
  }

  const sessionsByWeek = new Map<string, number>()
  for (const workout of workoutHistory) {
    const weekStart = getWeekStart(new Date(workout.completedAt))
    sessionsByWeek.set(weekStart, (sessionsByWeek.get(weekStart) ?? 0) + 1)
  }

  const weeks: { weekStart: string; avgStress: number; sessionCount: number }[] = []
  for (const [weekStart, stresses] of Array.from(stressByWeek.entries())) {
    weeks.push({
      weekStart,
      avgStress: average(stresses),
      sessionCount: sessionsByWeek.get(weekStart) ?? 0,
    })
  }

  if (weeks.length < config.minimumWeeks) {
    return { status: 'insufficient_data', message: INSUFFICIENT_DATA_MESSAGE, sampleSize: weeks.length }
  }

  const { lower, higher } = medianSplit(weeks, (w) => w.avgStress)
  if (lower.length === 0 || higher.length === 0) {
    return { status: 'insufficient_data', message: INSUFFICIENT_DATA_MESSAGE, sampleSize: weeks.length }
  }

  const lowerFrequency = average(lower.map((w) => w.sessionCount))
  const higherFrequency = average(higher.map((w) => w.sessionCount))
  const diffPct = lowerFrequency !== 0 ? ((higherFrequency - lowerFrequency) / lowerFrequency) * 100 : 0

  if (Math.abs(diffPct) < config.meaningfulDifferenceThreshold) {
    return {
      status: 'no_clear_association',
      message: 'No seu histórico, não há uma diferença clara de frequência de treino entre semanas com mais ou menos estresse registrado.',
      sampleSize: weeks.length,
    }
  }

  const direction = higherFrequency > lowerFrequency ? 'maior' : 'menor'
  return {
    status: 'association_found',
    message: `No seu histórico, semanas com estresse médio mais alto coincidiram com uma frequência de treino ${direction}.`,
    sampleSize: weeks.length,
  }
}
