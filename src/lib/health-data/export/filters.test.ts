import { describe, it, expect, beforeEach } from 'vitest'
import { createBodyProgressEntry } from '../../body-progress'
import { createHealthDataRecord } from '../storage'
import { getHealthRecordsForExport } from './filters'

const NOW = new Date('2026-07-26T12:00:00.000Z')

beforeEach(() => {
  window.localStorage.clear()
})

describe('getHealthRecordsForExport', () => {
  it('returns all records when no filters are applied', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-20T10:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'sleep_duration', value: 420, recordedAt: '2026-07-21T10:00:00.000Z', source: 'manual' })
    const records = getHealthRecordsForExport({}, NOW)
    expect(records).toHaveLength(2)
  })

  it('filters by metric', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-20T10:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'sleep_duration', value: 420, recordedAt: '2026-07-21T10:00:00.000Z', source: 'manual' })
    const records = getHealthRecordsForExport({ metrics: ['steps'] }, NOW)
    expect(records).toHaveLength(1)
    expect(records[0].metric).toBe('steps')
  })

  it('filters by source', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-20T10:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'steps', value: 9000, recordedAt: '2026-07-21T10:00:00.000Z', source: 'csv_import' })
    const records = getHealthRecordsForExport({ sources: ['csv_import'] }, NOW)
    expect(records).toHaveLength(1)
    expect(records[0].source).toBe('csv_import')
  })

  it('filters by period', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-06-01T10:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'steps', value: 9000, recordedAt: '2026-07-25T10:00:00.000Z', source: 'manual' })
    const records = getHealthRecordsForExport({ period: '7d' }, NOW)
    expect(records).toHaveLength(1)
    expect(records[0].value).toBe(9000)
  })

  it('filters by a custom range', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-06-01T10:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'steps', value: 9000, recordedAt: '2026-07-10T10:00:00.000Z', source: 'manual' })
    const records = getHealthRecordsForExport(
      { customRange: { start: '2026-07-01T00:00:00.000Z', end: '2026-07-31T23:59:59.000Z' } },
      NOW
    )
    expect(records).toHaveLength(1)
    expect(records[0].value).toBe(9000)
  })

  it('excludes weight (from Body Progress) when includeWeight is false', () => {
    createBodyProgressEntry({ recordedAt: '2026-07-20', weightKg: 80 })
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-20T10:00:00.000Z', source: 'manual' })
    const records = getHealthRecordsForExport({ includeWeight: false }, NOW)
    expect(records.some((r) => r.metric === 'weight')).toBe(false)
    expect(records).toHaveLength(1)
  })

  it('includes weight from Body Progress by default', () => {
    createBodyProgressEntry({ recordedAt: '2026-07-20', weightKg: 80 })
    const records = getHealthRecordsForExport({}, NOW)
    expect(records.some((r) => r.metric === 'weight')).toBe(true)
  })

  it('returns an empty array when nothing matches', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-20T10:00:00.000Z', source: 'manual' })
    const records = getHealthRecordsForExport({ metrics: ['sleep_duration'] }, NOW)
    expect(records).toHaveLength(0)
  })

  it('sorts deterministically by recordedAt, then metric, then source, then externalId', () => {
    createHealthDataRecord({ metric: 'steps', value: 9000, recordedAt: '2026-07-20T10:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'sleep_duration', value: 420, recordedAt: '2026-07-20T10:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-19T10:00:00.000Z', source: 'csv_import' })

    const records = getHealthRecordsForExport({}, NOW)
    expect(records.map((r) => `${r.recordedAt}:${r.metric}`)).toEqual([
      '2026-07-19T10:00:00.000Z:steps',
      '2026-07-20T10:00:00.000Z:sleep_duration',
      '2026-07-20T10:00:00.000Z:steps',
    ])
  })
})
