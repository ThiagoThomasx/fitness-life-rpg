import { describe, it, expect } from 'vitest'
import { buildRecoveryOptions } from './recovery-proposals'
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
    title: 'Recuperação incompleta',
    summary: 'readiness baixo e recuperação incompleta',
    evidence: ['Readiness abaixo de 40%'],
    period: '30d',
    generatedAt: NOW.toISOString(),
    suggestion: 'Considere recuperação.',
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
    templateSnapshot: {
      name: 'Pernas',
      capturedAt: '2026-07-20T00:00:00.000Z',
      exerciseBlocks: [
        { id: 'blk-1', type: 'single', exercise: { id: 'ex-1', exerciseId: 'leg-press', exerciseName: 'Leg Press', sets: 4 } },
      ],
    },
    ...overrides,
  }
}

describe('buildRecoveryOptions', () => {
  it('returns 3 independent options: reschedule, reduce volume, mobility swap', () => {
    const options = buildRecoveryOptions(recommendation(), plannedWorkout(), NOW)
    expect(options).toHaveLength(3)
    expect(options.map((o) => o.type).sort()).toEqual(['insert_recovery', 'reduce_volume', 'reschedule_workout'])
  })

  it('reschedules to the next day by default', () => {
    const options = buildRecoveryOptions(recommendation(), plannedWorkout(), NOW)
    const reschedule = options.find((o) => o.type === 'reschedule_workout')
    expect(reschedule!.after).toMatchObject({ date: '2026-07-26' })
  })

  it('all options share the same recommendationId so the UI can group them', () => {
    const options = buildRecoveryOptions(recommendation(), plannedWorkout(), NOW)
    expect(new Set(options.map((o) => o.recommendationId)).size).toBe(1)
  })

  it('drops options that are not eligible without failing the others', () => {
    const done = plannedWorkout({ status: 'done' })
    const options = buildRecoveryOptions(recommendation(), done, NOW)
    expect(options).toEqual([])
  })
})
