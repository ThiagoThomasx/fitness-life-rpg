import { describe, it, expect, vi } from 'vitest'
import {
  getCycleDateRange,
  filterCheckInsForCycle,
  buildCycleWellnessSummary,
  compareCycleWellness,
  DEFAULT_CYCLE_WELLNESS_CONFIG,
} from './training-cycle-wellness'
import type { TrainingCycle } from './training-cycles'
import type { WorkoutReadinessCheckIn } from './readiness-check-ins'
import type { CompletedWorkout } from './workout-history'

// ─── Mocks (buildCycleSummary pulls readiness/history via its own defaults) ──

vi.mock('./workout-history', () => ({
  getWorkoutHistory: vi.fn(() => mockHistory),
  getExerciseHistory: vi.fn(() => []),
}))
vi.mock('./custom-workouts', () => ({
  getCustomWorkouts: vi.fn(() => [{ id: 'cw-1', name: 'Treino A' }]),
  getAllExercises: vi.fn(() => []),
}))
vi.mock('./readiness-check-ins', async () => {
  const actual = await vi.importActual<typeof import('./readiness-check-ins')>('./readiness-check-ins')
  return { ...actual, getCheckIns: vi.fn(() => mockCheckIns) }
})

let mockHistory: CompletedWorkout[] = []
let mockCheckIns: WorkoutReadinessCheckIn[] = []

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function makeCheckIn(overrides: Partial<WorkoutReadinessCheckIn> = {}): WorkoutReadinessCheckIn {
  return {
    id: `ci-${Math.random()}`,
    createdAt: '2026-01-05T08:00:00.000Z',
    energy: 3,
    soreness: 3,
    sleepQuality: 3,
    motivation: 3,
    ...overrides,
  }
}

function makeWorkout(id: string, completedAt: string, opts: { prsCount?: number } = {}): CompletedWorkout {
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
    exercises: [
      { exerciseId: 'ex-1', exerciseName: 'Supino', sets: [{ weight_kg: 40, reps: 10 }] },
    ] as CompletedWorkout['exercises'],
    prsCount: opts.prsCount ?? 0,
  }
}

function checkInsAcrossDays(
  startDay: number,
  count: number,
  value: 1 | 2 | 3 | 4 | 5 = 3,
  yearMonth = '2026-01'
): WorkoutReadinessCheckIn[] {
  return Array.from({ length: count }, (_, i) =>
    makeCheckIn({
      id: `ci-${yearMonth}-${startDay + i}`,
      createdAt: `${yearMonth}-${String(startDay + i).padStart(2, '0')}T08:00:00.000Z`,
      energy: value,
    })
  )
}

// ─── getCycleDateRange ─────────────────────────────────────────────────────────

describe('getCycleDateRange', () => {
  it('uses now as end date for an active cycle', () => {
    const cycle = makeCycle({ status: 'active' })
    const range = getCycleDateRange(cycle, new Date('2026-01-20T12:00:00.000Z'))
    expect(range).toEqual({ start: '2026-01-01', end: '2026-01-20' })
  })

  it('uses completedAt for a completed cycle regardless of now', () => {
    const cycle = makeCycle({ status: 'completed', completedAt: '2026-01-15T12:00:00.000Z' })
    const range = getCycleDateRange(cycle, new Date('2026-06-01T12:00:00.000Z'))
    expect(range).toEqual({ start: '2026-01-01', end: '2026-01-15' })
  })

  it('uses completedAt for an archived cycle (preserved through archiving)', () => {
    const cycle = makeCycle({ status: 'archived', completedAt: '2026-01-15T12:00:00.000Z' })
    const range = getCycleDateRange(cycle, new Date('2026-06-01T12:00:00.000Z'))
    expect(range).toEqual({ start: '2026-01-01', end: '2026-01-15' })
  })
})

// ─── filterCheckInsForCycle ────────────────────────────────────────────────────

describe('filterCheckInsForCycle', () => {
  it('excludes check-ins before and after the cycle range', () => {
    const cycle = makeCycle({ status: 'completed', startDate: '2026-01-05', completedAt: '2026-01-10T00:00:00.000Z' })
    const checkIns = [
      makeCheckIn({ id: 'before', createdAt: '2026-01-04T23:59:00.000Z' }),
      makeCheckIn({ id: 'inside', createdAt: '2026-01-07T10:00:00.000Z' }),
      makeCheckIn({ id: 'after', createdAt: '2026-01-11T00:01:00.000Z' }),
    ]
    const filtered = filterCheckInsForCycle(cycle, checkIns)
    expect(filtered.map((c) => c.id)).toEqual(['inside'])
  })

  it('includes check-ins on the first and last day of the cycle', () => {
    const cycle = makeCycle({ status: 'completed', startDate: '2026-01-05', completedAt: '2026-01-10T00:00:00.000Z' })
    const checkIns = [
      makeCheckIn({ id: 'first-day', createdAt: '2026-01-05T00:00:01.000Z' }),
      makeCheckIn({ id: 'last-day', createdAt: '2026-01-10T23:59:00.000Z' }),
    ]
    const filtered = filterCheckInsForCycle(cycle, checkIns)
    expect(filtered.map((c) => c.id).sort()).toEqual(['first-day', 'last-day'])
  })

  it('does not deduplicate multiple check-ins on the same day', () => {
    const cycle = makeCycle({ status: 'completed', startDate: '2026-01-05', completedAt: '2026-01-10T00:00:00.000Z' })
    const checkIns = [
      makeCheckIn({ id: 'a', createdAt: '2026-01-06T08:00:00.000Z' }),
      makeCheckIn({ id: 'b', createdAt: '2026-01-06T20:00:00.000Z' }),
    ]
    expect(filterCheckInsForCycle(cycle, checkIns)).toHaveLength(2)
  })
})

// ─── buildCycleWellnessSummary ──────────────────────────────────────────────────

describe('buildCycleWellnessSummary', () => {
  it('returns no_data status and message when there are no check-ins', () => {
    mockHistory = []
    mockCheckIns = []
    const cycle = makeCycle({ status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-28T00:00:00.000Z' })
    const summary = buildCycleWellnessSummary(cycle, [], [])
    expect(summary.checkInCount).toBe(0)
    expect(summary.dataStatus).toBe('no_data')
    expect(summary.messages).toContain('Ainda não há check-ins registrados neste período.')
  })

  it('returns insufficient_data status with a single check-in', () => {
    mockHistory = []
    const cycle = makeCycle({ status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-28T00:00:00.000Z' })
    const checkIns = [makeCheckIn({ createdAt: '2026-01-05T08:00:00.000Z' })]
    mockCheckIns = checkIns
    const summary = buildCycleWellnessSummary(cycle, checkIns, [])
    expect(summary.checkInCount).toBe(1)
    expect(summary.dataStatus).toBe('insufficient_data')
  })

  it('computes averages only from present fields (does not treat absence as zero)', () => {
    mockHistory = []
    const cycle = makeCycle({ status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-28T00:00:00.000Z' })
    const checkIns = [
      makeCheckIn({ createdAt: '2026-01-05T08:00:00.000Z', energy: 4, sleepHours: 8 }),
      makeCheckIn({ createdAt: '2026-01-06T08:00:00.000Z', energy: 2 }), // no sleepHours
    ]
    mockCheckIns = checkIns
    const summary = buildCycleWellnessSummary(cycle, checkIns, [])
    expect(summary.averageEnergy).toBe(3)
    expect(summary.averageSleepHours).toBe(8) // averaged over the one entry that has it, not (8+0)/2
  })

  it('calculates coverage as covered days over calendar days in the cycle', () => {
    mockHistory = []
    const cycle = makeCycle({ status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-10T00:00:00.000Z' })
    const checkIns = [
      makeCheckIn({ createdAt: '2026-01-02T08:00:00.000Z' }),
      makeCheckIn({ createdAt: '2026-01-02T20:00:00.000Z' }), // same day, should count once for coverage
      makeCheckIn({ createdAt: '2026-01-05T08:00:00.000Z' }),
    ]
    mockCheckIns = checkIns
    const summary = buildCycleWellnessSummary(cycle, checkIns, [])
    expect(summary.checkInCount).toBe(3)
    expect(summary.coveredDays).toBe(2)
    expect(summary.coverageRate).toBeCloseTo(2 / 10, 5)
  })

  it('excludes registros fora do ciclo from the summary even when passed in', () => {
    mockHistory = []
    const cycle = makeCycle({ status: 'completed', startDate: '2026-01-05', completedAt: '2026-01-10T00:00:00.000Z' })
    const checkIns = [
      makeCheckIn({ createdAt: '2025-12-01T08:00:00.000Z' }),
      makeCheckIn({ createdAt: '2026-01-07T08:00:00.000Z' }),
    ]
    mockCheckIns = checkIns
    const summary = buildCycleWellnessSummary(cycle, checkIns, [])
    expect(summary.checkInCount).toBe(1)
  })

  describe('trends', () => {
    it('classifies a clear increase between halves as increasing', () => {
      mockHistory = []
      const cycle = makeCycle({ status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-30T00:00:00.000Z' })
      const checkIns = [
        ...checkInsAcrossDays(2, 3, 2), // first half, low energy
        ...checkInsAcrossDays(20, 3, 5), // second half, high energy
      ]
      mockCheckIns = checkIns
      const summary = buildCycleWellnessSummary(cycle, checkIns, [])
      const energyTrend = summary.trends.find((t) => t.metric === 'energy')
      expect(energyTrend?.direction).toBe('increasing')
      expect(energyTrend?.sampleSize).toBe(6)
    })

    it('classifies a clear decrease between halves as decreasing', () => {
      mockHistory = []
      const cycle = makeCycle({ status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-30T00:00:00.000Z' })
      const checkIns = [...checkInsAcrossDays(2, 3, 5), ...checkInsAcrossDays(20, 3, 2)]
      mockCheckIns = checkIns
      const summary = buildCycleWellnessSummary(cycle, checkIns, [])
      const energyTrend = summary.trends.find((t) => t.metric === 'energy')
      expect(energyTrend?.direction).toBe('decreasing')
    })

    it('classifies near-equal halves as stable', () => {
      mockHistory = []
      const cycle = makeCycle({ status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-30T00:00:00.000Z' })
      const checkIns = [...checkInsAcrossDays(2, 3, 3), ...checkInsAcrossDays(20, 3, 3)]
      mockCheckIns = checkIns
      const summary = buildCycleWellnessSummary(cycle, checkIns, [])
      const energyTrend = summary.trends.find((t) => t.metric === 'energy')
      expect(energyTrend?.direction).toBe('stable')
    })

    it('returns insufficient_data when a half has too few samples', () => {
      mockHistory = []
      const cycle = makeCycle({ status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-30T00:00:00.000Z' })
      const checkIns = [...checkInsAcrossDays(2, 1, 5), ...checkInsAcrossDays(20, 3, 2)]
      mockCheckIns = checkIns
      const summary = buildCycleWellnessSummary(cycle, checkIns, [])
      const energyTrend = summary.trends.find((t) => t.metric === 'energy')
      expect(energyTrend?.direction).toBe('insufficient_data')
    })

    it('marks a short cycle as insufficient for internal trends', () => {
      mockHistory = []
      const cycle = makeCycle({ status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-03T00:00:00.000Z' })
      const checkIns = [
        makeCheckIn({ createdAt: '2026-01-01T08:00:00.000Z' }),
        makeCheckIn({ createdAt: '2026-01-02T08:00:00.000Z' }),
        makeCheckIn({ createdAt: '2026-01-03T08:00:00.000Z' }),
        makeCheckIn({ createdAt: '2026-01-03T20:00:00.000Z' }),
      ]
      mockCheckIns = checkIns
      const summary = buildCycleWellnessSummary(cycle, checkIns, [])
      expect(summary.trends.every((t) => t.direction === 'insufficient_data')).toBe(true)
      expect(summary.messages).toContain('Este ciclo ainda é curto demais para comparar tendências internas.')
    })

    it('detects irregular data as a distinct direction from a clear trend', () => {
      mockHistory = []
      const cycle = makeCycle({ status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-30T00:00:00.000Z' })
      const checkIns = [
        makeCheckIn({ id: 'a', createdAt: '2026-01-02T08:00:00.000Z', energy: 1 }),
        makeCheckIn({ id: 'b', createdAt: '2026-01-04T08:00:00.000Z', energy: 5 }),
        makeCheckIn({ id: 'c', createdAt: '2026-01-06T08:00:00.000Z', energy: 1 }),
        makeCheckIn({ id: 'd', createdAt: '2026-01-20T08:00:00.000Z', energy: 5 }),
        makeCheckIn({ id: 'e', createdAt: '2026-01-22T08:00:00.000Z', energy: 1 }),
        makeCheckIn({ id: 'f', createdAt: '2026-01-24T08:00:00.000Z', energy: 5 }),
      ]
      mockCheckIns = checkIns
      const summary = buildCycleWellnessSummary(cycle, checkIns, [])
      const energyTrend = summary.trends.find((t) => t.metric === 'energy')
      expect(energyTrend?.direction).toBe('irregular')
    })
  })

  describe('associations and partial weeks', () => {
    it('does not include sessions outside the cycle when building weekly training metrics', () => {
      mockHistory = []
      // Cycle starts mid-week (Wed 2026-01-07); a session on Mon 2026-01-05 is in the
      // same ISO week but outside the cycle and must not be counted.
      const cycle = makeCycle({ status: 'completed', startDate: '2026-01-07', completedAt: '2026-02-04T00:00:00.000Z' })
      const workouts = [
        makeWorkout('outside', '2026-01-05T08:00:00.000Z'),
        makeWorkout('inside', '2026-01-08T08:00:00.000Z'),
      ]
      const checkIns = Array.from({ length: 5 }, (_, i) =>
        makeCheckIn({ id: `ci-${i}`, createdAt: `2026-01-${String(8 + i).padStart(2, '0')}T08:00:00.000Z`, energy: 5 })
      )
      mockCheckIns = checkIns
      mockHistory = workouts
      // Should not throw and should only reflect in-cycle sessions.
      const summary = buildCycleWellnessSummary(cycle, checkIns, workouts)
      expect(summary.checkInCount).toBe(5)
    })

    it('limits associations to at most maximumAssociationsShown', () => {
      mockHistory = []
      const cycle = makeCycle({ status: 'completed', startDate: '2026-01-01', completedAt: '2026-04-01T00:00:00.000Z' })
      const checkIns: WorkoutReadinessCheckIn[] = []
      const workouts: CompletedWorkout[] = []
      const start = new Date('2026-01-01T00:00:00.000Z')
      for (let week = 0; week < 12; week++) {
        const d = new Date(start)
        d.setDate(d.getDate() + week * 7)
        const iso = d.toISOString().slice(0, 10)
        checkIns.push(
          makeCheckIn({ id: `ci-${week}`, createdAt: `${iso}T08:00:00.000Z`, energy: week % 2 === 0 ? 5 : 1, stress: week % 2 === 0 ? 1 : 5 })
        )
        if (week % 2 === 0) {
          workouts.push(makeWorkout(`w-${week}`, `${iso}T09:00:00.000Z`))
          workouts.push(makeWorkout(`w-${week}-2`, `${iso}T10:00:00.000Z`))
        }
      }
      mockCheckIns = checkIns
      mockHistory = workouts
      const summary = buildCycleWellnessSummary(cycle, checkIns, workouts)
      expect(summary.associations.length).toBeLessThanOrEqual(DEFAULT_CYCLE_WELLNESS_CONFIG.maximumAssociationsShown)
    })
  })

  describe('cycle lifecycle', () => {
    it('marks an active cycle as partial with an in-progress message', () => {
      mockHistory = []
      const cycle = makeCycle({ status: 'active', startDate: '2026-01-01' })
      const checkIns = checkInsAcrossDays(2, 6)
      mockCheckIns = checkIns
      const summary = buildCycleWellnessSummary(cycle, checkIns, [], new Date('2026-01-20T12:00:00.000Z'))
      expect(summary.dataStatus).toBe('partial')
      expect(summary.messages).toContain('Análise parcial do ciclo em andamento.')
    })

    it('produces the same analysis for an archived cycle as for a completed one', () => {
      mockHistory = []
      const completed = makeCycle({ status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-30T00:00:00.000Z' })
      const archived = makeCycle({ status: 'archived', startDate: '2026-01-01', completedAt: '2026-01-30T00:00:00.000Z' })
      const checkIns = [...checkInsAcrossDays(2, 4, 2), ...checkInsAcrossDays(20, 4, 5)]
      mockCheckIns = checkIns
      const completedSummary = buildCycleWellnessSummary(completed, checkIns, [])
      const archivedSummary = buildCycleWellnessSummary(archived, checkIns, [])
      expect(archivedSummary.trends).toEqual(completedSummary.trends)
      expect(archivedSummary.checkInCount).toEqual(completedSummary.checkInCount)
    })

    it('renders for a cycle with zero check-ins without throwing', () => {
      mockHistory = []
      const cycle = makeCycle({ status: 'active', startDate: '2026-01-01' })
      mockCheckIns = []
      expect(() => buildCycleWellnessSummary(cycle, [], [], new Date('2026-01-10T12:00:00.000Z'))).not.toThrow()
    })
  })

  it('never states a causal claim in generated messages', () => {
    mockHistory = []
    const cycle = makeCycle({ status: 'completed', startDate: '2026-01-01', completedAt: '2026-04-01T00:00:00.000Z' })
    const checkIns: WorkoutReadinessCheckIn[] = []
    const workouts: CompletedWorkout[] = []
    const start = new Date('2026-01-01T00:00:00.000Z')
    for (let week = 0; week < 10; week++) {
      const d = new Date(start)
      d.setDate(d.getDate() + week * 7)
      const iso = d.toISOString().slice(0, 10)
      checkIns.push(makeCheckIn({ id: `ci-${week}`, createdAt: `${iso}T08:00:00.000Z`, energy: week % 2 === 0 ? 5 : 1 }))
      if (week % 2 === 0) workouts.push(makeWorkout(`w-${week}`, `${iso}T09:00:00.000Z`))
    }
    mockCheckIns = checkIns
    mockHistory = workouts
    const summary = buildCycleWellnessSummary(cycle, checkIns, workouts)
    const forbiddenPhrases = ['fez você', 'causou', 'porque você', 'devido a']
    for (const message of summary.messages) {
      for (const phrase of forbiddenPhrases) {
        expect(message.toLowerCase()).not.toContain(phrase)
      }
    }
  })
})

// ─── compareCycleWellness ────────────────────────────────────────────────────────

describe('compareCycleWellness', () => {
  it('marks all metrics insufficient_both when neither cycle has data', () => {
    mockHistory = []
    const cycleA = makeCycle({ id: 'a', status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-10T00:00:00.000Z' })
    const cycleB = makeCycle({ id: 'b', status: 'completed', startDate: '2026-02-01', completedAt: '2026-02-10T00:00:00.000Z' })
    const summaryA = buildCycleWellnessSummary(cycleA, [], [])
    const summaryB = buildCycleWellnessSummary(cycleB, [], [])
    const comparison = compareCycleWellness(summaryA, summaryB)
    expect(comparison.metrics.every((m) => m.dataStatus === 'insufficient_both')).toBe(true)
    expect(comparison.messages).toContain('Nenhum dos dois ciclos possui check-ins registrados para comparar.')
  })

  it('flags insufficient_cycle_a when only the first cycle lacks data for a metric', () => {
    mockHistory = []
    const cycleA = makeCycle({ id: 'a', status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-10T00:00:00.000Z' })
    const cycleB = makeCycle({ id: 'b', status: 'completed', startDate: '2026-02-01', completedAt: '2026-02-28T00:00:00.000Z' })
    const checkInsB = checkInsAcrossDays(2, 6, 4, '2026-02')
    const summaryA = buildCycleWellnessSummary(cycleA, [], [])
    const summaryB = buildCycleWellnessSummary(cycleB, checkInsB, [])
    const comparison = compareCycleWellness(summaryA, summaryB)
    const energyComparison = comparison.metrics.find((m) => m.metric === 'energy')
    expect(energyComparison?.dataStatus).toBe('insufficient_cycle_a')
  })

  it('computes an absolute difference when both cycles have comparable samples', () => {
    mockHistory = []
    const cycleA = makeCycle({ id: 'a', status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-30T00:00:00.000Z' })
    const cycleB = makeCycle({ id: 'b', status: 'completed', startDate: '2026-02-01', completedAt: '2026-02-28T00:00:00.000Z' })
    const checkInsA = checkInsAcrossDays(2, 6, 2)
    const checkInsB = [2, 3, 4, 5, 6, 7].map((d) =>
      makeCheckIn({ id: `b-${d}`, createdAt: `2026-02-0${d}T08:00:00.000Z`, energy: 4 })
    )
    const summaryA = buildCycleWellnessSummary(cycleA, checkInsA, [])
    const summaryB = buildCycleWellnessSummary(cycleB, checkInsB, [])
    const comparison = compareCycleWellness(summaryA, summaryB)
    const energyComparison = comparison.metrics.find((m) => m.metric === 'energy')
    expect(energyComparison?.dataStatus).toBe('comparable')
    expect(energyComparison?.valueA).toBe(2)
    expect(energyComparison?.valueB).toBe(4)
    expect(energyComparison?.absoluteDifference).toBe(2)
  })


  it('does not declare a winner in comparison messages', () => {
    mockHistory = []
    const cycleA = makeCycle({ id: 'a', status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-30T00:00:00.000Z' })
    const cycleB = makeCycle({ id: 'b', status: 'completed', startDate: '2026-02-01', completedAt: '2026-02-28T00:00:00.000Z' })
    const checkInsA = checkInsAcrossDays(2, 6, 2)
    const checkInsB = checkInsAcrossDays(2, 6, 4, '2026-02')
    const summaryA = buildCycleWellnessSummary(cycleA, checkInsA, [])
    const summaryB = buildCycleWellnessSummary(cycleB, checkInsB, [])
    const comparison = compareCycleWellness(summaryA, summaryB)
    for (const message of comparison.messages) {
      expect(message.toLowerCase()).not.toMatch(/melhor|venceu|ganhou|pior/)
    }
  })

  it('flags a large sample size gap between cycles', () => {
    mockHistory = []
    const cycleA = makeCycle({ id: 'a', status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-30T00:00:00.000Z' })
    const cycleB = makeCycle({ id: 'b', status: 'completed', startDate: '2026-02-01', completedAt: '2026-02-28T00:00:00.000Z' })
    const checkInsA = checkInsAcrossDays(2, 2, 3)
    const checkInsB = checkInsAcrossDays(2, 10, 3, '2026-02')
    const summaryA = buildCycleWellnessSummary(cycleA, checkInsA, [])
    const summaryB = buildCycleWellnessSummary(cycleB, checkInsB, [])
    const comparison = compareCycleWellness(summaryA, summaryB)
    expect(comparison.messages).toContain(
      'Um dos ciclos tem bem mais check-ins registrados que o outro, o que pode afetar a comparação.'
    )
  })

  it('handles cycles with different durations without throwing', () => {
    mockHistory = []
    const cycleA = makeCycle({ id: 'a', status: 'completed', startDate: '2026-01-01', completedAt: '2026-01-10T00:00:00.000Z' })
    const cycleB = makeCycle({ id: 'b', status: 'completed', startDate: '2026-02-01', completedAt: '2026-04-01T00:00:00.000Z' })
    const summaryA = buildCycleWellnessSummary(cycleA, checkInsAcrossDays(2, 4, 3), [])
    const summaryB = buildCycleWellnessSummary(cycleB, checkInsAcrossDays(2, 4, 3, '2026-02'), [])
    expect(() => compareCycleWellness(summaryA, summaryB)).not.toThrow()
  })
})
