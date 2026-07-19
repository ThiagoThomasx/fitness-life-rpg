// Motor de associações entre bem-estar e treino — Sprint 19 Parte 3.
//
// Pareia médias semanais de campos de `WorkoutReadinessCheckIn` (energia,
// dor muscular, sono, motivação, estresse, humor) com métricas semanais de
// treino já calculadas por `training-load.ts` (frequência, volume, uso de
// ajustes de sessão). Nunca infere causalidade — toda saída é apresentada
// como coincidência observada no próprio histórico do usuário, seguindo o
// mesmo padrão de linguagem já usado em `wellness-trends.ts`.
//
// Circularidade: `energy`, `soreness`, `sleepQuality` e `motivation` já
// alimentam diretamente o score de prontidão (ver `computeRawScores` em
// `workout-readiness.ts`). Este módulo não compara esses campos contra o
// score de prontidão — use `isReadinessCompositionMetric` /
// `READINESS_COMPOSITION_NOTE` para exibir uma nota de composição em vez de
// uma associação calculada nesses casos.

import type { WorkoutReadinessCheckIn } from './readiness-check-ins'
import { getWeekSummaries, type WeekSummary } from './training-load'
import { getWeekStart } from './weekly-plan'

export type WellnessMetric =
  | 'energy'
  | 'soreness'
  | 'sleepQuality'
  | 'motivation'
  | 'stress'
  | 'mood'
  | 'sleepHours'

export type TrainingMetric = 'frequency' | 'volume' | 'adjustments'

export type WellnessAssociationConfidence = 'low' | 'medium' | 'high'

export type AssociationDirection = 'positive' | 'negative' | 'neutral' | 'unclear'

export interface WellnessAssociation {
  id: string
  wellnessMetric: WellnessMetric
  trainingMetric: TrainingMetric
  sampleSize: number
  periodStart?: string
  periodEnd?: string
  direction: AssociationDirection
  confidence: WellnessAssociationConfidence
  summary: string
  explanation: string
}

export interface WellnessAssociationConfig {
  minimumWeeks: number
  /** Diferença percentual mínima entre os dois grupos comparados para valer a pena relatar. */
  meaningfulDifferenceThreshold: number
  highConfidenceWeeks: number
  highConfidenceDifferenceThreshold: number
}

export const DEFAULT_WELLNESS_ASSOCIATION_CONFIG: WellnessAssociationConfig = {
  minimumWeeks: 4,
  meaningfulDifferenceThreshold: 10,
  highConfidenceWeeks: 8,
  highConfidenceDifferenceThreshold: 20,
}

// Campos que já compõem o score de prontidão — ver nota de circularidade acima.
const READINESS_COMPOSITION_METRICS: WellnessMetric[] = ['energy', 'soreness', 'sleepQuality', 'motivation']

export const READINESS_COMPOSITION_NOTE =
  'O score de prontidão acompanha as variações dos campos que o compõem, incluindo este. Não é possível comparar os dois de forma independente sem circularidade.'

export function isReadinessCompositionMetric(metric: WellnessMetric): boolean {
  return READINESS_COMPOSITION_METRICS.includes(metric)
}

const INSUFFICIENT_DATA_SUMMARY = 'Amostra insuficiente'
const INSUFFICIENT_DATA_EXPLANATION =
  'Ainda não há semanas suficientes com registros de bem-estar para comparar com o treino. Essa diferença pode variar com novos registros.'

const METRIC_LABELS: Record<WellnessMetric, string> = {
  energy: 'energia',
  soreness: 'dor muscular',
  sleepQuality: 'qualidade do sono',
  motivation: 'motivação',
  stress: 'estresse',
  mood: 'humor',
  sleepHours: 'horas de sono',
}

const TRAINING_LABELS: Record<TrainingMetric, string> = {
  frequency: 'frequência de treino',
  volume: 'volume semanal',
  adjustments: 'uso de ajustes de sessão',
}

interface WeeklyPair {
  weekStart: string
  wellnessValue: number
  trainingValue: number
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function buildWeeklyWellnessAverages(
  checkIns: WorkoutReadinessCheckIn[],
  metric: WellnessMetric
): Map<string, number> {
  const byWeek = new Map<string, number[]>()
  for (const c of checkIns) {
    const value = c[metric]
    if (value === undefined) continue
    const weekStart = getWeekStart(new Date(c.createdAt))
    const list = byWeek.get(weekStart) ?? []
    list.push(value)
    byWeek.set(weekStart, list)
  }
  const result = new Map<string, number>()
  for (const [week, values] of Array.from(byWeek.entries())) result.set(week, average(values))
  return result
}

function trainingValueFor(summary: WeekSummary, trainingMetric: TrainingMetric): number {
  switch (trainingMetric) {
    case 'frequency':
      return summary.totalSessions
    case 'volume':
      return summary.totalVolumeKg
    case 'adjustments':
      return summary.totalSessions > 0 ? summary.adjustedSessions / summary.totalSessions : 0
  }
}

function medianSplit(pairs: WeeklyPair[]): { lower: WeeklyPair[]; higher: WeeklyPair[] } {
  const sorted = [...pairs].sort((a, b) => a.wellnessValue - b.wellnessValue)
  const mid = Math.floor(sorted.length / 2)
  return { lower: sorted.slice(0, mid), higher: sorted.slice(mid) }
}

// Heurística documentada, não um teste estatístico: a confiança cresce com o
// tamanho da amostra e com a magnitude da diferença observada entre os dois
// grupos (mediana de semanas "baixas" vs. "altas"). "high" exige folga
// confortável acima dos dois limiares mínimos; "medium" apenas ultrapassa o
// mínimo; "low" é o padrão para tudo que mal atinge o mínimo de semanas.
function classifyConfidence(
  sampleSize: number,
  diffPct: number,
  config: WellnessAssociationConfig
): WellnessAssociationConfidence {
  if (
    sampleSize >= config.highConfidenceWeeks &&
    Math.abs(diffPct) >= config.highConfidenceDifferenceThreshold
  ) {
    return 'high'
  }
  if (
    sampleSize >= config.minimumWeeks * 1.5 &&
    Math.abs(diffPct) >= config.meaningfulDifferenceThreshold * 1.5
  ) {
    return 'medium'
  }
  return 'low'
}

function periodBounds(pairs: WeeklyPair[]): { periodStart?: string; periodEnd?: string } {
  if (pairs.length === 0) return {}
  const weeks = pairs.map((p) => p.weekStart).sort()
  return { periodStart: weeks[0], periodEnd: weeks[weeks.length - 1] }
}

function buildAssociation(
  wellnessMetric: WellnessMetric,
  trainingMetric: TrainingMetric,
  pairs: WeeklyPair[],
  config: WellnessAssociationConfig
): WellnessAssociation {
  const id = `${wellnessMetric}_${trainingMetric}`
  const { periodStart, periodEnd } = periodBounds(pairs)

  if (pairs.length < config.minimumWeeks) {
    return {
      id,
      wellnessMetric,
      trainingMetric,
      sampleSize: pairs.length,
      periodStart,
      periodEnd,
      direction: 'unclear',
      confidence: 'low',
      summary: INSUFFICIENT_DATA_SUMMARY,
      explanation: INSUFFICIENT_DATA_EXPLANATION,
    }
  }

  const { lower, higher } = medianSplit(pairs)
  if (lower.length === 0 || higher.length === 0) {
    return {
      id,
      wellnessMetric,
      trainingMetric,
      sampleSize: pairs.length,
      periodStart,
      periodEnd,
      direction: 'unclear',
      confidence: 'low',
      summary: INSUFFICIENT_DATA_SUMMARY,
      explanation: INSUFFICIENT_DATA_EXPLANATION,
    }
  }

  const lowerTraining = average(lower.map((p) => p.trainingValue))
  const higherTraining = average(higher.map((p) => p.trainingValue))
  const diffPct =
    lowerTraining !== 0
      ? ((higherTraining - lowerTraining) / lowerTraining) * 100
      : higherTraining > 0
        ? 100
        : 0

  const confidence = classifyConfidence(pairs.length, diffPct, config)
  const wellnessLabel = METRIC_LABELS[wellnessMetric]
  const trainingLabel = TRAINING_LABELS[trainingMetric]

  if (Math.abs(diffPct) < config.meaningfulDifferenceThreshold) {
    return {
      id,
      wellnessMetric,
      trainingMetric,
      sampleSize: pairs.length,
      periodStart,
      periodEnd,
      direction: 'neutral',
      confidence,
      summary: `Sem diferença clara entre ${wellnessLabel} e ${trainingLabel}`,
      explanation: `No seu histórico, não há uma diferença clara de ${trainingLabel} entre semanas com ${wellnessLabel} mais alta ou mais baixa. Essa diferença pode variar com novos registros.`,
    }
  }

  const direction: AssociationDirection = higherTraining > lowerTraining ? 'positive' : 'negative'
  const changeWord = direction === 'positive' ? 'maior' : 'menor'

  return {
    id,
    wellnessMetric,
    trainingMetric,
    sampleSize: pairs.length,
    periodStart,
    periodEnd,
    direction,
    confidence,
    summary: `Semanas com ${wellnessLabel} mais alta coincidiram com ${trainingLabel} ${changeWord}`,
    explanation: `No seu histórico, semanas com ${wellnessLabel} média mais alta coincidiram com ${trainingLabel} ${changeWord}. A amostra ainda é pequena e essa diferença pode variar com novos registros.`,
  }
}

/**
 * Compara médias semanais de um campo de bem-estar com uma métrica de treino
 * (frequência, volume ou uso de ajustes de sessão), pareando por semana ISO.
 */
export function computeWellnessTrainingAssociation(
  wellnessMetric: WellnessMetric,
  trainingMetric: TrainingMetric,
  checkIns: WorkoutReadinessCheckIn[],
  weekSummaries: WeekSummary[] = getWeekSummaries(26),
  config: WellnessAssociationConfig = DEFAULT_WELLNESS_ASSOCIATION_CONFIG
): WellnessAssociation {
  const wellnessByWeek = buildWeeklyWellnessAverages(checkIns, wellnessMetric)
  const trainingByWeek = new Map(weekSummaries.map((w) => [w.startDate, w] as const))

  const pairs: WeeklyPair[] = []
  for (const [weekStart, wellnessValue] of Array.from(wellnessByWeek.entries())) {
    const summary = trainingByWeek.get(weekStart)
    if (!summary) continue
    pairs.push({ weekStart, wellnessValue, trainingValue: trainingValueFor(summary, trainingMetric) })
  }

  return buildAssociation(wellnessMetric, trainingMetric, pairs, config)
}

const ALL_WELLNESS_METRICS: WellnessMetric[] = [
  'energy',
  'soreness',
  'sleepQuality',
  'motivation',
  'stress',
  'mood',
  'sleepHours',
]

const ALL_TRAINING_METRICS: TrainingMetric[] = ['frequency', 'volume', 'adjustments']

/** Constrói todas as associações bem-estar × treino (7 métricas × 3 dimensões). */
export function computeAllWellnessTrainingAssociations(
  checkIns: WorkoutReadinessCheckIn[],
  weekSummaries: WeekSummary[] = getWeekSummaries(26),
  config: WellnessAssociationConfig = DEFAULT_WELLNESS_ASSOCIATION_CONFIG
): WellnessAssociation[] {
  const results: WellnessAssociation[] = []
  for (const wellnessMetric of ALL_WELLNESS_METRICS) {
    for (const trainingMetric of ALL_TRAINING_METRICS) {
      results.push(computeWellnessTrainingAssociation(wellnessMetric, trainingMetric, checkIns, weekSummaries, config))
    }
  }
  return results
}
