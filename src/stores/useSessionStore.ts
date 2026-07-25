import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import type { WorkoutSession, ExerciseSet, Exercise } from '@/types/database'
import type { SessionAdjustment } from '@/lib/session-adjustments'
import { ORIGINAL_ADJUSTMENT } from '@/lib/session-adjustments'
import type {
  ActiveWorkoutSource,
  PlannedWorkoutExecutionSnapshot,
  ActiveExerciseSource,
  ActiveExerciseStatus,
  ActiveExerciseSubstitution,
  ExerciseSubstitutionReason,
  PlannedExerciseTargets,
} from '@/lib/active-workout'
import { FREE_WORKOUT_SOURCE, moveActiveExercise, resolveExecutionExercise } from '@/lib/active-workout'
import { getAllExercises } from '@/lib/custom-workouts'

export interface ActiveSet {
  exercise: Exercise
  sets: Omit<ExerciseSet, 'id' | 'session_id' | 'created_at' | 'is_pr'>[]
  /** Ausente/`undefined` em treino livre e em sessões persistidas antes da Parte 4B (retrocompatível). */
  source?: ActiveExerciseSource
  /** ID interno do exercício no `PlannedWorkoutExecutionSnapshot` — não é o `exerciseId` do catálogo (Fase 5). */
  plannedExerciseId?: string
  plannedTargets?: PlannedExerciseTargets
  substitution?: ActiveExerciseSubstitution
  /** Só chega a `'skipped'` de fato — ver `deriveExerciseExecutionStatus` em active-workout.ts. */
  executionStatus?: ActiveExerciseStatus
}

interface SessionState {
  activeSession: WorkoutSession | null
  activeSets: ActiveSet[]
  elapsedSeconds: number
  isLoading: boolean
  error: string | null
  sessionAdjustment: SessionAdjustment
  /** Origem da sessão ativa — `free` por padrão, preservando o fluxo de treino livre já existente. */
  source: ActiveWorkoutSource
  /** Presente só quando `source.type === 'planned'`. Imutável após o início (Fase 6). */
  plannedSnapshot: PlannedWorkoutExecutionSnapshot | null
  /** `paused` só interrompe o timer (Fase 28) — nunca bloqueia edição de sets. */
  status: 'active' | 'paused'
  pausedAt: string | null
}

interface StartSessionOptions {
  source?: ActiveWorkoutSource
  plannedSnapshot?: PlannedWorkoutExecutionSnapshot
}

interface AddExerciseMeta {
  source?: ActiveExerciseSource
  plannedExerciseId?: string
  plannedTargets?: PlannedExerciseTargets
}

interface SessionActions {
  startSession: (session: WorkoutSession, options?: StartSessionOptions) => void
  endSession: () => void
  setSessionAdjustment: (adjustment: SessionAdjustment) => void
  addExercise: (exercise: Exercise, meta?: AddExerciseMeta) => void
  removeExercise: (exerciseId: string) => void
  addSet: (exerciseId: string, set: ActiveSet['sets'][number]) => void
  removeSet: (exerciseId: string, setIndex: number) => void
  updateSet: (exerciseId: string, setIndex: number, data: Partial<ActiveSet['sets'][number]>) => void
  tickTimer: () => void
  resetTimer: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  substituteExercise: (
    exerciseId: string,
    replacement: Exercise,
    reason?: ExerciseSubstitutionReason,
    note?: string
  ) => void
  revertExerciseSubstitution: (exerciseId: string) => void
  skipExercise: (exerciseId: string, options?: { clearSets?: boolean }) => void
  restoreExercise: (exerciseId: string) => void
  moveExercise: (exerciseId: string, direction: 'up' | 'down') => void
  pauseSession: () => void
  resumeSession: () => void
}

const INITIAL_STATE: SessionState = {
  activeSession: null,
  activeSets: [],
  elapsedSeconds: 0,
  isLoading: false,
  error: null,
  sessionAdjustment: ORIGINAL_ADJUSTMENT,
  source: FREE_WORKOUT_SOURCE,
  plannedSnapshot: null,
  status: 'active',
  pausedAt: null,
}

const safeStorage = {
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(name)
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(name, value) } catch {}
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(name)
  },
}

export const useSessionStore = create<SessionState & SessionActions>()(
  devtools(
    persist(
      (set) => ({
        ...INITIAL_STATE,

        startSession: (session, options) =>
          set(
            {
              activeSession: session,
              activeSets: [],
              elapsedSeconds: 0,
              error: null,
              sessionAdjustment: ORIGINAL_ADJUSTMENT,
              source: options?.source ?? FREE_WORKOUT_SOURCE,
              plannedSnapshot: options?.plannedSnapshot ?? null,
              status: 'active',
              pausedAt: null,
            },
            false,
            'session/start'
          ),

        setSessionAdjustment: (adjustment) =>
          set({ sessionAdjustment: adjustment }, false, 'session/setAdjustment'),

        endSession: () =>
          set(INITIAL_STATE, false, 'session/end'),

        addExercise: (exercise, meta) =>
          set(
            (state) => {
              const alreadyAdded = state.activeSets.some(
                (s) => s.exercise.id === exercise.id
              )
              if (alreadyAdded) return state
              return {
                activeSets: [
                  ...state.activeSets,
                  {
                    exercise,
                    sets: [],
                    source: meta?.source,
                    plannedExerciseId: meta?.plannedExerciseId,
                    plannedTargets: meta?.plannedTargets,
                  },
                ],
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

        substituteExercise: (exerciseId, replacement, reason, note) =>
          set(
            (state) => {
              const target = state.activeSets.find((s) => s.exercise.id === exerciseId)
              // Só substitui exercícios com vínculo planejado (planned ou já substituído) — Fase 13/49.
              if (!target || !target.plannedExerciseId) return state
              // Evita duas linhas com o mesmo exercise.id (chave de identidade das demais actions).
              const collides = state.activeSets.some(
                (s) => s !== target && s.exercise.id === replacement.id
              )
              if (collides) return state

              const plannedExerciseName = target.substitution?.plannedExerciseName ?? target.exercise.name
              const substitution: ActiveExerciseSubstitution = {
                plannedExerciseId: target.plannedExerciseId,
                plannedExerciseName,
                replacementExerciseId: replacement.id,
                replacementExerciseName: replacement.name,
                reason,
                note,
                substitutedAt: new Date().toISOString(),
              }
              return {
                activeSets: state.activeSets.map((s) =>
                  s === target
                    ? {
                        ...s,
                        exercise: replacement,
                        sets: [], // Fase 16: nunca transporta carga/reps silenciosamente para outro exercício.
                        source: 'substitution',
                        substitution,
                        executionStatus: undefined,
                      }
                    : s
                ),
              }
            },
            false,
            'session/substituteExercise'
          ),

        revertExerciseSubstitution: (exerciseId) =>
          set(
            (state) => {
              const target = state.activeSets.find((s) => s.exercise.id === exerciseId)
              if (!target || !target.substitution) return state
              const plannedExec = state.plannedSnapshot?.exercises.find(
                (e) => e.id === target.plannedExerciseId
              )
              if (!plannedExec) return state
              const restored = resolveExecutionExercise(plannedExec, getAllExercises())
              // Colisão com outra linha que já usa o exercício planejado original.
              const collides = state.activeSets.some((s) => s !== target && s.exercise.id === restored.id)
              if (collides) return state

              return {
                activeSets: state.activeSets.map((s) =>
                  s === target
                    ? {
                        ...s,
                        exercise: restored,
                        sets: [],
                        source: 'planned',
                        substitution: undefined,
                        executionStatus: undefined,
                      }
                    : s
                ),
              }
            },
            false,
            'session/revertExerciseSubstitution'
          ),

        skipExercise: (exerciseId, options) =>
          set(
            (state) => ({
              activeSets: state.activeSets.map((s) =>
                s.exercise.id === exerciseId
                  ? { ...s, executionStatus: 'skipped', sets: options?.clearSets ? [] : s.sets }
                  : s
              ),
            }),
            false,
            'session/skipExercise'
          ),

        restoreExercise: (exerciseId) =>
          set(
            (state) => ({
              activeSets: state.activeSets.map((s) =>
                s.exercise.id === exerciseId && s.executionStatus === 'skipped'
                  ? { ...s, executionStatus: undefined }
                  : s
              ),
            }),
            false,
            'session/restoreExercise'
          ),

        moveExercise: (exerciseId, direction) =>
          set(
            (state) => {
              const index = state.activeSets.findIndex((s) => s.exercise.id === exerciseId)
              if (index === -1) return state
              return { activeSets: moveActiveExercise(state.activeSets, index, direction) }
            },
            false,
            'session/moveExercise'
          ),

        pauseSession: () =>
          set(
            (state) =>
              state.status === 'paused' ? state : { status: 'paused', pausedAt: new Date().toISOString() },
            false,
            'session/pause'
          ),

        resumeSession: () =>
          set(
            (state) => (state.status === 'active' ? state : { status: 'active', pausedAt: null }),
            false,
            'session/resume'
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
      {
        name: 'lrpg-fit:active-session',
        storage: createJSONStorage(() => safeStorage),
        partialize: (state) => ({
          activeSession: state.activeSession,
          activeSets: state.activeSets,
          elapsedSeconds: state.elapsedSeconds,
          sessionAdjustment: state.sessionAdjustment,
          source: state.source,
          plannedSnapshot: state.plannedSnapshot,
          status: state.status,
          pausedAt: state.pausedAt,
        }),
      }
    ),
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
