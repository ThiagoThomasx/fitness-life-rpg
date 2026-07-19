import { describe, it, expect } from 'vitest'
import {
  computeWellnessTrainingAssociation,
  computeAllWellnessTrainingAssociations,
  isReadinessCompositionMetric,
  READINESS_COMPOSITION_NOTE,
  DEFAULT_WELLNESS_ASSOCIATION_CONFIG,
} from './wellness-associations'
import type { WorkoutReadinessCheckIn } from './readiness-check-ins'
import type { WeekSummary } from './training-load'

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

// Monday-aligned week-start dates (getWeekStart is Monday-based).
const WEEK_1 = '2026-07-06'
const WEEK_2 = '2026-07-13'
const WEEK_3 = '2026-07-20'
const WEEK_4 = '2026-07-27'
const WEEK_5 = '2026-08-03'
const WEEK_6 = '2026-08-10'

describe('computeWellnessTrainingAssociation', () => {
  it('returns insufficient_data (low confidence, unclear direction) below minimum weeks', () => {
    const result = computeWellnessTrainingAssociation(
      'stress',
      'frequency',
      [checkIn({ createdAt: `${WEEK_1}T08:00:00.000Z`, stress: 3 })],
      [weekSummary({ startDate: WEEK_1, totalSessions: 3 })]
    )
    expect(result.direction).toBe('unclear')
    expect(result.confidence).toBe('low')
    expect(result.sampleSize).toBe(1)
  })

  it('finds a positive association when frequency clearly differs by wellness group', () => {
    const checkIns = [
      checkIn({ createdAt: `${WEEK_1}T08:00:00.000Z`, stress: 5 }),
      checkIn({ createdAt: `${WEEK_2}T08:00:00.000Z`, stress: 5 }),
      checkIn({ createdAt: `${WEEK_3}T08:00:00.000Z`, stress: 1 }),
      checkIn({ createdAt: `${WEEK_4}T08:00:00.000Z`, stress: 1 }),
    ]
    const summaries = [
      weekSummary({ startDate: WEEK_1, totalSessions: 1 }),
      weekSummary({ startDate: WEEK_2, totalSessions: 1 }),
      weekSummary({ startDate: WEEK_3, totalSessions: 5 }),
      weekSummary({ startDate: WEEK_4, totalSessions: 5 }),
    ]
    const result = computeWellnessTrainingAssociation('stress', 'frequency', checkIns, summaries)
    expect(result.direction).toBe('negative')
    expect(result.summary).not.toMatch(/causou|prova|deve/i)
    expect(result.explanation).toContain('No seu histórico')
  })

  it('reports a neutral direction when the difference is small', () => {
    const checkIns = [WEEK_1, WEEK_2, WEEK_3, WEEK_4].map((w) =>
      checkIn({ createdAt: `${w}T08:00:00.000Z`, mood: 3 })
    )
    const summaries = [WEEK_1, WEEK_2, WEEK_3, WEEK_4].map((w) =>
      weekSummary({ startDate: w, totalVolumeKg: 1000 })
    )
    const result = computeWellnessTrainingAssociation('mood', 'volume', checkIns, summaries)
    expect(result.direction).toBe('neutral')
  })

  it('classifies confidence as high with a large sample and a large difference', () => {
    const weeks = [WEEK_1, WEEK_2, WEEK_3, WEEK_4, WEEK_5, WEEK_6, '2026-08-17', '2026-08-24']
    const checkIns = weeks.map((w, i) =>
      checkIn({ createdAt: `${w}T08:00:00.000Z`, energy: i < 4 ? 1 : 5 })
    )
    const summaries = weeks.map((w, i) =>
      weekSummary({ startDate: w, totalVolumeKg: i < 4 ? 100 : 1000 })
    )
    const result = computeWellnessTrainingAssociation(
      'energy',
      'volume',
      checkIns,
      summaries,
      DEFAULT_WELLNESS_ASSOCIATION_CONFIG
    )
    expect(result.direction).toBe('positive')
    expect(result.confidence).toBe('high')
  })

  it('computes the adjustments ratio safely when a week has zero sessions', () => {
    const checkIns = [WEEK_1, WEEK_2, WEEK_3, WEEK_4].map((w) =>
      checkIn({ createdAt: `${w}T08:00:00.000Z`, soreness: 3 })
    )
    const summaries = [WEEK_1, WEEK_2, WEEK_3, WEEK_4].map((w) =>
      weekSummary({ startDate: w, totalSessions: 0, adjustedSessions: 0 })
    )
    const result = computeWellnessTrainingAssociation('soreness', 'adjustments', checkIns, summaries)
    expect(Number.isFinite(result.sampleSize)).toBe(true)
    expect(result.direction).not.toBe(undefined)
  })

  it('only pairs weeks present in both wellness and training data', () => {
    const checkIns = [WEEK_1, WEEK_2, WEEK_3, WEEK_4, WEEK_5].map((w) =>
      checkIn({ createdAt: `${w}T08:00:00.000Z`, stress: 3 })
    )
    // Only 3 of the 5 weeks have training data.
    const summaries = [WEEK_1, WEEK_2, WEEK_3].map((w) => weekSummary({ startDate: w, totalSessions: 2 }))
    const result = computeWellnessTrainingAssociation('stress', 'frequency', checkIns, summaries)
    expect(result.sampleSize).toBe(3)
  })
})

describe('computeAllWellnessTrainingAssociations', () => {
  it('produces one association per wellness metric × training metric combination', () => {
    const results = computeAllWellnessTrainingAssociations([], [])
    expect(results).toHaveLength(7 * 3)
    expect(new Set(results.map((r) => r.id)).size).toBe(results.length)
  })
})

describe('readiness composition guard', () => {
  it('flags energy, soreness, sleepQuality, and motivation as composition metrics', () => {
    expect(isReadinessCompositionMetric('energy')).toBe(true)
    expect(isReadinessCompositionMetric('soreness')).toBe(true)
    expect(isReadinessCompositionMetric('sleepQuality')).toBe(true)
    expect(isReadinessCompositionMetric('motivation')).toBe(true)
  })

  it('does not flag stress, mood, or sleepHours (not part of the readiness score)', () => {
    expect(isReadinessCompositionMetric('stress')).toBe(false)
    expect(isReadinessCompositionMetric('mood')).toBe(false)
    expect(isReadinessCompositionMetric('sleepHours')).toBe(false)
  })

  it('exposes a fixed non-causal composition note', () => {
    expect(READINESS_COMPOSITION_NOTE).not.toMatch(/causou|prova|deve/i)
  })
})
