import { describe, it, expect } from 'vitest'
import { generateAdaptiveRecommendations, type AdaptiveRecommendationInput } from './adaptive-recommendations'
import type { ReadinessStats } from './workout-readiness'

function baseInput(overrides: Partial<AdaptiveRecommendationInput> = {}): AdaptiveRecommendationInput {
  return {
    windowKey: '2026-W30',
    plannedSessionsInWindow: 4,
    skippedSessionsInWindow: 0,
    ...overrides,
  }
}

function readinessStats(overrides: Partial<ReadinessStats> = {}): ReadinessStats {
  return {
    totalCheckIns: 4,
    averageEnergy: 4,
    averageSleep: 4,
    averageSoreness: 2,
    averageMotivation: 4,
    highReadinessCount: 3,
    moderateReadinessCount: 1,
    lowReadinessCount: 0,
    ...overrides,
  }
}

describe('generateAdaptiveRecommendations', () => {
  it('recommends maintaining the plan when adherence and volume are both high', () => {
    const result = generateAdaptiveRecommendations(baseInput({ programAdherenceRate: 1, volumeCompletionRate: 0.96 }))
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('maintain_plan')
    expect(result[0].severity).toBe('info')
  })

  it('recommends reducing volume when execution falls below 70%', () => {
    const result = generateAdaptiveRecommendations(baseInput({ volumeCompletionRate: 0.6 }))
    expect(result.some((r) => r.type === 'reduce_volume')).toBe(true)
  })

  it('recommends reducing frequency when more than 40% of sessions were skipped', () => {
    const result = generateAdaptiveRecommendations(
      baseInput({ plannedSessionsInWindow: 5, skippedSessionsInWindow: 3 })
    )
    expect(result.some((r) => r.type === 'reduce_frequency')).toBe(true)
  })

  it('recommends inserting recovery when readiness is mostly low', () => {
    const result = generateAdaptiveRecommendations(
      baseInput({ readinessStats: readinessStats({ lowReadinessCount: 3, totalCheckIns: 4 }) })
    )
    const rec = result.find((r) => r.type === 'insert_recovery')
    expect(rec).toBeDefined()
    expect(rec?.severity).toBe('important')
  })

  it('recommends inserting recovery when average soreness is elevated even with mostly high readiness', () => {
    const result = generateAdaptiveRecommendations(
      baseInput({ readinessStats: readinessStats({ averageSoreness: 4.5, lowReadinessCount: 0 }) })
    )
    expect(result.some((r) => r.type === 'insert_recovery')).toBe(true)
  })

  it('recommends reviewing a recurring substitution', () => {
    const result = generateAdaptiveRecommendations(
      baseInput({ recurringSubstitutions: [{ exerciseName: 'Supino Inclinado', count: 3 }] })
    )
    const rec = result.find((r) => r.type === 'review_exercise')
    expect(rec).toBeDefined()
    expect(rec?.title).toContain('Supino Inclinado')
  })

  it('does not recommend reviewing a substitution below the recurrence threshold', () => {
    const result = generateAdaptiveRecommendations(
      baseInput({ recurringSubstitutions: [{ exerciseName: 'Supino Inclinado', count: 2 }] })
    )
    expect(result.some((r) => r.type === 'review_exercise')).toBe(false)
  })

  it('returns no recommendations when there is insufficient data', () => {
    const result = generateAdaptiveRecommendations(baseInput({ plannedSessionsInWindow: 1 }))
    expect(result).toEqual([])
  })

  it('produces a stable, deterministic id for the same window and condition', () => {
    const a = generateAdaptiveRecommendations(baseInput({ volumeCompletionRate: 0.5 }))
    const b = generateAdaptiveRecommendations(baseInput({ volumeCompletionRate: 0.5 }))
    expect(a[0].id).toBe(b[0].id)
  })
})
