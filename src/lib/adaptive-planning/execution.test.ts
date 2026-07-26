import { describe, it, expect, beforeEach } from 'vitest'
import { applyProposal } from './execution'
import { acceptProposal } from './decisions'
import { getAdaptivePlanAuditTrail, saveAdaptivePlanProposal } from './storage'
import { buildReduceVolumeProposal } from './volume-proposals'
import { buildRescheduleProposal } from './reschedule-proposals'
import { buildMaintainPlanProposal } from './proposal-builder'
import { buildReplaceExerciseProposal } from './exercise-replace-proposals'
import { buildAdjustFrequencyProposal } from './frequency-proposals'
import { getPlannedWorkoutById, savePlannedWorkout, linkPlannedWorkoutToCompleted, type PlannedWorkout } from '../planned-workouts'
import { saveTrainingProgram } from '../training-programs'
import type { CoachRecommendation } from '../coach/types'

const NOW = new Date('2026-07-26T12:00:00.000Z')

function recommendation(overrides: Partial<CoachRecommendation> = {}): CoachRecommendation {
  return {
    id: 'rec-1',
    ruleId: 'rule-1',
    category: 'volume',
    priority: 'high',
    confidence: 'high',
    title: 'x',
    summary: 'x',
    evidence: ['x'],
    period: '30d',
    generatedAt: NOW.toISOString(),
    suggestion: 'x',
    actions: [],
    status: 'nova',
    ...overrides,
  }
}

function seedPlannedWorkout(overrides: Partial<PlannedWorkout> = {}): PlannedWorkout {
  const pw = savePlannedWorkout({
    date: '2026-07-27',
    weekday: 1,
    name: 'Pernas',
    isOptional: false,
    templateSnapshot: {
      name: 'Pernas',
      capturedAt: NOW.toISOString(),
      exerciseBlocks: [
        { id: 'blk-1', type: 'single', exercise: { id: 'ex-1', exerciseId: 'leg-press', exerciseName: 'Leg Press', sets: 4 } },
        { id: 'blk-2', type: 'single', exercise: { id: 'ex-2', exerciseId: 'squat', exerciseName: 'Agachamento', sets: 4 } },
      ],
    },
    ...overrides,
  })
  return pw
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('applyProposal — reduce_volume', () => {
  it('applies the reduction to the real planned workout', () => {
    const pw = seedPlannedWorkout()
    const proposal = buildReduceVolumeProposal(recommendation(), pw, NOW, { reductionPercent: 25 })!
    saveAdaptivePlanProposal(proposal)
    acceptProposal(proposal.id, NOW)

    const result = applyProposal(proposal.id, NOW)
    expect(result.success).toBe(true)
    expect(result.changedEntityIds).toEqual([pw.id])

    const updated = getPlannedWorkoutById(pw.id)!
    const totalSets = updated.templateSnapshot.exerciseBlocks.reduce((sum, b) => sum + (b.exercise.sets ?? 0), 0)
    expect(totalSets).toBeLessThan(8)
  })

  it('requires the proposal to be accepted first', () => {
    const pw = seedPlannedWorkout()
    const proposal = buildReduceVolumeProposal(recommendation(), pw, NOW)!
    saveAdaptivePlanProposal(proposal)

    const result = applyProposal(proposal.id, NOW)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/precisa ser aceita/)
  })

  it('is idempotent — reapplying an already-applied proposal is a safe no-op', () => {
    const pw = seedPlannedWorkout()
    const proposal = buildReduceVolumeProposal(recommendation(), pw, NOW)!
    saveAdaptivePlanProposal(proposal)
    acceptProposal(proposal.id, NOW)
    applyProposal(proposal.id, NOW)

    const secondResult = applyProposal(proposal.id, NOW)
    expect(secondResult.success).toBe(true)
    expect(secondResult.changedEntityIds).toEqual([])
    expect(secondResult.warnings[0]).toMatch(/já havia sido aplicada/)
  })

  it('fails safely when the target workout was completed after the proposal was created', () => {
    const pw = seedPlannedWorkout()
    const proposal = buildReduceVolumeProposal(recommendation(), pw, NOW)!
    saveAdaptivePlanProposal(proposal)
    acceptProposal(proposal.id, NOW)
    linkPlannedWorkoutToCompleted(pw.id, 'wh-1')

    const result = applyProposal(proposal.id, NOW)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/já foi concluído/)

    const auditEntry = getAdaptivePlanAuditTrail()[0]
    expect(auditEntry.action).toBe('failed')
    expect(auditEntry.result).toBe('failure')

    // Nothing partially changed — original volume stays intact.
    const untouched = getPlannedWorkoutById(pw.id)!
    expect(untouched.templateSnapshot.exerciseBlocks[0].exercise.sets).toBe(4)
  })

  it('returns a not-found error for an unknown proposal id', () => {
    const result = applyProposal('missing', NOW)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/não encontrada/)
  })
})

describe('applyProposal — reschedule_workout', () => {
  it('moves the planned workout to the new date', () => {
    const pw = seedPlannedWorkout()
    const proposal = buildRescheduleProposal(recommendation({ category: 'recovery' }), pw, '2026-07-29', NOW)!
    saveAdaptivePlanProposal(proposal)
    acceptProposal(proposal.id, NOW)

    const result = applyProposal(proposal.id, NOW)
    expect(result.success).toBe(true)
    expect(getPlannedWorkoutById(pw.id)!.date).toBe('2026-07-29')
  })
})

describe('applyProposal — replace_exercise', () => {
  it('replaces the exercise name on the target workout', () => {
    const pw = seedPlannedWorkout()
    const proposal = buildReplaceExerciseProposal(
      recommendation({ category: 'stagnation' }),
      { plannedWorkout: pw, exerciseId: 'leg-press', exerciseName: 'Leg Press', replacementName: 'Hack Squat' },
      NOW
    )!
    saveAdaptivePlanProposal(proposal)
    acceptProposal(proposal.id, NOW)

    const result = applyProposal(proposal.id, NOW)
    expect(result.success).toBe(true)
    const updated = getPlannedWorkoutById(pw.id)!
    expect(updated.templateSnapshot.exerciseBlocks[0].exercise.exerciseName).toBe('Hack Squat')
  })
})

describe('applyProposal — maintain_plan', () => {
  it('succeeds without changing any entity', () => {
    const program = saveTrainingProgram({ name: 'P', weeks: [], tags: [] }).program!
    const proposal = buildMaintainPlanProposal(recommendation({ category: 'consistency' }), { kind: 'program', programId: program.id }, NOW)
    saveAdaptivePlanProposal(proposal)
    acceptProposal(proposal.id, NOW)

    const result = applyProposal(proposal.id, NOW)
    expect(result.success).toBe(true)
    expect(result.changedEntityIds).toEqual([])
  })
})

describe('applyProposal — unsupported types', () => {
  it('fails explicitly for adjust_frequency instead of faking a mutation', () => {
    const program = saveTrainingProgram({ name: 'P', weeks: [], tags: [] }).program!
    const proposal = buildAdjustFrequencyProposal(
      recommendation({ category: 'frequency' }),
      { program, currentSessionsPerWeek: 5, averageAdherenceSessionsPerWeek: 3.1, proposedSessionsPerWeek: 4 },
      NOW
    )!
    saveAdaptivePlanProposal(proposal)
    acceptProposal(proposal.id, NOW)

    const result = applyProposal(proposal.id, NOW)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/não suporta aplicação automática/)
  })
})
