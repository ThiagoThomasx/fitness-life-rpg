import { describe, it, expect } from 'vitest'
import { buildRescheduleProposal } from './reschedule-proposals'
import type { CoachRecommendation } from '../coach/types'
import type { PlannedWorkout } from '../planned-workouts'

const NOW = new Date('2026-07-25T12:00:00.000Z')

function recommendation(): CoachRecommendation {
  return {
    id: 'rec-1',
    ruleId: 'rule-recovery-low',
    category: 'recovery',
    priority: 'high',
    confidence: 'high',
    title: 'Recuperação baixa',
    summary: 'readiness baixo e recuperação incompleta',
    evidence: ['Readiness abaixo de 40% nos últimos 2 dias'],
    period: '30d',
    generatedAt: NOW.toISOString(),
    suggestion: 'Reagende o treino.',
    actions: [],
    status: 'nova',
  }
}

function plannedWorkout(overrides: Partial<PlannedWorkout> = {}): PlannedWorkout {
  return {
    id: 'pw-1',
    date: '2026-07-25',
    weekday: 6,
    name: 'Pernas',
    status: 'pending',
    isOptional: false,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    templateSnapshot: { name: 'Pernas', capturedAt: '2026-07-20T00:00:00.000Z', exerciseBlocks: [] },
    ...overrides,
  }
}

describe('buildRescheduleProposal', () => {
  it('builds a proposal moving the workout to a new date, preserving the original', () => {
    const proposal = buildRescheduleProposal(recommendation(), plannedWorkout(), '2026-07-26', NOW)
    expect(proposal).not.toBeNull()
    expect(proposal!.type).toBe('reschedule_workout')
    expect(proposal!.before).toMatchObject({ date: '2026-07-25' })
    expect(proposal!.after).toMatchObject({ date: '2026-07-26' })
    expect(proposal!.changes).toEqual([
      expect.objectContaining({ kind: 'date_changed', before: '2026-07-25', after: '2026-07-26' }),
    ])
  })

  it('mentions conflicts in the summary without blocking the proposal', () => {
    const proposal = buildRescheduleProposal(recommendation(), plannedWorkout(), '2026-07-26', NOW, {
      conflictingWorkoutNames: ['Peito e Tríceps'],
    })
    expect(proposal!.summary).toMatch(/Peito e Tríceps/)
  })

  it('returns null when the workout is not pending', () => {
    expect(buildRescheduleProposal(recommendation(), plannedWorkout({ status: 'in_progress' }), '2026-07-26', NOW)).toBeNull()
    expect(buildRescheduleProposal(recommendation(), plannedWorkout({ status: 'done' }), '2026-07-26', NOW)).toBeNull()
  })

  it('returns null when the target date is the same as the original', () => {
    expect(buildRescheduleProposal(recommendation(), plannedWorkout(), '2026-07-25', NOW)).toBeNull()
  })
})
