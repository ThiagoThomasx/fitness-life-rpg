import { describe, it, expect, beforeEach } from 'vitest'
import {
  createCycleReview,
  updateCycleReview,
  deleteCycleReview,
  getCycleReviews,
  getReviewsByCycle,
  getReviewById,
  importCycleReviews,
  isMidCycleReviewAvailable,
} from './training-cycle-reviews'

beforeEach(() => {
  window.localStorage.clear()
})

describe('createCycleReview', () => {
  it('creates a review with the given fields', () => {
    const result = createCycleReview({
      cycleId: 'cycle-1', phase: 'mid_cycle', perceivedProgress: 4, perceivedRecovery: 3, satisfaction: 5,
    })
    expect(result.ok).toBe(true)
    expect(result.review?.cycleId).toBe('cycle-1')
    expect(result.review?.phase).toBe('mid_cycle')
    expect(result.review?.perceivedProgress).toBe(4)
  })

  it('rejects a review without a cycleId', () => {
    const result = createCycleReview({ cycleId: '', phase: 'manual' })
    expect(result.ok).toBe(false)
  })

  it('allows a review with no scales, only notes', () => {
    const result = createCycleReview({ cycleId: 'cycle-1', phase: 'end_cycle', notes: 'Boa fase' })
    expect(result.ok).toBe(true)
    expect(result.review?.notes).toBe('Boa fase')
  })

  it('allows multiple manual reviews for the same cycle', () => {
    createCycleReview({ cycleId: 'cycle-1', phase: 'manual' })
    createCycleReview({ cycleId: 'cycle-1', phase: 'manual' })
    expect(getReviewsByCycle('cycle-1')).toHaveLength(2)
  })
})

describe('getReviewsByCycle', () => {
  it('returns only reviews for the given cycle, oldest first', async () => {
    createCycleReview({ cycleId: 'cycle-1', phase: 'mid_cycle' })
    createCycleReview({ cycleId: 'cycle-2', phase: 'mid_cycle' })
    await new Promise((r) => setTimeout(r, 2))
    createCycleReview({ cycleId: 'cycle-1', phase: 'end_cycle' })

    const reviews = getReviewsByCycle('cycle-1')
    expect(reviews).toHaveLength(2)
    expect(reviews[0].phase).toBe('mid_cycle')
    expect(reviews[1].phase).toBe('end_cycle')
  })

  it('returns an empty array when no reviews exist for the cycle', () => {
    expect(getReviewsByCycle('missing')).toEqual([])
  })
})

describe('getReviewById', () => {
  it('finds a review by id', () => {
    const review = createCycleReview({ cycleId: 'cycle-1', phase: 'manual' }).review!
    expect(getReviewById(review.id)?.cycleId).toBe('cycle-1')
  })

  it('returns null for an unknown id', () => {
    expect(getReviewById('missing')).toBeNull()
  })
})

describe('updateCycleReview', () => {
  it('updates editable fields', () => {
    const review = createCycleReview({ cycleId: 'cycle-1', phase: 'manual' }).review!
    const updated = updateCycleReview(review.id, { satisfaction: 5, notes: 'Atualizado' })
    expect(updated?.satisfaction).toBe(5)
    expect(updated?.notes).toBe('Atualizado')
  })

  it('returns null for an unknown id', () => {
    expect(updateCycleReview('missing', { satisfaction: 5 })).toBeNull()
  })
})

describe('deleteCycleReview', () => {
  it('removes an existing review', () => {
    const review = createCycleReview({ cycleId: 'cycle-1', phase: 'manual' }).review!
    expect(deleteCycleReview(review.id)).toBe(true)
    expect(getCycleReviews()).toHaveLength(0)
  })

  it('returns false for an unknown id', () => {
    expect(deleteCycleReview('missing')).toBe(false)
  })
})

describe('isMidCycleReviewAvailable', () => {
  it('is false without a planned duration', () => {
    expect(isMidCycleReviewAvailable(undefined, 3, [])).toBe(false)
  })

  it('is false before reaching the halfway point', () => {
    expect(isMidCycleReviewAvailable(6, 2, [])).toBe(false)
  })

  it('is true once halfway is reached with no mid-cycle review yet', () => {
    expect(isMidCycleReviewAvailable(6, 3, [])).toBe(true)
  })

  it('is false once a mid-cycle review already exists', () => {
    const existing = createCycleReview({ cycleId: 'cycle-1', phase: 'mid_cycle' }).review!
    expect(isMidCycleReviewAvailable(6, 4, [existing])).toBe(false)
  })

  it('is unaffected by manual or end-cycle reviews', () => {
    const manual = createCycleReview({ cycleId: 'cycle-1', phase: 'manual' }).review!
    expect(isMidCycleReviewAvailable(6, 3, [manual])).toBe(true)
  })
})

describe('importCycleReviews', () => {
  it('imports valid reviews and skips invalid/duplicate ones', () => {
    const existing = createCycleReview({ cycleId: 'cycle-1', phase: 'manual' }).review!
    const result = importCycleReviews([
      existing,
      { id: 'review-x', cycleId: 'cycle-2', phase: 'mid_cycle', createdAt: 'x' },
      { id: 'invalid' },
      { id: 'review-y', cycleId: 'cycle-2', phase: 'mid_cycle', createdAt: 'x', perceivedProgress: 9 },
    ])
    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(3)
    expect(getCycleReviews()).toHaveLength(2)
  })

  it('handles non-array input gracefully', () => {
    const result = importCycleReviews('not-an-array' as unknown as unknown[])
    expect(result).toEqual({ imported: 0, skipped: 0 })
  })
})
