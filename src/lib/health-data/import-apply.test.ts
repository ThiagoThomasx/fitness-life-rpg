import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getBodyProgressEntries } from '../body-progress'
import { applyHealthImportRecords } from './import-apply'
import { buildHealthDataRecord, normalizeUnit } from './normalization'
import { getHealthDataRecords } from './storage'
import type { HealthDataRecord, NewHealthDataRecordInput } from './types'

beforeEach(() => {
  window.localStorage.clear()
})

function record(input: NewHealthDataRecordInput): HealthDataRecord {
  const normalized = normalizeUnit(input.metric, input.value, input.unit)!
  return buildHealthDataRecord(input, normalized, 'high')
}

describe('applyHealthImportRecords', () => {
  it('is a no-op for an empty list', () => {
    const result = applyHealthImportRecords([])
    expect(result.ok).toBe(true)
    expect(result.appliedCount).toBe(0)
  })

  it('persists non-weight records to health-data storage', () => {
    const r = record({ metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'json_import' })
    const result = applyHealthImportRecords([r])
    expect(result.ok).toBe(true)
    expect(result.appliedCount).toBe(1)
    expect(getHealthDataRecords()).toHaveLength(1)
  })

  it('redirects weight records to Body Progress instead of health-data storage', () => {
    const r = record({ metric: 'weight', value: 80, recordedAt: '2026-07-26T10:00:00.000Z', source: 'json_import' })
    const result = applyHealthImportRecords([r])
    expect(result.ok).toBe(true)
    expect(getBodyProgressEntries()).toHaveLength(1)
    expect(getBodyProgressEntries()[0].weightKg).toBe(80)
    expect(getHealthDataRecords()).toHaveLength(0)
  })

  it('applies a mixed batch of weight and non-weight records atomically', () => {
    const steps = record({ metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'json_import' })
    const weight = record({ metric: 'weight', value: 80, recordedAt: '2026-07-26T10:00:00.000Z', source: 'json_import' })
    const result = applyHealthImportRecords([steps, weight])
    expect(result.ok).toBe(true)
    expect(result.appliedCount).toBe(2)
    expect(getHealthDataRecords()).toHaveLength(1)
    expect(getBodyProgressEntries()).toHaveLength(1)
  })

  it('rolls back both keys to their prior state when a write fails partway through', () => {
    const steps = record({ metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'json_import' })
    const weight = record({ metric: 'weight', value: 80, recordedAt: '2026-07-27T10:00:00.000Z', source: 'json_import' })

    const realSetItem = Storage.prototype.setItem
    let calls = 0
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      calls++
      if (key === 'lrpg-fit:body-progress') {
        throw new Error('quota exceeded (simulated)')
      }
      realSetItem.call(this, key, value)
    })

    const result = applyHealthImportRecords([steps, weight])

    spy.mockRestore()

    expect(result.ok).toBe(false)
    expect(getHealthDataRecords()).toHaveLength(0)
    expect(getBodyProgressEntries()).toHaveLength(0)
    expect(calls).toBeGreaterThan(0)
  })
})
