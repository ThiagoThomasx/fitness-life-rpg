import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateReadiness,
  getProgressionContext,
  calculateSessionOutcome,
  formatOutcome,
  computeReadinessStats,
  DEFAULT_READINESS_CONFIG,
} from './workout-readiness'
import type { WorkoutReadinessCheckIn } from './readiness-check-ins'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('./workout-history', () => ({
  getWorkoutHistory: vi.fn(() => []),
}))

vi.mock('./workout-recovery', () => ({
  getMuscleRecoveryStates: vi.fn(() => ({
    peito: { muscleGroup: 'peito', recoveryPercent: 100, status: 'recovered', hoursSinceTrained: null, lastTrainedAt: null },
    costas: { muscleGroup: 'costas', recoveryPercent: 100, status: 'recovered', hoursSinceTrained: null, lastTrainedAt: null },
    pernas: { muscleGroup: 'pernas', recoveryPercent: 100, status: 'recovered', hoursSinceTrained: null, lastTrainedAt: null },
    ombros: { muscleGroup: 'ombros', recoveryPercent: 100, status: 'recovered', hoursSinceTrained: null, lastTrainedAt: null },
    biceps: { muscleGroup: 'biceps', recoveryPercent: 100, status: 'recovered', hoursSinceTrained: null, lastTrainedAt: null },
    triceps: { muscleGroup: 'triceps', recoveryPercent: 100, status: 'recovered', hoursSinceTrained: null, lastTrainedAt: null },
    core: { muscleGroup: 'core', recoveryPercent: 100, status: 'recovered', hoursSinceTrained: null, lastTrainedAt: null },
  })),
}))

vi.mock('./workout-intelligence', () => ({
  getAllExerciseIntelligence: vi.fn(() => []),
}))

vi.mock('./exercise-records', () => ({
  calculateVolumeKg: vi.fn(() => 0),
}))

vi.mock('./custom-workouts', () => ({
  getAllExercises: vi.fn(() => []),
}))

import { getWorkoutHistory } from './workout-history'
import { getMuscleRecoveryStates } from './workout-recovery'
import { getAllExerciseIntelligence } from './workout-intelligence'

const mockHistory = getWorkoutHistory as ReturnType<typeof vi.fn>
const mockRecovery = getMuscleRecoveryStates as ReturnType<typeof vi.fn>
const mockIntelligence = getAllExerciseIntelligence as ReturnType<typeof vi.fn>

function makeCheckIn(overrides: Partial<WorkoutReadinessCheckIn> = {}): WorkoutReadinessCheckIn {
  return {
    id: 'ci-test',
    createdAt: new Date().toISOString(),
    energy: 3,
    soreness: 2,
    sleepQuality: 3,
    motivation: 3,
    ...overrides,
  }
}

function makeHistory(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `cw-${i}`,
    workoutId: 'w1',
    workoutName: 'Treino',
    workoutColor: '#fff',
    category: 'strength',
    startedAt: new Date(Date.now() - i * 86400000).toISOString(),
    completedAt: new Date(Date.now() - i * 86400000).toISOString(),
    durationSeconds: 3600,
    xpEarned: 100,
    exercises: [],
    prsCount: 0,
  }))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('calculateReadiness', () => {
  beforeEach(() => {
    mockHistory.mockReturnValue([])
    mockIntelligence.mockReturnValue([])
    mockRecovery.mockReturnValue({
      peito: { recoveryPercent: 100 },
      costas: { recoveryPercent: 100 },
      pernas: { recoveryPercent: 100 },
      ombros: { recoveryPercent: 100 },
      biceps: { recoveryPercent: 100 },
      triceps: { recoveryPercent: 100 },
      core: { recoveryPercent: 100 },
    })
  })

  it('returns insufficient_data when no check-in and no history', () => {
    const result = calculateReadiness({ checkIn: null })
    expect(result.level).toBe('insufficient_data')
    expect(result.recommendation).toBe('complete_check_in')
  })

  it('returns high readiness with great check-in and good recovery', () => {
    mockHistory.mockReturnValue(makeHistory(5))
    const result = calculateReadiness({
      checkIn: makeCheckIn({ energy: 5, soreness: 1, sleepQuality: 5, motivation: 5 }),
    })
    expect(result.level).toBe('high')
    expect(result.recommendation).toBe('train_normally')
  })

  it('returns low readiness with very low energy', () => {
    mockHistory.mockReturnValue(makeHistory(5))
    const result = calculateReadiness({
      checkIn: makeCheckIn({ energy: 1, soreness: 5, sleepQuality: 1, motivation: 1 }),
    })
    expect(result.level).toBe('low')
    expect(result.recommendation).toBe('reduce_intensity')
  })

  it('returns moderate readiness with average check-in', () => {
    mockHistory.mockReturnValue(makeHistory(5))
    const result = calculateReadiness({
      checkIn: makeCheckIn({ energy: 3, soreness: 3, sleepQuality: 3, motivation: 3 }),
    })
    expect(['moderate', 'high']).toContain(result.level)
  })

  it('penalizes high soreness', () => {
    mockHistory.mockReturnValue(makeHistory(5))
    const withHighSoreness = calculateReadiness({
      checkIn: makeCheckIn({ soreness: 5, energy: 4, sleepQuality: 4, motivation: 4 }),
    })
    const withLowSoreness = calculateReadiness({
      checkIn: makeCheckIn({ soreness: 1, energy: 4, sleepQuality: 4, motivation: 4 }),
    })
    expect(withHighSoreness.score!).toBeLessThan(withLowSoreness.score!)
  })

  it('penalizes low sleep quality', () => {
    mockHistory.mockReturnValue(makeHistory(5))
    const withBadSleep = calculateReadiness({
      checkIn: makeCheckIn({ sleepQuality: 1 }),
    })
    const withGoodSleep = calculateReadiness({
      checkIn: makeCheckIn({ sleepQuality: 5 }),
    })
    expect(withBadSleep.score!).toBeLessThan(withGoodSleep.score!)
  })

  it('penalizes low motivation', () => {
    mockHistory.mockReturnValue(makeHistory(5))
    const withLowMot = calculateReadiness({
      checkIn: makeCheckIn({ motivation: 1 }),
    })
    const withHighMot = calculateReadiness({
      checkIn: makeCheckIn({ motivation: 5 }),
    })
    expect(withLowMot.score!).toBeLessThan(withHighMot.score!)
  })

  it('penalizes high weekly frequency', () => {
    const manyWorkouts = Array.from({ length: 7 }, (_, i) => ({
      id: `cw-${i}`,
      workoutId: 'w1',
      workoutName: 'Treino',
      workoutColor: '#fff',
      category: 'strength',
      startedAt: new Date(Date.now() - i * 86400000 * 0.8).toISOString(),
      completedAt: new Date(Date.now() - i * 86400000 * 0.8).toISOString(),
      durationSeconds: 3600,
      xpEarned: 100,
      exercises: [],
      prsCount: 0,
    }))
    mockHistory.mockReturnValue(manyWorkouts)
    const result = calculateReadiness({ checkIn: makeCheckIn({ energy: 4, soreness: 1, sleepQuality: 4, motivation: 4 }) })
    // With 7 sessions in a week, frequency should lower the score
    expect(result.score!).toBeLessThan(100)
  })

  it('penalizes poor muscle recovery', () => {
    mockHistory.mockReturnValue(makeHistory(5))
    mockRecovery.mockReturnValue({
      peito: { recoveryPercent: 20 },
      costas: { recoveryPercent: 20 },
      pernas: { recoveryPercent: 20 },
      ombros: { recoveryPercent: 100 },
      biceps: { recoveryPercent: 100 },
      triceps: { recoveryPercent: 100 },
      core: { recoveryPercent: 100 },
    })
    const result = calculateReadiness({
      checkIn: makeCheckIn({ energy: 4, soreness: 1, sleepQuality: 4, motivation: 4 }),
      targetMuscleGroups: ['peito'],
    })
    expect(result.score!).toBeLessThan(80)
  })

  it('penalizes regressing performance trend', () => {
    mockHistory.mockReturnValue(makeHistory(5))
    mockIntelligence.mockReturnValue([
      { exerciseId: 'ex1', exerciseName: 'Supino', status: 'regressing', recommendation: { type: 'deload', confidence: 'high', reason: '' }, sessionsAnalyzed: 5, daysSinceLastSession: 2 },
    ])
    const result = calculateReadiness({
      checkIn: makeCheckIn({ energy: 4, soreness: 1, sleepQuality: 4, motivation: 4 }),
      workoutExerciseIds: ['ex1'],
    })
    expect(result.score!).toBeLessThan(85)
  })

  it('returns high confidence when check-in present and >= 3 sessions', () => {
    mockHistory.mockReturnValue(makeHistory(5))
    const result = calculateReadiness({ checkIn: makeCheckIn() })
    expect(result.confidence).toBe('high')
  })

  it('returns medium confidence when check-in present but < 3 sessions', () => {
    mockHistory.mockReturnValue(makeHistory(1))
    const result = calculateReadiness({ checkIn: makeCheckIn() })
    expect(result.confidence).toBe('medium')
  })

  it('returns low confidence when no check-in and < 3 sessions', () => {
    mockHistory.mockReturnValue(makeHistory(2))
    const result = calculateReadiness({ checkIn: null })
    expect(result.confidence).toBe('low')
  })

  it('includes energy factor when check-in provided', () => {
    mockHistory.mockReturnValue(makeHistory(3))
    const result = calculateReadiness({ checkIn: makeCheckIn({ energy: 5 }) })
    const factor = result.factors.find((f) => f.key === 'energy')
    expect(factor).toBeDefined()
    expect(factor!.impact).toBe('positive')
  })

  it('includes negative soreness factor for high soreness', () => {
    mockHistory.mockReturnValue(makeHistory(3))
    const result = calculateReadiness({
      checkIn: makeCheckIn({ soreness: 5 }),
    })
    const factor = result.factors.find((f) => f.key === 'soreness')
    expect(factor).toBeDefined()
    expect(factor!.impact).toBe('negative')
  })

  it('suggests avoid_progression for low readiness', () => {
    mockHistory.mockReturnValue(makeHistory(5))
    const result = calculateReadiness({
      checkIn: makeCheckIn({ energy: 1, soreness: 5, sleepQuality: 1, motivation: 1 }),
    })
    expect(result.level).toBe('low')
    const adj = result.suggestedAdjustments.find(
      (a) => a.type === 'avoid_progression' || a.type === 'reduce_sets' || a.type === 'increase_rest'
    )
    expect(adj).toBeDefined()
  })

  it('suggests keep_plan for high readiness', () => {
    mockHistory.mockReturnValue(makeHistory(5))
    const result = calculateReadiness({
      checkIn: makeCheckIn({ energy: 5, soreness: 1, sleepQuality: 5, motivation: 5 }),
    })
    expect(result.level).toBe('high')
    const adj = result.suggestedAdjustments.find((a) => a.type === 'keep_plan')
    expect(adj).toBeDefined()
  })

  it('limits adjustments to 3', () => {
    mockHistory.mockReturnValue(makeHistory(5))
    const result = calculateReadiness({
      checkIn: makeCheckIn({ energy: 1, soreness: 5, sleepQuality: 1, motivation: 1 }),
    })
    expect(result.suggestedAdjustments.length).toBeLessThanOrEqual(3)
  })

  it('works with no check-in but existing history', () => {
    mockHistory.mockReturnValue(makeHistory(5))
    const result = calculateReadiness({ checkIn: null })
    expect(result.level).not.toBe('insufficient_data')
    expect(result.score).toBeDefined()
  })

  it('respects custom thresholds', () => {
    mockHistory.mockReturnValue(makeHistory(5))
    const customConfig = { ...DEFAULT_READINESS_CONFIG, highThreshold: 50 }
    const result = calculateReadiness({
      checkIn: makeCheckIn({ energy: 3, soreness: 2, sleepQuality: 3, motivation: 3 }),
      config: customConfig,
    })
    // With lower threshold, same check-in might be 'high'
    expect(['high', 'moderate']).toContain(result.level)
  })

  it('handles partial check-in fields gracefully via makeCheckIn defaults', () => {
    mockHistory.mockReturnValue(makeHistory(3))
    const checkIn = makeCheckIn()
    const result = calculateReadiness({ checkIn })
    expect(result.level).not.toBe(undefined)
  })
})

// ─── getProgressionContext ────────────────────────────────────────────────────

describe('getProgressionContext', () => {
  it('returns positive context for high readiness', () => {
    const ctx = getProgressionContext('high')
    expect(ctx.contextLabel).toContain('liberada')
  })

  it('returns cautious context for moderate readiness', () => {
    const ctx = getProgressionContext('moderate')
    expect(ctx.contextLabel).toContain('cautela')
  })

  it('returns discouraging context for low readiness', () => {
    const ctx = getProgressionContext('low')
    expect(ctx.contextLabel).toContain('necessário')
  })

  it('returns check-in prompt for insufficient_data', () => {
    const ctx = getProgressionContext('insufficient_data')
    expect(ctx.contextLabel).toContain('check-in')
  })
})

// ─── calculateSessionOutcome ──────────────────────────────────────────────────

describe('calculateSessionOutcome', () => {
  it('returns above_expectation when low readiness but volume maintained', () => {
    const outcome = calculateSessionOutcome({
      readinessLevel: 'low',
      actualVolume: 1000,
      expectedVolume: 1000,
      regressingCount: 0,
      improvingCount: 0,
    })
    expect(outcome).toBe('above_expectation')
  })

  it('returns aligned when normal session with moderate readiness', () => {
    const outcome = calculateSessionOutcome({
      readinessLevel: 'moderate',
      actualVolume: 1000,
      expectedVolume: 1000,
      regressingCount: 0,
      improvingCount: 0,
    })
    expect(outcome).toBe('aligned')
  })

  it('returns below_expectation when many regressions and low volume', () => {
    const outcome = calculateSessionOutcome({
      readinessLevel: 'high',
      actualVolume: 700,
      expectedVolume: 1000,
      regressingCount: 3,
      improvingCount: 0,
    })
    expect(outcome).toBe('below_expectation')
  })

  it('returns above_expectation when improving exercises and high volume', () => {
    const outcome = calculateSessionOutcome({
      readinessLevel: 'high',
      actualVolume: 1200,
      expectedVolume: 1000,
      regressingCount: 0,
      improvingCount: 2,
    })
    expect(outcome).toBe('above_expectation')
  })

  it('returns insufficient_data for insufficient_data level', () => {
    const outcome = calculateSessionOutcome({
      readinessLevel: 'insufficient_data',
      actualVolume: 1000,
      expectedVolume: 1000,
      regressingCount: 0,
      improvingCount: 0,
    })
    expect(outcome).toBe('insufficient_data')
  })
})

// ─── formatOutcome ────────────────────────────────────────────────────────────

describe('formatOutcome', () => {
  it('formats above_expectation', () => {
    expect(formatOutcome('above_expectation')).toContain('acima')
  })
  it('formats aligned', () => {
    expect(formatOutcome('aligned')).toContain('alinhada')
  })
  it('formats below_expectation', () => {
    expect(formatOutcome('below_expectation')).toContain('abaixo')
  })
  it('returns empty string for insufficient_data', () => {
    expect(formatOutcome('insufficient_data')).toBe('')
  })
})

// ─── computeReadinessStats ────────────────────────────────────────────────────

describe('computeReadinessStats', () => {
  beforeEach(() => {
    mockHistory.mockReturnValue(makeHistory(5))
  })

  it('returns zeroes for empty check-ins', () => {
    const stats = computeReadinessStats([])
    expect(stats.totalCheckIns).toBe(0)
    expect(stats.averageEnergy).toBe(0)
  })

  it('computes averages correctly', () => {
    const checkIns: WorkoutReadinessCheckIn[] = [
      makeCheckIn({ id: '1', energy: 4, soreness: 2, sleepQuality: 4, motivation: 4 }),
      makeCheckIn({ id: '2', energy: 2, soreness: 4, sleepQuality: 2, motivation: 2 }),
    ]
    const stats = computeReadinessStats(checkIns)
    expect(stats.totalCheckIns).toBe(2)
    expect(stats.averageEnergy).toBe(3)
    expect(stats.averageSoreness).toBe(3)
    expect(stats.averageSleep).toBe(3)
    expect(stats.averageMotivation).toBe(3)
  })

  it('counts high and low readiness sessions', () => {
    const checkIns: WorkoutReadinessCheckIn[] = [
      makeCheckIn({ id: '1', energy: 5, soreness: 1, sleepQuality: 5, motivation: 5 }),
      makeCheckIn({ id: '2', energy: 1, soreness: 5, sleepQuality: 1, motivation: 1 }),
    ]
    const stats = computeReadinessStats(checkIns)
    expect(stats.totalCheckIns).toBe(2)
    expect(stats.highReadinessCount + stats.moderateReadinessCount + stats.lowReadinessCount).toBe(2)
  })
})

// ─── Backup compatibility ─────────────────────────────────────────────────────

describe('backup compatibility', () => {
  it('calculateReadiness handles missing history gracefully', () => {
    mockHistory.mockReturnValue([])
    const checkIn = makeCheckIn()
    expect(() => calculateReadiness({ checkIn })).not.toThrow()
  })

  it('computeReadinessStats handles empty array (old backup)', () => {
    expect(() => computeReadinessStats([])).not.toThrow()
  })
})
