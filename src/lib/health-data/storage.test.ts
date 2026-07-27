import { describe, it, expect, beforeEach } from 'vitest'
import {
  createHealthDataRecord,
  deleteHealthDataRecord,
  getHealthDataRecordById,
  getHealthDataRecords,
  getHealthDataRecordsByMetric,
  importHealthDataRecords,
  resetHealthData,
  HEALTH_DATA_RECORDS_KEY,
} from './storage'
import type { HealthDataRecord, NewHealthDataRecordInput } from './types'

beforeEach(() => {
  window.localStorage.clear()
})

const stepsInput: NewHealthDataRecordInput = {
  metric: 'steps',
  value: 8000,
  recordedAt: '2026-07-26T10:00:00.000Z',
  source: 'manual',
}

describe('createHealthDataRecord', () => {
  it('creates and persists a valid record', () => {
    const result = createHealthDataRecord(stepsInput)
    expect(result.ok).toBe(true)
    expect(result.record?.value).toBe(8000)
    expect(getHealthDataRecords()).toHaveLength(1)
  })

  it('rejects an invalid input without persisting anything', () => {
    const result = createHealthDataRecord({ ...stepsInput, value: -1 })
    expect(result.ok).toBe(false)
    expect(result.errors?.length).toBeGreaterThan(0)
    expect(getHealthDataRecords()).toHaveLength(0)
  })

  it('does not duplicate the same metric+source+recordedAt on repeated calls', () => {
    createHealthDataRecord(stepsInput)
    const second = createHealthDataRecord(stepsInput)
    expect(second.ok).toBe(false)
    expect(second.duplicate).toBe(true)
    expect(getHealthDataRecords()).toHaveLength(1)
  })

  it('converts units before persisting', () => {
    const result = createHealthDataRecord({
      metric: 'weight',
      value: 176.37,
      unit: 'lb',
      recordedAt: '2026-07-26T10:00:00.000Z',
      source: 'manual',
    })
    expect(result.ok).toBe(true)
    expect(result.record?.unit).toBe('kg')
    expect(result.record?.value).toBeCloseTo(80, 1)
  })

  it('rejects an unsupported unit', () => {
    const result = createHealthDataRecord({ ...stepsInput, metric: 'weight', value: 80, unit: 'stone' })
    expect(result.ok).toBe(false)
  })
})

describe('getHealthDataRecordById / getHealthDataRecordsByMetric', () => {
  it('finds a record by id after creation', () => {
    const { record } = createHealthDataRecord(stepsInput)
    expect(getHealthDataRecordById(record!.id)?.value).toBe(8000)
  })

  it('returns null for an unknown id', () => {
    expect(getHealthDataRecordById('nope')).toBeNull()
  })

  it('filters records by metric', () => {
    createHealthDataRecord(stepsInput)
    createHealthDataRecord({
      metric: 'weight',
      value: 80,
      recordedAt: '2026-07-26T10:00:00.000Z',
      source: 'manual',
    })
    expect(getHealthDataRecordsByMetric('steps')).toHaveLength(1)
    expect(getHealthDataRecordsByMetric('weight')).toHaveLength(1)
  })
})

describe('deleteHealthDataRecord', () => {
  it('removes an existing record', () => {
    const { record } = createHealthDataRecord(stepsInput)
    expect(deleteHealthDataRecord(record!.id)).toBe(true)
    expect(getHealthDataRecords()).toHaveLength(0)
  })

  it('returns false for an id that does not exist', () => {
    expect(deleteHealthDataRecord('nope')).toBe(false)
  })
})

describe('importHealthDataRecords', () => {
  const validRecord: HealthDataRecord = {
    id: 'health-steps-import-1',
    metric: 'steps',
    value: 9000,
    unit: 'count',
    recordedAt: '2026-07-27T10:00:00.000Z',
    source: 'json_import',
    importedAt: '2026-07-27T10:00:00.000Z',
    quality: 'medium',
  }

  it('imports valid records', () => {
    const result = importHealthDataRecords([validRecord])
    expect(result.imported).toBe(1)
    expect(result.invalid).toBe(0)
    expect(getHealthDataRecords()).toHaveLength(1)
  })

  it('rejects invalid entries without throwing', () => {
    const result = importHealthDataRecords([{ garbage: true }, validRecord])
    expect(result.invalid).toBe(1)
    expect(result.imported).toBe(1)
  })

  it('does not duplicate a record already imported', () => {
    importHealthDataRecords([validRecord])
    const second = importHealthDataRecords([validRecord])
    expect(second.duplicates).toBe(1)
    expect(second.imported).toBe(0)
    expect(getHealthDataRecords()).toHaveLength(1)
  })

  it('handles a non-array payload gracefully', () => {
    expect(importHealthDataRecords(null as unknown as unknown[])).toEqual({
      imported: 0,
      duplicates: 0,
      invalid: 0,
    })
  })
})

describe('resetHealthData', () => {
  it('removes all health data records and leaves an empty, valid state', () => {
    createHealthDataRecord(stepsInput)
    expect(getHealthDataRecords()).toHaveLength(1)

    resetHealthData()

    expect(getHealthDataRecords()).toEqual([])
    expect(window.localStorage.getItem(HEALTH_DATA_RECORDS_KEY)).toBeNull()
  })

  it('is safe to call when there is nothing to reset', () => {
    expect(() => resetHealthData()).not.toThrow()
    expect(getHealthDataRecords()).toEqual([])
  })

  it('never touches health import presets — the two granular resets are isolated', () => {
    window.localStorage.setItem(
      'lrpg-fit:health-import-presets',
      JSON.stringify([{ id: 'preset-1', name: 'Preset' }])
    )
    createHealthDataRecord(stepsInput)

    resetHealthData()

    expect(getHealthDataRecords()).toEqual([])
    expect(window.localStorage.getItem('lrpg-fit:health-import-presets')).not.toBeNull()
  })
})
