// Health × Training Relationships — Sprint 29 Parte 3. Motor puro que compara
// treino/prontidão em dias com um sinal de saúde abaixo da linha de base
// contra dias com o sinal na baseline ou acima. Nunca afirma causalidade —
// só descreve diferença observada entre dois grupos, com amostra mínima
// explícita (ver `HEALTH-TRAINING-RELATIONSHIPS.md`).

import { resolvePeriodRange } from '../analytics/helpers'
import type { AnalyticsPeriod } from '../analytics/types'
import { getCheckIns, type WorkoutReadinessCheckIn } from '../readiness-check-ins'
import { sessionVolumeKg } from '../training-load'
import { getWorkoutHistory, type CompletedWorkout } from '../workout-history'
import { getMetricBaseline, getSummaryRange } from './analytics-queries'
import { summaryMetricValue, METRIC_LABELS } from './aggregation-shared'
import type { HealthMetricType } from './types'

/** Amostra mínima por grupo para gerar uma relação (seção 20 do brief da Sprint 29). */
export const MIN_RELATIONSHIP_GROUP_SAMPLE = 5

export type HealthRelationshipOutcome = 'session_volume' | 'reported_readiness'

export interface HealthTrainingRelationshipGroup {
  label: string
  sampleSize: number
  averageOutcome: number | null
}

export interface HealthTrainingRelationship {
  id: string
  label: string
  healthMetric: HealthMetricType
  outcome: HealthRelationshipOutcome
  period: AnalyticsPeriod
  minSampleRequired: number
  sufficientSample: boolean
  belowBaseline: HealthTrainingRelationshipGroup
  atOrAboveBaseline: HealthTrainingRelationshipGroup
  evidenceText: string
}

const OUTCOME_LABELS: Record<HealthRelationshipOutcome, string> = {
  session_volume: 'volume médio de treino (kg)',
  reported_readiness: 'nível médio de prontidão auto-relatado (check-in, 1-5)',
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function sessionVolumeByDate(sessions: readonly CompletedWorkout[]): Map<string, number> {
  const byDate = new Map<string, number[]>()
  for (const session of sessions) {
    const date = session.completedAt.slice(0, 10)
    const volumes = byDate.get(date) ?? []
    volumes.push(sessionVolumeKg(session))
    byDate.set(date, volumes)
  }
  const result = new Map<string, number>()
  byDate.forEach((volumes, date) => result.set(date, volumes.reduce((s, v) => s + v, 0)))
  return result
}

/** Nível de prontidão auto-relatado (média de `energy`) por dia — não é `WorkoutReadinessResult.score`, é o dado bruto do check-in (transparente sobre o que é). */
function reportedReadinessByDate(checkIns: readonly WorkoutReadinessCheckIn[]): Map<string, number> {
  const byDate = new Map<string, number[]>()
  for (const checkIn of checkIns) {
    const date = checkIn.createdAt.slice(0, 10)
    const values = byDate.get(date) ?? []
    values.push(checkIn.energy)
    byDate.set(date, values)
  }
  const result = new Map<string, number>()
  byDate.forEach((values, date) => result.set(date, average(values)!))
  return result
}

function evidenceText(
  metric: HealthMetricType,
  outcome: HealthRelationshipOutcome,
  below: HealthTrainingRelationshipGroup,
  atOrAbove: HealthTrainingRelationshipGroup
): string {
  const metricLabel = METRIC_LABELS[metric].toLowerCase()
  const outcomeLabel = OUTCOME_LABELS[outcome]

  if (below.averageOutcome === null || atOrAbove.averageOutcome === null) {
    return `Amostra insuficiente para comparar ${outcomeLabel} entre dias com ${metricLabel} abaixo e na/acima da linha de base.`
  }

  const roundedBelow = Math.round(below.averageOutcome * 10) / 10
  const roundedAtOrAbove = Math.round(atOrAbove.averageOutcome * 10) / 10
  const diffPercent = atOrAbove.averageOutcome !== 0
    ? Math.abs((below.averageOutcome - atOrAbove.averageOutcome) / atOrAbove.averageOutcome) * 100
    : 0

  if (diffPercent < 5) {
    return `Nas sessões de dias com ${metricLabel} abaixo da linha de base, ${outcomeLabel} foi semelhante ao de dias na/acima da linha de base (${roundedBelow} vs ${roundedAtOrAbove}).`
  }

  const comparison = below.averageOutcome < atOrAbove.averageOutcome ? 'menor' : 'maior'
  return `Nas sessões de dias com ${metricLabel} abaixo da linha de base, ${outcomeLabel} foi ${comparison} (${roundedBelow} vs ${roundedAtOrAbove} em dias na/acima da linha de base).`
}

function buildRelationship(
  id: string,
  label: string,
  metric: HealthMetricType,
  outcome: HealthRelationshipOutcome,
  period: AnalyticsPeriod,
  now: Date
): HealthTrainingRelationship {
  const summaries = getSummaryRange(period, now)
  const baseline = getMetricBaseline(metric, period, now)

  const outcomeByDate =
    outcome === 'session_volume'
      ? sessionVolumeByDate(filterWorkoutsByPeriod(getWorkoutHistory(), period, now))
      : reportedReadinessByDate(filterCheckInsByPeriod(getCheckIns(), period, now))

  const belowValues: number[] = []
  const atOrAboveValues: number[] = []

  if (baseline) {
    for (const summary of summaries) {
      const value = summaryMetricValue(summary, metric)
      if (value === undefined) continue
      const outcomeValue = outcomeByDate.get(summary.date)
      if (outcomeValue === undefined) continue

      if (value < baseline.value) belowValues.push(outcomeValue)
      else atOrAboveValues.push(outcomeValue)
    }
  }

  const below: HealthTrainingRelationshipGroup = {
    label: `${METRIC_LABELS[metric]} abaixo da linha de base`,
    sampleSize: belowValues.length,
    averageOutcome: average(belowValues),
  }
  const atOrAbove: HealthTrainingRelationshipGroup = {
    label: `${METRIC_LABELS[metric]} na linha de base ou acima`,
    sampleSize: atOrAboveValues.length,
    averageOutcome: average(atOrAboveValues),
  }

  const sufficientSample =
    belowValues.length >= MIN_RELATIONSHIP_GROUP_SAMPLE && atOrAboveValues.length >= MIN_RELATIONSHIP_GROUP_SAMPLE

  return {
    id,
    label,
    healthMetric: metric,
    outcome,
    period,
    minSampleRequired: MIN_RELATIONSHIP_GROUP_SAMPLE,
    sufficientSample,
    belowBaseline: below,
    atOrAboveBaseline: atOrAbove,
    evidenceText: sufficientSample
      ? evidenceText(metric, outcome, below, atOrAbove)
      : `Amostra insuficiente (mínimo de ${MIN_RELATIONSHIP_GROUP_SAMPLE} dias por grupo) para comparar ${OUTCOME_LABELS[outcome]} entre os dois grupos neste período.`,
  }
}

function filterWorkoutsByPeriod(workouts: readonly CompletedWorkout[], period: AnalyticsPeriod, now: Date): CompletedWorkout[] {
  const range = resolvePeriodRange(period, now)
  return workouts.filter((w) => {
    const t = new Date(w.completedAt).getTime()
    return t >= range.start.getTime() && t <= range.end.getTime()
  })
}

function filterCheckInsByPeriod(checkIns: readonly WorkoutReadinessCheckIn[], period: AnalyticsPeriod, now: Date): WorkoutReadinessCheckIn[] {
  const range = resolvePeriodRange(period, now)
  return checkIns.filter((c) => {
    const t = new Date(c.createdAt).getTime()
    return t >= range.start.getTime() && t <= range.end.getTime()
  })
}

/**
 * As 4 relações do brief da Sprint 29 (seção 19): sono × volume, sono ×
 * prontidão relatada, FC de repouso × prontidão relatada, atividade × carga
 * (volume). "Saúde × conclusão de treino" e outras combinações ficam fora
 * (amostra de sessões "puladas" não existe como dado consultável hoje — ver
 * pendências conscientes em `HEALTH-TRAINING-RELATIONSHIPS.md`).
 */
export function buildHealthTrainingRelationships(
  period: AnalyticsPeriod = '90d',
  now: Date = new Date()
): HealthTrainingRelationship[] {
  return [
    buildRelationship('sleep_x_volume', 'Sono × volume de treino', 'sleep_duration', 'session_volume', period, now),
    buildRelationship('sleep_x_readiness', 'Sono × prontidão relatada', 'sleep_duration', 'reported_readiness', period, now),
    buildRelationship('resting_hr_x_readiness', 'FC de repouso × prontidão relatada', 'resting_heart_rate', 'reported_readiness', period, now),
    buildRelationship('activity_x_volume', 'Atividade externa × carga de treino', 'activity_duration', 'session_volume', period, now),
  ]
}
