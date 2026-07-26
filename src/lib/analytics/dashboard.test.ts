import { describe, it, expect } from 'vitest'
import { buildDashboardAnalytics } from './dashboard'
import type { CompletedWorkout, ExerciseRecord, SetRecord } from '../workout-history'
import type { PersonalRecordEvent } from '../personal-record-events'

const HISTORY_KEY = 'lrpg-fit:workout-history'
const CUSTOM_EXERCISES_KEY = 'lrpg-fit:custom-exercises'
const PROGRAMS_KEY = 'lrpg-fit:training-programs'
const PLANNED_WORKOUTS_KEY = 'lrpg-fit:planned-workouts'
const PR_EVENTS_KEY = 'lrpg-fit:personal-record-events'
const CHECK_INS_KEY = 'lrpg-fit:readiness-check-ins'

const NOW = new Date('2026-07-25T12:00:00.000Z')

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
  window.localStorage.removeItem(CHECK_INS_KEY)
}

describe('buildDashboardAnalytics — empty history', () => {
  it('composes a fully empty/null-safe shape without crashing', () => {
    resetAll()
    const dashboard = buildDashboardAnalytics('30d', NOW)

    expect(dashboard.period).toBe('30d')
    expect(dashboard.performance.evolution).toHaveLength(5)
    expect(dashboard.performance.topEvolving).toEqual([])
    expect(dashboard.performance.stagnant).toEqual([])
    expect(dashboard.consistency.completedSessions).toBe(0)
    expect(dashboard.muscleBalance.distribution).toHaveLength(7)
    expect(dashboard.fatigue.readiness.totalCheckIns).toBe(0)
    expect(dashboard.progress.sessionsCompleted).toBe(0)
    expect(dashboard.insights).toEqual([])
  })
})

describe('buildDashboardAnalytics — integration with a realistic seeded history', () => {
  it('produces an internally consistent composed shape', () => {
    resetAll()
    // Ordem mais-recente-primeiro — mesma convenção real de `getWorkoutHistory()`.
    seedHistory([
      workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord(PERNAS_EXERCISE_ID, [set(100, 5)])] }),
      workout({ completedAt: '2026-07-20T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(70, 8)])] }),
      workout({ completedAt: '2026-07-15T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(65, 8)])] }),
      workout({ completedAt: '2026-07-10T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] }),
    ])
    seedPrEvents([
      prEvent({ achievedAt: '2026-07-15T10:05:00.000Z' }),
      prEvent({ achievedAt: '2026-07-20T10:05:00.000Z' }),
    ])

    const dashboard = buildDashboardAnalytics('30d', NOW)

    // A contagem de recordes do progress report bate com o que foi semeado
    // no período (nenhum recálculo divergente entre progress.ts e o que os
    // eventos de PR realmente contêm).
    expect(dashboard.progress.recordsCount).toBe(2)
    expect(dashboard.progress.sessionsCompleted).toBe(dashboard.consistency.completedSessions)
    expect(dashboard.progress.period).toBe(dashboard.period)
    expect(dashboard.consistency.period).toBe(dashboard.period)
    expect(dashboard.muscleBalance.imbalances.period).toBe(dashboard.period)
    expect(dashboard.fatigue.period).toBe(dashboard.period)

    // O grupo de topo em evolução no progress report deve ser o mesmo
    // exercício retornado por `performance.topEvolving[0]` — mesma fonte.
    expect(dashboard.progress.topEvolvingExercise?.exerciseId).toBe(dashboard.performance.topEvolving[0]?.exerciseId)

    for (const insight of dashboard.insights) {
      expect(insight.period).toBe('30d')
      expect(insight.evidence.length).toBeGreaterThan(0)
    }
  })
})

describe('buildDashboardAnalytics — period boundaries', () => {
  it('handles the "all" period across every composed section without throwing', () => {
    resetAll()
    seedHistory([workout({ completedAt: '2020-01-01T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] })])
    expect(() => buildDashboardAnalytics('all', NOW)).not.toThrow()
    const dashboard = buildDashboardAnalytics('all', NOW)
    expect(dashboard.period).toBe('all')
    expect(dashboard.performance.evolution.every((e) => e.direction === 'insufficient_data')).toBe(true)
  })
})
