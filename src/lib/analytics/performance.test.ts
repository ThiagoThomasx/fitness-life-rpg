import { describe, it, expect } from 'vitest'
import { computePerformanceEvolution, getTopEvolvingExercises, getStagnantExercisesInPeriod } from './performance'
import { getTopGrowthExercises, getStagnantExercises } from '../exercise-records'
import type { CompletedWorkout, ExerciseRecord, SetRecord } from '../workout-history'

const HISTORY_KEY = 'lrpg-fit:workout-history'
const NOW = new Date('2026-07-25T12:00:00.000Z')

function set(weight_kg: number, reps: number): SetRecord {
  return { weight_kg, reps, isPr: false }
}

function exerciseRecord(overrides: Partial<ExerciseRecord> = {}): ExerciseRecord {
  return {
    exerciseId: 'ex-1',
    exerciseName: 'Supino Reto',
    sets: [set(60, 8), set(60, 8)],
    estimated1RMKg: 76,
    ...overrides,
  }
}

function workout(overrides: Partial<CompletedWorkout> & { completedAt: string }): CompletedWorkout {
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
    exercises: [exerciseRecord()],
    ...overrides,
  }
}

function seedHistory(history: CompletedWorkout[]) {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

describe('computePerformanceEvolution', () => {
  it('returns insufficient_data for all 5 metrics with an empty history', () => {
    seedHistory([])
    const evolutions = computePerformanceEvolution('30d', NOW)
    expect(evolutions).toHaveLength(5)
    expect(evolutions.map((e) => e.metric).sort()).toEqual(['1rm', 'frequency', 'load', 'reps', 'volume'])
    for (const e of evolutions) {
      expect(e.direction).toBe('insufficient_data')
      expect(e.sampleConfidence).toBe('insufficient')
      expect(e.explanation).toMatch(/insuficiente/i)
    }
  })

  it('reports insufficient_data for the "all" period since there is no prior window to compare against', () => {
    seedHistory([workout({ completedAt: '2026-07-20T10:00:00.000Z' })])
    const evolutions = computePerformanceEvolution('all', NOW)
    for (const e of evolutions) {
      expect(e.direction).toBe('insufficient_data')
      expect(e.changePercent).toBeNull()
      expect(e.explanation).toMatch(/Tudo/)
    }
  })

  it('treats a single session with no prior-period baseline as increasing with a null changePercent', () => {
    seedHistory([workout({ completedAt: '2026-07-24T10:00:00.000Z' })])
    const evolutions = computePerformanceEvolution('7d', NOW)
    const frequency = evolutions.find((e) => e.metric === 'frequency')!
    expect(frequency.direction).toBe('increasing')
    expect(frequency.changePercent).toBeNull()
    expect(frequency.sampleConfidence).toBe('low')
  })

  it('detects a clear volume increase between the current and previous 7-day windows', () => {
    seedHistory([
      // Previous window (7-14 days before NOW): lower volume.
      workout({ completedAt: '2026-07-12T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(50, 5)] })] }),
      // Current window (last 7 days): higher volume.
      workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(80, 10), set(80, 10)] })] }),
    ])
    const evolutions = computePerformanceEvolution('7d', NOW)
    const volume = evolutions.find((e) => e.metric === 'volume')!
    expect(volume.direction).toBe('increasing')
    expect(volume.changePercent).toBeGreaterThan(0)
    expect(volume.explanation).toBe('A média dos últimos 7 dias foi 540% maior que os 7 dias anteriores.')
  })

  it('detects a clear decrease and uses the "menor" wording', () => {
    seedHistory([
      workout({ completedAt: '2026-07-12T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(100, 10)] })] }),
      workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(50, 5)] })] }),
    ])
    const evolutions = computePerformanceEvolution('7d', NOW)
    const volume = evolutions.find((e) => e.metric === 'volume')!
    expect(volume.direction).toBe('decreasing')
    expect(volume.explanation).toContain('menor')
  })

  it('treats a swing within tolerance as stable', () => {
    seedHistory([
      workout({ completedAt: '2026-07-12T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(100, 10)] })] }),
      workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(102, 10)] })] }),
    ])
    const evolutions = computePerformanceEvolution('7d', NOW)
    const load = evolutions.find((e) => e.metric === 'load')!
    expect(load.direction).toBe('stable')
    expect(load.explanation).toContain('estável')
  })

  it('includes an item exactly at the shared start/end boundary in both windows (inclusive on both ends)', () => {
    // 30d range for NOW (2026-07-25T12:00:00.000Z) starts at 2026-06-25T12:00:00.000Z,
    // which is simultaneously the *end* of the previous 30d window — filterByDateRange
    // is inclusive on both ends, so a workout exactly there counts in both windows.
    seedHistory([
      workout({ completedAt: '2026-06-25T12:00:00.000Z' }),
      // Just before the boundary — falls only in the previous window.
      workout({ completedAt: '2026-06-25T11:59:59.000Z' }),
    ])
    const evolutions = computePerformanceEvolution('30d', NOW)
    const frequency = evolutions.find((e) => e.metric === 'frequency')!
    // current window: 1 session (boundary). previous window: 2 sessions (boundary + just-before).
    expect(frequency.changePercent).toBeCloseTo(-50)
    expect(frequency.direction).toBe('decreasing')
  })

  it('ignores sets with no weight (bodyweight-only sessions) for the load metric without crashing', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-24T10:00:00.000Z',
        exercises: [exerciseRecord({ sets: [{ weight_kg: 0, reps: 15, isPr: false }] })],
      }),
    ])
    expect(() => computePerformanceEvolution('7d', NOW)).not.toThrow()
    const evolutions = computePerformanceEvolution('7d', NOW)
    const load = evolutions.find((e) => e.metric === 'load')!
    expect(load.direction).toBe('insufficient_data')
  })

  it('does not crash when the exercise referenced in history was removed from the catalog', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-24T10:00:00.000Z',
        exercises: [exerciseRecord({ exerciseId: 'deleted-exercise-id', exerciseName: 'Exercício Removido' })],
      }),
    ])
    expect(() => computePerformanceEvolution('30d', NOW)).not.toThrow()
  })

  it('averages estimated1RMKg only across records that have one', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-24T10:00:00.000Z',
        exercises: [
          exerciseRecord({ estimated1RMKg: 100 }),
          exerciseRecord({ exerciseId: 'ex-2', estimated1RMKg: null }),
        ],
      }),
    ])
    expect(() => computePerformanceEvolution('7d', NOW)).not.toThrow()
  })
})

describe('getTopEvolvingExercises / getStagnantExercisesInPeriod', () => {
  it('delegates to getTopGrowthExercises without altering its result (documented lack of period scoping)', () => {
    seedHistory([
      workout({ completedAt: '2026-01-01T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(50, 8)] })] }),
      workout({ completedAt: '2026-07-01T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(70, 8)] })] }),
    ])
    expect(getTopEvolvingExercises('30d', 3)).toEqual(getTopGrowthExercises(3))
  })

  it('delegates to getStagnantExercises without altering its result', () => {
    seedHistory([
      workout({ completedAt: '2026-01-01T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(70, 8)] })] }),
      workout({ completedAt: '2026-03-01T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(70, 8)] })] }),
      workout({ completedAt: '2026-07-01T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(70, 8)] })] }),
    ])
    expect(getStagnantExercisesInPeriod('90d', 3)).toEqual(getStagnantExercises(3, 3))
  })

  it('returns an empty array for an empty history without crashing', () => {
    seedHistory([])
    expect(getTopEvolvingExercises('7d')).toEqual([])
    expect(getStagnantExercisesInPeriod('7d')).toEqual([])
  })
})
