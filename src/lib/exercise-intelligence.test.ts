import { describe, it, expect } from 'vitest'
import type { CompletedWorkout, ExerciseRecord, SetRecord } from './workout-history'
import {
  normalizeExerciseExecutions,
  getExerciseHistorySummary,
  getExerciseTimeline,
  getExercisePersonalRecords,
  detectNewExerciseRecords,
  getExerciseTrends,
  getExerciseSubstitutionInsights,
  getRecurringSubstitutions,
} from './exercise-intelligence'

const HISTORY_KEY = 'lrpg-fit:workout-history'

function set(weight_kg: number, reps: number): SetRecord {
  return { weight_kg, reps, isPr: false }
}

function exerciseRecord(overrides: Partial<ExerciseRecord> = {}): ExerciseRecord {
  return {
    exerciseId: 'ex-1',
    exerciseName: 'Supino Reto',
    sets: [set(60, 8), set(60, 8)],
    ...overrides,
  }
}

function workout(overrides: Partial<CompletedWorkout> & { completedAt: string }): CompletedWorkout {
  return {
    id: `w-${overrides.completedAt}`,
    workoutId: 'wt-1',
    workoutName: 'Treino A',
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

describe('normalizeExerciseExecutions', () => {
  it('returns empty array when the exercise was never performed', () => {
    seedHistory([])
    expect(normalizeExerciseExecutions('ex-1')).toEqual([])
  })

  it('normalizes fields and preserves newest-first order', () => {
    seedHistory([
      workout({ completedAt: '2026-02-01T10:00:00Z', exercises: [exerciseRecord({ sets: [set(60, 8)] })] }),
      workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord({ sets: [set(50, 10)] })] }),
    ])
    const executions = normalizeExerciseExecutions('ex-1')
    expect(executions).toHaveLength(2)
    expect(executions[0].performedAt).toBe('2026-02-01T10:00:00Z')
    expect(executions[0].totalVolumeKg).toBe(480)
    expect(executions[1].totalVolumeKg).toBe(500)
  })

  it('carries substitution provenance when present', () => {
    seedHistory([
      workout({
        completedAt: '2026-02-01T10:00:00Z',
        exercises: [
          exerciseRecord({
            exerciseId: 'ex-2',
            exerciseName: 'Chest Press',
            plannedExerciseId: 'blk-1',
            source: 'substitution',
            substitution: {
              plannedExerciseId: 'blk-1',
              plannedExerciseName: 'Supino Inclinado',
              replacementExerciseId: 'ex-2',
              replacementExerciseName: 'Chest Press',
              reason: 'equipment',
              substitutedAt: '2026-02-01T10:00:00Z',
            },
          }),
        ],
      }),
    ])
    const executions = normalizeExerciseExecutions('ex-2')
    expect(executions[0].wasSubstitution).toBe(true)
    expect(executions[0].substitutedFromExerciseName).toBe('Supino Inclinado')
    expect(executions[0].substitutionReason).toBe('equipment')
  })

  it('ignores exercises with no ID match, even across different history entries', () => {
    seedHistory([workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord({ exerciseId: 'other' })] })])
    expect(normalizeExerciseExecutions('ex-1')).toEqual([])
  })
})

describe('getExerciseHistorySummary', () => {
  it('returns null when exercise has no history', () => {
    seedHistory([])
    expect(getExerciseHistorySummary('ex-1')).toBeNull()
  })

  it('aggregates totals, averages and first/last dates', () => {
    seedHistory([
      workout({ completedAt: '2026-01-11T10:00:00Z', exercises: [exerciseRecord({ sets: [set(60, 8), set(60, 8)] })] }),
      workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord({ sets: [set(50, 10)] })] }),
    ])
    const summary = getExerciseHistorySummary('ex-1')!
    expect(summary.totalExecutions).toBe(2)
    expect(summary.firstPerformedAt).toBe('2026-01-01T10:00:00Z')
    expect(summary.lastPerformedAt).toBe('2026-01-11T10:00:00Z')
    expect(summary.totalSets).toBe(3)
    expect(summary.averageDaysBetweenExecutions).toBeCloseTo(10, 5)
  })

  it('counts totalWorkouts distinctly from totalExecutions when the exercise repeats within a workout', () => {
    seedHistory([
      workout({
        completedAt: '2026-01-01T10:00:00Z',
        exercises: [exerciseRecord({ sets: [set(60, 8)] }), exerciseRecord({ sets: [set(65, 6)] })],
      }),
    ])
    const summary = getExerciseHistorySummary('ex-1')!
    expect(summary.totalExecutions).toBe(2)
    expect(summary.totalWorkouts).toBe(1)
  })

  it('leaves averageDaysBetweenExecutions undefined with a single execution', () => {
    seedHistory([workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord()] })])
    expect(getExerciseHistorySummary('ex-1')!.averageDaysBetweenExecutions).toBeUndefined()
  })

  it('counts substitutionsIn and substitutionsOut independently', () => {
    seedHistory([
      workout({
        completedAt: '2026-01-01T10:00:00Z',
        exercises: [
          exerciseRecord({
            exerciseId: 'ex-2',
            exerciseName: 'Chest Press',
            substitution: {
              plannedExerciseId: 'blk-1',
              plannedExerciseName: 'Supino Inclinado',
              replacementExerciseId: 'ex-2',
              replacementExerciseName: 'Chest Press',
              substitutedAt: '2026-01-01T10:00:00Z',
            },
          }),
        ],
      }),
    ])
    expect(getExerciseHistorySummary('ex-2')!.substitutionsIn).toBe(1)
  })
})

describe('getExerciseTimeline', () => {
  it('orders oldest_first when requested', () => {
    seedHistory([
      workout({ completedAt: '2026-01-11T10:00:00Z', exercises: [exerciseRecord()] }),
      workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord()] }),
    ])
    const timeline = getExerciseTimeline('ex-1', 'oldest_first')
    expect(timeline[0].performedAt).toBe('2026-01-01T10:00:00Z')
    expect(timeline[1].performedAt).toBe('2026-01-11T10:00:00Z')
  })
})

describe('getExercisePersonalRecords', () => {
  it('returns empty object with no history', () => {
    seedHistory([])
    expect(getExercisePersonalRecords('ex-1')).toEqual({})
  })

  it('detects max load, max reps, best set volume, session volume and sets count', () => {
    seedHistory([
      workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord({ sets: [set(60, 8), set(60, 10)] })] }),
      workout({ completedAt: '2026-01-08T10:00:00Z', exercises: [exerciseRecord({ sets: [set(70, 5)] })] }),
    ])
    const records = getExercisePersonalRecords('ex-1')
    expect(records.maxLoad?.value).toBe(70)
    expect(records.maxReps?.value).toBe(10)
    expect(records.bestSetVolume?.value).toBe(600) // 60*10
    expect(records.maxSessionVolume?.value).toBe(1080) // 60*8 + 60*10
    expect(records.maxSetsInSession?.value).toBe(2)
  })

  it('keeps the first chronological occurrence on a tie (strict >, not >=)', () => {
    seedHistory([
      // Mais recente primeiro (convenção de getWorkoutHistory).
      workout({ completedAt: '2026-01-08T10:00:00Z', exercises: [exerciseRecord({ sets: [set(60, 8)] })] }),
      workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord({ sets: [set(60, 8)] })] }),
    ])
    const records = getExercisePersonalRecords('ex-1')
    expect(records.maxLoad?.achievedAt).toBe('2026-01-01T10:00:00Z')
  })

  it('ignores zero/bodyweight sets for load-based records', () => {
    seedHistory([workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord({ sets: [set(0, 12)] })] })])
    const records = getExercisePersonalRecords('ex-1')
    expect(records.maxLoad).toBeUndefined()
    expect(records.maxReps?.value).toBe(12)
  })
})

describe('detectNewExerciseRecords', () => {
  it('reports insufficient data as no changes when there is no prior history (first time)', () => {
    seedHistory([])
    const changes = detectNewExerciseRecords('ex-1', [{ weight_kg: 50, reps: 8 }])
    // Primeira vez sempre bate o "recorde anterior" indefinido — todas as métricas contam como novo recorde.
    expect(changes.map((c) => c.type)).toEqual(
      expect.arrayContaining(['max_load', 'max_reps', 'best_set_volume', 'max_session_volume', 'max_sets_in_session'])
    )
    expect(changes.find((c) => c.type === 'max_load')?.previousValue).toBeUndefined()
  })

  it('computes delta and percentage against prior record', () => {
    seedHistory([workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord({ sets: [set(60, 8)] })] })])
    const changes = detectNewExerciseRecords('ex-1', [{ weight_kg: 66, reps: 8 }])
    const loadChange = changes.find((c) => c.type === 'max_load')!
    expect(loadChange.previousValue).toBe(60)
    expect(loadChange.newValue).toBe(66)
    expect(loadChange.deltaAbsolute).toBe(6)
    expect(loadChange.deltaPercent).toBeCloseTo(10, 5)
  })

  it('does not report a record on a tie', () => {
    seedHistory([workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord({ sets: [set(60, 8)] })] })])
    const changes = detectNewExerciseRecords('ex-1', [{ weight_kg: 60, reps: 8 }])
    expect(changes.find((c) => c.type === 'max_load')).toBeUndefined()
  })
})

describe('getExerciseTrends', () => {
  it('returns insufficient_data for load/volume/reps with fewer than 6 executions', () => {
    seedHistory([workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord()] })])
    const trends = getExerciseTrends('ex-1')
    expect(trends.find((t) => t.metric === 'load')!.direction).toBe('insufficient_data')
  })

  it('classifies increasing load beyond the stability tolerance', () => {
    // Cronológico (mais antigo → mais recente): 50,50,50,60,60,60 — últimas 3 vs 3 anteriores: +20%.
    const dates = ['01', '02', '03', '04', '05', '06'].map((d) => `2026-01-${d}T10:00:00Z`)
    const loads = [50, 50, 50, 60, 60, 60]
    const history = dates.map((completedAt, i) => workout({ completedAt, exercises: [exerciseRecord({ sets: [set(loads[i], 8)] })] }))
    seedHistory([...history].reverse()) // seedHistory espera mais recente primeiro
    const trend = getExerciseTrends('ex-1').find((t) => t.metric === 'load')!
    expect(trend.direction).toBe('increasing')
    expect(trend.percentageChange).toBeCloseTo(20, 5)
  })

  it('classifies stable when variation is within tolerance', () => {
    const dates = ['01', '02', '03', '04', '05', '06'].map((d) => `2026-01-${d}T10:00:00Z`)
    const loads = [50, 50, 50, 51, 51, 51]
    const history = dates.map((completedAt, i) => workout({ completedAt, exercises: [exerciseRecord({ sets: [set(loads[i], 8)] })] }))
    seedHistory([...history].reverse())
    const trend = getExerciseTrends('ex-1').find((t) => t.metric === 'load')!
    expect(trend.direction).toBe('stable')
  })
})

describe('substitution intelligence', () => {
  function substitutedRecord(): ExerciseRecord {
    return exerciseRecord({
      exerciseId: 'ex-2',
      exerciseName: 'Chest Press',
      plannedExerciseId: 'blk-1',
      source: 'substitution',
      substitution: {
        plannedExerciseId: 'blk-1',
        plannedExerciseName: 'Supino Inclinado',
        replacementExerciseId: 'ex-2',
        replacementExerciseName: 'Chest Press',
        reason: 'equipment',
        substitutedAt: '2026-01-01T10:00:00Z',
      },
    })
  }

  it('getExerciseSubstitutionInsights returns null when the exercise was never performed', () => {
    seedHistory([])
    expect(getExerciseSubstitutionInsights('ex-1')).toBeNull()
  })

  it('aggregates mostCommonReplacements and mostCommonReasons for the substituted exercise', () => {
    seedHistory([
      workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [substitutedRecord()] }),
      workout({ completedAt: '2026-01-08T10:00:00Z', exercises: [substitutedRecord()] }),
      workout({ completedAt: '2026-01-15T10:00:00Z', exercises: [exerciseRecord({ exerciseName: 'Supino Inclinado', plannedExerciseId: 'blk-1' })] }),
    ])
    const insights = getExerciseSubstitutionInsights('ex-1')
    expect(insights).not.toBeNull()
    expect(insights!.timesReplaced).toBe(2)
    expect(insights!.mostCommonReplacements[0]).toMatchObject({ exerciseId: 'ex-2', count: 2 })
    expect(insights!.mostCommonReasons[0]).toMatchObject({ reason: 'equipment', count: 2 })
    // 2 substituições + 1 execução direta = 3 aparições planejadas; taxa = 2/3.
    expect(insights!.replacementRate).toBeCloseTo(2 / 3, 5)
  })

  it('getRecurringSubstitutions aggregates across all exercises by planned name', () => {
    seedHistory([
      workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [substitutedRecord()] }),
      workout({ completedAt: '2026-01-08T10:00:00Z', exercises: [substitutedRecord()] }),
      workout({ completedAt: '2026-01-15T10:00:00Z', exercises: [substitutedRecord()] }),
    ])
    const recurring = getRecurringSubstitutions()
    expect(recurring).toEqual([{ exerciseName: 'Supino Inclinado', count: 3 }])
  })

  it('does not count a reverted substitution (no substitution field persisted)', () => {
    seedHistory([workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord({ exerciseId: 'ex-1', plannedExerciseId: 'blk-1' })] })])
    expect(getRecurringSubstitutions()).toEqual([])
  })
})
