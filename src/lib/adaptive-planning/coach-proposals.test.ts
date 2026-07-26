import { describe, it, expect, beforeEach } from 'vitest'
import { buildProposalsForRecommendation } from './coach-proposals'
import { savePlannedWorkout, updatePlannedWorkoutStatus } from '../planned-workouts'
import type { CoachRecommendation } from '../coach/types'

const NOW = new Date('2026-07-26T12:00:00.000Z')

function recommendation(overrides: Partial<CoachRecommendation> = {}): CoachRecommendation {
  return {
    id: 'rec-1',
    ruleId: 'rule-1',
    category: 'volume',
    priority: 'high',
    confidence: 'high',
    title: 'Volume acima do esperado',
    summary: 'Volume 20% acima da média.',
    evidence: ['x'],
    period: '30d',
    generatedAt: NOW.toISOString(),
    suggestion: 'Reduza o volume da próxima sessão de pernas.',
    actions: [{ kind: 'planner', label: 'Ver plano da semana' }],
    status: 'nova',
    ...overrides,
  }
}

function seedWorkout(date = '2026-07-27') {
  return savePlannedWorkout({
    date,
    weekday: 1,
    name: 'Pernas',
    isOptional: false,
    templateSnapshot: {
      name: 'Pernas',
      capturedAt: NOW.toISOString(),
      exerciseBlocks: [{ id: 'blk-1', type: 'single', exercise: { id: 'ex-1', exerciseName: 'Leg Press', sets: 4 } }],
    },
  })
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('buildProposalsForRecommendation — volume', () => {
  it('builds a reduce_volume proposal targeting the next pending workout', () => {
    seedWorkout()
    const proposals = buildProposalsForRecommendation(recommendation(), NOW)
    expect(proposals).toHaveLength(1)
    expect(proposals[0].type).toBe('reduce_volume')
  })

  it('builds an increase_volume proposal when the suggestion says to increase', () => {
    seedWorkout()
    const proposals = buildProposalsForRecommendation(recommendation({ suggestion: 'Aumente o volume gradualmente.' }), NOW)
    expect(proposals).toHaveLength(1)
    expect(proposals[0].type).toBe('increase_volume')
  })

  it('returns nothing when there is no pending workout in the planner', () => {
    expect(buildProposalsForRecommendation(recommendation(), NOW)).toEqual([])
  })

  it('treats the real Coach.Volume.Imbalance wording ("Redistribua...") as a reduction', () => {
    seedWorkout()
    const proposals = buildProposalsForRecommendation(
      recommendation({ suggestion: 'Redistribua parte do volume de Peito para outros grupos musculares negligenciados.' }),
      NOW
    )
    expect(proposals).toHaveLength(1)
    expect(proposals[0].type).toBe('reduce_volume')
  })

  it('picks the earliest pending workout, ignoring ones already in progress or further in the future', () => {
    const soon = seedWorkout('2026-07-27')
    seedWorkout('2026-08-15')
    const proposals = buildProposalsForRecommendation(recommendation(), NOW)
    expect(proposals[0].target).toMatchObject({ plannedWorkoutId: soon.id })
  })

  it('skips a workout already in progress and falls back to the next pending one', () => {
    const inProgress = seedWorkout('2026-07-27')
    updatePlannedWorkoutStatus(inProgress.id, 'in_progress')
    const nextPending = seedWorkout('2026-07-28')
    const proposals = buildProposalsForRecommendation(recommendation(), NOW)
    expect(proposals[0].target).toMatchObject({ plannedWorkoutId: nextPending.id })
  })
})

describe('buildProposalsForRecommendation — recovery', () => {
  it('builds recovery options for the next pending workout', () => {
    seedWorkout()
    const proposals = buildProposalsForRecommendation(
      recommendation({ category: 'recovery', suggestion: 'Considere recuperação.' }),
      NOW
    )
    expect(proposals.length).toBeGreaterThan(0)
    expect(proposals.every((p) => p.recommendationId === 'rec-1')).toBe(true)
  })
})

describe('buildProposalsForRecommendation — other categories', () => {
  it('returns nothing for categories without an orchestrated builder', () => {
    seedWorkout()
    expect(buildProposalsForRecommendation(recommendation({ category: 'consistency' }), NOW)).toEqual([])
  })
})
