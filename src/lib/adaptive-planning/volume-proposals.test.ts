import { describe, it, expect } from 'vitest'
import { buildIncreaseVolumeProposal, buildReduceVolumeProposal, buildVolumeSnapshot } from './volume-proposals'
import type { CoachRecommendation } from '../coach/types'
import type { PlannedWorkout } from '../planned-workouts'

const NOW = new Date('2026-07-25T12:00:00.000Z')

function recommendation(overrides: Partial<CoachRecommendation> = {}): CoachRecommendation {
  return {
    id: 'rec-1',
    ruleId: 'rule-volume-high',
    category: 'volume',
    priority: 'high',
    confidence: 'high',
    title: 'Volume acima do esperado',
    summary: 'Reduza o volume da próxima sessão de pernas.',
    evidence: ['Volume 20% acima da média'],
    period: '30d',
    generatedAt: NOW.toISOString(),
    suggestion: 'Reduza o volume.',
    actions: [],
    status: 'nova',
    ...overrides,
  }
}

function plannedWorkout(overrides: Partial<PlannedWorkout> = {}): PlannedWorkout {
  return {
    id: 'pw-1',
    date: '2026-07-26',
    weekday: 0,
    name: 'Pernas',
    status: 'pending',
    isOptional: false,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    templateSnapshot: {
      name: 'Pernas',
      capturedAt: '2026-07-20T00:00:00.000Z',
      exerciseBlocks: [
        { id: 'blk-1', type: 'single', exercise: { id: 'ex-1', exerciseId: 'leg-press', exerciseName: 'Leg Press', sets: 4 } },
        { id: 'blk-2', type: 'single', exercise: { id: 'ex-2', exerciseId: 'squat', exerciseName: 'Agachamento', sets: 4 } },
        { id: 'blk-3', type: 'single', exercise: { id: 'ex-3', exerciseId: 'ext', exerciseName: 'Extensora', sets: 4 } },
        { id: 'blk-4', type: 'single', exercise: { id: 'ex-4', exerciseId: 'curl', exerciseName: 'Mesa Flexora', sets: 4 } },
      ],
    },
    ...overrides,
  }
}

describe('buildVolumeSnapshot', () => {
  it('extracts sets per exercise and the total', () => {
    const snapshot = buildVolumeSnapshot(plannedWorkout())
    expect(snapshot.totalSets).toBe(16)
    expect(snapshot.exercises).toHaveLength(4)
  })
})

describe('buildReduceVolumeProposal', () => {
  it('builds a proposal reducing volume with the diff engine populated', () => {
    const proposal = buildReduceVolumeProposal(recommendation(), plannedWorkout(), NOW)
    expect(proposal).not.toBeNull()
    expect(proposal!.type).toBe('reduce_volume')
    expect(proposal!.after.kind).toBe('volume')
    expect((proposal!.after as { totalSets: number }).totalSets).toBeLessThan(16)
    expect(proposal!.changes.some((c) => c.kind === 'volume_changed')).toBe(true)
    expect(proposal!.target).toEqual({ kind: 'planned_workout', plannedWorkoutId: 'pw-1', date: '2026-07-26' })
  })

  it('returns null for a completed workout — never touch finished sessions', () => {
    expect(buildReduceVolumeProposal(recommendation(), plannedWorkout({ status: 'done' }), NOW)).toBeNull()
  })

  it('returns null for a cancelled workout', () => {
    expect(buildReduceVolumeProposal(recommendation(), plannedWorkout({ status: 'cancelled' }), NOW)).toBeNull()
  })

  it('returns null when the workout has no exercises', () => {
    const empty = plannedWorkout({
      templateSnapshot: { name: 'Vazio', capturedAt: NOW.toISOString(), exerciseBlocks: [] },
    })
    expect(buildReduceVolumeProposal(recommendation(), empty, NOW)).toBeNull()
  })

  it('respects a custom reduction percent', () => {
    const proposal = buildReduceVolumeProposal(recommendation(), plannedWorkout(), NOW, { reductionPercent: 50 })
    expect((proposal!.after as { totalSets: number }).totalSets).toBe(8)
  })
})

describe('buildIncreaseVolumeProposal', () => {
  it('builds a conservative increase proposal', () => {
    const proposal = buildIncreaseVolumeProposal(recommendation({ suggestion: 'Aumente o volume.' }), plannedWorkout(), NOW)
    expect(proposal).not.toBeNull()
    expect(proposal!.type).toBe('increase_volume')
    expect((proposal!.after as { totalSets: number }).totalSets).toBe(18) // default +2
  })

  it('returns null for a completed workout', () => {
    expect(buildIncreaseVolumeProposal(recommendation(), plannedWorkout({ status: 'done' }), NOW)).toBeNull()
  })
})
