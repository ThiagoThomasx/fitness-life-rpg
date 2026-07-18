import { describe, it, expect } from 'vitest'
import { compareCycles, MIN_SESSIONS_FOR_RELIABLE_COMPARISON } from './training-cycle-comparison'
import type { TrainingCycle } from './training-cycles'
import type { TrainingCycleSummary, CycleExerciseSummary, CycleMuscleGroupSummary } from './training-cycle-summary'

function makeCycle(id: string, overrides: Partial<TrainingCycle> = {}): TrainingCycle {
  return {
    id, name: `Ciclo ${id}`, goal: 'strength', startDate: '2026-06-01', status: 'completed',
    createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeExercise(overrides: Partial<CycleExerciseSummary> = {}): CycleExerciseSummary {
  return {
    exerciseId: 'ex-1', exerciseName: 'Supino', firstWeightKg: 40, lastWeightKg: 45,
    firstEstimated1RMKg: 50, lastEstimated1RMKg: 56, firstVolumeKg: 800, lastVolumeKg: 900,
    sessions: 6, prs: 1, status: 'improving',
    ...overrides,
  }
}

function makeMuscleGroup(overrides: Partial<CycleMuscleGroupSummary> = {}): CycleMuscleGroupSummary {
  return {
    muscleGroup: 'peito', label: 'Peito', totalSessions: 6, totalSets: 18,
    totalVolumeKg: 3000, averageWeeklySets: 4.5, averageWeeklyVolumeKg: 750,
    ...overrides,
  }
}

function makeSummary(overrides: Partial<TrainingCycleSummary> = {}): TrainingCycleSummary {
  return {
    cycleId: 'cycle-a', startDate: '2026-06-01', endDate: '2026-07-01',
    completedWeeks: 4, plannedWeeks: 4,
    totalSessions: 12, plannedSessions: 10, freeSessions: 2,
    totalVolumeKg: 12000, averageWeeklyVolumeKg: 3000, totalSets: 96, totalReps: 768,
    totalPrs: 3, averageReadiness: 3.5, adjustedSessions: 1,
    muscleGroups: [makeMuscleGroup()], exercises: [makeExercise()], trend: 'increasing',
    ...overrides,
  }
}

describe('compareCycles — basic metrics', () => {
  it('marks equal-duration cycles with a status of equal on duration', () => {
    const result = compareCycles(
      { cycle: makeCycle('a'), summary: makeSummary({ completedWeeks: 4 }) },
      { cycle: makeCycle('b'), summary: makeSummary({ completedWeeks: 4 }) }
    )
    expect(result.duration.status).toBe('equal')
  })

  it('flags a duration difference in status and adds a narrative note about weekly averages', () => {
    const result = compareCycles(
      { cycle: makeCycle('a'), summary: makeSummary({ completedWeeks: 4 }) },
      { cycle: makeCycle('b'), summary: makeSummary({ completedWeeks: 6 }) }
    )
    expect(result.duration.status).toBe('higher')
    expect(result.summaryMessages).toContain(
      'Os ciclos possuem durações diferentes; médias semanais oferecem uma comparação mais justa.'
    )
  })

  it('computes weekly frequency and average volume per session', () => {
    const result = compareCycles(
      { cycle: makeCycle('a'), summary: makeSummary({ totalSessions: 12, completedWeeks: 4, totalVolumeKg: 12000 }) },
      { cycle: makeCycle('b'), summary: makeSummary({ totalSessions: 12, completedWeeks: 4, totalVolumeKg: 12000 }) }
    )
    expect(result.weeklyFrequency.first).toBe(3)
    expect(result.averageVolumePerSessionKg.first).toBe(1000)
  })

  it('computes a percentage difference relative to the first cycle', () => {
    const result = compareCycles(
      { cycle: makeCycle('a'), summary: makeSummary({ totalPrs: 4 }) },
      { cycle: makeCycle('b'), summary: makeSummary({ totalPrs: 5 }) }
    )
    expect(result.prs.percentageDifference).toBe(25)
  })

  it('handles an empty cycle without dividing by zero', () => {
    const emptySummary = makeSummary({ totalSessions: 0, totalVolumeKg: 0, completedWeeks: 1, plannedSessions: 0, exercises: [], muscleGroups: [] })
    const result = compareCycles(
      { cycle: makeCycle('a'), summary: emptySummary },
      { cycle: makeCycle('b'), summary: makeSummary() }
    )
    expect(result.averageVolumePerSessionKg.first).toBeUndefined()
    expect(result.adherence.first).toBeUndefined()
    expect(result.firstHasInsufficientData).toBe(true)
  })

  it('flags a cycle below the minimum session threshold as insufficient data', () => {
    const result = compareCycles(
      { cycle: makeCycle('a'), summary: makeSummary({ totalSessions: MIN_SESSIONS_FOR_RELIABLE_COMPARISON - 1 }) },
      { cycle: makeCycle('b'), summary: makeSummary({ totalSessions: MIN_SESSIONS_FOR_RELIABLE_COMPARISON }) }
    )
    expect(result.firstHasInsufficientData).toBe(true)
    expect(result.secondHasInsufficientData).toBe(false)
    expect(result.summaryMessages[0]).toContain('não possui dados suficientes')
  })

  it('marks metrics as not_comparable when readiness data is missing from one cycle', () => {
    const result = compareCycles(
      { cycle: makeCycle('a'), summary: makeSummary({ averageReadiness: null }) },
      { cycle: makeCycle('b'), summary: makeSummary({ averageReadiness: 4 }) }
    )
    expect(result.averageReadiness.status).toBe('not_comparable')
  })

  it('describes similar readiness without asserting a winner', () => {
    const result = compareCycles(
      { cycle: makeCycle('a'), summary: makeSummary({ averageReadiness: 3.5 }) },
      { cycle: makeCycle('b'), summary: makeSummary({ averageReadiness: 3.6 }) }
    )
    expect(result.summaryMessages).toContain('A prontidão média foi semelhante nos dois ciclos.')
  })
})

describe('compareCycles — exercises', () => {
  it('compares only exercises present in both cycles', () => {
    const result = compareCycles(
      {
        cycle: makeCycle('a'),
        summary: makeSummary({
          exercises: [makeExercise({ exerciseId: 'ex-1', exerciseName: 'Supino' }), makeExercise({ exerciseId: 'ex-2', exerciseName: 'Agachamento' })],
        }),
      },
      {
        cycle: makeCycle('b'),
        summary: makeSummary({ exercises: [makeExercise({ exerciseId: 'ex-1', exerciseName: 'Supino', lastWeightKg: 50 })] }),
      }
    )
    expect(result.sharedExercises).toHaveLength(1)
    expect(result.sharedExercises[0].exerciseId).toBe('ex-1')
    expect(result.exclusiveToFirstExercises).toEqual(['Agachamento'])
    expect(result.exclusiveToSecondExercises).toEqual([])
  })

  it('computes weight/volume/1RM deltas for shared exercises', () => {
    const result = compareCycles(
      { cycle: makeCycle('a'), summary: makeSummary({ exercises: [makeExercise({ lastWeightKg: 40, lastVolumeKg: 800, lastEstimated1RMKg: 50 })] }) },
      { cycle: makeCycle('b'), summary: makeSummary({ exercises: [makeExercise({ lastWeightKg: 50, lastVolumeKg: 1000, lastEstimated1RMKg: 60 })] }) }
    )
    const [comparison] = result.sharedExercises
    expect(comparison.weightDelta.absoluteDifference).toBe(10)
    expect(comparison.volumeDelta.status).toBe('higher')
    expect(comparison.oneRMDelta.absoluteDifference).toBe(10)
  })

  it('adds a narrative message counting shared exercises', () => {
    const result = compareCycles(
      { cycle: makeCycle('a'), summary: makeSummary() },
      { cycle: makeCycle('b'), summary: makeSummary() }
    )
    expect(result.summaryMessages.some((m) => m.includes('1 exercício'))).toBe(true)
  })
})

describe('compareCycles — muscle groups', () => {
  it('includes muscle groups from either cycle, flagging which are shared', () => {
    const result = compareCycles(
      { cycle: makeCycle('a'), summary: makeSummary({ muscleGroups: [makeMuscleGroup({ muscleGroup: 'peito' })] }) },
      { cycle: makeCycle('b'), summary: makeSummary({ muscleGroups: [makeMuscleGroup({ muscleGroup: 'costas', label: 'Costas' })] }) }
    )
    expect(result.muscleGroups).toHaveLength(2)
    expect(result.muscleGroups.every((g) => !g.sharedInBoth)).toBe(true)
  })

  it('marks a muscle group present in both cycles as shared', () => {
    const result = compareCycles(
      { cycle: makeCycle('a'), summary: makeSummary({ muscleGroups: [makeMuscleGroup({ averageWeeklyVolumeKg: 700 })] }) },
      { cycle: makeCycle('b'), summary: makeSummary({ muscleGroups: [makeMuscleGroup({ averageWeeklyVolumeKg: 900 })] }) }
    )
    expect(result.muscleGroups[0].sharedInBoth).toBe(true)
    expect(result.muscleGroups[0].averageWeeklyVolumeKg.status).toBe('higher')
  })
})

describe('compareCycles — message cap', () => {
  it('never returns more than the configured maximum of summary messages', () => {
    const result = compareCycles(
      {
        cycle: makeCycle('a'),
        summary: makeSummary({
          totalSessions: 1, completedWeeks: 10, averageReadiness: null,
        }),
      },
      {
        cycle: makeCycle('b'),
        summary: makeSummary({
          totalSessions: 20, completedWeeks: 2, averageReadiness: 5, averageWeeklyVolumeKg: 9000, totalVolumeKg: 40000,
        }),
      }
    )
    expect(result.summaryMessages.length).toBeLessThanOrEqual(8)
  })
})
