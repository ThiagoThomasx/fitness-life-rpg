import { describe, it, expect } from 'vitest'
import { buildDailySummaries, buildDailySummaryForDate } from './aggregation'
import type { HealthDataRecord } from './types'

function makeRecord(overrides: Partial<HealthDataRecord> = {}): HealthDataRecord {
  return {
    id: overrides.id ?? `health-${Math.random().toString(36).slice(2)}`,
    metric: 'steps',
    value: 8000,
    unit: 'count',
    recordedAt: '2026-07-26T10:00:00.000Z',
    source: 'manual',
    importedAt: '2026-07-26T10:00:00.000Z',
    quality: 'high',
    ...overrides,
  }
}

describe('buildDailySummaries', () => {
  it('returns an empty list for an empty history', () => {
    expect(buildDailySummaries([])).toEqual([])
  })

  it('summarizes a single record', () => {
    const summaries = buildDailySummaries([makeRecord({ value: 9000 })])
    expect(summaries).toHaveLength(1)
    expect(summaries[0].date).toBe('2026-07-26')
    expect(summaries[0].steps).toBe(9000)
    expect(summaries[0].sources).toEqual(['manual'])
  })

  it('groups multiple records across different days', () => {
    const summaries = buildDailySummaries([
      makeRecord({ value: 8000, recordedAt: '2026-07-26T10:00:00.000Z' }),
      makeRecord({ value: 9000, recordedAt: '2026-07-27T10:00:00.000Z' }),
    ])
    expect(summaries).toHaveLength(2)
    expect(summaries.map((s) => s.date)).toEqual(['2026-07-27', '2026-07-26'])
  })

  describe('steps', () => {
    it('takes the max value from the highest-priority source, never summing sources', () => {
      const summaries = buildDailySummaries([
        makeRecord({ metric: 'steps', value: 8000, source: 'manual' }),
        makeRecord({ metric: 'steps', value: 12300, source: 'json_import' }),
      ])
      expect(summaries[0].steps).toBe(8000)
    })

    it('takes the max reading within the winning source across the day', () => {
      const summaries = buildDailySummaries([
        makeRecord({ metric: 'steps', value: 3000, source: 'manual', recordedAt: '2026-07-26T08:00:00.000Z' }),
        makeRecord({ metric: 'steps', value: 8000, source: 'manual', recordedAt: '2026-07-26T20:00:00.000Z' }),
      ])
      expect(summaries[0].steps).toBe(8000)
    })
  })

  describe('weight', () => {
    it('uses the most recent record of the day, never an average', () => {
      const summaries = buildDailySummaries([
        makeRecord({ metric: 'weight', unit: 'kg', value: 80, source: 'manual', recordedAt: '2026-07-26T07:00:00.000Z' }),
        makeRecord({
          metric: 'weight',
          unit: 'kg',
          value: 79.5,
          source: 'body_progress',
          recordedAt: '2026-07-26T20:00:00.000Z',
        }),
      ])
      expect(summaries[0].weightKg).toBe(79.5)
    })
  })

  describe('sleep_duration', () => {
    it('sums a single interval record', () => {
      const summaries = buildDailySummaries([
        makeRecord({
          metric: 'sleep_duration',
          unit: 'minutes',
          value: 420,
          source: 'wellness',
          recordedAt: '2026-07-26T07:00:00.000Z',
          startAt: '2026-07-25T23:00:00.000Z',
          endAt: '2026-07-26T06:00:00.000Z',
        }),
      ])
      expect(summaries[0].sleepMinutes).toBe(420)
    })

    it('merges overlapping intervals from the same source instead of summing them', () => {
      const summaries = buildDailySummaries([
        makeRecord({
          metric: 'sleep_duration',
          unit: 'minutes',
          value: 480,
          source: 'wellness',
          recordedAt: '2026-07-26T07:00:00.000Z',
          startAt: '2026-07-25T23:00:00.000Z',
          endAt: '2026-07-26T07:00:00.000Z',
        }),
        makeRecord({
          metric: 'sleep_duration',
          unit: 'minutes',
          value: 330,
          source: 'wellness',
          recordedAt: '2026-07-26T06:30:00.000Z',
          startAt: '2026-07-26T00:30:00.000Z',
          endAt: '2026-07-26T06:00:00.000Z',
        }),
      ])
      // union of 23:00-07:00 and 00:30-06:00 is still 23:00-07:00 = 480min, never 810min.
      expect(summaries[0].sleepMinutes).toBe(480)
    })
  })

  describe('resting_heart_rate', () => {
    it('takes the median across all sources of the day', () => {
      const summaries = buildDailySummaries([
        makeRecord({ metric: 'resting_heart_rate', unit: 'bpm', value: 52, source: 'manual' }),
        makeRecord({ metric: 'resting_heart_rate', unit: 'bpm', value: 58, source: 'json_import' }),
        makeRecord({ metric: 'resting_heart_rate', unit: 'bpm', value: 60, source: 'csv_import' }),
      ])
      expect(summaries[0].restingHeartRate).toBe(58)
    })
  })

  describe('activity_duration', () => {
    it('sums non-overlapping activity events', () => {
      const summaries = buildDailySummaries([
        makeRecord({
          metric: 'activity_duration',
          unit: 'minutes',
          value: 30,
          source: 'workout',
          startAt: '2026-07-26T07:00:00.000Z',
          endAt: '2026-07-26T07:30:00.000Z',
        }),
        makeRecord({
          metric: 'activity_duration',
          unit: 'minutes',
          value: 45,
          source: 'workout',
          startAt: '2026-07-26T18:00:00.000Z',
          endAt: '2026-07-26T18:45:00.000Z',
        }),
      ])
      expect(summaries[0].activityMinutes).toBe(75)
    })
  })

  describe('active_calories', () => {
    it('takes the max from the winning source, never sums totals from two sources', () => {
      const summaries = buildDailySummaries([
        makeRecord({ metric: 'active_calories', unit: 'kcal', value: 400, source: 'workout' }),
        makeRecord({ metric: 'active_calories', unit: 'kcal', value: 650, source: 'json_import' }),
      ])
      expect(summaries[0].activeCalories).toBe(400)
    })
  })

  describe('distance', () => {
    it('sums independent events from the winning source', () => {
      const summaries = buildDailySummaries([
        makeRecord({ metric: 'distance', unit: 'km', value: 3, source: 'workout' }),
        makeRecord({ metric: 'distance', unit: 'km', value: 5, source: 'workout' }),
      ])
      expect(summaries[0].distanceKm).toBe(8)
    })
  })
})

describe('buildDailySummaryForDate', () => {
  it('returns null for an empty history', () => {
    expect(buildDailySummaryForDate([], '2026-07-26')).toBeNull()
  })

  it('returns null when there is no record for that date', () => {
    const records = [makeRecord({ recordedAt: '2026-07-25T10:00:00.000Z' })]
    expect(buildDailySummaryForDate(records, '2026-07-26')).toBeNull()
  })

  it('returns the summary for the requested date only', () => {
    const records = [
      makeRecord({ value: 8000, recordedAt: '2026-07-25T10:00:00.000Z' }),
      makeRecord({ value: 9000, recordedAt: '2026-07-26T10:00:00.000Z' }),
    ]
    const summary = buildDailySummaryForDate(records, '2026-07-26')
    expect(summary?.steps).toBe(9000)
  })
})
