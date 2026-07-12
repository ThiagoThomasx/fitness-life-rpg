import type { Exercise } from '@/types/database'
import { getWorkoutHistory, type CompletedWorkout } from './workout-history'
import { getAllExercises } from './custom-workouts'
import { RECOVERY_HOURS, MUSCLE_GROUP_LABELS, normalizeMuscleGroups, type MuscleGroup } from './muscle-groups'

const ALL_MUSCLE_GROUPS = Object.keys(RECOVERY_HOURS) as MuscleGroup[]
const PARTIAL_RECOVERY_THRESHOLD = 50
const NEVER_COMPLETED_SCORE_BONUS = 20

export type RecoveryStatus = 'recovered' | 'partial' | 'fatigued'
export type WorkoutRecoveryStatus = RecoveryStatus | 'never' | 'active'

export interface MuscleRecoveryState {
  muscleGroup: MuscleGroup
  lastTrainedAt: string | null
  hoursSinceTrained: number | null
  recoveryPercent: number
  status: RecoveryStatus
}

export interface RecoveryEligibleWorkout {
  id: string
  name: string
  exercises: { muscle_groups: string[] }[]
}

export interface WorkoutRecoveryInfo {
  workoutId: string
  workoutName: string
  muscleGroups: MuscleGroup[]
  lastCompletedAt: string | null
  neverCompleted: boolean
  status: WorkoutRecoveryStatus
  score: number
  reason: string
}

interface RecoveryLookupOptions {
  history?: CompletedWorkout[]
  allExercises?: Exercise[]
  activeWorkoutId?: string | null
  now?: Date
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function recoveryStatusFor(recoveryPercent: number): RecoveryStatus {
  if (recoveryPercent >= 100) return 'recovered'
  if (recoveryPercent >= PARTIAL_RECOVERY_THRESHOLD) return 'partial'
  return 'fatigued'
}

/**
 * `history` is assumed newest-first, matching getWorkoutHistory()'s storage order —
 * the first match per muscle group is therefore its most recent training date.
 */
export function getMuscleRecoveryStates(
  history: CompletedWorkout[] = getWorkoutHistory(),
  allExercises: Exercise[] = getAllExercises(),
  now: Date = new Date()
): Record<MuscleGroup, MuscleRecoveryState> {
  const groupsByExerciseId = new Map<string, MuscleGroup[]>()
  for (const ex of allExercises) {
    groupsByExerciseId.set(ex.id, normalizeMuscleGroups(ex.muscle_groups))
  }

  const lastTrainedAt: Partial<Record<MuscleGroup, string>> = {}
  for (const completed of history) {
    for (const record of completed.exercises) {
      const groups = groupsByExerciseId.get(record.exerciseId) ?? []
      for (const group of groups) {
        if (!(group in lastTrainedAt)) lastTrainedAt[group] = completed.completedAt
      }
    }
  }

  const states = {} as Record<MuscleGroup, MuscleRecoveryState>
  for (const group of ALL_MUSCLE_GROUPS) {
    const last = lastTrainedAt[group] ?? null
    const hoursSinceTrained = last ? (now.getTime() - new Date(last).getTime()) / 3_600_000 : null
    const recoveryPercent =
      hoursSinceTrained === null ? 100 : clamp((hoursSinceTrained / RECOVERY_HOURS[group]) * 100, 0, 100)
    states[group] = {
      muscleGroup: group,
      lastTrainedAt: last,
      hoursSinceTrained,
      recoveryPercent,
      status: recoveryStatusFor(recoveryPercent),
    }
  }
  return states
}

export function getWorkoutRecoveryInfo(
  workout: RecoveryEligibleWorkout,
  options: RecoveryLookupOptions = {}
): WorkoutRecoveryInfo {
  const history = options.history ?? getWorkoutHistory()
  const allExercises = options.allExercises ?? getAllExercises()
  const now = options.now ?? new Date()
  const activeWorkoutId = options.activeWorkoutId ?? null

  const muscleGroups = normalizeMuscleGroups(workout.exercises.flatMap((e) => e.muscle_groups))
  const lastCompletedAt = history.find((h) => h.workoutId === workout.id)?.completedAt ?? null
  const neverCompleted = lastCompletedAt === null

  if (activeWorkoutId === workout.id) {
    return {
      workoutId: workout.id,
      workoutName: workout.name,
      muscleGroups,
      lastCompletedAt,
      neverCompleted,
      status: 'active',
      score: -1,
      reason: 'Sessão ativa em andamento',
    }
  }

  if (muscleGroups.length === 0) {
    return {
      workoutId: workout.id,
      workoutName: workout.name,
      muscleGroups,
      lastCompletedAt,
      neverCompleted,
      status: neverCompleted ? 'never' : 'recovered',
      score: 100,
      reason: neverCompleted ? 'Novo treino — nunca realizado' : 'Totalmente recuperado',
    }
  }

  const muscleStates = getMuscleRecoveryStates(history, allExercises, now)
  const relevantStates = muscleGroups.map((g) => muscleStates[g])
  // O treino só está tão recuperado quanto seu grupo muscular mais fatigado —
  // usar a média esconderia um grupo travado atrás de outros já recuperados,
  // e o score deixaria de bater com o status/badge exibido (ambos worst-case).
  const mostFatigued = relevantStates.reduce((worst, s) => (s.recoveryPercent < worst.recoveryPercent ? s : worst))
  const bottleneckRecovery = mostFatigued.recoveryPercent

  if (neverCompleted) {
    return {
      workoutId: workout.id,
      workoutName: workout.name,
      muscleGroups,
      lastCompletedAt,
      neverCompleted,
      status: 'never',
      score: clamp(bottleneckRecovery + NEVER_COMPLETED_SCORE_BONUS, 0, 100),
      reason: 'Novo treino — nunca realizado',
    }
  }

  if (mostFatigued.status === 'recovered') {
    return {
      workoutId: workout.id,
      workoutName: workout.name,
      muscleGroups,
      lastCompletedAt,
      neverCompleted,
      status: 'recovered',
      score: bottleneckRecovery,
      reason: 'Totalmente recuperado',
    }
  }

  const hours = mostFatigued.hoursSinceTrained !== null ? Math.round(mostFatigued.hoursSinceTrained) : 0
  const groupLabel = MUSCLE_GROUP_LABELS[mostFatigued.muscleGroup]
  const descriptor = mostFatigued.status === 'partial' ? 'em recuperação parcial' : 'fatigado'
  return {
    workoutId: workout.id,
    workoutName: workout.name,
    muscleGroups,
    lastCompletedAt,
    neverCompleted,
    status: mostFatigued.status,
    score: bottleneckRecovery,
    reason: `${groupLabel} ${descriptor} — treinado há ${hours}h`,
  }
}

export function rankWorkoutsByRecovery(
  workouts: RecoveryEligibleWorkout[],
  options: RecoveryLookupOptions = {}
): WorkoutRecoveryInfo[] {
  const history = options.history ?? getWorkoutHistory()
  const allExercises = options.allExercises ?? getAllExercises()
  const now = options.now ?? new Date()
  const activeWorkoutId = options.activeWorkoutId ?? null

  return workouts
    .map((w) => getWorkoutRecoveryInfo(w, { history, allExercises, now, activeWorkoutId }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const aDate = a.lastCompletedAt ?? ''
      const bDate = b.lastCompletedAt ?? ''
      if (aDate !== bDate) return aDate.localeCompare(bDate)
      return a.workoutName.localeCompare(b.workoutName)
    })
}

export function getRecommendedWorkout(
  workouts: RecoveryEligibleWorkout[],
  options: RecoveryLookupOptions = {}
): WorkoutRecoveryInfo | null {
  const ranked = rankWorkoutsByRecovery(workouts, options)
  const top = ranked[0]
  if (!top || top.status === 'active') return null
  return top
}

export function formatTimeSinceCompleted(lastCompletedAt: string | null, now: Date = new Date()): string {
  if (!lastCompletedAt) return 'Nunca realizado'
  const hours = (now.getTime() - new Date(lastCompletedAt).getTime()) / 3_600_000
  if (hours < 1) return 'há poucos minutos'
  if (hours < 24) return `há ${Math.round(hours)}h`
  const days = Math.floor(hours / 24)
  return `há ${days} dia${days !== 1 ? 's' : ''}`
}
