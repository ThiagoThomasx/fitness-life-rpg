// Exercise Highlights — Sprint 22 Parte 2 §36.
//
// Integração mínima com Insights: "Exercícios em destaque". Não inicia
// Analytics 2.0 — só uma lista curta de exercícios que abrem
// `/exercicios/[id]` a partir de sinais já calculados pelo motor
// (`exercise-intelligence.ts`), nunca recalculados aqui.

import { getWorkoutHistory, type CompletedWorkout } from './workout-history'
import { getExercisePersonalRecords, getExerciseTrends, getExerciseSubstitutionInsights } from './exercise-intelligence'

export type ExerciseHighlightKind = 'recent_record' | 'most_substituted' | 'improving' | 'no_recent_execution'

export interface ExerciseHighlight {
  exerciseId: string
  exerciseName: string
  kind: ExerciseHighlightKind
  detail: string
}

const MAX_PER_CATEGORY = 3
/** Considerado "sem execução recente" quando a última execução tem mais que isso. */
const STALE_DAYS = 21
/** Só exercícios com histórico minimamente relevante entram na lista de "sem execução recente" — evita citar um exercício feito uma vez há muito tempo. */
const MIN_EXECUTIONS_FOR_STALE = 3

interface ExerciseAggregate {
  exerciseId: string
  exerciseName: string
  executionCount: number
  lastPerformedAt: string
}

function collectDistinctExercises(history: CompletedWorkout[]): ExerciseAggregate[] {
  const map = new Map<string, ExerciseAggregate>()
  for (const workout of history) {
    for (const record of workout.exercises) {
      const existing = map.get(record.exerciseId)
      if (existing) {
        existing.executionCount++
        if (workout.completedAt > existing.lastPerformedAt) existing.lastPerformedAt = workout.completedAt
        continue
      }
      map.set(record.exerciseId, {
        exerciseId: record.exerciseId,
        exerciseName: record.exerciseName,
        executionCount: 1,
        lastPerformedAt: workout.completedAt,
      })
    }
  }
  return Array.from(map.values())
}

/**
 * Recordes alcançados na execução mais recente do histórico geral — evita
 * "recorde recente" para um PR alcançado há meses só porque nunca foi
 * superado depois.
 */
function getRecentRecordHighlights(exercises: ExerciseAggregate[], mostRecentWorkoutAt: string): ExerciseHighlight[] {
  const highlights: ExerciseHighlight[] = []
  for (const ex of exercises) {
    const records = getExercisePersonalRecords(ex.exerciseId)
    const achievedNow = [records.maxLoad, records.bestSetVolume, records.maxSessionVolume].find(
      (r) => r?.achievedAt === mostRecentWorkoutAt
    )
    if (!achievedNow) continue
    highlights.push({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      kind: 'recent_record',
      detail: `Novo recorde de ${achievedNow.value}${achievedNow.unit} na última sessão`,
    })
    if (highlights.length >= MAX_PER_CATEGORY) break
  }
  return highlights
}

function getMostSubstitutedHighlights(exercises: ExerciseAggregate[]): ExerciseHighlight[] {
  const withCounts = exercises
    .map((ex) => ({ ex, insights: getExerciseSubstitutionInsights(ex.exerciseId) }))
    .filter((e) => e.insights && e.insights.timesReplaced > 0)
    .sort((a, b) => (b.insights?.timesReplaced ?? 0) - (a.insights?.timesReplaced ?? 0))

  return withCounts.slice(0, MAX_PER_CATEGORY).map(({ ex, insights }) => ({
    exerciseId: ex.exerciseId,
    exerciseName: ex.exerciseName,
    kind: 'most_substituted',
    detail: `Substituído ${insights?.timesReplaced} vez(es)`,
  }))
}

function getImprovingHighlights(exercises: ExerciseAggregate[]): ExerciseHighlight[] {
  const highlights: ExerciseHighlight[] = []
  for (const ex of exercises) {
    const trends = getExerciseTrends(ex.exerciseId)
    const loadTrend = trends.find((t) => t.metric === 'load')
    if (loadTrend?.direction !== 'increasing') continue
    highlights.push({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      kind: 'improving',
      detail: loadTrend.explanation,
    })
    if (highlights.length >= MAX_PER_CATEGORY) break
  }
  return highlights
}

function getNoRecentExecutionHighlights(exercises: ExerciseAggregate[], mostRecentWorkoutAt: string): ExerciseHighlight[] {
  const referenceTime = new Date(mostRecentWorkoutAt).getTime()
  return exercises
    .filter((ex) => ex.executionCount >= MIN_EXECUTIONS_FOR_STALE)
    .filter((ex) => (referenceTime - new Date(ex.lastPerformedAt).getTime()) / 86_400_000 > STALE_DAYS)
    .sort((a, b) => (a.lastPerformedAt < b.lastPerformedAt ? -1 : 1))
    .slice(0, MAX_PER_CATEGORY)
    .map((ex) => {
      const daysSince = Math.floor((referenceTime - new Date(ex.lastPerformedAt).getTime()) / 86_400_000)
      return {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        kind: 'no_recent_execution' as const,
        detail: `Sem execução há ${daysSince} dias`,
      }
    })
}

export interface ExerciseHighlightsGroups {
  recentRecords: ExerciseHighlight[]
  mostSubstituted: ExerciseHighlight[]
  improving: ExerciseHighlight[]
  noRecentExecution: ExerciseHighlight[]
}

export function getExerciseHighlights(history: CompletedWorkout[] = getWorkoutHistory()): ExerciseHighlightsGroups {
  if (history.length === 0) {
    return { recentRecords: [], mostSubstituted: [], improving: [], noRecentExecution: [] }
  }
  const exercises = collectDistinctExercises(history)
  const mostRecentWorkoutAt = history[0].completedAt

  return {
    recentRecords: getRecentRecordHighlights(exercises, mostRecentWorkoutAt),
    mostSubstituted: getMostSubstitutedHighlights(exercises),
    improving: getImprovingHighlights(exercises),
    noRecentExecution: getNoRecentExecutionHighlights(exercises, mostRecentWorkoutAt),
  }
}
