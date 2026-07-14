import { describe, it, expect, beforeEach } from 'vitest'
import type { CompletedWorkout, SetRecord } from './workout-history'
import {
  generateRecommendation,
  getExerciseStatus,
  getAllExerciseIntelligence,
  getTopChallenges,
  getWeeklyIntelligenceSummary,
  suggestWeightIncrease,
} from './workout-intelligence'

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
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

beforeEach(() => {
  window.localStorage.clear()
})

// ─── suggestWeightIncrease ────────────────────────────────────────────────────

describe('suggestWeightIncrease', () => {
  it('increments by 1kg for weights below 20kg', () => {
    expect(suggestWeightIncrease(10)).toBe(11)
    expect(suggestWeightIncrease(19)).toBe(20)
  })

  it('increments by 2.5kg for weights 20–60kg', () => {
    expect(suggestWeightIncrease(20)).toBe(22.5)
    expect(suggestWeightIncrease(40)).toBe(42.5)
    expect(suggestWeightIncrease(60)).toBe(62.5)
  })

  it('increments by 5kg for weights above 60kg', () => {
    expect(suggestWeightIncrease(80)).toBe(85)
    expect(suggestWeightIncrease(100)).toBe(105)
  })
})

// ─── generateRecommendation — no history ─────────────────────────────────────

describe('generateRecommendation — no history', () => {
  it('returns insufficient_data with low confidence when no history exists', () => {
    seedHistory([])
    const rec = generateRecommendation('ex-1')
    expect(rec.type).toBe('insufficient_data')
    expect(rec.confidence).toBe('low')
  })
})

// ─── generateRecommendation — single session ──────────────────────────────────

describe('generateRecommendation — single session', () => {
  it('suggests weight increase with low confidence when all sets hit target reps', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 10), set(40, 10)] },
        ],
      }),
    ])
    const rec = generateRecommendation('ex-1')
    expect(rec.type).toBe('increase_weight')
    expect(rec.confidence).toBe('low')
    expect(rec.suggestedWeight).toBe(42.5)
  })

  it('suggests increase_reps with low confidence when last session did not hit target', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] },
        ],
      }),
    ])
    const rec = generateRecommendation('ex-1')
    expect(rec.type).toBe('increase_reps')
    expect(rec.confidence).toBe('low')
    expect(rec.suggestedWeight).toBe(40)
    expect(rec.suggestedReps).toBe(9)
  })

  it('handles bodyweight (weight = 0) single session', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [
          { exerciseId: 'ex-bw', exerciseName: 'Flexão', sets: [set(0, 8)] },
        ],
      }),
    ])
    const rec = generateRecommendation('ex-bw')
    expect(rec.type).toBe('increase_reps')
    expect(rec.suggestedWeight).toBeUndefined()
  })
})

// ─── generateRecommendation — increase weight ────────────────────────────────

describe('generateRecommendation — increase weight', () => {
  it('returns increase_weight with high confidence after 3+ sessions all hitting target reps', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-03T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 10), set(40, 10)] }],
      }),
      workout({
        completedAt: '2026-07-02T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 10), set(40, 10)] }],
      }),
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 10), set(40, 10)] }],
      }),
    ])
    const rec = generateRecommendation('ex-1')
    expect(rec.type).toBe('increase_weight')
    expect(rec.confidence).toBe('high')
    expect(rec.suggestedWeight).toBe(42.5)
    expect(rec.suggestedReps).toBe(10)
  })

  it('returns increase_weight with medium confidence after exactly 2 sessions hitting target reps', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-02T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 12)] }],
      }),
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 10)] }],
      }),
    ])
    const rec = generateRecommendation('ex-1')
    expect(rec.type).toBe('increase_weight')
    expect(rec.confidence).toBe('medium')
  })
})

// ─── generateRecommendation — increase reps ──────────────────────────────────

describe('generateRecommendation — increase reps', () => {
  it('suggests same weight + 1 more rep when last session did not hit target', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-02T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 7)] }],
      }),
    ])
    const rec = generateRecommendation('ex-1')
    expect(rec.type).toBe('increase_reps')
    expect(rec.suggestedWeight).toBe(40)
    expect(rec.suggestedReps).toBe(9)
  })

  it('does not suggest more than targetRepsMax reps', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 12)] }],
      }),
    ])
    // 12 reps = targetRepsMax so this session hit target → should suggest weight increase, not reps
    const rec = generateRecommendation('ex-1', { targetRepsMin: 10, targetRepsMax: 12, stagnationThreshold: 5, regressionThreshold: 3 })
    expect(rec.type).toBe('increase_weight')
  })
})

// ─── generateRecommendation — maintain ───────────────────────────────────────

describe('generateRecommendation — maintain', () => {
  it('returns maintain when there is recent regression but drop is small', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-03T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(38, 8)] }],
      }),
      workout({
        completedAt: '2026-07-02T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(39, 8)] }],
      }),
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
    ])
    const rec = generateRecommendation('ex-1')
    expect(rec.type).toBe('maintain')
  })
})

// ─── generateRecommendation — deload ─────────────────────────────────────────

describe('generateRecommendation — deload', () => {
  it('suggests deload when there is consistent significant weight drop (>10%)', () => {
    // Weights: 40 → 36 → 32 (most recent first in history)
    seedHistory([
      workout({
        completedAt: '2026-07-03T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(32, 8)] }],
      }),
      workout({
        completedAt: '2026-07-02T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(36, 8)] }],
      }),
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
    ])
    const rec = generateRecommendation('ex-1')
    expect(rec.type).toBe('deload')
    expect(rec.confidence).toBe('high')
    expect(rec.suggestedWeight).toBeDefined()
    expect(rec.suggestedWeight!).toBeLessThan(32)
  })
})

// ─── generateRecommendation — stagnation ─────────────────────────────────────

describe('generateRecommendation — stagnation', () => {
  it('detects stagnation and suggests weight increase when consistently hitting target reps', () => {
    const sessions = [
      '2026-07-05', '2026-07-04', '2026-07-03', '2026-07-02', '2026-07-01',
    ].map((date) =>
      workout({
        completedAt: `${date}T00:00:00.000Z`,
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 10), set(40, 10)] }],
      })
    )
    seedHistory(sessions)
    const rec = generateRecommendation('ex-1')
    expect(rec.type).toBe('increase_weight')
    expect(rec.suggestedWeight).toBe(42.5)
  })

  it('detects stagnation and suggests maintain when not consistently hitting target reps', () => {
    const sessions = [
      '2026-07-05', '2026-07-04', '2026-07-03', '2026-07-02', '2026-07-01',
    ].map((date) =>
      workout({
        completedAt: `${date}T00:00:00.000Z`,
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      })
    )
    seedHistory(sessions)
    const rec = generateRecommendation('ex-1', {
      targetRepsMin: 10, targetRepsMax: 12, stagnationThreshold: 5, regressionThreshold: 3,
    })
    expect(rec.type).toBe('maintain')
  })

  it('respects configurable stagnationThreshold', () => {
    const sessions = ['2026-07-03', '2026-07-02', '2026-07-01'].map((date) =>
      workout({
        completedAt: `${date}T00:00:00.000Z`,
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      })
    )
    seedHistory(sessions)
    // With threshold = 3 and last 3 sessions all same weight/reps, should detect stagnation
    const rec = generateRecommendation('ex-1', {
      targetRepsMin: 10, targetRepsMax: 12, stagnationThreshold: 3, regressionThreshold: 3,
    })
    expect(rec.type).toBe('maintain')
  })
})

// ─── generateRecommendation — incomplete history ──────────────────────────────

describe('generateRecommendation — incomplete history', () => {
  it('handles records with empty sets array gracefully', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [] }],
      }),
    ])
    const rec = generateRecommendation('ex-1')
    expect(rec.type).toBe('insufficient_data')
  })
})

// ─── getExerciseStatus ────────────────────────────────────────────────────────

describe('getExerciseStatus', () => {
  it('returns insufficient_data when fewer than 2 sessions', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }],
      }),
    ])
    expect(getExerciseStatus('ex-1')).toBe('insufficient_data')
  })

  it('returns insufficient_data when no history', () => {
    seedHistory([])
    expect(getExerciseStatus('ex-unknown')).toBe('insufficient_data')
  })

  it('returns improving when weight increased last 2 sessions', () => {
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
    expect(getExerciseStatus('ex-1')).toBe('improving')
  })

  it('returns regressing when weight dropped for regressionThreshold sessions', () => {
    seedHistory([
      workout({ completedAt: '2026-07-03T00:00:00.000Z', exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(32, 8)] }] }),
      workout({ completedAt: '2026-07-02T00:00:00.000Z', exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(36, 8)] }] }),
      workout({ completedAt: '2026-07-01T00:00:00.000Z', exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }] }),
    ])
    expect(getExerciseStatus('ex-1')).toBe('regressing')
  })

  it('returns stagnant when same weight for stagnationThreshold sessions', () => {
    const sessions = ['2026-07-05', '2026-07-04', '2026-07-03', '2026-07-02', '2026-07-01'].map((date) =>
      workout({ completedAt: `${date}T00:00:00.000Z`, exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }] })
    )
    seedHistory(sessions)
    expect(getExerciseStatus('ex-1')).toBe('stagnant')
  })

  it('returns stable when weight is same across 2 sessions but below stagnation threshold', () => {
    seedHistory([
      workout({ completedAt: '2026-07-02T00:00:00.000Z', exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }] }),
      workout({ completedAt: '2026-07-01T00:00:00.000Z', exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }] }),
    ])
    expect(getExerciseStatus('ex-1')).toBe('stable')
  })
})

// ─── getAllExerciseIntelligence ───────────────────────────────────────────────

describe('getAllExerciseIntelligence', () => {
  it('returns empty array when there is no history', () => {
    seedHistory([])
    expect(getAllExerciseIntelligence()).toEqual([])
  })

  it('returns one entry per unique exercise', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] },
          { exerciseId: 'ex-2', exerciseName: 'Agachamento', sets: [set(80, 8)] },
        ],
      }),
    ])
    const result = getAllExerciseIntelligence()
    expect(result).toHaveLength(2)
    const ids = result.map((r) => r.exerciseId).sort()
    expect(ids).toEqual(['ex-1', 'ex-2'])
  })

  it('populates sessionsAnalyzed correctly', () => {
    seedHistory([
      workout({ completedAt: '2026-07-02T00:00:00.000Z', exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }] }),
      workout({ completedAt: '2026-07-01T00:00:00.000Z', exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [set(40, 8)] }] }),
    ])
    const result = getAllExerciseIntelligence()
    expect(result[0].sessionsAnalyzed).toBe(2)
  })
})

// ─── getTopChallenges ─────────────────────────────────────────────────────────

describe('getTopChallenges', () => {
  it('returns empty array when no exercises have weighted history', () => {
    seedHistory([])
    expect(getTopChallenges()).toEqual([])
  })

  it('returns up to the limit number of challenges', () => {
    const sessions = ['ex-1', 'ex-2', 'ex-3', 'ex-4', 'ex-5', 'ex-6'].map((id, i) =>
      workout({
        completedAt: `2026-07-0${i + 1}T00:00:00.000Z`,
        exercises: [{ exerciseId: id, exerciseName: id, sets: [set(40, 10), set(40, 10)] }],
      })
    )
    seedHistory(sessions)
    const result = getTopChallenges(3)
    expect(result.length).toBeLessThanOrEqual(3)
  })

  it('excludes insufficient_data exercises from challenges', () => {
    seedHistory([
      workout({
        completedAt: '2026-07-01T00:00:00.000Z',
        exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino', sets: [] }],
      }),
    ])
    expect(getTopChallenges()).toEqual([])
  })
})

// ─── getWeeklyIntelligenceSummary ─────────────────────────────────────────────

describe('getWeeklyIntelligenceSummary', () => {
  it('returns all zeros when there is no history', () => {
    seedHistory([])
    const summary = getWeeklyIntelligenceSummary()
    expect(summary.currentWeekPrs).toBe(0)
    expect(summary.previousWeekPrs).toBe(0)
    expect(summary.currentWeekVolume).toBe(0)
    expect(summary.previousWeekVolume).toBe(0)
    expect(summary.improvingCount).toBe(0)
    expect(summary.stagnantCount).toBe(0)
    expect(summary.regressingCount).toBe(0)
  })
})
