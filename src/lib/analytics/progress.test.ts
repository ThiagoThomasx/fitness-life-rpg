import { describe, it, expect } from 'vitest'
import { buildProgressReport } from './progress'
import type { CompletedWorkout, ExerciseRecord, SetRecord } from '../workout-history'
import type { PersonalRecordEvent } from '../personal-record-events'

const HISTORY_KEY = 'lrpg-fit:workout-history'
const CUSTOM_EXERCISES_KEY = 'lrpg-fit:custom-exercises'
const PROGRAMS_KEY = 'lrpg-fit:training-programs'
const PLANNED_WORKOUTS_KEY = 'lrpg-fit:planned-workouts'
const PR_EVENTS_KEY = 'lrpg-fit:personal-record-events'

const NOW = new Date('2026-07-25T12:00:00.000Z')

// IDs de src/lib/mock/data.ts com um único grupo muscular canônico após normalização.
const PEITO_EXERCISE_ID = 'ex-3'
const PERNAS_EXERCISE_ID = 'ex-9'

function set(weight_kg: number, reps: number): SetRecord {
  return { weight_kg, reps, isPr: false }
}

function exerciseRecord(exerciseId: string, sets: SetRecord[]): ExerciseRecord {
  return { exerciseId, exerciseName: exerciseId, sets }
}

function workout(overrides: Partial<CompletedWorkout> & { completedAt: string; exercises: ExerciseRecord[] }): CompletedWorkout {
  return {
    id: `w-${overrides.completedAt}-${Math.random().toString(36).slice(2, 6)}`,
    workoutId: 'wt-1',
    workoutName: 'Treino A',
    workoutColor: '#000',
    category: 'strength',
    startedAt: overrides.completedAt,
    durationSeconds: 1800,
    xpEarned: 50,
    prsCount: 0,
    ...overrides,
  }
}

function prEvent(overrides: Partial<PersonalRecordEvent> & { achievedAt: string }): PersonalRecordEvent {
  return {
    id: `pr-${overrides.achievedAt}-${Math.random().toString(36).slice(2, 6)}`,
    workoutId: 'wt-1',
    exerciseId: PEITO_EXERCISE_ID,
    exerciseName: 'Supino Reto',
    recordType: 'max_load',
    newValue: 80,
    unit: 'kg',
    ...overrides,
  }
}

function seedHistory(history: CompletedWorkout[]) {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

function seedPrEvents(events: PersonalRecordEvent[]) {
  window.localStorage.setItem(PR_EVENTS_KEY, JSON.stringify(events))
}

function resetAll() {
  seedHistory([])
  seedPrEvents([])
  window.localStorage.removeItem(CUSTOM_EXERCISES_KEY)
  window.localStorage.removeItem(PROGRAMS_KEY)
  window.localStorage.removeItem(PLANNED_WORKOUTS_KEY)
}

describe('buildProgressReport — empty history', () => {
  it('returns a fully null/zero report without crashing', () => {
    resetAll()
    const report = buildProgressReport('30d', NOW)
    expect(report.period).toBe('30d')
    expect(report.sessionsCompleted).toBe(0)
    expect(report.consistencyPercent).toBeNull()
    expect(report.volumeChangePercent).toBeNull()
    expect(report.loadChangePercent).toBeNull()
    expect(report.recordsCount).toBe(0)
    expect(report.topEvolvingExercise).toBeNull()
    // Todos os 7 grupos musculares ficam com frequência 0 — o primeiro do
    // array canônico (`peito`) é retornado de forma determinística.
    expect(report.leastFrequentMuscleGroup).toEqual({ muscleGroup: 'peito', label: 'Peito' })
  })
})

describe('buildProgressReport — populated history', () => {
  it('composes sessions/records/top-evolving from underlying engines without recomputing them', () => {
    resetAll()
    // Ordem mais-recente-primeiro — mesma convenção real de `getWorkoutHistory()`
    // (`saveCompletedWorkout` faz `[workout, ...history]`), da qual
    // `exercise-records.ts`/`getTopGrowthExercises` depende para earliest→latest.
    seedHistory([
      workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord(PERNAS_EXERCISE_ID, [set(100, 5)])] }),
      workout({ completedAt: '2026-07-20T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(70, 8)])] }),
      workout({ completedAt: '2026-07-15T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(65, 8)])] }),
      workout({ completedAt: '2026-07-10T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] }),
    ])
    seedPrEvents([
      prEvent({ achievedAt: '2026-07-15T10:05:00.000Z' }),
      prEvent({ achievedAt: '2026-07-20T10:05:00.000Z' }),
      // Fora do período de 30 dias contados a partir de NOW — não deve contar.
      prEvent({ achievedAt: '2026-01-01T10:05:00.000Z' }),
    ])

    const report = buildProgressReport('30d', NOW)

    expect(report.sessionsCompleted).toBe(4)
    expect(report.recordsCount).toBe(2)
    expect(report.topEvolvingExercise).toEqual({ exerciseId: PEITO_EXERCISE_ID, exerciseName: PEITO_EXERCISE_ID })
    // Peito(3)/pernas(1) tiveram sessões; os outros 5 grupos ficam em 0 —
    // empate resolvido pelo primeiro grupo de frequência 0 na ordem canônica
    // de `ALL_MUSCLE_GROUPS` (peito, costas, pernas, ...) → 'costas'.
    expect(report.leastFrequentMuscleGroup?.muscleGroup).toBe('costas')
  })

  it('reflects program adherence in consistencyPercent when an active program exists', () => {
    resetAll()
    window.localStorage.setItem(
      PROGRAMS_KEY,
      JSON.stringify([
        {
          id: 'prog-1',
          name: 'Programa X',
          weeks: [],
          tags: [],
          isFavorite: false,
          isArchived: false,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
    )
    const cw = workout({ id: 'cw-1', completedAt: '2026-07-20T11:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] })
    seedHistory([cw])
    window.localStorage.setItem(
      PLANNED_WORKOUTS_KEY,
      JSON.stringify([
        {
          id: 'pw-1',
          date: '2026-07-20',
          weekday: 1,
          name: 'A',
          templateSnapshot: {
            name: 'Treino A',
            exerciseBlocks: [{ id: 'blk-1', type: 'single', exercise: { id: PEITO_EXERCISE_ID, exerciseId: PEITO_EXERCISE_ID, exerciseName: 'Supino Reto' } }],
            capturedAt: new Date().toISOString(),
          },
          status: 'done',
          isOptional: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: { programId: 'prog-1', programVersion: 1, programWeekId: 'w1', programWeekNumber: 1 },
          execution: { completedWorkoutId: 'cw-1', updatedAt: '2026-07-20T11:00:00.000Z' },
        },
      ])
    )

    const report = buildProgressReport('30d', NOW)
    expect(report.consistencyPercent).toBe(100)
  })
})

describe('buildProgressReport — period boundaries', () => {
  it('handles the "all" period without a comparable previous window', () => {
    resetAll()
    seedHistory([workout({ completedAt: '2020-01-01T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] })])
    const report = buildProgressReport('all', NOW)
    expect(report.period).toBe('all')
    expect(report.sessionsCompleted).toBe(1)
    // 'all' não tem período anterior equivalente (performance.ts, Parte 2).
    expect(report.volumeChangePercent).toBeNull()
    expect(report.loadChangePercent).toBeNull()
  })
})
