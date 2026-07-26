import { describe, it, expect, beforeEach } from 'vitest'
import {
  appendAdaptivePlanAuditEntry,
  getAdaptivePlanAuditTrail,
  getAdaptivePlanProposalById,
  getAdaptivePlanProposalByRecommendationId,
  getAdaptivePlanProposals,
  importAdaptivePlanProposals,
  resetAdaptivePlanAuditTrail,
  resetAdaptivePlanning,
  resetAdaptivePlanProposals,
  saveAdaptivePlanProposal,
  updateAdaptivePlanProposal,
} from './storage'
import type { AdaptiveAuditEntry, AdaptivePlanProposal } from './types'

function makeProposal(overrides: Partial<AdaptivePlanProposal> = {}): AdaptivePlanProposal {
  return {
    id: 'adp-1',
    recommendationId: 'rec-1',
    ruleId: 'rule-1',
    category: 'volume',
    type: 'reduce_volume',
    target: { kind: 'planned_workout', plannedWorkoutId: 'pw-1', date: '2026-07-26' },
    status: 'draft',
    title: 'Reduzir volume',
    summary: 'x',
    before: { kind: 'none' },
    after: { kind: 'none' },
    changes: [],
    evidence: [],
    createdAt: '2026-07-25T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  resetAdaptivePlanning()
})

describe('adaptive-planning proposal storage', () => {
  it('starts empty', () => {
    expect(getAdaptivePlanProposals()).toEqual([])
  })

  it('saves and retrieves a proposal by id and by recommendation id', () => {
    saveAdaptivePlanProposal(makeProposal())
    expect(getAdaptivePlanProposalById('adp-1')?.recommendationId).toBe('rec-1')
    expect(getAdaptivePlanProposalByRecommendationId('rec-1')?.id).toBe('adp-1')
  })

  it('updates a proposal in place, preserving its id', () => {
    saveAdaptivePlanProposal(makeProposal())
    const updated = updateAdaptivePlanProposal('adp-1', { status: 'accepted' })
    expect(updated?.status).toBe('accepted')
    expect(getAdaptivePlanProposals()).toHaveLength(1)
  })

  it('returns null when updating a proposal that does not exist', () => {
    expect(updateAdaptivePlanProposal('missing', { status: 'accepted' })).toBeNull()
  })

  it('reset clears all proposals', () => {
    saveAdaptivePlanProposal(makeProposal())
    resetAdaptivePlanProposals()
    expect(getAdaptivePlanProposals()).toEqual([])
  })

  it('imports proposals, skipping duplicates and invalid entries', () => {
    saveAdaptivePlanProposal(makeProposal())
    const result = importAdaptivePlanProposals([makeProposal(), makeProposal({ id: 'adp-2' }), { bogus: true }])
    expect(result).toEqual({ imported: 1, skipped: 2 })
    expect(getAdaptivePlanProposals()).toHaveLength(2)
  })
})

describe('adaptive-planning audit trail', () => {
  const entry: AdaptiveAuditEntry = {
    id: 'adp-audit-1',
    proposalId: 'adp-1',
    recommendationId: 'rec-1',
    ruleId: 'rule-1',
    action: 'accepted',
    targetSummary: 'Treino de pernas',
    changesSummary: ['Leg Press: 4 → 3'],
    createdAt: '2026-07-25T00:00:00.000Z',
  }

  it('starts empty', () => {
    expect(getAdaptivePlanAuditTrail()).toEqual([])
  })

  it('appends entries without overwriting previous ones', () => {
    appendAdaptivePlanAuditEntry(entry)
    appendAdaptivePlanAuditEntry({ ...entry, id: 'adp-audit-2', action: 'applied' })
    expect(getAdaptivePlanAuditTrail()).toHaveLength(2)
  })

  it('reset clears the audit trail independently of proposals', () => {
    saveAdaptivePlanProposal(makeProposal())
    appendAdaptivePlanAuditEntry(entry)
    resetAdaptivePlanAuditTrail()
    expect(getAdaptivePlanAuditTrail()).toEqual([])
    expect(getAdaptivePlanProposals()).toHaveLength(1)
  })

  it('resetAdaptivePlanning clears both proposals and audit trail', () => {
    saveAdaptivePlanProposal(makeProposal())
    appendAdaptivePlanAuditEntry(entry)
    resetAdaptivePlanning()
    expect(getAdaptivePlanProposals()).toEqual([])
    expect(getAdaptivePlanAuditTrail()).toEqual([])
  })
})
