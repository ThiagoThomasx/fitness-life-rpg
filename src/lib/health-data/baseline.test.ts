import { describe, it, expect } from 'vitest'
import { computeMetricBaseline, getMinimumBaselineSamples } from './baseline'
import type { DailyHealthSummary } from './types'

function makeSummary(date: string, overrides: Partial<DailyHealthSummary> = {}): DailyHealthSummary {
  return {
    date,
    sources: ['manual'],
    quality: { level: 'high', reasons: [] },
    conflicts: [],
    ...overrides,
  }
}

describe('computeMetricBaseline', () => {
  it('returns null when the sample is below the minimum required for the metric', () => {
    expect(getMinimumBaselineSamples('sleep_duration')).toBe(7)
    const summaries = Array.from({ length: 6 }, (_, i) => makeSummary(`2026-07-${20 + i}`, { sleepMinutes: 420 }))
    expect(computeMetricBaseline(summaries, 'sleep_duration', 7)).toBeNull()
  })

  it('computes mean, median and standard deviation once the sample is sufficient', () => {
    expect(getMinimumBaselineSamples('weight')).toBe(5)
    const values = [80, 79.5, 80.5, 80, 79]
    const summaries = values.map((weightKg, i) => makeSummary(`2026-07-${20 + i}`, { weightKg }))

    const baseline = computeMetricBaseline(summaries, 'weight', 30)
    expect(baseline).not.toBeNull()
    expect(baseline!.sampleSize).toBe(5)
    expect(baseline!.value).toBeCloseTo(79.8, 5)
    expect(baseline!.median).toBe(80)
    expect(baseline!.standardDeviation).toBeGreaterThan(0)
  })

  it('ignores days without a value for the requested metric', () => {
    const summaries = [
      makeSummary('2026-07-20', { steps: 8000 }),
      makeSummary('2026-07-21', {}),
      makeSummary('2026-07-22', { steps: 9000 }),
      makeSummary('2026-07-23', { steps: 8500 }),
      makeSummary('2026-07-24', { steps: 8200 }),
      makeSummary('2026-07-25', { steps: 8700 }),
      makeSummary('2026-07-26', { steps: 8900 }),
      makeSummary('2026-07-27', { steps: 8300 }),
    ]
    const baseline = computeMetricBaseline(summaries, 'steps', 30)
    expect(baseline!.sampleSize).toBe(7)
  })

  it('marks low-sample baselines as lower quality than high-sample ones', () => {
    const lowSampleValues = [50, 51, 52, 53, 54, 55, 56]
    const lowSampleSummaries = lowSampleValues.map((restingHeartRate, i) =>
      makeSummary(`2026-07-${20 + i}`, { restingHeartRate })
    )
    const lowSampleBaseline = computeMetricBaseline(lowSampleSummaries, 'resting_heart_rate', 7)

    const highSampleValues = Array.from({ length: 20 }, () => 55)
    const highSampleSummaries = highSampleValues.map((restingHeartRate, i) =>
      makeSummary(`2026-08-${1 + i}`, { restingHeartRate })
    )
    const highSampleBaseline = computeMetricBaseline(highSampleSummaries, 'resting_heart_rate', 30)

    expect(lowSampleBaseline!.quality.level).not.toBe('high')
    expect(highSampleBaseline!.quality.level).toBe('high')
  })
})
