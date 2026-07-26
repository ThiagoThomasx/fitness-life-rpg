import { describe, it, expect } from 'vitest'
import { buildAdaptiveProposal, buildMaintainPlanProposal, isProposalActionable } from './proposal-builder'
import type { CoachRecommendation } from '../coach/types'
import type { VolumeChangeSnapshot } from './types'

const NOW = new Date('2026-07-25T12:00:00.000Z')

function baseRecommendation(overrides: Partial<CoachRecommendation> = {}): CoachRecommendation {
  return {
    id: 'rec-1',
    ruleId: 'rule-volume-high',
    category: 'volume',
    priority: 'high',
    confidence: 'high',
    title: 'Volume acima do esperado',
    summary: 'O volume de pernas está acima do padrão recente.',
    evidence: ['Volume 20% acima da média das últimas 4 semanas'],
    period: '30d',
    generatedAt: NOW.toISOString(),
    suggestion: 'Reduza o volume da próxima sessão de pernas.',
    actions: [{ kind: 'workout', label: 'Ver treino', id: 'pw-1' }],
    status: 'nova',
    ...overrides,
  }
}

describe('buildAdaptiveProposal', () => {
  it('builds a draft proposal with diff, evidence and expiry copied from the recommendation', () => {
    const recommendation = baseRecommendation()
    const before: VolumeChangeSnapshot = {
      kind: 'volume',
      workoutId: 'w1',
      workoutName: 'Pernas',
      totalSets: 16,
      exercises: [{ exerciseId: 'leg-press', name: 'Leg Press', sets: 4 }],
    }
    const after: VolumeChangeSnapshot = { ...before, totalSets: 13, exercises: [{ exerciseId: 'leg-press', name: 'Leg Press', sets: 3 }] }

    const proposal = buildAdaptiveProposal({
      recommendation,
      type: 'reduce_volume',
      target: { kind: 'planned_workout', plannedWorkoutId: 'pw-1', date: '2026-07-26' },
      before,
      after,
      title: 'Reduzir volume de pernas',
      summary: recommendation.summary,
      now: NOW,
    })

    expect(proposal.status).toBe('draft')
    expect(proposal.recommendationId).toBe('rec-1')
    expect(proposal.ruleId).toBe('rule-volume-high')
    expect(proposal.category).toBe('volume')
    expect(proposal.evidence).toEqual(recommendation.evidence)
    expect(proposal.evidence).not.toBe(recommendation.evidence)
    expect(proposal.changes.length).toBeGreaterThan(0)
    expect(new Date(proposal.expiresAt!).getTime()).toBeGreaterThan(NOW.getTime())
    expect(proposal.id).toMatch(/^adp-rec-1-/)
  })

  it('respects a custom expiry window', () => {
    const proposal = buildAdaptiveProposal({
      recommendation: baseRecommendation(),
      type: 'maintain_plan',
      target: { kind: 'program', programId: 'prog-1' },
      before: { kind: 'none' },
      after: { kind: 'none' },
      title: 'x',
      summary: 'x',
      now: NOW,
      expiresInDays: 1,
    })
    const expiresAt = new Date(proposal.expiresAt!)
    expect(expiresAt.getTime() - NOW.getTime()).toBe(24 * 60 * 60 * 1000)
  })
})

describe('buildMaintainPlanProposal', () => {
  it('produces a proposal with no changes', () => {
    const proposal = buildMaintainPlanProposal(
      baseRecommendation({ category: 'consistency', title: 'Excelente consistência' }),
      { kind: 'program', programId: 'prog-1' },
      NOW
    )
    expect(proposal.type).toBe('maintain_plan')
    expect(proposal.changes).toEqual([])
    expect(proposal.before).toEqual({ kind: 'none' })
    expect(proposal.after).toEqual({ kind: 'none' })
  })
})

describe('isProposalActionable', () => {
  it('is true for categories with a specialized builder', () => {
    expect(isProposalActionable(baseRecommendation({ category: 'volume' }))).toBe(true)
    expect(isProposalActionable(baseRecommendation({ category: 'recovery' }))).toBe(true)
  })

  it('is false for categories without one yet, e.g. purely informational ones', () => {
    expect(isProposalActionable(baseRecommendation({ category: 'consistency' }))).toBe(false)
    expect(isProposalActionable(baseRecommendation({ category: 'records' }))).toBe(false)
  })
})
