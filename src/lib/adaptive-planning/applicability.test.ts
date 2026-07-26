import { describe, it, expect } from 'vitest'
import { checkProposalApplicability } from './applicability'
import type { AdaptivePlanProposal } from './types'
import type { PlannedWorkout } from '../planned-workouts'
import type { TrainingProgram } from '../training-programs'

const NOW = new Date('2026-07-25T12:00:00.000Z')

function baseProposal(overrides: Partial<AdaptivePlanProposal> = {}): AdaptivePlanProposal {
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
    createdAt: '2026-07-20T00:00:00.000Z',
    expiresAt: '2026-08-03T00:00:00.000Z',
    ...overrides,
  }
}

function basePlannedWorkout(overrides: Partial<PlannedWorkout> = {}): PlannedWorkout {
  return {
    id: 'pw-1',
    date: '2026-07-26',
    weekday: 0,
    name: 'Pernas',
    templateSnapshot: { name: 'Pernas', exerciseBlocks: [], capturedAt: '2026-07-20T00:00:00.000Z' },
    status: 'pending',
    isOptional: false,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    ...overrides,
  }
}

function baseProgram(overrides: Partial<TrainingProgram> = {}): TrainingProgram {
  return {
    id: 'prog-1',
    name: 'Programa A',
    weeks: [],
    tags: [],
    isFavorite: false,
    isArchived: false,
    version: 1,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('checkProposalApplicability', () => {
  it('is applicable when everything is valid', () => {
    const result = checkProposalApplicability(baseProposal(), { now: NOW, plannedWorkout: basePlannedWorkout() })
    expect(result.applicable).toBe(true)
    expect(result.reasons).toEqual([])
  })

  it('rejects already-applied proposals', () => {
    const result = checkProposalApplicability(baseProposal({ status: 'applied' }), { now: NOW })
    expect(result.applicable).toBe(false)
    expect(result.reasons[0]).toMatch(/já foi aplicada/)
  })

  it('rejects terminal statuses like rejected/expired', () => {
    const rejected = checkProposalApplicability(baseProposal({ status: 'rejected' }), { now: NOW })
    expect(rejected.applicable).toBe(false)
    const expired = checkProposalApplicability(baseProposal({ status: 'expired' }), { now: NOW })
    expect(expired.applicable).toBe(false)
  })

  it('rejects when the recommendation has expired', () => {
    const result = checkProposalApplicability(
      baseProposal({ expiresAt: '2026-07-01T00:00:00.000Z' }),
      { now: NOW, plannedWorkout: basePlannedWorkout() }
    )
    expect(result.applicable).toBe(false)
    expect(result.reasons[0]).toMatch(/expirou/)
  })

  it('rejects when the target planned workout no longer exists', () => {
    const result = checkProposalApplicability(baseProposal(), { now: NOW, plannedWorkout: null })
    expect(result.applicable).toBe(false)
    expect(result.reasons[0]).toMatch(/não existe mais/)
  })

  it('rejects when the target workout is already completed', () => {
    const result = checkProposalApplicability(baseProposal(), {
      now: NOW,
      plannedWorkout: basePlannedWorkout({ status: 'done' }),
    })
    expect(result.applicable).toBe(false)
    expect(result.reasons[0]).toMatch(/já foi concluído/)
  })

  it('warns (but does not block) when the workout is in progress', () => {
    const result = checkProposalApplicability(baseProposal(), {
      now: NOW,
      plannedWorkout: basePlannedWorkout({ status: 'in_progress' }),
    })
    expect(result.applicable).toBe(true)
    expect(result.warnings[0]).toMatch(/em andamento/)
  })

  it('rejects when the target program is archived', () => {
    const result = checkProposalApplicability(baseProposal({ target: { kind: 'program', programId: 'prog-1' } }), {
      now: NOW,
      program: baseProgram({ isArchived: true }),
    })
    expect(result.applicable).toBe(false)
    expect(result.reasons[0]).toMatch(/arquivado/)
  })

  it('rejects when the program version snapshot is stale', () => {
    const result = checkProposalApplicability(
      baseProposal({ target: { kind: 'program', programId: 'prog-1', programVersion: 1 } }),
      { now: NOW, program: baseProgram({ version: 2 }) }
    )
    expect(result.applicable).toBe(false)
    expect(result.reasons[0]).toMatch(/obsoleto/)
  })

  it('warns but stays applicable when the reschedule target date has a conflict', () => {
    const result = checkProposalApplicability(baseProposal(), {
      now: NOW,
      plannedWorkout: basePlannedWorkout(),
      rescheduleConflicts: [basePlannedWorkout({ id: 'pw-2', templateSnapshot: { name: 'Peito', exerciseBlocks: [], capturedAt: NOW.toISOString() } })],
    })
    expect(result.applicable).toBe(true)
    expect(result.warnings[0]).toMatch(/Peito/)
  })
})
