import type { Exercise } from '@/types/database'
import { MOCK_WORKOUT_TYPES } from './mock/data'

export interface CustomWorkout {
  id: string
  name: string
  workoutTypeId: string
  exerciseIds: string[]
  estimatedMinutes: number
  createdAt: string
}

const STORAGE_KEY = 'lrpg-fit:custom-workouts'

function safeGet(): CustomWorkout[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CustomWorkout[]) : []
  } catch {
    return []
  }
}

function safeSet(workouts: CustomWorkout[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts))
  } catch {}
}

export function getCustomWorkouts(): CustomWorkout[] {
  return safeGet().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
}

export function saveCustomWorkout(data: Omit<CustomWorkout, 'id' | 'createdAt'>): CustomWorkout {
  const workouts = safeGet()
  const workout: CustomWorkout = {
    ...data,
    id: `cw-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  workouts.unshift(workout)
  safeSet(workouts)
  return workout
}

export function deleteCustomWorkout(id: string): void {
  safeSet(safeGet().filter((w) => w.id !== id))
}

export function toMockWorkoutShape(cw: CustomWorkout, allExercises: Exercise[]) {
  const workoutType = MOCK_WORKOUT_TYPES.find((wt) => wt.id === cw.workoutTypeId) ?? MOCK_WORKOUT_TYPES[0]
  const exercises = cw.exerciseIds.map((id) => allExercises.find((ex) => ex.id === id)).filter(Boolean) as Exercise[]
  return {
    id: cw.id,
    user_id: 'mock-user-id',
    workout_type_id: cw.workoutTypeId,
    name: cw.name,
    notes: null,
    created_at: cw.createdAt,
    workout_type: workoutType,
    exercises,
    color: '#1db954',
    estimated_minutes: cw.estimatedMinutes,
    isCustom: true as const,
  }
}
