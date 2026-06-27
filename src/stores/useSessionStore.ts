import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { WorkoutSession, ExerciseSet, Exercise } from '@/types/database'

interface ActiveSet {
  exercise: Exercise
  sets: Omit<ExerciseSet, 'id' | 'session_id' | 'created_at' | 'is_pr'>[]
}

interface SessionState {
  activeSession: WorkoutSession | null
  activeSets: ActiveSet[]
  elapsedSeconds: number
  isLoading: boolean
  error: string | null
}

interface SessionActions {
  startSession: (session: WorkoutSession) => void
  endSession: () => void
  addExercise: (exercise: Exercise) => void
  removeExercise: (exerciseId: string) => void
  addSet: (exerciseId: string, set: ActiveSet['sets'][number]) => void
  removeSet: (exerciseId: string, setIndex: number) => void
  updateSet: (exerciseId: string, setIndex: number, data: Partial<ActiveSet['sets'][number]>) => void
  tickTimer: () => void
  resetTimer: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

const INITIAL_STATE: SessionState = {
  activeSession: null,
  activeSets: [],
  elapsedSeconds: 0,
  isLoading: false,
  error: null,
}

export const useSessionStore = create<SessionState & SessionActions>()(
  devtools(
    (set) => ({
      ...INITIAL_STATE,

      startSession: (session) =>
        set(
          { activeSession: session, activeSets: [], elapsedSeconds: 0, error: null },
          false,
          'session/start'
        ),

      endSession: () =>
        set(INITIAL_STATE, false, 'session/end'),

      addExercise: (exercise) =>
        set(
          (state) => {
            const alreadyAdded = state.activeSets.some(
              (s) => s.exercise.id === exercise.id
            )
            if (alreadyAdded) return state
            return {
              activeSets: [...state.activeSets, { exercise, sets: [] }],
            }
          },
          false,
          'session/addExercise'
        ),

      removeExercise: (exerciseId) =>
        set(
          (state) => ({
            activeSets: state.activeSets.filter(
              (s) => s.exercise.id !== exerciseId
            ),
          }),
          false,
          'session/removeExercise'
        ),

      addSet: (exerciseId, newSet) =>
        set(
          (state) => ({
            activeSets: state.activeSets.map((s) =>
              s.exercise.id === exerciseId
                ? { ...s, sets: [...s.sets, newSet] }
                : s
            ),
          }),
          false,
          'session/addSet'
        ),

      removeSet: (exerciseId, setIndex) =>
        set(
          (state) => ({
            activeSets: state.activeSets.map((s) =>
              s.exercise.id === exerciseId
                ? {
                    ...s,
                    sets: s.sets.filter((_, i) => i !== setIndex),
                  }
                : s
            ),
          }),
          false,
          'session/removeSet'
        ),

      updateSet: (exerciseId, setIndex, data) =>
        set(
          (state) => ({
            activeSets: state.activeSets.map((s) =>
              s.exercise.id === exerciseId
                ? {
                    ...s,
                    sets: s.sets.map((set, i) =>
                      i === setIndex ? { ...set, ...data } : set
                    ),
                  }
                : s
            ),
          }),
          false,
          'session/updateSet'
        ),

      tickTimer: () =>
        set(
          (state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }),
          false,
          'session/tick'
        ),

      resetTimer: () =>
        set({ elapsedSeconds: 0 }, false, 'session/resetTimer'),

      setLoading: (isLoading) =>
        set({ isLoading }, false, 'session/setLoading'),

      setError: (error) =>
        set({ error }, false, 'session/setError'),
    }),
    { name: 'SessionStore' }
  )
)

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
