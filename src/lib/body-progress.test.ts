import { describe, it, expect, beforeEach } from 'vitest'
import {
  createBodyProgressEntry,
  updateBodyProgressEntry,
  deleteBodyProgressEntry,
  getBodyProgressEntries,
  getBodyProgressEntryById,
  importBodyProgressEntries,
  validateBodyProgressInput,
  type NewBodyProgressInput,
} from './body-progress'

beforeEach(() => {
  window.localStorage.clear()
})

const weightOnlyInput: NewBodyProgressInput = {
  recordedAt: '2026-08-01',
  weightKg: 80,
}

const fullInput: NewBodyProgressInput = {
  recordedAt: '2026-08-05',
  weightKg: 79.5,
  measurements: { waistCm: 90, rightArmCm: 35 },
  notes: 'Sentindo-me bem',
  cycleId: 'cycle-1',
}

describe('validateBodyProgressInput', () => {
  it('accepts a weight-only entry', () => {
    expect(validateBodyProgressInput(weightOnlyInput)).toBeNull()
  })

  it('accepts a full entry', () => {
    expect(validateBodyProgressInput(fullInput)).toBeNull()
  })

  it('rejects an invalid date', () => {
    expect(validateBodyProgressInput({ recordedAt: 'not-a-date', weightKg: 80 })).not.toBeNull()
  })

  it('rejects a non-positive weight', () => {
    expect(validateBodyProgressInput({ recordedAt: '2026-08-01', weightKg: -1 })).not.toBeNull()
  })

  it('rejects a non-positive measurement', () => {
    expect(
      validateBodyProgressInput({ recordedAt: '2026-08-01', measurements: { waistCm: 0 } })
    ).not.toBeNull()
  })

  it('rejects an empty entry with no weight, measurements or notes', () => {
    expect(validateBodyProgressInput({ recordedAt: '2026-08-01' })).not.toBeNull()
  })

  it('accepts an entry with only notes', () => {
    expect(validateBodyProgressInput({ recordedAt: '2026-08-01', notes: 'Só observação' })).toBeNull()
  })

  it('validates custom measurements', () => {
    const withCustom: NewBodyProgressInput = {
      recordedAt: '2026-08-01',
      measurements: { custom: [{ id: 'c1', label: 'Punho', valueCm: 17 }] },
    }
    expect(validateBodyProgressInput(withCustom)).toBeNull()

    const invalidCustom: NewBodyProgressInput = {
      recordedAt: '2026-08-01',
      measurements: { custom: [{ id: 'c1', label: '', valueCm: 17 }] },
    }
    expect(validateBodyProgressInput(invalidCustom)).not.toBeNull()
  })
})

describe('createBodyProgressEntry', () => {
  it('creates and persists an entry', () => {
    const result = createBodyProgressEntry(weightOnlyInput)
    expect(result.ok).toBe(true)
    expect(result.entry?.weightKg).toBe(80)
    expect(getBodyProgressEntries()).toHaveLength(1)
  })

  it('rejects invalid input without persisting', () => {
    const result = createBodyProgressEntry({ recordedAt: 'bad-date' })
    expect(result.ok).toBe(false)
    expect(getBodyProgressEntries()).toHaveLength(0)
  })

  it('sets createdAt equal to updatedAt on creation', () => {
    const result = createBodyProgressEntry(fullInput)
    expect(result.entry?.createdAt).toBe(result.entry?.updatedAt)
  })
})

describe('getBodyProgressEntries', () => {
  it('returns entries sorted chronologically by recordedAt', () => {
    createBodyProgressEntry({ recordedAt: '2026-08-10', weightKg: 78 })
    createBodyProgressEntry({ recordedAt: '2026-08-01', weightKg: 80 })
    createBodyProgressEntry({ recordedAt: '2026-08-05', weightKg: 79 })

    const dates = getBodyProgressEntries().map((e) => e.recordedAt)
    expect(dates).toEqual(['2026-08-01', '2026-08-05', '2026-08-10'])
  })
})

describe('updateBodyProgressEntry', () => {
  it('updates fields and preserves createdAt', () => {
    const created = createBodyProgressEntry(weightOnlyInput).entry!
    const updated = updateBodyProgressEntry(created.id, { weightKg: 79 })
    expect(updated?.weightKg).toBe(79)
    expect(updated?.createdAt).toBe(created.createdAt)
  })

  it('returns null for a non-existent id', () => {
    expect(updateBodyProgressEntry('missing', { weightKg: 79 })).toBeNull()
  })

  it('rejects an update that produces an invalid entry', () => {
    const created = createBodyProgressEntry(weightOnlyInput).entry!
    const updated = updateBodyProgressEntry(created.id, { weightKg: -5 })
    expect(updated).toBeNull()
    expect(getBodyProgressEntryById(created.id)?.weightKg).toBe(80)
  })

  it('round-trips photoIds', () => {
    const created = createBodyProgressEntry(weightOnlyInput).entry!
    expect(created.photoIds).toBeUndefined()

    const updated = updateBodyProgressEntry(created.id, { photoIds: ['photo-1', 'photo-2'] })
    expect(updated?.photoIds).toEqual(['photo-1', 'photo-2'])
    expect(getBodyProgressEntryById(created.id)?.photoIds).toEqual(['photo-1', 'photo-2'])
  })

  it('rejects a photoIds patch containing non-string entries', () => {
    const created = createBodyProgressEntry(weightOnlyInput).entry!
    const updated = updateBodyProgressEntry(created.id, {
      photoIds: [123 as unknown as string],
    })
    expect(updated).toBeNull()
    expect(getBodyProgressEntryById(created.id)?.photoIds).toBeUndefined()
  })
})

describe('deleteBodyProgressEntry', () => {
  it('removes an existing entry', () => {
    const created = createBodyProgressEntry(weightOnlyInput).entry!
    expect(deleteBodyProgressEntry(created.id)).toBe(true)
    expect(getBodyProgressEntries()).toHaveLength(0)
  })

  it('returns false for a non-existent id', () => {
    expect(deleteBodyProgressEntry('missing')).toBe(false)
  })
})

describe('importBodyProgressEntries', () => {
  it('imports valid new entries and skips duplicates/invalid ones', () => {
    const created = createBodyProgressEntry(weightOnlyInput).entry!
    const result = importBodyProgressEntries([
      created, // duplicate id
      { id: 'new-1', recordedAt: '2026-08-02', weightKg: 81, createdAt: 'x', updatedAt: 'x' },
      { id: 'invalid', recordedAt: 'bad-date', createdAt: 'x', updatedAt: 'x' },
    ])
    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(2)
    expect(getBodyProgressEntries()).toHaveLength(2)
  })

  it('handles non-array input gracefully', () => {
    expect(importBodyProgressEntries('not-an-array' as unknown as unknown[])).toEqual({ imported: 0, skipped: 0 })
  })

  it('imports legacy entries without photoIds and entries with valid photoIds', () => {
    const result = importBodyProgressEntries([
      { id: 'legacy-1', recordedAt: '2026-08-02', weightKg: 81, createdAt: 'x', updatedAt: 'x' },
      {
        id: 'with-photos-1',
        recordedAt: '2026-08-03',
        weightKg: 82,
        photoIds: ['photo-a', 'photo-b'],
        createdAt: 'x',
        updatedAt: 'x',
      },
      {
        id: 'bad-photos-1',
        recordedAt: '2026-08-04',
        weightKg: 83,
        photoIds: ['ok', 123],
        createdAt: 'x',
        updatedAt: 'x',
      },
    ])
    expect(result.imported).toBe(2)
    expect(result.skipped).toBe(1)
    expect(getBodyProgressEntryById('legacy-1')?.photoIds).toBeUndefined()
    expect(getBodyProgressEntryById('with-photos-1')?.photoIds).toEqual(['photo-a', 'photo-b'])
    expect(getBodyProgressEntryById('bad-photos-1')).toBeNull()
  })
})
