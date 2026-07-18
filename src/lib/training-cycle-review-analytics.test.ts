import { describe, it, expect } from 'vitest'
import { buildCycleReviewAnalytics } from './training-cycle-review-analytics'
import type { CycleReview } from './training-cycle-reviews'

function review(overrides: Partial<CycleReview>): CycleReview {
  return {
    id: 'review-1', cycleId: 'cycle-1', phase: 'manual', createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildCycleReviewAnalytics', () => {
  it('returns nulls and zero count for an empty review list', () => {
    const result = buildCycleReviewAnalytics([])
    expect(result.totalReviews).toBe(0)
    expect(result.averagePerceivedProgress).toBeNull()
    expect(result.averageSatisfaction).toBeNull()
    expect(result.lastReview).toBeNull()
    expect(result.satisfactionVariation).toBeNull()
  })

  it('averages scales across multiple reviews, ignoring missing fields', () => {
    const reviews = [
      review({ id: 'r1', createdAt: '2026-08-01T00:00:00.000Z', perceivedProgress: 4, satisfaction: 5 }),
      review({ id: 'r2', createdAt: '2026-08-15T00:00:00.000Z', perceivedProgress: 2 }),
    ]
    const result = buildCycleReviewAnalytics(reviews)
    expect(result.averagePerceivedProgress).toBe(3)
    expect(result.averageSatisfaction).toBe(5)
    expect(result.totalReviews).toBe(2)
  })

  it('identifies the last review by createdAt regardless of input order', () => {
    const reviews = [
      review({ id: 'r2', createdAt: '2026-08-15T00:00:00.000Z' }),
      review({ id: 'r1', createdAt: '2026-08-01T00:00:00.000Z' }),
    ]
    const result = buildCycleReviewAnalytics(reviews)
    expect(result.lastReview?.id).toBe('r2')
  })

  it('computes satisfaction variation between mid-cycle and end-cycle reviews', () => {
    const reviews = [
      review({ id: 'mid', phase: 'mid_cycle', createdAt: '2026-08-01T00:00:00.000Z', satisfaction: 3 }),
      review({ id: 'end', phase: 'end_cycle', createdAt: '2026-08-30T00:00:00.000Z', satisfaction: 5 }),
    ]
    const result = buildCycleReviewAnalytics(reviews)
    expect(result.satisfactionVariation).toBe(2)
  })

  it('leaves satisfaction variation null when either phase is missing', () => {
    const reviews = [review({ phase: 'mid_cycle', satisfaction: 3 })]
    const result = buildCycleReviewAnalytics(reviews)
    expect(result.satisfactionVariation).toBeNull()
  })

  it('picks the last end_cycle review if there are somehow multiple', () => {
    const reviews = [
      review({ id: 'end1', phase: 'end_cycle', createdAt: '2026-08-30T00:00:00.000Z', satisfaction: 2 }),
      review({ id: 'end2', phase: 'end_cycle', createdAt: '2026-09-01T00:00:00.000Z', satisfaction: 4 }),
    ]
    const result = buildCycleReviewAnalytics(reviews)
    expect(result.endCycleReview?.id).toBe('end2')
  })
})
