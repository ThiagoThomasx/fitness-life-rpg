import { describe, it, expect } from 'vitest'
import { computeConsistency } from './consistency'
import type { CompletedWorkout } from '../workout-history'
import type { PlannedWorkout, WorkoutTemplateSnapshot } from '../planned-workouts'
import type { TrainingProgram } from '../training-programs'

const HISTORY_KEY = 'lrpg-fit:workout-history'
const PROGRAMS_KEY = 'lrpg-fit:training-programs'
const PLANNED_WORKOUTS_KEY = 'lrpg-fit:planned-workouts'

const NOW = new Date('2026-07-25T12:00:00.000Z')

function completedWorkout(overrides: Partial<CompletedWorkout> & { completedAt: string }): CompletedWorkout {
  return {
    id: `cw-${overrides.completedAt}-${Math.random().toString(36).slice(2, 6)}`,
    workoutId: 'wt-1',
    workoutName: 'Treino A',
    workoutColor: '#000',
    category: 'strength',
    startedAt: overrides.completedAt,
    durationSeconds: 1800,
    xpEarned: 50,
    prsCount: 0,
    exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino Reto', sets: [{ weight_kg: 60, reps: 8, isPr: false }] }],
    ...overrides,
  }
}

function templateSnapshot(): WorkoutTemplateSnapshot {
  return {
    name: 'Treino A',
    exerciseBlocks: [{ id: 'blk-1', type: 'single', exercise: { id: 'ex-1', exerciseId: 'ex-1', exerciseName: 'Supino Reto' } }],
    capturedAt: new Date().toISOString(),
  }
}

function plannedWorkout(overrides: Partial<PlannedWorkout> = {}): PlannedWorkout {
  return {
    id: `pw-${Math.random().toString(36).slice(2, 8)}`,
    date: '2026-07-20',
    weekday: 1,
    name: 'A',
    templateSnapshot: templateSnapshot(),
    status: 'pending',
    isOptional: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: { programId: 'prog-1', programVersion: 1, programWeekId: 'w1', programWeekNumber: 1 },
    ...overrides,
  }
}

function program(overrides: Partial<TrainingProgram> = {}): TrainingProgram {
  return {
    id: 'prog-1',
    name: 'Programa X',
    weeks: [],
    tags: [],
    isFavorite: false,
    isArchived: false,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function seedHistory(history: CompletedWorkout[]) {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

function seedPrograms(programs: TrainingProgram[]) {
  window.localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs))
}

function seedPlannedWorkouts(planned: PlannedWorkout[]) {
  window.localStorage.setItem(PLANNED_WORKOUTS_KEY, JSON.stringify(planned))
}

function resetAll() {
  seedHistory([])
  seedPrograms([])
  seedPlannedWorkouts([])
}

describe('computeConsistency — empty and small history', () => {
  it('returns all-zero/null report for a completely empty history', () => {
    resetAll()
    const report = computeConsistency('30d', NOW)
    expect(report).toEqual({
      weeklyAdherenceRate: null,
      monthlyAdherenceRate: null,
      plannedSessions: 0,
      completedSessions: 0,
      missedSessions: 0,
      longestStreakDays: 0,
      currentStreakDays: 0,
      perfectWeeksCount: 0,
      bestMonth: null,
      worstMonth: null,
      period: '30d',
    })
  })

  it('counts raw completed sessions when there is no active program', () => {
    resetAll()
    seedHistory([completedWorkout({ completedAt: '2026-07-24T10:00:00.000Z' })])
    const report = computeConsistency('7d', NOW)
    expect(report.completedSessions).toBe(1)
    expect(report.plannedSessions).toBe(0)
    expect(report.weeklyAdherenceRate).toBeNull()
    expect(report.monthlyAdherenceRate).toBeNull()
  })
})

describe('computeConsistency — streaks', () => {
  it('computes a current streak counting back from today with no gap tolerance', () => {
    resetAll()
    seedHistory([
      completedWorkout({ completedAt: '2026-07-25T09:00:00.000Z' }), // today
      completedWorkout({ completedAt: '2026-07-24T09:00:00.000Z' }), // yesterday
      completedWorkout({ completedAt: '2026-07-23T09:00:00.000Z' }), // day before
      completedWorkout({ completedAt: '2026-07-20T09:00:00.000Z' }), // gap — breaks the streak before this point
    ])
    const report = computeConsistency('30d', NOW)
    expect(report.currentStreakDays).toBe(3)
  })

  it('returns zero current streak when the most recent workout was not today', () => {
    resetAll()
    seedHistory([completedWorkout({ completedAt: '2026-07-22T09:00:00.000Z' })])
    const report = computeConsistency('30d', NOW)
    expect(report.currentStreakDays).toBe(0)
  })

  it('finds the longest historical streak even when it is not the current one', () => {
    resetAll()
    seedHistory([
      // Long-past streak of 4 consecutive days.
      completedWorkout({ completedAt: '2026-07-01T09:00:00.000Z' }),
      completedWorkout({ completedAt: '2026-07-02T09:00:00.000Z' }),
      completedWorkout({ completedAt: '2026-07-03T09:00:00.000Z' }),
      completedWorkout({ completedAt: '2026-07-04T09:00:00.000Z' }),
      // Isolated recent session, not today.
      completedWorkout({ completedAt: '2026-07-15T09:00:00.000Z' }),
    ])
    const report = computeConsistency('30d', NOW)
    expect(report.longestStreakDays).toBe(4)
    expect(report.currentStreakDays).toBe(0)
  })

  it('counts multiple workouts on the same calendar day as a single streak day', () => {
    resetAll()
    seedHistory([
      completedWorkout({ completedAt: '2026-07-25T08:00:00.000Z' }),
      completedWorkout({ completedAt: '2026-07-25T18:00:00.000Z' }),
    ])
    const report = computeConsistency('30d', NOW)
    expect(report.currentStreakDays).toBe(1)
    expect(report.longestStreakDays).toBe(1)
  })
})

describe('computeConsistency — best/worst month', () => {
  it('groups completed sessions by calendar month within the period', () => {
    resetAll()
    seedHistory([
      completedWorkout({ completedAt: '2026-02-05T10:00:00.000Z' }),
      completedWorkout({ completedAt: '2026-02-10T10:00:00.000Z' }),
      completedWorkout({ completedAt: '2026-02-15T10:00:00.000Z' }),
      completedWorkout({ completedAt: '2026-05-05T10:00:00.000Z' }),
    ])
    const report = computeConsistency('1y', NOW)
    expect(report.bestMonth).toEqual({ label: '2026-02', completedSessions: 3 })
    expect(report.worstMonth).toEqual({ label: '2026-05', completedSessions: 1 })
  })

  it('returns the same month for both best and worst when only one month has data', () => {
    resetAll()
    seedHistory([completedWorkout({ completedAt: '2026-07-24T10:00:00.000Z' })])
    const report = computeConsistency('30d', NOW)
    expect(report.bestMonth).toEqual({ label: '2026-07', completedSessions: 1 })
    expect(report.worstMonth).toEqual({ label: '2026-07', completedSessions: 1 })
  })
})

describe('computeConsistency — program adherence composition', () => {
  it('computes weekly/monthly adherence rates from an active program with a fully completed planned session', () => {
    resetAll()
    seedPrograms([program()])
    const cw = completedWorkout({ id: 'cw-1', completedAt: '2026-07-20T11:00:00.000Z' })
    seedHistory([cw])
    seedPlannedWorkouts([
      plannedWorkout({
        id: 'pw-1',
        date: '2026-07-20',
        status: 'done',
        execution: { completedWorkoutId: 'cw-1', updatedAt: '2026-07-20T11:00:00.000Z' },
      }),
    ])
    const report = computeConsistency('30d', NOW)
    expect(report.plannedSessions).toBe(1)
    expect(report.completedSessions).toBe(1)
    expect(report.weeklyAdherenceRate).toBe(1)
    expect(report.monthlyAdherenceRate).toBe(1)
    expect(report.perfectWeeksCount).toBe(1)
  })

  it('counts a skipped planned session as missed', () => {
    resetAll()
    seedPrograms([program()])
    seedHistory([])
    seedPlannedWorkouts([plannedWorkout({ id: 'pw-1', date: '2026-07-20', status: 'skipped' })])
    const report = computeConsistency('30d', NOW)
    expect(report.missedSessions).toBe(1)
    expect(report.completedSessions).toBe(0)
  })

  it('ignores archived programs entirely', () => {
    resetAll()
    seedPrograms([program({ id: 'prog-archived', isArchived: true })])
    seedHistory([])
    seedPlannedWorkouts([
      plannedWorkout({ id: 'pw-1', date: '2026-07-20', status: 'pending', source: { programId: 'prog-archived', programVersion: 1, programWeekId: 'w1', programWeekNumber: 1 } }),
    ])
    const report = computeConsistency('30d', NOW)
    expect(report.plannedSessions).toBe(0)
    expect(report.weeklyAdherenceRate).toBeNull()
  })

  it('does not crash when a planned workout references an exercise removed from the catalog', () => {
    resetAll()
    seedPrograms([program()])
    const snapshot: WorkoutTemplateSnapshot = {
      name: 'Treino A',
      exerciseBlocks: [{ id: 'blk-1', type: 'single', exercise: { id: 'deleted-ex', exerciseId: 'deleted-ex', exerciseName: 'Removido' } }],
      capturedAt: new Date().toISOString(),
    }
    seedPlannedWorkouts([plannedWorkout({ id: 'pw-1', date: '2026-07-20', status: 'pending', templateSnapshot: snapshot })])
    expect(() => computeConsistency('30d', NOW)).not.toThrow()
  })
})

describe('computeConsistency — period boundaries', () => {
  it('respects the "all" period without throwing and includes every session ever recorded', () => {
    resetAll()
    seedHistory([
      completedWorkout({ completedAt: '2020-01-01T10:00:00.000Z' }),
      completedWorkout({ completedAt: '2026-07-24T10:00:00.000Z' }),
    ])
    const report = computeConsistency('all', NOW)
    expect(report.completedSessions).toBe(2)
    expect(report.period).toBe('all')
  })
})
