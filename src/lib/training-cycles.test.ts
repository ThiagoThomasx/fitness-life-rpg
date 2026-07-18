import { describe, it, expect, beforeEach } from 'vitest'
import {
  createCycle,
  updateCycle,
  completeCycle,
  archiveCycle,
  restoreCycle,
  getActiveCycle,
  getCycleById,
  getCompletedCycles,
  getArchivedCycles,
  getTrainingCycles,
  importCycles,
  TRAINING_CYCLE_GOAL_LABELS,
} from './training-cycles'

beforeEach(() => {
  window.localStorage.clear()
})

describe('createCycle', () => {
  it('creates an active cycle with the given fields', () => {
    const result = createCycle({ name: 'Bloco de força', goal: 'strength', startDate: '2026-08-01', plannedWeeks: 6 })
    expect(result.ok).toBe(true)
    expect(result.cycle?.status).toBe('active')
    expect(result.cycle?.name).toBe('Bloco de força')
    expect(result.cycle?.plannedWeeks).toBe(6)
  })

  it('rejects a second active cycle while one is already active', () => {
    createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-08-01' })
    const second = createCycle({ name: 'Bloco B', goal: 'hypertrophy', startDate: '2026-08-01' })
    expect(second.ok).toBe(false)
    expect(getTrainingCycles()).toHaveLength(1)
  })

  it('rejects an empty name', () => {
    const result = createCycle({ name: '   ', goal: 'general', startDate: '2026-08-01' })
    expect(result.ok).toBe(false)
  })

  it('stores customGoal only when goal is custom', () => {
    const withCustom = createCycle({
      name: 'Bloco custom', goal: 'custom', customGoal: 'Prep de prova', startDate: '2026-08-01',
    })
    expect(withCustom.cycle?.customGoal).toBe('Prep de prova')

    window.localStorage.clear()
    const withoutCustom = createCycle({
      name: 'Bloco força', goal: 'strength', customGoal: 'ignorado', startDate: '2026-08-01',
    })
    expect(withoutCustom.cycle?.customGoal).toBeUndefined()
  })

  it('allows a new active cycle once the previous one is completed', () => {
    const first = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-08-01' })
    completeCycle(first.cycle!.id)
    const second = createCycle({ name: 'Bloco B', goal: 'hypertrophy', startDate: '2026-09-15' })
    expect(second.ok).toBe(true)
    expect(getActiveCycle()?.id).toBe(second.cycle?.id)
  })
})

describe('getActiveCycle / getCompletedCycles', () => {
  it('returns null when there is no active cycle', () => {
    expect(getActiveCycle()).toBeNull()
  })

  it('separates active from completed cycles', () => {
    const a = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-06-01' }).cycle!
    completeCycle(a.id)
    const b = createCycle({ name: 'Bloco B', goal: 'hypertrophy', startDate: '2026-07-01' }).cycle!

    expect(getActiveCycle()?.id).toBe(b.id)
    expect(getCompletedCycles().map((c) => c.id)).toEqual([a.id])
  })

  it('sorts completed cycles by startDate descending', () => {
    const a = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-01-01' }).cycle!
    completeCycle(a.id)
    const b = createCycle({ name: 'Bloco B', goal: 'strength', startDate: '2026-03-01' }).cycle!
    completeCycle(b.id)

    expect(getCompletedCycles().map((c) => c.id)).toEqual([b.id, a.id])
  })
})

describe('completeCycle', () => {
  it('sets status to completed and stamps completedAt', () => {
    const cycle = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-08-01' }).cycle!
    const completed = completeCycle(cycle.id)
    expect(completed?.status).toBe('completed')
    expect(completed?.completedAt).toBeTruthy()
  })

  it('is a no-op for an already-completed cycle', () => {
    const cycle = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-08-01' }).cycle!
    completeCycle(cycle.id)
    const second = completeCycle(cycle.id)
    expect(second).toBeNull()
  })

  it('preserves an explicit closing note', () => {
    const cycle = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-08-01' }).cycle!
    const completed = completeCycle(cycle.id, 'Mudança de rotina')
    expect(completed?.notes).toBe('Mudança de rotina')
  })
})

describe('updateCycle', () => {
  it('updates editable fields without touching status', () => {
    const cycle = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-08-01' }).cycle!
    const updated = updateCycle(cycle.id, { name: 'Bloco A — revisado', plannedWeeks: 8 })
    expect(updated?.name).toBe('Bloco A — revisado')
    expect(updated?.plannedWeeks).toBe(8)
    expect(updated?.status).toBe('active')
  })

  it('returns null for an unknown id', () => {
    expect(updateCycle('missing', { name: 'x' })).toBeNull()
  })
})

describe('getCycleById', () => {
  it('finds a cycle by id', () => {
    const cycle = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-08-01' }).cycle!
    expect(getCycleById(cycle.id)?.name).toBe('Bloco A')
  })

  it('returns null for an unknown id', () => {
    expect(getCycleById('missing')).toBeNull()
  })
})

describe('archiveCycle', () => {
  it('archives a completed cycle', () => {
    const cycle = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-08-01' }).cycle!
    completeCycle(cycle.id)
    const result = archiveCycle(cycle.id)
    expect(result.ok).toBe(true)
    expect(result.cycle?.status).toBe('archived')
  })

  it('removes an archived cycle from getCompletedCycles and lists it in getArchivedCycles', () => {
    const cycle = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-08-01' }).cycle!
    completeCycle(cycle.id)
    archiveCycle(cycle.id)
    expect(getCompletedCycles()).toHaveLength(0)
    expect(getArchivedCycles().map((c) => c.id)).toEqual([cycle.id])
  })

  it('refuses to archive an active cycle', () => {
    const cycle = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-08-01' }).cycle!
    const result = archiveCycle(cycle.id)
    expect(result.ok).toBe(false)
    expect(getActiveCycle()?.status).toBe('active')
  })

  it('refuses to double-archive a cycle', () => {
    const cycle = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-08-01' }).cycle!
    completeCycle(cycle.id)
    archiveCycle(cycle.id)
    const second = archiveCycle(cycle.id)
    expect(second.ok).toBe(false)
  })

  it('returns an error for an unknown id', () => {
    expect(archiveCycle('missing').ok).toBe(false)
  })
})

describe('restoreCycle', () => {
  it('restores an archived cycle back to completed, not active', () => {
    const cycle = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-08-01' }).cycle!
    completeCycle(cycle.id)
    archiveCycle(cycle.id)
    const restored = restoreCycle(cycle.id)
    expect(restored?.status).toBe('completed')
    expect(getActiveCycle()).toBeNull()
    expect(getCompletedCycles().map((c) => c.id)).toEqual([cycle.id])
  })

  it('returns null for a cycle that is not archived', () => {
    const cycle = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-08-01' }).cycle!
    expect(restoreCycle(cycle.id)).toBeNull()
  })

  it('returns null for an unknown id', () => {
    expect(restoreCycle('missing')).toBeNull()
  })
})

describe('importCycles', () => {
  it('imports valid cycles and skips invalid/duplicate ones', () => {
    const existing = createCycle({ name: 'Bloco A', goal: 'strength', startDate: '2026-08-01' }).cycle!
    const result = importCycles([
      existing, // duplicate id — skipped
      { id: 'cycle-x', name: 'Bloco X', goal: 'strength', startDate: '2026-09-01', status: 'active', createdAt: 'x', updatedAt: 'x' },
      { id: 'invalid' }, // malformed — skipped
    ])
    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(2)
    expect(getTrainingCycles()).toHaveLength(2)
  })

  it('handles non-array input gracefully', () => {
    const result = importCycles('not-an-array' as unknown as unknown[])
    expect(result).toEqual({ imported: 0, skipped: 0 })
  })

  it('accepts an archived cycle as valid', () => {
    const result = importCycles([
      { id: 'cycle-archived', name: 'Bloco antigo', goal: 'strength', startDate: '2026-01-01', status: 'archived', createdAt: 'x', updatedAt: 'x' },
    ])
    expect(result.imported).toBe(1)
    expect(getArchivedCycles().map((c) => c.id)).toEqual(['cycle-archived'])
  })
})

describe('TRAINING_CYCLE_GOAL_LABELS', () => {
  it('has a label for every goal', () => {
    const goals = ['strength', 'hypertrophy', 'consistency', 'technique', 'conditioning', 'general', 'custom'] as const
    for (const g of goals) {
      expect(TRAINING_CYCLE_GOAL_LABELS[g]).toBeTruthy()
    }
  })
})
