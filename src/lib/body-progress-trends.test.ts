import { describe, it, expect } from 'vitest'
import {
  summarizeWeightTrend,
  summarizeMeasurementTrend,
  comparePeriods,
  DEFAULT_BODY_TREND_CONFIG,
} from './body-progress-trends'
import type { BodyProgressEntry } from './body-progress'

function entry(overrides: Partial<BodyProgressEntry>): BodyProgressEntry {
  return {
    id: overrides.id ?? `e-${overrides.recordedAt}`,
    recordedAt: '2026-08-01',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('summarizeWeightTrend', () => {
  it('returns insufficient_data when no entries have weight', () => {
    const summary = summarizeWeightTrend([entry({ recordedAt: '2026-08-01', notes: 'x' })])
    expect(summary.trend).toBe('insufficient_data')
    expect(summary.sampleSize).toBe(0)
  })

  it('summarizes a decreasing weight series', () => {
    const entries = [
      entry({ recordedAt: '2026-08-01', weightKg: 90 }),
      entry({ recordedAt: '2026-08-08', weightKg: 88 }),
      entry({ recordedAt: '2026-08-15', weightKg: 86 }),
      entry({ recordedAt: '2026-08-22', weightKg: 84 }),
    ]
    const summary = summarizeWeightTrend(entries, DEFAULT_BODY_TREND_CONFIG)
    expect(summary.trend).toBe('decreasing')
    expect(summary.firstValue).toBe(90)
    expect(summary.latestValue).toBe(84)
    expect(summary.absoluteChange).toBe(-6)
    expect(summary.sampleSize).toBe(4)
  })

  it('ignores entries without weightKg when computing the series', () => {
    const entries = [
      entry({ recordedAt: '2026-08-01', weightKg: 90 }),
      entry({ recordedAt: '2026-08-05', notes: 'sem peso' }),
      entry({ recordedAt: '2026-08-08', weightKg: 89 }),
    ]
    const summary = summarizeWeightTrend(entries)
    expect(summary.sampleSize).toBe(2)
  })
})

describe('summarizeMeasurementTrend', () => {
  it('summarizes a named measurement field', () => {
    const entries = [
      entry({ recordedAt: '2026-08-01', measurements: { waistCm: 100 } }),
      entry({ recordedAt: '2026-08-08', measurements: { waistCm: 98 } }),
      entry({ recordedAt: '2026-08-15', measurements: { waistCm: 96 } }),
    ]
    const summary = summarizeMeasurementTrend(entries, 'waistCm')
    expect(summary.trend).toBe('decreasing')
    expect(summary.metric).toBe('waistCm')
  })

  it('summarizes a custom measurement by id', () => {
    const entries = [
      entry({ recordedAt: '2026-08-01', measurements: { custom: [{ id: 'punho', label: 'Punho', valueCm: 17 }] } }),
      entry({ recordedAt: '2026-08-08', measurements: { custom: [{ id: 'punho', label: 'Punho', valueCm: 17.2 }] } }),
      entry({ recordedAt: '2026-08-15', measurements: { custom: [{ id: 'punho', label: 'Punho', valueCm: 17.1 }] } }),
    ]
    const summary = summarizeMeasurementTrend(entries, 'punho')
    expect(summary.sampleSize).toBe(3)
    expect(summary.trend).toBe('stable')
  })

  it('returns insufficient_data when the field is never present', () => {
    const entries = [entry({ recordedAt: '2026-08-01', measurements: { chestCm: 100 } })]
    const summary = summarizeMeasurementTrend(entries, 'waistCm')
    expect(summary.trend).toBe('insufficient_data')
  })
})

describe('comparePeriods', () => {
  const entries = [
    entry({ recordedAt: '2026-07-01', weightKg: 92, measurements: { waistCm: 105 } }),
    entry({ recordedAt: '2026-07-15', weightKg: 90, measurements: { waistCm: 102 } }),
    entry({ recordedAt: '2026-08-01', weightKg: 88, measurements: { waistCm: 99 } }),
    entry({ recordedAt: '2026-08-15', weightKg: 86, measurements: { waistCm: 97 } }),
  ]

  it('summarizes each period independently without declaring a winner', () => {
    const result = comparePeriods(
      entries,
      { startDate: '2026-07-01', endDate: '2026-07-31' },
      { startDate: '2026-08-01', endDate: '2026-08-31' }
    )
    expect(result.periodA.entryCount).toBe(2)
    expect(result.periodA.weightAverage).toBe(91)
    expect(result.periodA.measurementAverages.waistCm).toBeCloseTo(103.5)

    expect(result.periodB.entryCount).toBe(2)
    expect(result.periodB.weightAverage).toBe(87)
    expect(result.periodB.measurementAverages.waistCm).toBeCloseTo(98)

    // No "winner" field exists on PeriodSummary — this is a structural guarantee.
    expect(result.periodA).not.toHaveProperty('winner')
    expect(result.periodB).not.toHaveProperty('winner')
  })

  it('handles an empty period gracefully', () => {
    const result = comparePeriods(entries, { startDate: '2026-01-01', endDate: '2026-01-31' }, { startDate: '2026-08-01', endDate: '2026-08-31' })
    expect(result.periodA.entryCount).toBe(0)
    expect(result.periodA.weightAverage).toBeUndefined()
  })
})
