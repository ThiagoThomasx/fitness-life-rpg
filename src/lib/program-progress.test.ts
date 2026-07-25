import { describe, it, expect } from 'vitest'
import {
  groupPlannedWorkoutsByProgramWeek,
  buildProgramAdherenceSnapshot,
  findNextPlannedWorkout,
  computeOnTimeRate,
  findMostDeviatedSession,
  adherenceRateLabel,
  countAdherenceWeeksAboveThreshold,
} from './program-progress'
import type { PlannedWorkout, WorkoutTemplateSnapshot } from './planned-workouts'
import type { CompletedWorkout } from './workout-history'
import type { TrainingProgram } from './training-programs'

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

function completedWorkout(overrides: Partial<CompletedWorkout> = {}): CompletedWorkout {
  return {
    id: 'cw-1',
    workoutId: 'w-1',
    workoutName: 'Treino A',
    workoutColor: '#000',
    category: 'strength',
    startedAt: '2026-07-20T10:00:00.000Z',
    completedAt: '2026-07-20T11:00:00.000Z',
    durationSeconds: 3600,
    xpEarned: 10,
    exercises: [{ exerciseId: 'ex-1', exerciseName: 'Supino Reto', sets: [{ weight_kg: 60, reps: 8, isPr: false }] }],
    prsCount: 0,
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

describe('groupPlannedWorkoutsByProgramWeek', () => {
  it('groups by programWeekId, ignoring items from other programs or without a week link', () => {
    const items = [
      plannedWorkout({ id: 'a', source: { programId: 'prog-1', programWeekId: 'w1', programWeekNumber: 1 } }),
      plannedWorkout({ id: 'b', source: { programId: 'prog-1', programWeekId: 'w1', programWeekNumber: 1 } }),
      plannedWorkout({ id: 'c', source: { programId: 'prog-1', programWeekId: 'w2', programWeekNumber: 2 } }),
      plannedWorkout({ id: 'd', source: { programId: 'prog-2', programWeekId: 'w1', programWeekNumber: 1 } }),
      plannedWorkout({ id: 'e', source: undefined }),
    ]
    const groups = groupPlannedWorkoutsByProgramWeek(items, 'prog-1')
    expect(groups).toHaveLength(2)
    expect(groups[0].items.map((i) => i.id)).toEqual(['a', 'b'])
    expect(groups[1].items.map((i) => i.id)).toEqual(['c'])
  })
})

describe('buildProgramAdherenceSnapshot', () => {
  it('reports full adherence for a perfect week', () => {
    const pw = plannedWorkout({ id: 'a', status: 'done', date: '2026-07-20', execution: { completedWorkoutId: 'cw-1', updatedAt: '2026-07-20T00:00:00.000Z' } })
    const result = buildProgramAdherenceSnapshot(program(), [pw], [completedWorkout()], '2026-07-25')
    expect(result.weekSummaries).toHaveLength(1)
    expect(result.weekSummaries[0].adherenceRate).toBe(1)
    expect(result.plannedSessions).toBe(1)
    expect(result.completedSessions).toBe(1)
  })

  it('returns no week summaries when nothing links to the program', () => {
    const result = buildProgramAdherenceSnapshot(program(), [], [], '2026-07-25')
    expect(result.weekSummaries).toEqual([])
    expect(result.status).toBe('not_started')
  })
})

describe('findNextPlannedWorkout', () => {
  it('returns the soonest pending session in the program on or after today', () => {
    const items = [
      plannedWorkout({ id: 'past', status: 'pending', date: '2026-07-10' }),
      plannedWorkout({ id: 'soon', status: 'pending', date: '2026-07-26' }),
      plannedWorkout({ id: 'later', status: 'pending', date: '2026-07-28' }),
    ]
    const next = findNextPlannedWorkout(items, 'prog-1', '2026-07-25')
    expect(next?.id).toBe('soon')
  })

  it('returns undefined when there is nothing pending', () => {
    expect(findNextPlannedWorkout([plannedWorkout({ status: 'done' })], 'prog-1', '2026-07-25')).toBeUndefined()
  })
})

describe('computeOnTimeRate', () => {
  it('computes the share of on_time completions among sessions with timing recorded', () => {
    const items = [
      plannedWorkout({ status: 'done', execution: { completionTiming: 'on_time', updatedAt: '' } }),
      plannedWorkout({ status: 'done', execution: { completionTiming: 'late', updatedAt: '' } }),
    ]
    expect(computeOnTimeRate(items, 'prog-1')).toBe(0.5)
  })

  it('returns undefined when no completed session has completionTiming recorded', () => {
    expect(computeOnTimeRate([plannedWorkout({ status: 'done' })], 'prog-1')).toBeUndefined()
  })
})

describe('findMostDeviatedSession', () => {
  it('returns undefined when the worst session still matches 100%', () => {
    const pw = plannedWorkout({ id: 'a', status: 'done', execution: { completedWorkoutId: 'cw-1', updatedAt: '' } })
    expect(findMostDeviatedSession([pw], [completedWorkout()], 'prog-1', '2026-07-25')).toBeUndefined()
  })

  it('returns the session with the lowest exercise match rate', () => {
    const pw = plannedWorkout({
      id: 'a',
      status: 'done',
      templateSnapshot: {
        name: 'Treino A',
        exerciseBlocks: [
          { id: 'blk-1', type: 'single', exercise: { id: 'ex-1', exerciseId: 'ex-1', exerciseName: 'Supino Reto' } },
          { id: 'blk-2', type: 'single', exercise: { id: 'ex-2', exerciseId: 'ex-2', exerciseName: 'Remada' } },
        ],
        capturedAt: new Date().toISOString(),
      },
      execution: { completedWorkoutId: 'cw-1', updatedAt: '' },
    })
    const result = findMostDeviatedSession([pw], [completedWorkout()], 'prog-1', '2026-07-25')
    expect(result?.id).toBe('a')
  })
})

describe('countAdherenceWeeksAboveThreshold', () => {
  it('counts only complete weeks meeting the threshold, across all programs given', () => {
    const perfectWeek = plannedWorkout({
      id: 'a',
      status: 'done',
      date: '2026-07-20',
      execution: { completedWorkoutId: 'cw-1', updatedAt: '' },
      source: { programId: 'prog-1', programWeekId: 'w1', programWeekNumber: 1 },
    })
    const futureWeek = plannedWorkout({
      id: 'b',
      status: 'pending',
      date: '2026-08-10',
      source: { programId: 'prog-1', programWeekId: 'w2', programWeekNumber: 2 },
    })
    const count = countAdherenceWeeksAboveThreshold([program()], [perfectWeek, futureWeek], [completedWorkout()], '2026-07-25', 1)
    expect(count).toBe(1)
  })

  it('does not count a complete week below the threshold', () => {
    const week = plannedWorkout({ id: 'a', status: 'skipped', date: '2026-07-20' })
    const count = countAdherenceWeeksAboveThreshold([program()], [week], [], '2026-07-25', 0.8)
    expect(count).toBe(0)
  })
})

describe('adherenceRateLabel', () => {
  it('maps rate ranges to labels', () => {
    expect(adherenceRateLabel(undefined)).toBe('Dados insuficientes')
    expect(adherenceRateLabel(0.95)).toBe('Excelente')
    expect(adherenceRateLabel(0.8)).toBe('Boa consistência')
    expect(adherenceRateLabel(0.6)).toBe('Inconsistente')
    expect(adherenceRateLabel(0.2)).toBe('Baixa adesão')
  })
})
