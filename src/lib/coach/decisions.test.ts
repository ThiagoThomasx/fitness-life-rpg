import { describe, it, expect, beforeEach } from 'vitest'
import { getCoachDecisions, recordCoachDecision, resetCoachDecisions } from './decisions'

beforeEach(() => {
  resetCoachDecisions()
})

describe('coach decisions persistence', () => {
  it('starts empty', () => {
    expect(getCoachDecisions()).toEqual([])
  })

  it('records a decision and persists it', () => {
    recordCoachDecision('rec-1', 'aceita')
    const decisions = getCoachDecisions()
    expect(decisions).toHaveLength(1)
    expect(decisions[0].recommendationId).toBe('rec-1')
    expect(decisions[0].status).toBe('aceita')
  })

  it('is idempotent: deciding again on the same id replaces, never stacks', () => {
    recordCoachDecision('rec-1', 'visualizada')
    recordCoachDecision('rec-1', 'ignorada')
    const decisions = getCoachDecisions()
    expect(decisions).toHaveLength(1)
    expect(decisions[0].status).toBe('ignorada')
  })

  it('tracks multiple independent recommendation ids', () => {
    recordCoachDecision('rec-1', 'aceita')
    recordCoachDecision('rec-2', 'ignorada')
    expect(getCoachDecisions()).toHaveLength(2)
  })

  it('reset clears all decisions', () => {
    recordCoachDecision('rec-1', 'aceita')
    resetCoachDecisions()
    expect(getCoachDecisions()).toEqual([])
  })
})
