import { describe, it, expect, beforeEach } from 'vitest'
import { acceptProposal, expireStaleProposals, rejectProposal, reviewProposalLater } from './decisions'
import { getAdaptivePlanAuditTrail, resetAdaptivePlanning, saveAdaptivePlanProposal } from './storage'
import type { AdaptivePlanProposal } from './types'

const NOW = new Date('2026-07-26T12:00:00.000Z')

function makeProposal(overrides: Partial<AdaptivePlanProposal> = {}): AdaptivePlanProposal {
  return {
    id: 'adp-1',
    recommendationId: 'rec-1',
    ruleId: 'rule-1',
    category: 'volume',
    type: 'reduce_volume',
    target: { kind: 'planned_workout', plannedWorkoutId: 'pw-1', date: '2026-07-27' },
    status: 'draft',
    title: 'Reduzir volume',
    summary: 'x',
    before: { kind: 'none' },
    after: { kind: 'none' },
    changes: [],
    evidence: [],
    createdAt: '2026-07-25T00:00:00.000Z',
    expiresAt: '2026-08-09T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  resetAdaptivePlanning()
})

describe('acceptProposal', () => {
  it('moves an open proposal to accepted and records an audit entry', () => {
    saveAdaptivePlanProposal(makeProposal())
    const updated = acceptProposal('adp-1', NOW)
    expect(updated?.status).toBe('accepted')
    expect(updated?.reviewedAt).toBe(NOW.toISOString())
    expect(getAdaptivePlanAuditTrail()).toHaveLength(1)
    expect(getAdaptivePlanAuditTrail()[0].action).toBe('accepted')
  })

  it('returns null for a proposal that is already applied', () => {
    saveAdaptivePlanProposal(makeProposal({ status: 'applied' }))
    expect(acceptProposal('adp-1', NOW)).toBeNull()
  })

  it('returns null for a nonexistent proposal', () => {
    expect(acceptProposal('missing', NOW)).toBeNull()
  })
})

describe('rejectProposal', () => {
  it('moves an open proposal to rejected', () => {
    saveAdaptivePlanProposal(makeProposal())
    const updated = rejectProposal('adp-1', NOW)
    expect(updated?.status).toBe('rejected')
  })

  it('rejection is stable across reload — status stays rejected', () => {
    saveAdaptivePlanProposal(makeProposal())
    rejectProposal('adp-1', NOW)
    expect(rejectProposal('adp-1', NOW)).toBeNull() // already terminal, can't reject again
  })
})

describe('reviewProposalLater', () => {
  it('keeps the proposal open in reviewing status', () => {
    saveAdaptivePlanProposal(makeProposal())
    const updated = reviewProposalLater('adp-1', NOW)
    expect(updated?.status).toBe('reviewing')
  })
})

describe('expireStaleProposals', () => {
  it('expires open proposals past their expiry date', () => {
    saveAdaptivePlanProposal(makeProposal({ expiresAt: '2026-07-01T00:00:00.000Z' }))
    const count = expireStaleProposals(NOW)
    expect(count).toBe(1)
  })

  it('never touches proposals already decided', () => {
    saveAdaptivePlanProposal(makeProposal({ status: 'accepted', expiresAt: '2026-07-01T00:00:00.000Z' }))
    expect(expireStaleProposals(NOW)).toBe(0)
  })

  it('never expires a proposal still within its window', () => {
    saveAdaptivePlanProposal(makeProposal({ expiresAt: '2026-12-01T00:00:00.000Z' }))
    expect(expireStaleProposals(NOW)).toBe(0)
  })
})
