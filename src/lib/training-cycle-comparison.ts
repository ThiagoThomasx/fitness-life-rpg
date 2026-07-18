// Comparação entre dois ciclos concluídos — Sprint 17.1.
// Puramente derivado: recebe os resumos já calculados por
// `training-cycle-summary.ts` (nunca recalcula volume/PRs/prontidão) e
// nunca declara um "vencedor" — apenas descreve diferenças e semelhanças.

import type { TrainingCycle } from './training-cycles'
import type { TrainingCycleSummary, CycleExerciseSummary, CycleMuscleGroupSummary } from './training-cycle-summary'

// ─── Config ───────────────────────────────────────────────────────────────────

/** Sessões mínimas para considerar um ciclo comparável com confiança. */
export const MIN_SESSIONS_FOR_RELIABLE_COMPARISON = 4

/** Diferença percentual mínima para que uma métrica seja descrita como "maior/menor" na narrativa. */
const NARRATIVE_TOLERANCE_PCT = 10

const MAX_SUMMARY_MESSAGES = 8

// ─── Types ────────────────────────────────────────────────────────────────────

export type MetricComparisonStatus = 'higher' | 'lower' | 'equal' | 'not_comparable'

export interface MetricComparison {
  first?: number
  second?: number
  absoluteDifference?: number
  percentageDifference?: number
  status: MetricComparisonStatus
}

export interface ExerciseCycleComparison {
  exerciseId: string
  exerciseName: string
  first: CycleExerciseSummary | null
  second: CycleExerciseSummary | null
  sharedInBoth: boolean
  weightDelta: MetricComparison
  volumeDelta: MetricComparison
  oneRMDelta: MetricComparison
}

export interface MuscleGroupCycleComparison {
  muscleGroup: CycleMuscleGroupSummary['muscleGroup']
  label: string
  sharedInBoth: boolean
  averageWeeklyVolumeKg: MetricComparison
  averageWeeklySets: MetricComparison
}

export interface TrainingCycleComparison {
  firstCycleId: string
  secondCycleId: string

  duration: MetricComparison
  sessions: MetricComparison
  weeklyFrequency: MetricComparison
  totalVolumeKg: MetricComparison
  averageWeeklyVolumeKg: MetricComparison
  averageVolumePerSessionKg: MetricComparison
  adherence: MetricComparison
  prs: MetricComparison
  averageReadiness: MetricComparison
  adjustedSessions: MetricComparison

  sharedExercises: ExerciseCycleComparison[]
  exclusiveToFirstExercises: string[]
  exclusiveToSecondExercises: string[]

  muscleGroups: MuscleGroupCycleComparison[]

  firstHasInsufficientData: boolean
  secondHasInsufficientData: boolean

  summaryMessages: string[]
}

// ─── Metric comparison ────────────────────────────────────────────────────────

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function compareMetric(first: number | null | undefined, second: number | null | undefined): MetricComparison {
  if (first === null || first === undefined || second === null || second === undefined) {
    return { first: first ?? undefined, second: second ?? undefined, status: 'not_comparable' }
  }
  const absoluteDifference = round(second - first, 2)
  const percentageDifference = first !== 0 ? round(((second - first) / first) * 100, 1) : undefined
  const status: MetricComparisonStatus = second > first ? 'higher' : second < first ? 'lower' : 'equal'
  return { first, second, absoluteDifference, percentageDifference, status }
}

function adherencePct(summary: TrainingCycleSummary): number | undefined {
  if (summary.totalSessions === 0) return undefined
  return round((summary.plannedSessions / summary.totalSessions) * 100, 1)
}

function averageVolumePerSession(summary: TrainingCycleSummary): number | undefined {
  if (summary.totalSessions === 0) return undefined
  return round(summary.totalVolumeKg / summary.totalSessions, 1)
}

function weeklyFrequency(summary: TrainingCycleSummary): number {
  return round(summary.totalSessions / Math.max(1, summary.completedWeeks), 2)
}

// ─── Exercise comparison ──────────────────────────────────────────────────────

function buildExerciseComparisons(
  firstExercises: CycleExerciseSummary[],
  secondExercises: CycleExerciseSummary[]
): { shared: ExerciseCycleComparison[]; exclusiveToFirst: string[]; exclusiveToSecond: string[] } {
  const firstById = new Map(firstExercises.map((e) => [e.exerciseId, e]))
  const secondById = new Map(secondExercises.map((e) => [e.exerciseId, e]))

  const shared: ExerciseCycleComparison[] = []
  for (const [id, first] of Array.from(firstById.entries())) {
    const second = secondById.get(id)
    if (!second) continue
    shared.push({
      exerciseId: id,
      exerciseName: first.exerciseName,
      first,
      second,
      sharedInBoth: true,
      weightDelta: compareMetric(first.lastWeightKg, second.lastWeightKg),
      volumeDelta: compareMetric(first.lastVolumeKg, second.lastVolumeKg),
      oneRMDelta: compareMetric(first.lastEstimated1RMKg, second.lastEstimated1RMKg),
    })
  }

  const exclusiveToFirst = firstExercises.filter((e) => !secondById.has(e.exerciseId)).map((e) => e.exerciseName)
  const exclusiveToSecond = secondExercises.filter((e) => !firstById.has(e.exerciseId)).map((e) => e.exerciseName)

  return { shared, exclusiveToFirst, exclusiveToSecond }
}

// ─── Muscle group comparison ──────────────────────────────────────────────────

function buildMuscleGroupComparisons(
  firstGroups: CycleMuscleGroupSummary[],
  secondGroups: CycleMuscleGroupSummary[]
): MuscleGroupCycleComparison[] {
  const firstByGroup = new Map(firstGroups.map((g) => [g.muscleGroup, g]))
  const secondByGroup = new Map(secondGroups.map((g) => [g.muscleGroup, g]))
  const allGroups = new Set([...Array.from(firstByGroup.keys()), ...Array.from(secondByGroup.keys())])

  const result: MuscleGroupCycleComparison[] = []
  for (const mg of Array.from(allGroups)) {
    const first = firstByGroup.get(mg)
    const second = secondByGroup.get(mg)
    result.push({
      muscleGroup: mg,
      label: (first ?? second)!.label,
      sharedInBoth: Boolean(first && second),
      averageWeeklyVolumeKg: compareMetric(first?.averageWeeklyVolumeKg, second?.averageWeeklyVolumeKg),
      averageWeeklySets: compareMetric(first?.averageWeeklySets, second?.averageWeeklySets),
    })
  }
  return result
}

// ─── Narrative ────────────────────────────────────────────────────────────────

function describeComparison(metricLabel: string, comparison: MetricComparison): string | null {
  if (comparison.status === 'not_comparable') return null
  if (comparison.status === 'equal') return null
  const magnitude = comparison.percentageDifference !== undefined ? Math.abs(comparison.percentageDifference) : undefined
  if (magnitude !== undefined && magnitude < NARRATIVE_TOLERANCE_PCT) return null

  const winner = comparison.status === 'higher' ? 'segundo' : 'primeiro'
  return `O ${winner} ciclo teve maior ${metricLabel}.`
}

function buildSummaryMessages(
  comparison: Omit<TrainingCycleComparison, 'summaryMessages'>
): string[] {
  const messages: string[] = []

  if (comparison.firstHasInsufficientData) {
    messages.push('O primeiro ciclo ainda não possui dados suficientes para uma comparação confiável.')
  }
  if (comparison.secondHasInsufficientData) {
    messages.push('O segundo ciclo ainda não possui dados suficientes para uma comparação confiável.')
  }

  if (
    comparison.duration.first !== undefined &&
    comparison.duration.second !== undefined &&
    comparison.duration.first !== comparison.duration.second
  ) {
    messages.push('Os ciclos possuem durações diferentes; médias semanais oferecem uma comparação mais justa.')
  }

  const weeklyFreqMsg = describeComparison('frequência semanal', comparison.weeklyFrequency)
  if (weeklyFreqMsg) messages.push(weeklyFreqMsg)

  const weeklyVolMsg = describeComparison('volume médio semanal', comparison.averageWeeklyVolumeKg)
  if (weeklyVolMsg) messages.push(weeklyVolMsg)

  const perSessionMsg = describeComparison('volume médio por sessão', comparison.averageVolumePerSessionKg)
  if (perSessionMsg) messages.push(perSessionMsg)

  if (comparison.averageReadiness.status === 'not_comparable') {
    // sem dados de prontidão em algum dos ciclos — não afirma nada
  } else if (comparison.averageReadiness.status === 'equal') {
    messages.push('A prontidão média foi semelhante nos dois ciclos.')
  } else {
    const magnitude = comparison.averageReadiness.absoluteDifference !== undefined
      ? Math.abs(comparison.averageReadiness.absoluteDifference)
      : 0
    if (magnitude < 0.5) {
      messages.push('A prontidão média foi semelhante nos dois ciclos.')
    } else {
      const readinessMsg = describeComparison('prontidão média', comparison.averageReadiness)
      if (readinessMsg) messages.push(readinessMsg)
    }
  }

  if (comparison.sharedExercises.length > 0) {
    messages.push(
      `${comparison.sharedExercises.length} exercício${comparison.sharedExercises.length !== 1 ? 's' : ''} ` +
      `puderam ser comparados entre os ciclos.`
    )
  }

  return messages.slice(0, MAX_SUMMARY_MESSAGES)
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function compareCycles(
  first: { cycle: TrainingCycle; summary: TrainingCycleSummary },
  second: { cycle: TrainingCycle; summary: TrainingCycleSummary }
): TrainingCycleComparison {
  const firstSummary = first.summary
  const secondSummary = second.summary

  const { shared, exclusiveToFirst, exclusiveToSecond } = buildExerciseComparisons(
    firstSummary.exercises,
    secondSummary.exercises
  )

  const base: Omit<TrainingCycleComparison, 'summaryMessages'> = {
    firstCycleId: first.cycle.id,
    secondCycleId: second.cycle.id,

    duration: compareMetric(firstSummary.completedWeeks, secondSummary.completedWeeks),
    sessions: compareMetric(firstSummary.totalSessions, secondSummary.totalSessions),
    weeklyFrequency: compareMetric(weeklyFrequency(firstSummary), weeklyFrequency(secondSummary)),
    totalVolumeKg: compareMetric(firstSummary.totalVolumeKg, secondSummary.totalVolumeKg),
    averageWeeklyVolumeKg: compareMetric(firstSummary.averageWeeklyVolumeKg, secondSummary.averageWeeklyVolumeKg),
    averageVolumePerSessionKg: compareMetric(averageVolumePerSession(firstSummary), averageVolumePerSession(secondSummary)),
    adherence: compareMetric(adherencePct(firstSummary), adherencePct(secondSummary)),
    prs: compareMetric(firstSummary.totalPrs, secondSummary.totalPrs),
    averageReadiness: compareMetric(firstSummary.averageReadiness, secondSummary.averageReadiness),
    adjustedSessions: compareMetric(firstSummary.adjustedSessions, secondSummary.adjustedSessions),

    sharedExercises: shared,
    exclusiveToFirstExercises: exclusiveToFirst,
    exclusiveToSecondExercises: exclusiveToSecond,

    muscleGroups: buildMuscleGroupComparisons(firstSummary.muscleGroups, secondSummary.muscleGroups),

    firstHasInsufficientData: firstSummary.totalSessions < MIN_SESSIONS_FOR_RELIABLE_COMPARISON,
    secondHasInsufficientData: secondSummary.totalSessions < MIN_SESSIONS_FOR_RELIABLE_COMPARISON,
  }

  return { ...base, summaryMessages: buildSummaryMessages(base) }
}
