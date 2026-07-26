import { describe, it, expect, beforeEach } from 'vitest'
import { createBodyProgressEntry } from '../body-progress'
import { createHealthDataRecord } from './storage'
import { getHealthRecordsByMetric, getHealthRecordsForPeriod, getLatestHealthMetric } from './queries'

beforeEach(() => {
  window.localStorage.clear()
})

describe('getHealthRecordsByMetric', () => {
  it('combines directly stored records with those derived from body progress', () => {
    createHealthDataRecord({
      metric: 'weight',
      value: 81,
      recordedAt: '2026-07-20T10:00:00.000Z',
      source: 'manual',
    })
    createBodyProgressEntry({ recordedAt: '2026-07-25', weightKg: 80 })

    const records = getHealthRecordsByMetric('weight')
    expect(records).toHaveLength(2)
  })

  it('returns records sorted by recordedAt ascending', () => {
    createHealthDataRecord({
      metric: 'steps',
      value: 9000,
      recordedAt: '2026-07-27T10:00:00.000Z',
      source: 'manual',
    })
    createHealthDataRecord({
      metric: 'steps',
      value: 8000,
      recordedAt: '2026-07-26T10:00:00.000Z',
      source: 'json_import',
    })
    const records = getHealthRecordsByMetric('steps')
    expect(records.map((r) => r.value)).toEqual([8000, 9000])
  })
})

describe('getLatestHealthMetric', () => {
  it('returns null when there are no records', () => {
    expect(getLatestHealthMetric('steps')).toBeNull()
  })

  it('returns the most recent record', () => {
    createHealthDataRecord({
      metric: 'steps',
      value: 8000,
      recordedAt: '2026-07-26T10:00:00.000Z',
      source: 'manual',
    })
    createHealthDataRecord({
      metric: 'steps',
      value: 9500,
      recordedAt: '2026-07-27T10:00:00.000Z',
      source: 'manual',
    })
    expect(getLatestHealthMetric('steps')?.value).toBe(9500)
  })
})

describe('getHealthRecordsForPeriod', () => {
  it('filters records within an inclusive date range', () => {
    createHealthDataRecord({
      metric: 'steps',
      value: 1000,
      recordedAt: '2026-07-01T10:00:00.000Z',
      source: 'manual',
    })
    createHealthDataRecord({
      metric: 'steps',
      value: 2000,
      recordedAt: '2026-07-15T10:00:00.000Z',
      source: 'manual',
    })
    createHealthDataRecord({
      metric: 'steps',
      value: 3000,
      recordedAt: '2026-08-01T10:00:00.000Z',
      source: 'manual',
    })

    const records = getHealthRecordsForPeriod('steps', '2026-07-10T00:00:00.000Z', '2026-07-31T23:59:59.000Z')
    expect(records.map((r) => r.value)).toEqual([2000])
  })
})
