import { describe, it, expect } from 'vitest'
import { buildReplaceExerciseProposal } from './exercise-replace-proposals'
import type { CoachRecommendation } from '../coach/types'
import type { PlannedWorkout } from '../planned-workouts'

const NOW = new Date('2026-07-26T12:00:00.000Z')

function recommendation(): CoachRecommendation {
  return {
    id: 'rec-1',
    ruleId: 'rule-stagnation',
    category: 'stagnation',
    priority: 'low',
    confidence: 'medium',
    title: 'Substituição recorrente detectada',
    summary: 'Supino Inclinado foi substituído recorrentemente.',
    evidence: ['Substituído em 4 das últimas 5 sessões'],
    period: '30d',
    generatedAt: NOW.toISOString(),
    suggestion: 'Considere atualizar o exercício futuro.',
    actions: [],
    status: 'nova',
  }
}

function plannedWorkout(overrides: Partial<PlannedWorkout> = {}): PlannedWorkout {
  return {
    id: 'pw-1',
    date: '2026-07-27',
    weekday: 1,
    name: 'Peito',
    status: 'pending',
    isOptional: false,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    templateSnapshot: { name: 'Peito', capturedAt: '2026-07-20T00:00:00.000Z', exerciseBlocks: [] },
    ...overrides,
  }
}

describe('buildReplaceExerciseProposal', () => {
  it('builds a proposal replacing the exercise for future workouts', () => {
    const proposal = buildReplaceExerciseProposal(
      recommendation(),
      {
        plannedWorkout: plannedWorkout(),
        exerciseId: 'incline-bench',
        exerciseName: 'Supino Inclinado',
        replacementName: 'Chest Press',
        reasonLabel: 'equipamento indisponível',
      },
      NOW
    )
    expect(proposal).not.toBeNull()
    expect(proposal!.type).toBe('replace_exercise')
    expect(proposal!.changes).toEqual([
      expect.objectContaining({ kind: 'exercise_replaced', before: 'Supino Inclinado', after: 'Chest Press' }),
    ])
    expect(proposal!.summary).toMatch(/equipamento indisponível/)
  })

  it('returns null for a completed workout', () => {
    expect(
      buildReplaceExerciseProposal(
        recommendation(),
        { plannedWorkout: plannedWorkout({ status: 'done' }), exerciseName: 'Supino Inclinado', replacementName: 'Chest Press' },
        NOW
      )
    ).toBeNull()
  })

  it('returns null when the replacement equals the original exercise', () => {
    expect(
      buildReplaceExerciseProposal(
        recommendation(),
        { plannedWorkout: plannedWorkout(), exerciseName: 'Supino Inclinado', replacementName: 'Supino Inclinado' },
        NOW
      )
    ).toBeNull()
  })
})
