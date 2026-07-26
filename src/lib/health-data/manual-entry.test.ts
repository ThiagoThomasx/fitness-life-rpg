import { describe, it, expect, beforeEach } from 'vitest'
import { createManualHealthRecord } from './manual-entry'
import { getBodyProgressEntries } from '../body-progress'
import { getHealthDataRecords } from './storage'
import type { NewHealthDataRecordInput } from './types'

beforeEach(() => {
  window.localStorage.clear()
})

describe('createManualHealthRecord — non-weight metrics', () => {
  it('persists a valid steps entry in health-data storage', () => {
    const input: NewHealthDataRecordInput = {
      metric: 'steps',
      value: 8000,
      recordedAt: '2026-07-26T10:00:00.000Z',
      source: 'manual',
    }
    const result = createManualHealthRecord(input)
    expect(result.ok).toBe(true)
    expect(result.redirectedToBodyProgress).toBeUndefined()
    expect(getHealthDataRecords()).toHaveLength(1)
  })

  it('surfaces validation errors without persisting', () => {
    const result = createManualHealthRecord({
      metric: 'steps',
      value: -1,
      recordedAt: '2026-07-26T10:00:00.000Z',
      source: 'manual',
    })
    expect(result.ok).toBe(false)
    expect(result.errors?.length).toBeGreaterThan(0)
    expect(getHealthDataRecords()).toHaveLength(0)
  })
})

describe('createManualHealthRecord — weight', () => {
  it('redirects to Body Progress instead of health-data storage', () => {
    const result = createManualHealthRecord({
      metric: 'weight',
      value: 80,
      recordedAt: '2026-07-26T10:00:00.000Z',
      source: 'manual',
    })
    expect(result.ok).toBe(true)
    expect(result.redirectedToBodyProgress).toBe(true)
    expect(getBodyProgressEntries()).toHaveLength(1)
    expect(getBodyProgressEntries()[0].weightKg).toBe(80)
    expect(getHealthDataRecords()).toHaveLength(0)
  })

  it('converts unit before delegating to Body Progress', () => {
    const result = createManualHealthRecord({
      metric: 'weight',
      value: 176.37,
      unit: 'lb',
      recordedAt: '2026-07-26T10:00:00.000Z',
      source: 'manual',
    })
    expect(result.ok).toBe(true)
    expect(result.value).toBeCloseTo(80, 1)
    expect(getBodyProgressEntries()[0].weightKg).toBeCloseTo(80, 1)
  })

  it('rejects an implausible weight without touching Body Progress', () => {
    const result = createManualHealthRecord({
      metric: 'weight',
      value: 900,
      recordedAt: '2026-07-26T10:00:00.000Z',
      source: 'manual',
    })
    expect(result.ok).toBe(false)
    expect(getBodyProgressEntries()).toHaveLength(0)
  })
})
