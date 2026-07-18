import { describe, it, expect, beforeEach, vi } from 'vitest'
import { buildCycleWeekBreakdown, countWeeksByType, buildWeekTypeTrendNote } from './training-cycle-week-summary'
import { upsertCycleWeekAnnotation } from './training-cycle-weeks'
import type { TrainingCycle } from './training-cycles'

vi.mock('./workout-history', () => ({ getWorkoutHistory: vi.fn(() => mockHistory) }))
vi.mock('./readiness-check-ins', () => ({ getCheckIns: vi.fn(() => []) }))
vi.mock('./weekly-plan', () => ({
  getWeekStart: vi.fn((d: Date) => {
    const date = new Date(d)
    const day = date.getDay()
    const diff = day === 0 ? -6 : 1 - day
    date.setDate(date.getDate() + diff)
    return date.toISOString().slice(0, 10)
  }),
}))

let mockHistory: unknown[] = []

function makeWorkout(id: string, completedAt: string, volumeKg: number, prsCount = 0) {
  return {
    id,
    workoutId: 'cw-1',
    workoutName: 'Treino A',
    workoutColor: '#fff',
    category: 'strength',
    startedAt: completedAt,
    completedAt,
    durationSeconds: 3600,
    xpEarned: 50,
    prsCount,
    exercises: [
      { exerciseId: 'ex-1', exerciseName: 'Supino', sets: [{ weight_kg: volumeKg / 8, reps: 8 }] },
    ],
  }
}

function makeCycle(overrides: Partial<TrainingCycle> = {}): TrainingCycle {
  return {
    id: 'cycle-1',
    name: 'Bloco de teste',
    goal: 'strength',
    startDate: '2026-08-03', // Monday
    status: 'active',
    createdAt: '2026-08-03T12:00:00.000Z',
    updatedAt: '2026-08-03T12:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  window.localStorage.clear()
  mockHistory = []
})

describe('buildCycleWeekBreakdown', () => {
  it('returns one row per elapsed week, including the current partial week', () => {
    const cycle = makeCycle()
    const weeks = buildCycleWeekBreakdown(cycle, new Date('2026-08-17T12:00:00Z'))
    // 2026-08-03 to 2026-08-17 spans weeks starting 08-03, 08-10, 08-17
    expect(weeks).toHaveLength(3)
    expect(weeks[0].weekNumber).toBe(1)
    expect(weeks[0].startDate).toBe('2026-08-03')
    expect(weeks[2].weekNumber).toBe(3)
  })

  it('defaults unclassified weeks to normal type', () => {
    const cycle = makeCycle()
    const weeks = buildCycleWeekBreakdown(cycle, new Date('2026-08-10T12:00:00Z'))
    expect(weeks.every((w) => w.type === 'normal')).toBe(true)
  })

  it('applies a manual classification to the matching week', () => {
    upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-10', type: 'recovery' })
    const cycle = makeCycle()
    const weeks = buildCycleWeekBreakdown(cycle, new Date('2026-08-10T12:00:00Z'))
    expect(weeks[1].type).toBe('recovery')
  })

  it('aggregates sessions and volume per week', () => {
    mockHistory = [makeWorkout('w1', '2026-08-04T10:00:00Z', 400, 1), makeWorkout('w2', '2026-08-05T10:00:00Z', 200)]
    const cycle = makeCycle()
    const weeks = buildCycleWeekBreakdown(cycle, new Date('2026-08-10T12:00:00Z'))
    expect(weeks[0].sessions).toBe(2)
    expect(weeks[0].volumeKg).toBe(600)
    expect(weeks[0].prs).toBe(1)
  })

  it('uses the completion date as the end boundary for a completed cycle', () => {
    const cycle = makeCycle({ status: 'completed', completedAt: '2026-08-10T00:00:00.000Z' })
    const weeks = buildCycleWeekBreakdown(cycle, new Date('2026-09-01T12:00:00Z'))
    expect(weeks).toHaveLength(2)
  })

  it('excludes sessions that fall after completedAt even within the same calendar week', () => {
    // Cycle completes mid-week (Monday); a session later that same week must
    // not be counted, or the week total would exceed the cycle's own summary.
    mockHistory = [
      makeWorkout('w1', '2026-08-03T10:00:00Z', 400), // on completion day — counted
      makeWorkout('w2', '2026-08-05T10:00:00Z', 300), // after completion — not counted
    ]
    const cycle = makeCycle({ status: 'completed', completedAt: '2026-08-03T18:00:00.000Z' })
    const weeks = buildCycleWeekBreakdown(cycle, new Date('2026-09-01T12:00:00Z'))
    expect(weeks).toHaveLength(1)
    expect(weeks[0].sessions).toBe(1)
    expect(weeks[0].volumeKg).toBe(400)
  })
})

describe('countWeeksByType', () => {
  it('counts weeks by classification', () => {
    upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-10', type: 'recovery' })
    upsertCycleWeekAnnotation({ cycleId: 'cycle-1', weekStartDate: '2026-08-17', type: 'test' })
    const cycle = makeCycle()
    const weeks = buildCycleWeekBreakdown(cycle, new Date('2026-08-17T12:00:00Z'))
    expect(countWeeksByType(weeks)).toEqual({ normal: 1, recovery: 1, test: 1, transition: 0 })
  })
})

describe('buildWeekTypeTrendNote', () => {
  it('returns null when there is no meaningful drop', () => {
    const weeks = [
      { weekNumber: 1, startDate: 'a', endDate: 'a', type: 'normal' as const, sessions: 1, volumeKg: 100, prs: 0, averageReadiness: null },
      { weekNumber: 2, startDate: 'b', endDate: 'b', type: 'normal' as const, sessions: 1, volumeKg: 105, prs: 0, averageReadiness: null },
    ]
    expect(buildWeekTypeTrendNote(weeks)).toBeNull()
  })

  it('explains a drop that coincides with a recovery week and recovers after', () => {
    const weeks = [
      { weekNumber: 1, startDate: 'a', endDate: 'a', type: 'normal' as const, sessions: 1, volumeKg: 1000, prs: 0, averageReadiness: null },
      { weekNumber: 2, startDate: 'b', endDate: 'b', type: 'recovery' as const, sessions: 1, volumeKg: 400, prs: 0, averageReadiness: null },
      { weekNumber: 3, startDate: 'c', endDate: 'c', type: 'normal' as const, sessions: 1, volumeKg: 1100, prs: 0, averageReadiness: null },
    ]
    expect(buildWeekTypeTrendNote(weeks)).toContain('recuperação')
  })

  it('explains a drop during a test week without implying regression', () => {
    const weeks = [
      { weekNumber: 1, startDate: 'a', endDate: 'a', type: 'normal' as const, sessions: 1, volumeKg: 1000, prs: 0, averageReadiness: null },
      { weekNumber: 2, startDate: 'b', endDate: 'b', type: 'test' as const, sessions: 1, volumeKg: 200, prs: 0, averageReadiness: null },
    ]
    expect(buildWeekTypeTrendNote(weeks)).toContain('teste')
  })

  it('does not annotate a drop in an unclassified (normal) week', () => {
    const weeks = [
      { weekNumber: 1, startDate: 'a', endDate: 'a', type: 'normal' as const, sessions: 1, volumeKg: 1000, prs: 0, averageReadiness: null },
      { weekNumber: 2, startDate: 'b', endDate: 'b', type: 'normal' as const, sessions: 1, volumeKg: 200, prs: 0, averageReadiness: null },
    ]
    expect(buildWeekTypeTrendNote(weeks)).toBeNull()
  })
})
