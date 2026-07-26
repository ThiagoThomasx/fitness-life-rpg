import { describe, it, expect } from 'vitest'
import { buildAdjustFrequencyProposal } from './frequency-proposals'
import type { CoachRecommendation } from '../coach/types'
import type { TrainingProgram } from '../training-programs'

const NOW = new Date('2026-07-26T12:00:00.000Z')

function recommendation(): CoachRecommendation {
  return {
    id: 'rec-1',
    ruleId: 'rule-consistency-low',
    category: 'frequency',
    priority: 'medium',
    confidence: 'medium',
    title: 'Aderência abaixo do planejado',
    summary: 'Aderência real: 3,1 sessões por semana.',
    evidence: ['Aderência média de 3.1 sessões/semana nas últimas 4 semanas'],
    period: '30d',
    generatedAt: NOW.toISOString(),
    suggestion: 'Adapte a frequência das próximas semanas.',
    actions: [],
    status: 'nova',
  }
}

function program(overrides: Partial<TrainingProgram> = {}): TrainingProgram {
  return {
    id: 'prog-1',
    name: 'Programa A',
    weeks: [],
    tags: [],
    isFavorite: false,
    isArchived: false,
    version: 2,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildAdjustFrequencyProposal', () => {
  it('builds a proposal adjusting sessions per week, pinning the program version', () => {
    const proposal = buildAdjustFrequencyProposal(
      recommendation(),
      { program: program(), currentSessionsPerWeek: 5, averageAdherenceSessionsPerWeek: 3.1, proposedSessionsPerWeek: 4 },
      NOW
    )
    expect(proposal).not.toBeNull()
    expect(proposal!.type).toBe('adjust_frequency')
    expect(proposal!.target).toEqual({ kind: 'program', programId: 'prog-1', programVersion: 2 })
    expect(proposal!.before).toMatchObject({ sessionsPerWeek: 5 })
    expect(proposal!.after).toMatchObject({ sessionsPerWeek: 4 })
    expect(proposal!.changes).toEqual([
      expect.objectContaining({ kind: 'frequency_changed', before: 5, after: 4 }),
    ])
  })

  it('returns null for an archived program', () => {
    expect(
      buildAdjustFrequencyProposal(
        recommendation(),
        { program: program({ isArchived: true }), currentSessionsPerWeek: 5, averageAdherenceSessionsPerWeek: 3.1, proposedSessionsPerWeek: 4 },
        NOW
      )
    ).toBeNull()
  })

  it('returns null when the proposed frequency equals the current one', () => {
    expect(
      buildAdjustFrequencyProposal(
        recommendation(),
        { program: program(), currentSessionsPerWeek: 4, averageAdherenceSessionsPerWeek: 3.1, proposedSessionsPerWeek: 4 },
        NOW
      )
    ).toBeNull()
  })

  it('returns null when the proposed frequency is less than 1', () => {
    expect(
      buildAdjustFrequencyProposal(
        recommendation(),
        { program: program(), currentSessionsPerWeek: 1, averageAdherenceSessionsPerWeek: 0.2, proposedSessionsPerWeek: 0 },
        NOW
      )
    ).toBeNull()
  })
})
