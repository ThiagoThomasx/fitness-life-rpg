import { describe, it, expect, beforeEach } from 'vitest'
import {
  createHealthImportPreset,
  deleteHealthImportPreset,
  duplicateHealthImportPreset,
  getHealthImportPresetById,
  HEALTH_IMPORT_PRESETS_KEY,
  loadHealthImportPresets,
  resetHealthImportPresets,
  updateHealthImportPreset,
} from './presets'
import type { NewHealthImportMappingInput } from './types'

beforeEach(() => {
  window.localStorage.clear()
})

const baseInput: NewHealthImportMappingInput = {
  name: 'Apple Health CSV',
  sourceFormat: 'csv',
  columns: { recordedAt: 'date', value: 'steps' },
  static: { metric: 'steps' },
  decimalSeparator: '.',
  delimiter: ',',
  transformations: [],
}

describe('createHealthImportPreset', () => {
  it('creates and persists a preset with generated id and timestamps', () => {
    const result = createHealthImportPreset(baseInput)
    expect(result.ok).toBe(true)
    expect(result.preset?.id).toBeTruthy()
    expect(result.preset?.createdAt).toBeTruthy()
    expect(loadHealthImportPresets()).toHaveLength(1)
  })
})

describe('updateHealthImportPreset', () => {
  it('updates fields while preserving id and createdAt', () => {
    const created = createHealthImportPreset(baseInput).preset!
    const updated = updateHealthImportPreset(created.id, { ...baseInput, name: 'Renamed' })
    expect(updated.ok).toBe(true)
    expect(updated.preset?.id).toBe(created.id)
    expect(updated.preset?.createdAt).toBe(created.createdAt)
    expect(updated.preset?.name).toBe('Renamed')
  })

  it('fails for a preset id that does not exist', () => {
    const result = updateHealthImportPreset('missing', baseInput)
    expect(result.ok).toBe(false)
  })
})

describe('duplicateHealthImportPreset', () => {
  it('creates a new preset with a new id and the given name', () => {
    const created = createHealthImportPreset(baseInput).preset!
    const duplicated = duplicateHealthImportPreset(created.id, 'Copy of Apple Health CSV')
    expect(duplicated.ok).toBe(true)
    expect(duplicated.preset?.id).not.toBe(created.id)
    expect(duplicated.preset?.name).toBe('Copy of Apple Health CSV')
    expect(loadHealthImportPresets()).toHaveLength(2)
  })

  it('fails for a preset id that does not exist', () => {
    expect(duplicateHealthImportPreset('missing', 'Copy').ok).toBe(false)
  })
})

describe('deleteHealthImportPreset', () => {
  it('removes an existing preset', () => {
    const created = createHealthImportPreset(baseInput).preset!
    expect(deleteHealthImportPreset(created.id)).toBe(true)
    expect(loadHealthImportPresets()).toHaveLength(0)
  })

  it('returns false for a preset id that does not exist', () => {
    expect(deleteHealthImportPreset('missing')).toBe(false)
  })
})

describe('getHealthImportPresetById', () => {
  it('finds a preset by id', () => {
    const created = createHealthImportPreset(baseInput).preset!
    expect(getHealthImportPresetById(created.id)?.name).toBe('Apple Health CSV')
  })

  it('returns null for a missing id', () => {
    expect(getHealthImportPresetById('missing')).toBeNull()
  })
})

describe('resetHealthImportPresets', () => {
  it('clears all presets from storage', () => {
    createHealthImportPreset(baseInput)
    resetHealthImportPresets()
    expect(loadHealthImportPresets()).toHaveLength(0)
  })
})

describe('loadHealthImportPresets', () => {
  it('ignores malformed entries in storage', () => {
    window.localStorage.setItem(HEALTH_IMPORT_PRESETS_KEY, JSON.stringify([{ not: 'a preset' }]))
    expect(loadHealthImportPresets()).toHaveLength(0)
  })

  it('returns an empty array for corrupted JSON', () => {
    window.localStorage.setItem(HEALTH_IMPORT_PRESETS_KEY, '{not json')
    expect(loadHealthImportPresets()).toHaveLength(0)
  })
})
