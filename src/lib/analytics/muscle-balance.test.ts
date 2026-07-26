import { describe, it, expect } from 'vitest'
import { computeMuscleGroupDistribution, identifyImbalances } from './muscle-balance'
import type { CompletedWorkout, ExerciseRecord, SetRecord } from '../workout-history'

const HISTORY_KEY = 'lrpg-fit:workout-history'
const CUSTOM_EXERCISES_KEY = 'lrpg-fit:custom-exercises'
const NOW = new Date('2026-07-25T12:00:00.000Z')

// IDs de exercícios de src/lib/mock/data.ts com um único grupo muscular
// canônico após normalização — evita ambiguidade nos testes de razão.
const PEITO_EXERCISE_ID = 'ex-3' // Crucifixo — peitoral apenas
const COSTAS_EXERCISE_ID = 'ex-6' // Remada Baixa — costas média, bíceps (primário: costas)
const PERNAS_EXERCISE_ID = 'ex-9' // Cadeira Extensora — quadríceps apenas
const OMBROS_EXERCISE_ID = 'ex-12' // Elevação Lateral — deltoide lateral apenas
const BICEPS_EXERCISE_ID = 'ex-13' // Rosca Direta — bíceps apenas
const TRICEPS_EXERCISE_ID = 'ex-15' // Tríceps Corda — tríceps apenas
const CORE_EXERCISE_ID = 'ex-17' // Abdominal — abdômen apenas (core)

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
  window.localStorage.removeItem(CUSTOM_EXERCISES_KEY)
}

describe('computeMuscleGroupDistribution', () => {
  it('returns all 7 muscle groups at zero without crashing for an empty history', () => {
    resetAll()
    const distribution = computeMuscleGroupDistribution('30d', NOW)
    expect(distribution).toHaveLength(7)
    for (const entry of distribution) {
      expect(entry.sets).toBe(0)
      expect(entry.volumeKg).toBe(0)
      expect(entry.frequency).toBe(0)
      expect(entry.participationPercent).toBe(0)
    }
  })

  it('attributes sets/volume/frequency to the correct muscle group for a small history', () => {
    resetAll()
    seedHistory([
      workout({
        completedAt: '2026-07-24T10:00:00.000Z',
        exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8), set(60, 8), set(60, 8)])],
      }),
    ])
    const distribution = computeMuscleGroupDistribution('7d', NOW)
    const peito = distribution.find((d) => d.muscleGroup === 'peito')!
    expect(peito.sets).toBe(3)
    expect(peito.frequency).toBe(1)
    expect(peito.volumeKg).toBe(60 * 8 * 3)
    expect(peito.participationPercent).toBe(100)

    const costas = distribution.find((d) => d.muscleGroup === 'costas')!
    expect(costas.sets).toBe(0)
    expect(costas.participationPercent).toBe(0)
  })

  it('computes participation percent as a share of total sets across a larger, multi-group history', () => {
    resetAll()
    seedHistory([
      workout({ completedAt: '2026-07-20T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8), set(60, 8)])] }),
      workout({ completedAt: '2026-07-21T10:00:00.000Z', exercises: [exerciseRecord(COSTAS_EXERCISE_ID, [set(50, 8), set(50, 8)])] }),
      workout({ completedAt: '2026-07-22T10:00:00.000Z', exercises: [exerciseRecord(PERNAS_EXERCISE_ID, [set(80, 10)])] }),
    ])
    const distribution = computeMuscleGroupDistribution('30d', NOW)
    const totalSets = distribution.reduce((s, d) => s + d.sets, 0)
    expect(totalSets).toBe(5)
    const peito = distribution.find((d) => d.muscleGroup === 'peito')!
    expect(peito.participationPercent).toBeCloseTo((2 / 5) * 100)
  })

  it('counts multiple sessions touching the same group toward frequency', () => {
    resetAll()
    seedHistory([
      workout({ completedAt: '2026-07-20T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] }),
      workout({ completedAt: '2026-07-21T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] }),
    ])
    const distribution = computeMuscleGroupDistribution('30d', NOW)
    const peito = distribution.find((d) => d.muscleGroup === 'peito')!
    expect(peito.frequency).toBe(2)
    expect(peito.sets).toBe(2)
  })

  it('does not crash when a workout references an exercise removed from the catalog', () => {
    resetAll()
    seedHistory([
      workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord('deleted-exercise-id', [set(60, 8)])] }),
    ])
    expect(() => computeMuscleGroupDistribution('30d', NOW)).not.toThrow()
    const distribution = computeMuscleGroupDistribution('30d', NOW)
    expect(distribution.reduce((s, d) => s + d.sets, 0)).toBe(0)
  })

  it('respects the "all" period boundary without throwing', () => {
    resetAll()
    seedHistory([workout({ completedAt: '2020-01-01T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] })])
    expect(() => computeMuscleGroupDistribution('all', NOW)).not.toThrow()
    const distribution = computeMuscleGroupDistribution('all', NOW)
    expect(distribution.find((d) => d.muscleGroup === 'peito')!.sets).toBe(1)
  })
})

describe('identifyImbalances', () => {
  it('flags every group as neglected when there is no history at all', () => {
    resetAll()
    const report = identifyImbalances('30d', NOW)
    expect(report.neglectedGroups.sort()).toEqual(
      ['biceps', 'core', 'costas', 'ombros', 'peito', 'pernas', 'triceps'].sort()
    )
    expect(report.excessiveGroups).toEqual([])
    expect(report.pushPullRatio).toEqual({ push: 0, pull: 0, ratio: null })
    expect(report.upperLowerRatio).toEqual({ upper: 0, lower: 0, ratio: null })
    expect(report.period).toBe('30d')
  })

  it('flags a single heavily-trained group as excessive relative to the other six', () => {
    resetAll()
    seedHistory([
      workout({
        completedAt: '2026-07-24T10:00:00.000Z',
        exercises: [
          exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8), set(60, 8), set(60, 8), set(60, 8), set(60, 8), set(60, 8)]),
          exerciseRecord(COSTAS_EXERCISE_ID, [set(50, 8)]),
        ],
      }),
    ])
    const report = identifyImbalances('7d', NOW)
    expect(report.excessiveGroups).toContain('peito')
    expect(report.excessiveGroups).not.toContain('costas')
  })

  it('computes an all-push edge case where pull is zero and the ratio is null', () => {
    resetAll()
    seedHistory([
      workout({
        completedAt: '2026-07-24T10:00:00.000Z',
        exercises: [
          exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8), set(60, 8)]),
          exerciseRecord(OMBROS_EXERCISE_ID, [set(30, 10)]),
          exerciseRecord(TRICEPS_EXERCISE_ID, [set(20, 10)]),
        ],
      }),
    ])
    const report = identifyImbalances('7d', NOW)
    expect(report.pushPullRatio.pull).toBe(0)
    expect(report.pushPullRatio.push).toBe(4)
    expect(report.pushPullRatio.ratio).toBeNull()
  })

  it('computes an all-pull edge case where push is zero and the ratio is null', () => {
    resetAll()
    seedHistory([
      workout({
        completedAt: '2026-07-24T10:00:00.000Z',
        exercises: [
          exerciseRecord(COSTAS_EXERCISE_ID, [set(50, 8), set(50, 8)]),
          exerciseRecord(BICEPS_EXERCISE_ID, [set(20, 10)]),
        ],
      }),
    ])
    const report = identifyImbalances('7d', NOW)
    expect(report.pushPullRatio.push).toBe(0)
    expect(report.pushPullRatio.pull).toBe(3)
    // Denominador (pull) > 0 — ratio é definido (0), não null. `ratio: null`
    // só ocorre quando o DENOMINADOR é zero (ver caso "all-push" acima).
    expect(report.pushPullRatio.ratio).toBe(0)
  })

  it('computes a finite push/pull ratio when both sides have sets', () => {
    resetAll()
    seedHistory([
      workout({
        completedAt: '2026-07-24T10:00:00.000Z',
        exercises: [
          exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8), set(60, 8), set(60, 8), set(60, 8)]),
          exerciseRecord(COSTAS_EXERCISE_ID, [set(50, 8), set(50, 8)]),
        ],
      }),
    ])
    const report = identifyImbalances('7d', NOW)
    expect(report.pushPullRatio.ratio).toBeCloseTo(4 / 2)
  })

  it('excludes core from both the push/pull and upper/lower ratios', () => {
    resetAll()
    seedHistory([
      workout({
        completedAt: '2026-07-24T10:00:00.000Z',
        exercises: [exerciseRecord(CORE_EXERCISE_ID, [set(0, 20), set(0, 20)])],
      }),
    ])
    const report = identifyImbalances('7d', NOW)
    expect(report.pushPullRatio).toEqual({ push: 0, pull: 0, ratio: null })
    expect(report.upperLowerRatio).toEqual({ upper: 0, lower: 0, ratio: null })
  })

  it('computes upper/lower ratio counting only pernas as lower', () => {
    resetAll()
    seedHistory([
      workout({
        completedAt: '2026-07-24T10:00:00.000Z',
        exercises: [
          exerciseRecord(PERNAS_EXERCISE_ID, [set(80, 10), set(80, 10)]),
          exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)]),
        ],
      }),
    ])
    const report = identifyImbalances('7d', NOW)
    expect(report.upperLowerRatio).toEqual({ upper: 1, lower: 2, ratio: 0.5 })
  })

  it('does not crash on muscle groups with zero sets while others have data', () => {
    resetAll()
    seedHistory([workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] })])
    expect(() => identifyImbalances('7d', NOW)).not.toThrow()
  })
})
