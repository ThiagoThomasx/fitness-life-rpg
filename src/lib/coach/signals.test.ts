import { describe, it, expect } from 'vitest'
import { buildCoachSignals } from './signals'
import type { CompletedWorkout, ExerciseRecord, SetRecord } from '../workout-history'

const HISTORY_KEY = 'lrpg-fit:workout-history'
const CHECK_INS_KEY = 'lrpg-fit:readiness-check-ins'
const NOW = new Date('2026-07-25T12:00:00.000Z')

// Mesmos ids de src/lib/mock/data.ts usados pelos testes de analytics/fatigue.test.ts.
const PEITO_EXERCISE_ID = 'ex-3'

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

function seedHistory(history: CompletedWorkout[]) {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

function resetAll() {
  seedHistory([])
  window.localStorage.setItem(CHECK_INS_KEY, JSON.stringify([]))
}

describe('buildCoachSignals — empty history', () => {
  it('returns a fully well-formed, empty/insufficient signals object without throwing', () => {
    resetAll()
    expect(() => buildCoachSignals('30d', NOW)).not.toThrow()
    const signals = buildCoachSignals('30d', NOW)

    expect(signals.period).toBe('30d')
    expect(signals.generatedAt).toBe(NOW.toISOString())
    expect(signals.recovery.readiness.totalCheckIns).toBe(0)
    expect(signals.consistency.completedSessions).toBe(0)
    expect(signals.performance.stagnationDetails).toEqual([])
    expect(signals.records.recent).toEqual([])
    expect(signals.trainingLoad.loadTrend).toBe('insufficient_data')
  })
})

describe('buildCoachSignals — populated history', () => {
  it('surfaces a stagnation detail for an exercise with a flat load trend across enough executions', () => {
    resetAll()
    const history: CompletedWorkout[] = []
    // 6 execuções (janela mínima do motor de tendência), mesma carga sempre -> 'stable'.
    for (let i = 0; i < 6; i += 1) {
      history.push(
        workout({
          completedAt: `2026-07-${(i + 1).toString().padStart(2, '0')}T10:00:00.000Z`,
          exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8), set(60, 8)])],
        })
      )
    }
    seedHistory(history)

    const signals = buildCoachSignals('90d', NOW)
    expect(signals.performance.stagnant.length).toBeGreaterThan(0)
    const detail = signals.performance.stagnationDetails.find((d) => d.exerciseId === PEITO_EXERCISE_ID)
    expect(detail).toBeDefined()
    expect(detail?.trend.direction).toBe('stable')
  })

  it('surfaces recent records when a workout contains a first-time execution', () => {
    resetAll()
    seedHistory([
      workout({
        completedAt: '2026-07-24T10:00:00.000Z',
        exercises: [{ exerciseId: 'ex-new', exerciseName: 'Novo Exercício', sets: [set(20, 10)], isFirstTime: true }],
      }),
    ])

    const signals = buildCoachSignals('30d', NOW)
    expect(signals.records.recent.length).toBeGreaterThan(0)
    expect(signals.records.recent[0].type).toBe('first_time')
  })
})
