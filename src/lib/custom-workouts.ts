import type { Exercise } from '@/types/database'
import { MOCK_WORKOUT_TYPES, MOCK_EXERCISES } from './mock/data'
import { categoryColor } from './theme-colors'
import { getPlannedWorkouts } from './planned-workouts'
import { getTrainingPrograms } from './training-programs'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExerciseTarget {
  exerciseId: string
  targetSets: number
  targetReps: number | null
  targetWeightKg: number | null
  targetDurationSecs: number | null
}

export interface CustomWorkout {
  id: string
  name: string
  workoutTypeId: string
  exerciseIds: string[]
  targets: ExerciseTarget[]
  estimatedMinutes: number
  createdAt: string
  updatedAt?: string
}

export interface CustomExercise {
  id: string
  name: string
  workout_type_id: string
  muscle_groups: string[]
  equipment: string[]
  instructions: null
  isCustom: true
  createdAt: string
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const WORKOUTS_KEY = 'lrpg-fit:custom-workouts'
const EXERCISES_KEY = 'lrpg-fit:custom-exercises'

// ─── Storage helpers ──────────────────────────────────────────────────────────

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

// ─── Custom Workouts ──────────────────────────────────────────────────────────

export function getCustomWorkouts(): CustomWorkout[] {
  return safeGet<CustomWorkout[]>(WORKOUTS_KEY, [])
    .map((w) => ({ ...w, targets: w.targets ?? [] }))
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
}

export function saveCustomWorkout(
  data: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt'>
): CustomWorkout {
  const workouts = safeGet<CustomWorkout[]>(WORKOUTS_KEY, [])
  const workout: CustomWorkout = {
    ...data,
    id: `cw-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  workouts.unshift(workout)
  safeSet(WORKOUTS_KEY, workouts)
  return workout
}

export function updateCustomWorkout(
  id: string,
  data: Partial<Omit<CustomWorkout, 'id' | 'createdAt'>>
): CustomWorkout | null {
  const workouts = safeGet<CustomWorkout[]>(WORKOUTS_KEY, [])
  const idx = workouts.findIndex((w) => w.id === id)
  if (idx === -1) return null
  const updated: CustomWorkout = {
    ...workouts[idx],
    targets: workouts[idx].targets ?? [],
    ...data,
    updatedAt: new Date().toISOString(),
  }
  workouts[idx] = updated
  safeSet(WORKOUTS_KEY, workouts)
  return updated
}

export function duplicateCustomWorkout(id: string): CustomWorkout | null {
  const workouts = safeGet<CustomWorkout[]>(WORKOUTS_KEY, [])
  const original = workouts.find((w) => w.id === id)
  if (!original) return null
  const copy: CustomWorkout = {
    ...original,
    id: `cw-${Date.now()}`,
    name: `${original.name} (Cópia)`,
    createdAt: new Date().toISOString(),
    updatedAt: undefined,
  }
  workouts.unshift(copy)
  safeSet(WORKOUTS_KEY, workouts)
  return copy
}

export function deleteCustomWorkout(id: string): void {
  safeSet(
    WORKOUTS_KEY,
    safeGet<CustomWorkout[]>(WORKOUTS_KEY, []).filter((w) => w.id !== id)
  )
}

// ─── Custom Exercises ─────────────────────────────────────────────────────────

export function getCustomExercises(): CustomExercise[] {
  return safeGet<CustomExercise[]>(EXERCISES_KEY, []).sort((a, b) =>
    a.createdAt > b.createdAt ? -1 : 1
  )
}

export function saveCustomExercise(
  data: Omit<CustomExercise, 'id' | 'createdAt' | 'isCustom'>
): CustomExercise {
  const exercises = safeGet<CustomExercise[]>(EXERCISES_KEY, [])
  const exercise: CustomExercise = {
    ...data,
    isCustom: true,
    id: `cx-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  exercises.unshift(exercise)
  safeSet(EXERCISES_KEY, exercises)
  return exercise
}

export function updateCustomExercise(
  id: string,
  data: Partial<Omit<CustomExercise, 'id' | 'createdAt' | 'isCustom'>>
): CustomExercise | null {
  const exercises = safeGet<CustomExercise[]>(EXERCISES_KEY, [])
  const idx = exercises.findIndex((e) => e.id === id)
  if (idx === -1) return null
  const updated = { ...exercises[idx], ...data }
  exercises[idx] = updated
  safeSet(EXERCISES_KEY, exercises)
  return updated
}

/**
 * Verifica se o exercício está referenciado em alguma sessão planejada ou
 * programa — evita que a exclusão quebre silenciosamente `exerciseId` já
 * congelado em snapshots (auditoria Sprint 20 Parte 3, risco #7).
 */
export function isCustomExerciseUsed(exerciseId: string): boolean {
  const usedInPlanner = getPlannedWorkouts().some((p) =>
    p.templateSnapshot.exerciseBlocks.some((b) => b.exercise.exerciseId === exerciseId)
  )
  if (usedInPlanner) return true

  return getTrainingPrograms().some((program) =>
    program.weeks.some((week) =>
      week.sessions.some((session) =>
        session.templateSnapshot.exerciseBlocks.some((b) => b.exercise.exerciseId === exerciseId)
      )
    )
  )
}

/** Segue o mesmo padrão de `deleteWorkoutTemplate` — nunca exclui silenciosamente um exercício em uso. */
export function deleteCustomExercise(id: string, isInUse: boolean): { ok: boolean; error?: string } {
  if (isInUse) {
    return {
      ok: false,
      error: 'Este exercício já foi usado em sessões planejadas ou programas. Não é possível excluir.',
    }
  }
  safeSet(
    EXERCISES_KEY,
    safeGet<CustomExercise[]>(EXERCISES_KEY, []).filter((e) => e.id !== id)
  )
  return { ok: true }
}

export function getAllExercises(): Exercise[] {
  const custom = getCustomExercises().map(
    (cx): Exercise => ({
      id: cx.id,
      workout_type_id: cx.workout_type_id,
      name: cx.name,
      muscle_groups: cx.muscle_groups,
      equipment: cx.equipment,
      instructions: null,
    })
  )
  return [...MOCK_EXERCISES, ...custom]
}

// ─── Shape conversion ─────────────────────────────────────────────────────────

export function toMockWorkoutShape(cw: CustomWorkout, allExercises: Exercise[]) {
  const workoutType =
    MOCK_WORKOUT_TYPES.find((wt) => wt.id === cw.workoutTypeId) ?? MOCK_WORKOUT_TYPES[0]
  const exercises = cw.exerciseIds
    .map((id) => allExercises.find((ex) => ex.id === id))
    .filter(Boolean) as Exercise[]
  return {
    id: cw.id,
    user_id: 'mock-user-id',
    workout_type_id: cw.workoutTypeId,
    name: cw.name,
    notes: null,
    created_at: cw.createdAt,
    workout_type: workoutType,
    exercises,
    color: categoryColor(workoutType.category).fill,
    estimated_minutes: cw.estimatedMinutes,
    isCustom: true as const,
    targets: cw.targets ?? [],
  }
}
