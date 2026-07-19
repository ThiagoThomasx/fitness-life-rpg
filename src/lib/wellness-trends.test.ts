import { describe, it, expect } from 'vitest'
import {
  summarizeWellnessTrends,
  computeSleepEnergyAssociation,
  computeStressFrequencyAssociation,
  DEFAULT_WELLNESS_ASSOCIATION_CONFIG,
} from './wellness-trends'
import type { WorkoutReadinessCheckIn } from './readiness-check-ins'
import type { CompletedWorkout } from './workout-history'

function checkIn(overrides: Partial<WorkoutReadinessCheckIn> & { createdAt: string }): WorkoutReadinessCheckIn {
  return {
    id: `c-${overrides.createdAt}`,
    energy: 3,
    soreness: 3,
    sleepQuality: 3,
    motivation: 3,
    ...overrides,
  }
}

function workout(completedAt: string): CompletedWorkout {
  return {
    id: `w-${completedAt}`,
    workoutId: 'wk-1',
    workoutName: 'Treino A',
    workoutColor: '#000',
    category: 'push',
    startedAt: completedAt,
    completedAt,
    durationSeconds: 3000,
    xpEarned: 50,
    exercises: [],
    prsCount: 0,
  }
}

describe('summarizeWellnessTrends', () => {
  it('returns insufficient_data for metrics never recorded', () => {
    const summaries = summarizeWellnessTrends([checkIn({ createdAt: '2026-08-01T08:00:00.000Z' })])
    const stress = summaries.find((s) => s.metric === 'stress')
    expect(stress?.trend).toBe('insufficient_data')
  })

  it('summarizes energy present in every check-in', () => {
    const checkIns = [
      checkIn({ createdAt: '2026-08-01T08:00:00.000Z', energy: 2 }),
      checkIn({ createdAt: '2026-08-02T08:00:00.000Z', energy: 3 }),
      checkIn({ createdAt: '2026-08-03T08:00:00.000Z', energy: 4 }),
    ]
    const summaries = summarizeWellnessTrends(checkIns)
    const energy = summaries.find((s) => s.metric === 'energy')
    expect(energy?.sampleSize).toBe(3)
    expect(energy?.average).toBeCloseTo(3)
  })
})

describe('computeSleepEnergyAssociation', () => {
  it('reports insufficient_data below the minimum paired samples', () => {
    const result = computeSleepEnergyAssociation([checkIn({ createdAt: '2026-08-01T08:00:00.000Z', sleepHours: 7 })])
    expect(result.status).toBe('insufficient_data')
  })

  it('finds an association when energy clearly differs by sleep group', () => {
    const checkIns = [
      checkIn({ createdAt: '2026-08-01T08:00:00.000Z', sleepHours: 5, energy: 2 }),
      checkIn({ createdAt: '2026-08-02T08:00:00.000Z', sleepHours: 5, energy: 2 }),
      checkIn({ createdAt: '2026-08-03T08:00:00.000Z', sleepHours: 5, energy: 1 }),
      checkIn({ createdAt: '2026-08-04T08:00:00.000Z', sleepHours: 5.5, energy: 2 }),
      checkIn({ createdAt: '2026-08-05T08:00:00.000Z', sleepHours: 8, energy: 5 }),
      checkIn({ createdAt: '2026-08-06T08:00:00.000Z', sleepHours: 8, energy: 4 }),
      checkIn({ createdAt: '2026-08-07T08:00:00.000Z', sleepHours: 8.5, energy: 5 }),
      checkIn({ createdAt: '2026-08-08T08:00:00.000Z', sleepHours: 9, energy: 5 }),
    ]
    const result = computeSleepEnergyAssociation(checkIns, DEFAULT_WELLNESS_ASSOCIATION_CONFIG)
    expect(result.status).toBe('association_found')
    expect(result.message).toContain('No seu histórico')
    expect(result.message).not.toMatch(/causou|porque/i)
  })

  it('reports no_clear_association when the difference is small', () => {
    const checkIns = Array.from({ length: 8 }, (_, i) =>
      checkIn({ createdAt: `2026-08-0${i + 1}T08:00:00.000Z`, sleepHours: 6 + (i % 2), energy: 3 })
    )
    const result = computeSleepEnergyAssociation(checkIns)
    expect(result.status).toBe('no_clear_association')
  })
})

describe('computeStressFrequencyAssociation', () => {
  it('reports insufficient_data below the minimum weeks', () => {
    const result = computeStressFrequencyAssociation(
      [checkIn({ createdAt: '2026-08-03T08:00:00.000Z', stress: 4 })],
      []
    )
    expect(result.status).toBe('insufficient_data')
  })

  it('finds an association when session frequency clearly differs by stress group', () => {
    const checkIns = [
      checkIn({ createdAt: '2026-07-06T08:00:00.000Z', stress: 5 }), // low-frequency week
      checkIn({ createdAt: '2026-07-13T08:00:00.000Z', stress: 5 }),
      checkIn({ createdAt: '2026-07-20T08:00:00.000Z', stress: 1 }), // high-frequency week
      checkIn({ createdAt: '2026-07-27T08:00:00.000Z', stress: 1 }),
    ]
    const workouts = [
      workout('2026-07-20T10:00:00.000Z'),
      workout('2026-07-21T10:00:00.000Z'),
      workout('2026-07-22T10:00:00.000Z'),
      workout('2026-07-27T10:00:00.000Z'),
      workout('2026-07-28T10:00:00.000Z'),
      workout('2026-07-29T10:00:00.000Z'),
    ]
    const result = computeStressFrequencyAssociation(checkIns, workouts, DEFAULT_WELLNESS_ASSOCIATION_CONFIG)
    expect(result.status).toBe('association_found')
    expect(result.message).not.toMatch(/causou|porque/i)
  })
})
