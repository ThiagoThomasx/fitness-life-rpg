import { describe, it, expect, vi } from 'vitest'
import { buildWellnessAssociationsOverview, getActiveCycleWellnessOverview } from './wellness-overview'
import { DEFAULT_WELLNESS_ASSOCIATION_CONFIG } from './wellness-associations'
import type { WorkoutReadinessCheckIn } from './readiness-check-ins'
import type { WeekSummary } from './training-load'
import type { TrainingCycle } from './training-cycles'

// ─── Mocks (getActiveCycleWellnessOverview pulls storage via its own defaults) ──

let mockActiveCycle: TrainingCycle | null = null
let mockCheckIns: WorkoutReadinessCheckIn[] = []

vi.mock('./training-cycles', () => ({
  getActiveCycle: vi.fn(() => mockActiveCycle),
}))
vi.mock('./readiness-check-ins', async () => {
  const actual = await vi.importActual<typeof import('./readiness-check-ins')>('./readiness-check-ins')
  return { ...actual, getCheckIns: vi.fn(() => mockCheckIns) }
})
vi.mock('./workout-history', () => ({
  getWorkoutHistory: vi.fn(() => []),
}))

function checkIn(overrides: Partial<WorkoutReadinessCheckIn> & { createdAt: string }): WorkoutReadinessCheckIn {
  return {
    id: `c-${overrides.createdAt}-${Math.random()}`,
    energy: 3,
    soreness: 3,
    sleepQuality: 3,
    motivation: 3,
    ...overrides,
  }
}

function weekSummary(overrides: Partial<WeekSummary> & { startDate: string }): WeekSummary {
  return {
    endDate: overrides.startDate,
    totalSessions: 0,
    totalVolumeKg: 0,
    totalSets: 0,
    prsCount: 0,
    averageReadiness: null,
    completionRate: 0,
    adjustedSessions: 0,
    ...overrides,
  }
}

function makeCycle(overrides: Partial<TrainingCycle> = {}): TrainingCycle {
  return {
    id: 'cycle-1',
    name: 'Bloco de teste',
    goal: 'strength',
    startDate: '2026-01-01',
    status: 'active',
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
    ...overrides,
  }
}

// Monday-aligned week-start dates (getWeekStart is Monday-based).
const WEEK_1 = '2026-07-06'
const WEEK_2 = '2026-07-13'
const WEEK_3 = '2026-07-20'
const WEEK_4 = '2026-07-27'

describe('buildWellnessAssociationsOverview', () => {
  it('returns no_data with zero check-ins', () => {
    const result = buildWellnessAssociationsOverview([], [])
    expect(result.dataStatus).toBe('no_data')
    expect(result.associations).toEqual([])
    expect(result.checkInCount).toBe(0)
  })

  it('returns insufficient_data when below minimum weeks for every metric', () => {
    const checkIns = [checkIn({ createdAt: `${WEEK_1}T08:00:00.000Z`, stress: 3 })]
    const summaries = [weekSummary({ startDate: WEEK_1, totalSessions: 2 })]
    const result = buildWellnessAssociationsOverview(checkIns, summaries)
    expect(result.dataStatus).toBe('insufficient_data')
    expect(result.checkInCount).toBe(1)
  })

  it('selects one association per wellness metric, preferring a clear finding', () => {
    const checkIns = [
      checkIn({ createdAt: `${WEEK_1}T08:00:00.000Z`, stress: 5, energy: 5 }),
      checkIn({ createdAt: `${WEEK_2}T08:00:00.000Z`, stress: 5, energy: 5 }),
      checkIn({ createdAt: `${WEEK_3}T08:00:00.000Z`, stress: 1, energy: 1 }),
      checkIn({ createdAt: `${WEEK_4}T08:00:00.000Z`, stress: 1, energy: 1 }),
    ]
    const summaries = [
      weekSummary({ startDate: WEEK_1, totalSessions: 1 }),
      weekSummary({ startDate: WEEK_2, totalSessions: 1 }),
      weekSummary({ startDate: WEEK_3, totalSessions: 5 }),
      weekSummary({ startDate: WEEK_4, totalSessions: 5 }),
    ]
    const result = buildWellnessAssociationsOverview(checkIns, summaries)
    expect(result.dataStatus).toBe('available')

    const metrics = result.associations.map((a) => a.wellnessMetric)
    expect(new Set(metrics).size).toBe(metrics.length)
    for (const assoc of result.associations) {
      expect(assoc.summary).not.toMatch(/causou|prova|comprovou/i)
    }
  })

  it('caps the number of associations returned', () => {
    const checkIns = [
      checkIn({ createdAt: `${WEEK_1}T08:00:00.000Z` }),
      checkIn({ createdAt: `${WEEK_2}T08:00:00.000Z` }),
      checkIn({ createdAt: `${WEEK_3}T08:00:00.000Z` }),
      checkIn({ createdAt: `${WEEK_4}T08:00:00.000Z` }),
    ]
    const summaries = [
      weekSummary({ startDate: WEEK_1, totalSessions: 2 }),
      weekSummary({ startDate: WEEK_2, totalSessions: 3 }),
      weekSummary({ startDate: WEEK_3, totalSessions: 1 }),
      weekSummary({ startDate: WEEK_4, totalSessions: 4 }),
    ]
    const result = buildWellnessAssociationsOverview(checkIns, summaries, DEFAULT_WELLNESS_ASSOCIATION_CONFIG, 2)
    expect(result.associations.length).toBeLessThanOrEqual(2)
  })
})

describe('getActiveCycleWellnessOverview', () => {
  it('returns null when there is no active cycle', () => {
    mockActiveCycle = null
    expect(getActiveCycleWellnessOverview()).toBeNull()
  })

  it('returns a summary for the active cycle', () => {
    mockActiveCycle = makeCycle()
    mockCheckIns = [
      checkIn({ createdAt: '2026-01-02T08:00:00.000Z' }),
      checkIn({ createdAt: '2026-01-03T08:00:00.000Z' }),
    ]
    const now = new Date('2026-01-10T00:00:00.000Z')
    const result = getActiveCycleWellnessOverview(now)
    expect(result).not.toBeNull()
    expect(result?.cycleId).toBe('cycle-1')
    expect(result?.cycleName).toBe('Bloco de teste')
    expect(result?.summary.checkInCount).toBe(2)
  })
})
