import { describe, it, expect } from 'vitest'
import {
  classifySessionAttendance,
  computeSessionAdherence,
  computeWeekAdherence,
  computeBlockAdherence,
  computeProgramAdherence,
  identifyExtraSessions,
  validateProgramExecutionIntegrity,
  DEFAULT_PROGRAM_ADHERENCE_CONFIG,
  type ProgramWeekAdherence,
} from './program-adherence'
import type { PlannedWorkout, WorkoutTemplateSnapshot } from './planned-workouts'
import type { CompletedWorkout } from './workout-history'
import type { TrainingBlock } from './training-blocks'

function templateSnapshot(exerciseCount = 1): WorkoutTemplateSnapshot {
  return {
    name: 'Treino A',
    exerciseBlocks: Array.from({ length: exerciseCount }, (_, i) => ({
      id: `blk-${i}`,
      type: 'single' as const,
      exercise: { id: `ex-${i}`, exerciseName: `Exercicio ${i}` },
    })),
    capturedAt: new Date().toISOString(),
  }
}

function planned(overrides: Partial<PlannedWorkout> = {}): PlannedWorkout {
  return {
    id: `pw-${Math.random()}`,
    date: '2026-07-20',
    weekday: 1,
    name: 'A',
    templateSnapshot: templateSnapshot(),
    status: 'pending',
    isOptional: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function completed(overrides: Partial<CompletedWorkout> = {}): CompletedWorkout {
  return {
    id: `cw-${Math.random()}`,
    workoutId: 'w-1',
    workoutName: 'Treino A',
    workoutColor: '#000',
    category: 'strength',
    startedAt: '2026-07-20T10:00:00.000Z',
    completedAt: '2026-07-20T11:00:00.000Z',
    durationSeconds: 3600,
    xpEarned: 10,
    exercises: [{ exerciseId: 'ex-0', exerciseName: 'Exercicio 0', sets: [{ weight_kg: 50, reps: 8, isPr: false }] }],
    prsCount: 0,
    ...overrides,
  }
}

const TODAY = '2026-07-25'

describe('classifySessionAttendance', () => {
  it('classifies cancelled and skipped from status alone', () => {
    expect(classifySessionAttendance(planned({ status: 'cancelled' }), undefined, TODAY)).toBe('cancelled')
    expect(classifySessionAttendance(planned({ status: 'skipped' }), undefined, TODAY)).toBe('skipped')
  })

  it('classifies pending as overdue past the grace period', () => {
    expect(classifySessionAttendance(planned({ date: '2026-07-01', status: 'pending' }), undefined, TODAY)).toBe(
      'overdue'
    )
    expect(classifySessionAttendance(planned({ date: '2026-07-25', status: 'pending' }), undefined, TODAY)).toBe(
      'pending'
    )
  })

  it('classifies done with a fully-matched completed workout as completed', () => {
    const p = planned({ status: 'done', templateSnapshot: templateSnapshot(1) })
    const c = completed()
    expect(classifySessionAttendance(p, c, TODAY)).toBe('completed')
  })

  it('classifies done with a partially-matched completed workout as partial', () => {
    const p = planned({ status: 'done', templateSnapshot: templateSnapshot(5) })
    const c = completed({ exercises: [completed().exercises[0]] })
    expect(classifySessionAttendance(p, c, TODAY)).toBe('partial')
  })

  it('treats done without a resolvable completed record as completed (broken link, not a fabricated status)', () => {
    const p = planned({ status: 'done' })
    expect(classifySessionAttendance(p, undefined, TODAY)).toBe('completed')
  })
})

describe('computeSessionAdherence', () => {
  it('resolves the linked completed workout via completedById', () => {
    const c = completed({ id: 'cw-1' })
    const p = planned({ status: 'done', execution: { completedWorkoutId: 'cw-1', updatedAt: TODAY } })
    const result = computeSessionAdherence([p], new Map([['cw-1', c]]), TODAY)
    expect(result[0].attendanceStatus).toBe('completed')
    expect(result[0].dataStatus).toBe('available')
  })
})

describe('computeWeekAdherence', () => {
  it('marks a week with only pending future sessions as future', () => {
    const week = computeWeekAdherence([planned({ date: '2026-08-01' })], 'week-1', 1, new Map(), [], TODAY)
    expect(week.dataStatus).toBe('future')
    expect(week.adherenceRate).toBe(0)
  })

  it('marks a week with no pending/overdue sessions as complete', () => {
    const week = computeWeekAdherence([planned({ status: 'skipped' })], 'week-1', 1, new Map(), [], TODAY)
    expect(week.dataStatus).toBe('complete')
  })

  it('excludes optional sessions from the adherence rate by default', () => {
    const required = planned({ status: 'skipped' })
    const optional = planned({ status: 'pending', date: '2026-08-01', isOptional: true })
    const week = computeWeekAdherence([required, optional], 'week-1', 1, new Map(), [], TODAY)
    // Only the required session counts; it was skipped, so rate is 0, not diluted by the optional one.
    expect(week.adherenceRate).toBe(0)
    expect(week.plannedSessions).toBe(2)
  })

  it('excludes cancelled sessions from the adherence rate by default', () => {
    const cancelled = planned({ status: 'cancelled' })
    const done = planned({ status: 'done', templateSnapshot: templateSnapshot(1) })
    const c = completed({ id: 'cw-2', exercises: templateSnapshot(1).exerciseBlocks.map((b) => ({ exerciseId: b.exercise.exerciseId!, exerciseName: b.exercise.exerciseName, sets: [] })) })
    const week = computeWeekAdherence(
      [cancelled, { ...done, execution: { completedWorkoutId: 'cw-2', updatedAt: TODAY } }],
      'week-1',
      1,
      new Map([['cw-2', c]]),
      [],
      TODAY
    )
    expect(week.adherenceRate).toBe(1)
  })

  it('reports insufficient_data and an undefined rate for a week with no planned sessions', () => {
    const week = computeWeekAdherence([], 'week-1', 1, new Map(), [], TODAY)
    expect(week.dataStatus).toBe('insufficient_data')
    expect(week.adherenceRate).toBeUndefined()
    expect(week.plannedSessions).toBe(0)
  })

  it('never lets extra sessions push the rate above 100%', () => {
    const done = planned({ status: 'done', templateSnapshot: templateSnapshot(1) })
    const c = completed({ id: 'cw-3' })
    const extra = completed({ id: 'cw-extra' })
    const week = computeWeekAdherence(
      [{ ...done, execution: { completedWorkoutId: 'cw-3', updatedAt: TODAY } }],
      'week-1',
      1,
      new Map([['cw-3', c]]),
      [extra],
      TODAY
    )
    expect(week.adherenceRate).toBeLessThanOrEqual(1)
    expect(week.extraSessions).toBe(1)
  })
})

describe('computeBlockAdherence', () => {
  it('aggregates week summaries into a block summary', () => {
    const block: TrainingBlock = { id: 'blk-1', name: 'Bloco 1', startWeek: 1, endWeek: 2 }
    const weeks: ProgramWeekAdherence[] = [
      computeWeekAdherence([planned({ status: 'skipped' })], 'w1', 1, new Map(), [], TODAY),
      computeWeekAdherence([planned({ date: '2026-08-10' })], 'w2', 2, new Map(), [], TODAY),
    ]
    const result = computeBlockAdherence(block, weeks)
    expect(result.totalWeeks).toBe(2)
    expect(result.status).toBe('in_progress')
  })
})

describe('computeProgramAdherence', () => {
  it('handles a program with no sessions without dividing by zero', () => {
    const result = computeProgramAdherence({ id: 'prog-1', version: 1, weeks: [], blocks: [] }, [], 0)
    expect(result.status).toBe('not_started')
    expect(result.adherenceRate).toBeUndefined()
    expect(result.plannedSessions).toBe(0)
  })

  it('builds block summaries scoped to the block week range', () => {
    const block: TrainingBlock = { id: 'blk-1', name: 'Bloco 1', startWeek: 1, endWeek: 1 }
    const weekSummaries = [computeWeekAdherence([planned({ status: 'skipped' })], 'w1', 1, new Map(), [], TODAY)]
    const result = computeProgramAdherence(
      { id: 'prog-1', version: 1, weeks: [], blocks: [block] },
      weekSummaries,
      0
    )
    expect(result.blockSummaries).toHaveLength(1)
    expect(result.blockSummaries[0].blockId).toBe('blk-1')
  })
})

describe('identifyExtraSessions', () => {
  it('flags completed workouts without a plannedWorkoutId within range', () => {
    const linked = completed({ id: 'cw-1', source: { plannedWorkoutId: 'pw-1' } })
    const extra = completed({ id: 'cw-2' })
    const outOfRange = completed({ id: 'cw-3', completedAt: '2026-06-01T10:00:00.000Z' })
    const result = identifyExtraSessions([linked, extra, outOfRange], '2026-07-01', '2026-07-31')
    expect(result.map((w) => w.id)).toEqual(['cw-2'])
  })
})

describe('validateProgramExecutionIntegrity', () => {
  it('detects a completed link pointing to a missing history record', () => {
    const p = planned({ execution: { completedWorkoutId: 'missing-cw', updatedAt: TODAY } })
    const report = validateProgramExecutionIntegrity([p], [])
    expect(report.plannedWithoutCompletedRecord).toEqual([p.id])
  })

  it('detects duplicate links to the same planned workout', () => {
    const c1 = completed({ id: 'cw-1', source: { plannedWorkoutId: 'pw-dup' } })
    const c2 = completed({ id: 'cw-2', source: { plannedWorkoutId: 'pw-dup' } })
    const report = validateProgramExecutionIntegrity([], [c1, c2])
    expect(report.duplicateLinks).toEqual(['pw-dup'])
  })
})

describe('config defaults', () => {
  it('exports sane defaults', () => {
    expect(DEFAULT_PROGRAM_ADHERENCE_CONFIG.optionalSessionsAffectRate).toBe(false)
    expect(DEFAULT_PROGRAM_ADHERENCE_CONFIG.cancelledSessionsAffectRate).toBe(false)
  })
})
