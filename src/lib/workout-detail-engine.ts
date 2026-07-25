// Workout Detail Engine — Sprint 22 Parte 3A.
//
// Agrega tudo que a página `/historico/[id]` precisa para representar uma
// sessão concluída (`CompletedWorkout`) como entidade central do histórico —
// sem recalcular nada que já exista em outro motor: readiness
// (`workout-readiness.ts`), comparação planejado×realizado
// (`planned-performed-comparison.ts`), carga semanal (`training-load.ts`),
// programa (`training-programs.ts`/`planned-workouts.ts`) e recordes
// (`personal-record-events.ts`). Esta camada só COMPÕE essas fontes.

import { getWorkoutHistory, type CompletedWorkout } from './workout-history'
import { getCheckInById, type WorkoutReadinessCheckIn } from './readiness-check-ins'
import { calculateReadiness, type WorkoutReadinessResult } from './workout-readiness'
import { getPlannedWorkoutById, type PlannedWorkout } from './planned-workouts'
import { getTrainingProgramById } from './training-programs'
import {
  buildPlannedPerformedComparison,
  resolvedExercisesFromPlannedWorkout,
  type PlannedPerformedComparison,
} from './planned-performed-comparison'
import { buildTrainingWeek, sessionVolumeKg, sessionTotalSets, sessionTotalReps, type TrainingWeek } from './training-load'
import { getPersonalRecordEventsForWorkout, type PersonalRecordEvent } from './personal-record-events'

export function getCompletedWorkoutById(
  workoutId: string,
  history: CompletedWorkout[] = getWorkoutHistory()
): CompletedWorkout | null {
  return history.find((w) => w.id === workoutId) ?? null
}

export interface WorkoutDetailProgramInfo {
  programId: string
  programName?: string
  programWeekNumber?: number
  plannedWorkoutId?: string
}

export interface WorkoutDetailData {
  workout: CompletedWorkout
  volumeKg: number
  totalSets: number
  totalReps: number
  checkIn: WorkoutReadinessCheckIn | null
  readinessResult: WorkoutReadinessResult | null
  program: WorkoutDetailProgramInfo | null
  plannedWorkout: PlannedWorkout | null
  comparison: PlannedPerformedComparison | null
  trainingWeek: TrainingWeek | null
  recordEvents: PersonalRecordEvent[]
}

/**
 * Monta a visão completa de uma sessão concluída. Retorna `null` apenas
 * quando o ID não existe no histórico — a página de detalhe usa isso para
 * distinguir "carregando" (`undefined`) de "não encontrado" (`null`), mesmo
 * padrão de `/exercicios/[id]` e `/plano/treino/[id]`.
 */
export function getWorkoutDetail(workoutId: string): WorkoutDetailData | null {
  const history = getWorkoutHistory()
  const workout = getCompletedWorkoutById(workoutId, history)
  if (!workout) return null

  const checkIn = workout.checkInId ? getCheckInById(workout.checkInId) : null
  const readinessResult = checkIn
    ? calculateReadiness({ checkIn, workoutExerciseIds: workout.exercises.map((e) => e.exerciseId) })
    : null

  let plannedWorkout: PlannedWorkout | null = null
  let comparison: PlannedPerformedComparison | null = null
  if (workout.source?.plannedWorkoutId) {
    plannedWorkout = getPlannedWorkoutById(workout.source.plannedWorkoutId)
    if (plannedWorkout) {
      comparison = buildPlannedPerformedComparison(
        plannedWorkout,
        resolvedExercisesFromPlannedWorkout(plannedWorkout),
        workout,
        workout.completedAt.slice(0, 10)
      )
    }
  }

  let program: WorkoutDetailProgramInfo | null = null
  if (workout.source?.programId) {
    const trainingProgram = getTrainingProgramById(workout.source.programId)
    program = {
      programId: workout.source.programId,
      programName: trainingProgram?.name,
      programWeekNumber: workout.source.programWeekNumber,
      plannedWorkoutId: workout.source.plannedWorkoutId,
    }
  }

  return {
    workout,
    volumeKg: sessionVolumeKg(workout),
    totalSets: sessionTotalSets(workout),
    totalReps: sessionTotalReps(workout),
    checkIn,
    readinessResult,
    program,
    plannedWorkout,
    comparison,
    trainingWeek: buildTrainingWeek(new Date(workout.completedAt)),
    recordEvents: getPersonalRecordEventsForWorkout(workout.id),
  }
}

// ─── Sessões Destaque (Sprint 22 §17 — Insights) ────────────────────────────

export type WorkoutHighlightReason = 'volume' | 'load' | 'duration' | 'xp' | 'records'

export interface WorkoutHighlight {
  workout: CompletedWorkout
  reason: WorkoutHighlightReason
  value: number
}

function maxSetWeightKg(workout: CompletedWorkout): number {
  let max = 0
  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      if (set.weight_kg > max) max = set.weight_kg
    }
  }
  return max
}

/**
 * Sessões destaque para Insights: maior volume, maior carga, maior duração,
 * maior XP e maior número de recordes — uma sessão por categoria, na ordem
 * acima, sem repetir a mesma sessão duas vezes (a primeira categoria em que
 * ela se destaca "ganha" a sessão; as demais categorias buscam a próxima
 * melhor). Categorias com valor zero (ex: nenhuma sessão com recorde) são
 * omitidas em vez de exibir um destaque vazio.
 */
export function getHighlightSessions(limit = 5): WorkoutHighlight[] {
  const history = getWorkoutHistory()
  if (history.length === 0) return []

  const recordCounts = new Map<string, number>()
  for (const workout of history) {
    recordCounts.set(workout.id, getPersonalRecordEventsForWorkout(workout.id).length)
  }

  const seen = new Set<string>()
  const highlights: WorkoutHighlight[] = []

  function pickBest(reason: WorkoutHighlightReason, valueOf: (w: CompletedWorkout) => number) {
    let best: CompletedWorkout | null = null
    let bestValue = 0
    for (const workout of history) {
      if (seen.has(workout.id)) continue
      const value = valueOf(workout)
      if (value > bestValue) {
        best = workout
        bestValue = value
      }
    }
    if (best && bestValue > 0) {
      seen.add(best.id)
      highlights.push({ workout: best, reason, value: bestValue })
    }
  }

  pickBest('volume', sessionVolumeKg)
  pickBest('load', maxSetWeightKg)
  pickBest('duration', (w) => w.durationSeconds)
  pickBest('xp', (w) => w.xpEarned)
  pickBest('records', (w) => recordCounts.get(w.id) ?? 0)

  return highlights.slice(0, limit)
}
