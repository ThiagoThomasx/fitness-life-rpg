import { describe, it, expect, beforeEach } from 'vitest'
import {
  recordRecommendationDecision,
  getRecommendationDecisions,
  filterActiveRecommendations,
  resetRecommendationDecisions,
} from './adaptive-recommendation-decisions'

beforeEach(() => {
  window.localStorage.clear()
})

describe('recordRecommendationDecision', () => {
  it('persists a decision', () => {
    recordRecommendationDecision('reduce_volume:2026-W30', 'reduce_volume', 'accepted')
    expect(getRecommendationDecisions()).toHaveLength(1)
  })

  it('replaces a previous decision for the same recommendation id instead of stacking', () => {
    recordRecommendationDecision('reduce_volume:2026-W30', 'reduce_volume', 'review_later')
    recordRecommendationDecision('reduce_volume:2026-W30', 'reduce_volume', 'dismissed')
    const decisions = getRecommendationDecisions()
    expect(decisions).toHaveLength(1)
    expect(decisions[0].status).toBe('dismissed')
  })
})

describe('filterActiveRecommendations', () => {
  it('hides a dismissed recommendation', () => {
    recordRecommendationDecision('reduce_volume:2026-W30', 'reduce_volume', 'dismissed')
    const result = filterActiveRecommendations([{ id: 'reduce_volume:2026-W30' }, { id: 'maintain_plan:2026-W30' }])
    expect(result).toEqual([{ id: 'maintain_plan:2026-W30' }])
  })

  it('hides an already-accepted recommendation', () => {
    recordRecommendationDecision('insert_recovery:2026-W30', 'insert_recovery', 'accepted')
    const result = filterActiveRecommendations([{ id: 'insert_recovery:2026-W30' }])
    expect(result).toEqual([])
  })

  it('keeps a review_later recommendation visible', () => {
    recordRecommendationDecision('reduce_volume:2026-W30', 'reduce_volume', 'review_later')
    const result = filterActiveRecommendations([{ id: 'reduce_volume:2026-W30' }])
    expect(result).toEqual([{ id: 'reduce_volume:2026-W30' }])
  })
})

describe('resetRecommendationDecisions', () => {
  it('clears all decisions', () => {
    recordRecommendationDecision('reduce_volume:2026-W30', 'reduce_volume', 'accepted')
    resetRecommendationDecisions()
    expect(getRecommendationDecisions()).toEqual([])
  })
})
