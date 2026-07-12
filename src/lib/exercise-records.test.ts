import { describe, it, expect, beforeEach } from 'vitest'
import type { CompletedWorkout, SetRecord } from './workout-history'
import {
  calculateVolumeKg,
  calculateEstimated1RM,
  detectExercisePrs,
  getExerciseSummary,
  getLastExecutionSummary,
  getRecentRecords,
  getTopGrowthExercises,
  getStagnantExercises,
  getProfileRecordStats,
} from './exercise-records'

const HISTORY_KEY = 'lrpg-fit:workout-history'

function set(weight_kg: number, reps: number, isPr = false): SetRecord {
  return { weight_kg, reps, isPr }
}

function workout(overrides: Partial<CompletedWorkout> & { completedAt: string }): CompletedWorkout {
  return {
    id: `w-${overrides.completedAt}`,
    workoutId: 'wt-1',
    workoutName: 'Treino',
    workoutColor: '#000',
    category: 'strength',
    startedAt: overrides.completedAt,
    durationSeconds: 1800,
    xpEarned: 50,
    prsCount: 0,
    exercises: [],
    ...overrides,
  }
}

function seedHistory(history: CompletedWorkout[]) {
  // getWorkoutHistory()/getExerciseHistory() esperam mais recente primeiro.
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('calculateVolumeKg', () => {
  it('returns 0 for an empty set list', () => {
    expect(calculateVolumeKg([])).toBe(0)
  })

  it('computes weight × reps for a single set', () => {
    expect(calculateVolumeKg([{ weight_kg: 20, reps: 10 }])).toBe(200)
  })

  it('sums volume across multiple sets', () => {
    expect(
      calculateVolumeKg([
        { weight_kg: 20, reps: 10 },
        { weight_kg: 25, reps: 8 },
      ])
    ).toBe(400)
  })
})

describe('calculateEstimated1RM', () => {
  it('applies the Epley formula', () => {
    expect(calculateEstimated1RM(100, 10)).toBeCloseTo(133.33, 1)
  })

  it('returns 0 for zero or negative weight (bodyweight exercises)', () => {
    expect(calculateEstimated1RM(0, 10)).toBe(0)
    expect(calculateEstimated1RM(-5, 10)).toBe(0)
  })

  it('returns 0 for zero or negative reps', () => {
    expect(calculateEstimated1RM(100, 0)).toBe(0)
  })
})

describe('detectExercisePrs', () => {
  it('marks first-ever execution as isFirstTime and no other PR type', () => {
    seedHistory([])
    const result = detectExercisePrs('ex-1', [{ weight_kg: 40, reps: 8 }])
    expect(result.isFirstTime).toBe(true)
    expect(result.isWeightPr).toBe(false)
    expect(result.isRepsPr).toBe(false)
    expect(result.isVolumePr).toBe(false)
  })

  it('detects a new weight PR', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
    ])
    const result = detectExercisePrs('ex-1', [{ weight_kg: 45, reps: 8 }])
    expect(result.isWeightPr).toBe(true)
    expect(result.isFirstTime).toBe(false)
  })

  it('does not count a tie (equal to prior best) as a PR', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
    ])
    const result = detectExercisePrs('ex-1', [{ weight_kg: 40, reps: 8 }])
    expect(result.isWeightPr).toBe(false)
  })

  it('does not count a lower weight as a PR', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
    ])
    const result = detectExercisePrs('ex-1', [{ weight_kg: 30, reps: 8 }])
    expect(result.isWeightPr).toBe(false)
  })

  it('detects a reps PR independent of weight', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
    ])
    const result = detectExercisePrs('ex-1', [{ weight_kg: 40, reps: 10 }])
    expect(result.isRepsPr).toBe(true)
    expect(result.isWeightPr).toBe(false)
  })

  it('detects a volume PR even when neither weight nor reps individually beat their own bests', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 10)] }], // volume 400
      }),
    ])
    // 3 séries de 40x8 = volume 960 > 400, mas nem peso (40=40) nem reps (8<10) batem individualmente
    const result = detectExercisePrs('ex-1', [
      { weight_kg: 40, reps: 8 },
      { weight_kg: 40, reps: 8 },
      { weight_kg: 40, reps: 8 },
    ])
    expect(result.isVolumePr).toBe(true)
    expect(result.isWeightPr).toBe(false)
    expect(result.isRepsPr).toBe(false)
  })

  it('can flag combined PR types in the same session (not mutually exclusive)', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
    ])
    const result = detectExercisePrs('ex-1', [{ weight_kg: 50, reps: 10 }])
    expect(result.isWeightPr).toBe(true)
    expect(result.isRepsPr).toBe(true)
    expect(result.isVolumePr).toBe(true)
  })

  it('returns null estimated1RM for bodyweight-only sets', () => {
    seedHistory([])
    const result = detectExercisePrs('ex-1', [{ weight_kg: 0, reps: 15 }])
    expect(result.estimated1RMKg).toBeNull()
  })

  it('computes estimated1RM as the max across sets when weighted', () => {
    seedHistory([])
    const result = detectExercisePrs('ex-1', [
      { weight_kg: 40, reps: 8 },
      { weight_kg: 45, reps: 5 },
    ])
    expect(result.estimated1RMKg).toBeCloseTo(calculateEstimated1RM(45, 5), 5)
  })
})

describe('getExerciseSummary', () => {
  it('returns null when the exercise has no history', () => {
    seedHistory([])
    expect(getExerciseSummary('ex-unknown')).toBeNull()
  })

  it('reports insufficient_data trend with only one prior session', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
    ])
    const summary = getExerciseSummary('ex-1')
    expect(summary?.trend).toBe('insufficient_data')
  })

  it('reports an up trend when the latest session beats the previous one', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-02T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(45, 8)] }],
      }),
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
    ])
    const summary = getExerciseSummary('ex-1')
    expect(summary?.trend).toBe('up')
    expect(summary?.bestWeightKg).toBe(45)
  })

  it('reports a flat trend when weight is unchanged', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-02T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
    ])
    expect(getExerciseSummary('ex-1')?.trend).toBe('flat')
  })
})

describe('getLastExecutionSummary', () => {
  it('returns null when there is no history', () => {
    seedHistory([])
    expect(getLastExecutionSummary('ex-1')).toBeNull()
  })

  it('returns the most recent session best set (max weight, tie-break by reps)', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-02T00:00:00.000Z',
        exercises: [
          {
            exerciseId: 'ex-1',
            exerciseName: 'Supino',
            sets: [set(40, 8), set(40, 10), set(35, 12)],
          },
        ],
      }),
    ])
    const last = getLastExecutionSummary('ex-1')
    expect(last).toEqual({ weightKg: 40, reps: 10, date: '2026-07-02T00:00:00.000Z' })
  })
})

describe('getRecentRecords', () => {
  it('returns an empty list when there is no history', () => {
    seedHistory([])
    expect(getRecentRecords()).toEqual([])
  })

  it('prioritizes first_time > weight > volume > reps when multiple types qualify', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-05T00:00:00.000Z',
        exercises: [
          {
            exerciseId: 'ex-1',
            exerciseName: 'Supino',
            sets: [set(50, 10)],
            isFirstTime: false,
            isWeightPr: true,
            isVolumePr: true,
            isRepsPr: true,
          },
        ],
      }),
    ])
    const records = getRecentRecords()
    expect(records[0].type).toBe('weight')
  })

  it('respects the limit parameter', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-05T00:00:00.000Z',
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'A', sets: [set(10, 10)], isWeightPr: true },
          { exerciseId: 'ex-2', exerciseName: 'B', sets: [set(10, 10)], isWeightPr: true },
          { exerciseId: 'ex-3', exerciseName: 'C', sets: [set(10, 10)], isWeightPr: true },
        ],
      }),
    ])
    expect(getRecentRecords(2)).toHaveLength(2)
  })
})

describe('getTopGrowthExercises / getStagnantExercises', () => {
  function growthHistory() {
    return [
      workout({
        completedAt: '2026-07-03T00:00:00.000Z',
        exercises: [
          { exerciseId: 'ex-growing', exerciseName: 'Agachamento', sets: [set(60, 8)] },
          { exerciseId: 'ex-flat', exerciseName: 'Rosca', sets: [set(20, 10)] },
        ],
      }),
      workout({
        completedAt: '2026-07-02T00:00:00.000Z',
        exercises: [
          { exerciseId: 'ex-growing', exerciseName: 'Agachamento', sets: [set(50, 8)] },
          { exerciseId: 'ex-flat', exerciseName: 'Rosca', sets: [set(20, 10)] },
        ],
      }),
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [
          { exerciseId: 'ex-growing', exerciseName: 'Agachamento', sets: [set(40, 8)] },
          { exerciseId: 'ex-flat', exerciseName: 'Rosca', sets: [set(20, 10)] },
        ],
      }),
    ]
  }

  it('excludes exercises with fewer than 2 sessions from growth ranking', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-once', exerciseName: 'X', sets: [set(10, 10)] }],
      }),
    ])
    expect(getTopGrowthExercises()).toEqual([])
  })

  it('ranks the growing exercise first, ordered by delta', () => {
    seedHistory(growthHistory())
    const top = getTopGrowthExercises()
    expect(top[0].exerciseId).toBe('ex-growing')
    expect(top[0].deltaKg).toBe(20)
    expect(top[0].deltaPercent).toBeCloseTo(50, 5)
  })

  it('excludes a flat/growing exercise from stagnant and includes only non-improving ones with enough sessions', () => {
    seedHistory(growthHistory())
    const stagnant = getStagnantExercises(3)
    expect(stagnant.some((e) => e.exerciseId === 'ex-flat')).toBe(true)
    expect(stagnant.some((e) => e.exerciseId === 'ex-growing')).toBe(false)
  })
})

describe('getProfileRecordStats', () => {
  it('returns all-zero, graceful stats when there is no history', () => {
    seedHistory([])
    const stats = getProfileRecordStats()
    expect(stats.totalRecords).toBe(0)
    expect(stats.heaviestWeightEverKg).toBe(0)
    expect(stats.heaviestWeightExerciseName).toBeNull()
    expect(stats.mostImprovedExercise).toBeNull()
    expect(stats.longestImprovementStreak).toBe(0)
  })

  it('counts total records across all PR types and finds the true global heaviest weight', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-02T00:00:00.000Z',
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(100, 5)], isWeightPr: true },
          { exerciseId: 'ex-2', exerciseName: 'Rosca', sets: [set(20, 10)], isRepsPr: true },
        ],
      }),
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
    ])
    const stats = getProfileRecordStats()
    expect(stats.totalRecords).toBe(2)
    expect(stats.heaviestWeightEverKg).toBe(100)
    expect(stats.heaviestWeightExerciseName).toBe('Supino')
  })

  it('computes the longest improvement streak and resets on a no-PR workout', () => {
    seedHistory([
      // Mais recente primeiro: workout sem PR, depois dois workouts consecutivos com PR (mais antigos).
      workout({
        completedAt: '2026-07-03T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
      workout({
        completedAt: '2026-07-02T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(45, 8)], isWeightPr: true }],
      }),
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)], isFirstTime: true }],
      }),
    ])
    const stats = getProfileRecordStats()
    expect(stats.longestImprovementStreak).toBe(2)
  })
})
