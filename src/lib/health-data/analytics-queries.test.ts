import { describe, it, expect, beforeEach } from 'vitest'
import {
  getConflicts,
  getDailySummary,
  getLatestSummary,
  getMetricBaseline,
  getMetricTrend,
  getQuality,
  getSummaryRange,
} from './analytics-queries'
import { createHealthDataRecord } from './storage'

beforeEach(() => {
  window.localStorage.clear()
})

const NOW = new Date('2026-07-27T12:00:00.000Z')

describe('getSummaryRange', () => {
  it('returns an empty list when there is no history', () => {
    expect(getSummaryRange('30d', NOW)).toEqual([])
  })

  it('only includes days within the requested period', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'steps', value: 5000, recordedAt: '2026-01-01T10:00:00.000Z', source: 'manual' })

    const summaries = getSummaryRange('7d', NOW)
    expect(summaries).toHaveLength(1)
    expect(summaries[0].date).toBe('2026-07-26')
  })
})

describe('getDailySummary / getLatestSummary', () => {
  it('returns null when there is no record for the date', () => {
    expect(getDailySummary('2026-07-26')).toBeNull()
    expect(getLatestSummary()).toBeNull()
  })

  it('finds the summary regardless of period, and the latest one overall', () => {
    createHealthDataRecord({ metric: 'steps', value: 5000, recordedAt: '2026-01-01T10:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'manual' })

    expect(getDailySummary('2026-01-01')?.steps).toBe(5000)
    expect(getLatestSummary()?.date).toBe('2026-07-26')
  })
})

describe('getConflicts', () => {
  it('returns conflicts detected only within the requested period', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'steps', value: 15000, recordedAt: '2026-07-26T11:00:00.000Z', source: 'json_import' })

    expect(getConflicts('7d', NOW)).toHaveLength(1)
    expect(getConflicts('7d', new Date('2026-01-01T00:00:00.000Z'))).toHaveLength(0)
  })
})

describe('getQuality', () => {
  it('returns null for a date without records', () => {
    expect(getQuality('2026-07-26')).toBeNull()
  })

  it('returns the aggregated quality for a date with records', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'manual' })
    expect(getQuality('2026-07-26')?.level).toBe('high')
  })
})

describe('getMetricBaseline', () => {
  it('returns null when the period has an empty history', () => {
    expect(getMetricBaseline('steps', '30d', NOW)).toBeNull()
  })

  it('returns a baseline once enough days of data exist in the period', () => {
    for (let day = 20; day <= 26; day++) {
      createHealthDataRecord({
        metric: 'steps',
        value: 8000 + day,
        recordedAt: `2026-07-${day}T10:00:00.000Z`,
        source: 'manual',
      })
    }
    const baseline = getMetricBaseline('steps', '30d', NOW)
    expect(baseline?.sampleSize).toBe(7)
  })
})

describe('getMetricTrend', () => {
  it('returns insufficient_data for an empty period', () => {
    const trend = getMetricTrend('steps', '30d', NOW)
    expect(trend.direction).toBe('insufficient_data')
  })
})
