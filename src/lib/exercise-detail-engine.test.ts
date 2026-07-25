import { describe, it, expect, beforeEach } from 'vitest'
import type { CompletedWorkout, ExerciseRecord, SetRecord } from './workout-history'
import { saveCustomExercise } from './custom-workouts'
import {
  resolveExercise,
  getExerciseDataQuality,
  getExerciseRelatedWorkouts,
  filterExecutionsByPeriod,
  getExerciseLoadSeries,
  getExercise1RMSeries,
  getExerciseVolumeSeries,
  getExerciseRepsSeries,
  getExerciseFrequencySeries,
} from './exercise-detail-engine'
import { getExerciseTimeline } from './exercise-intelligence'

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

beforeEach(() => {
  window.localStorage.clear()
})

describe('resolveExercise', () => {
  it('resolves a library exercise as active', () => {
    seedHistory([])
    const resolved = resolveExercise('ex-1')
    expect(resolved).not.toBeNull()
    expect(resolved?.origin).toBe('library')
    expect(resolved?.availability).toBe('active')
    expect(resolved?.exerciseName).toBe('Supino Reto')
  })

  it('resolves a custom exercise as active + custom origin', () => {
    seedHistory([])
    const saved = saveCustomExercise({
      name: 'Remada Customizada',
      workout_type_id: 'wt-1',
      muscle_groups: ['costas'],
      equipment: [],
      instructions: null,
    })
    const resolved = resolveExercise(saved.id)
    expect(resolved?.origin).toBe('custom')
    expect(resolved?.availability).toBe('active')
  })

  it('resolves an exercise removed from the catalog but present in history', () => {
    seedHistory([
      workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord({ exerciseId: 'removed-ex', exerciseName: 'Exercício Removido' })] }),
    ])
    const resolved = resolveExercise('removed-ex')
    expect(resolved?.origin).toBe('history_only')
    expect(resolved?.availability).toBe('removed')
    expect(resolved?.exerciseName).toBe('Exercício Removido')
  })

  it('returns null when there is no evidence at all', () => {
    seedHistory([])
    expect(resolveExercise('never-existed')).toBeNull()
  })
})

describe('getExerciseDataQuality', () => {
  it('reports no_data when never executed', () => {
    seedHistory([])
    expect(getExerciseDataQuality('ex-1').status).toBe('no_data')
  })

  it('reports single_execution with exactly one execution', () => {
    seedHistory([workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord()] })])
    expect(getExerciseDataQuality('ex-1').status).toBe('single_execution')
  })

  it('reports no_load_recorded for bodyweight-only history', () => {
    seedHistory([
      workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord({ sets: [set(0, 12)] })] }),
      workout({ completedAt: '2026-01-02T10:00:00Z', exercises: [exerciseRecord({ sets: [set(0, 15)] })] }),
    ])
    expect(getExerciseDataQuality('ex-1').status).toBe('no_load_recorded')
  })

  it('reports partial_history with 2-5 executions with load', () => {
    seedHistory(
      Array.from({ length: 3 }, (_, i) => workout({ completedAt: `2026-01-0${i + 1}T10:00:00Z`, exercises: [exerciseRecord()] }))
    )
    expect(getExerciseDataQuality('ex-1').status).toBe('partial_history')
  })

  it('reports full_history with 6+ executions', () => {
    seedHistory(
      Array.from({ length: 6 }, (_, i) => workout({ completedAt: `2026-01-0${i + 1}T10:00:00Z`, exercises: [exerciseRecord()] }))
    )
    expect(getExerciseDataQuality('ex-1').status).toBe('full_history')
  })
})

describe('getExerciseRelatedWorkouts', () => {
  it('groups by program + workout name and counts occurrences', () => {
    seedHistory([
      workout({
        completedAt: '2026-01-01T10:00:00Z',
        workoutName: 'Push A',
        source: { programId: 'prog-1', programWeekNumber: 1 },
        exercises: [exerciseRecord()],
      }),
      workout({
        completedAt: '2026-01-08T10:00:00Z',
        workoutName: 'Push A',
        source: { programId: 'prog-1', programWeekNumber: 2 },
        exercises: [exerciseRecord()],
      }),
      workout({ completedAt: '2026-01-15T10:00:00Z', workoutName: 'Treino Livre', exercises: [exerciseRecord()] }),
    ])
    const related = getExerciseRelatedWorkouts('ex-1')
    expect(related).toHaveLength(2)
    const programGroup = related.find((r) => r.programId === 'prog-1')
    expect(programGroup?.occurrences).toBe(2)
    const freeGroup = related.find((r) => r.programId === undefined)
    expect(freeGroup?.occurrences).toBe(1)
  })

  it('returns empty array for an exercise never performed', () => {
    seedHistory([])
    expect(getExerciseRelatedWorkouts('ex-1')).toEqual([])
  })
})

describe('filterExecutionsByPeriod', () => {
  it('returns everything for "all"', () => {
    seedHistory([
      workout({ completedAt: '2020-01-01T10:00:00Z', exercises: [exerciseRecord()] }),
      workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord()] }),
    ])
    const executions = getExerciseTimeline('ex-1', 'oldest_first')
    expect(filterExecutionsByPeriod(executions, 'all')).toHaveLength(2)
  })

  it('excludes executions older than the window relative to the most recent one', () => {
    seedHistory([
      workout({ completedAt: '2025-01-01T10:00:00Z', exercises: [exerciseRecord()] }),
      workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord()] }),
    ])
    const executions = getExerciseTimeline('ex-1', 'oldest_first')
    const filtered = filterExecutionsByPeriod(executions, '30d')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].performedAt).toBe('2026-01-01T10:00:00Z')
  })
})

describe('chart series', () => {
  beforeEach(() => {
    seedHistory([
      workout({ completedAt: '2026-01-08T10:00:00Z', exercises: [exerciseRecord({ sets: [set(60, 8)] })] }),
      workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord({ sets: [set(50, 10), set(0, 5)] })] }),
    ])
  })

  it('getExerciseLoadSeries returns the max loaded set per execution, omitting unloaded sets', () => {
    const series = getExerciseLoadSeries('ex-1')
    expect(series).toHaveLength(2)
    expect(series[0].value).toBe(50)
    expect(series[1].value).toBe(60)
  })

  it('getExercise1RMSeries reuses calculateEstimated1RM and returns the best per execution', () => {
    const series = getExercise1RMSeries('ex-1')
    expect(series).toHaveLength(2)
    expect(series[0].value).toBeGreaterThan(50)
  })

  it('getExerciseVolumeSeries omits sessions without valid volume', () => {
    seedHistory([workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord({ sets: [set(0, 10)] })] })])
    expect(getExerciseVolumeSeries('ex-1')).toEqual([])
  })

  it('getExerciseRepsSeries returns total reps per execution', () => {
    const series = getExerciseRepsSeries('ex-1')
    expect(series[0].value).toBe(15)
    expect(series[1].value).toBe(8)
  })

  it('getExerciseFrequencySeries buckets executions into weekly windows', () => {
    const series = getExerciseFrequencySeries('ex-1')
    expect(series.length).toBeGreaterThan(0)
    const total = series.reduce((sum, p) => sum + p.count, 0)
    expect(total).toBe(2)
  })

  it('returns empty series when the exercise has no history', () => {
    seedHistory([])
    expect(getExerciseLoadSeries('ex-1')).toEqual([])
    expect(getExerciseFrequencySeries('ex-1')).toEqual([])
  })
})
