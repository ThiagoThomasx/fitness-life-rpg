import { describe, it, expect, beforeEach } from 'vitest'
import {
  recordMilestoneReached,
  getMilestonesForGoal,
  getAllMilestones,
  importMilestones,
  MILESTONE_PERCENTAGES,
} from './training-goal-milestones'

beforeEach(() => {
  window.localStorage.clear()
})

describe('recordMilestoneReached', () => {
  it('records a new milestone', () => {
    const record = recordMilestoneReached('goal-1', 25)
    expect(record?.goalId).toBe('goal-1')
    expect(record?.percentage).toBe(25)
    expect(record?.reachedAt).toBeTruthy()
  })

  it('does not duplicate the same goal+percentage', () => {
    recordMilestoneReached('goal-1', 50)
    const second = recordMilestoneReached('goal-1', 50)
    expect(second).toBeNull()
    expect(getMilestonesForGoal('goal-1')).toHaveLength(1)
  })

  it('keeps a milestone once reached even if recorded again for a lower percentage later', () => {
    recordMilestoneReached('goal-1', 75)
    recordMilestoneReached('goal-1', 50)
    const milestones = getMilestonesForGoal('goal-1')
    expect(milestones.map((m) => m.percentage)).toEqual([50, 75])
  })

  it('tracks milestones separately per goal', () => {
    recordMilestoneReached('goal-1', 25)
    recordMilestoneReached('goal-2', 25)
    expect(getMilestonesForGoal('goal-1')).toHaveLength(1)
    expect(getMilestonesForGoal('goal-2')).toHaveLength(1)
    expect(getAllMilestones()).toHaveLength(2)
  })
})

describe('MILESTONE_PERCENTAGES', () => {
  it('is the standard 25/50/75/100 sequence', () => {
    expect(MILESTONE_PERCENTAGES).toEqual([25, 50, 75, 100])
  })
})

describe('importMilestones', () => {
  it('imports valid milestones and skips duplicates by id', () => {
    const record = recordMilestoneReached('goal-1', 25)!
    const result = importMilestones([record, { id: 'bad' }])
    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(2)
  })

  it('imports a new valid milestone', () => {
    const foreign = { id: 'milestone-foreign', goalId: 'goal-9', percentage: 100, reachedAt: '2026-08-01T00:00:00.000Z' }
    const result = importMilestones([foreign])
    expect(result.imported).toBe(1)
    expect(getMilestonesForGoal('goal-9')).toHaveLength(1)
  })

  it('ignores non-array input', () => {
    // @ts-expect-error deliberately invalid input for defensive coverage
    const result = importMilestones({ not: 'an array' })
    expect(result).toEqual({ imported: 0, skipped: 0 })
  })
})
