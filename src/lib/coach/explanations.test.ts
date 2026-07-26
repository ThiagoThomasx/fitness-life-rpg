import { describe, it, expect } from 'vitest'
import { buildExplanation, COACH_RULE_DESCRIPTIONS } from './explanations'
import { COACH_RULES } from './rules'
import type { CoachRecommendation } from './types'

function recommendation(overrides: Partial<CoachRecommendation> = {}): CoachRecommendation {
  return {
    id: 'Coach.Progress.Stagnation:30d:ex-1',
    ruleId: 'Coach.Progress.Stagnation',
    category: 'stagnation',
    priority: 'medium',
    confidence: 'high',
    title: 'Supino Inclinado sem evolução de carga',
    summary: 'resumo',
    evidence: ['evidência 1'],
    period: '30d',
    generatedAt: '2026-07-25T12:00:00.000Z',
    suggestion: 'sugestão',
    actions: [],
    status: 'nova',
    ...overrides,
  }
}

describe('buildExplanation', () => {
  it('answers all four required questions: title, evidence, rule applied, suggestion', () => {
    const rec = recommendation()
    const explanation = buildExplanation(rec)
    expect(explanation.title).toBe(rec.title)
    expect(explanation.summary).toBe(rec.summary)
    expect(explanation.evidence).toEqual(rec.evidence)
    expect(explanation.ruleApplied).toBe('Coach.Progress.Stagnation')
    expect(explanation.suggestion).toBe(rec.suggestion)
    expect(explanation.periodAnalyzed).toBe('últimos 30 dias')
  })
})

describe('COACH_RULE_DESCRIPTIONS completeness', () => {
  it('has a human-readable description for every registered rule id', () => {
    for (const rule of COACH_RULES) {
      expect(COACH_RULE_DESCRIPTIONS[rule.id], `missing description for ${rule.id}`).toBeTruthy()
    }
  })

  it('has no orphan descriptions for rules that no longer exist', () => {
    const ruleIds = new Set(COACH_RULES.map((r) => r.id))
    for (const id of Object.keys(COACH_RULE_DESCRIPTIONS)) {
      expect(ruleIds.has(id), `orphan description: ${id}`).toBe(true)
    }
  })
})
