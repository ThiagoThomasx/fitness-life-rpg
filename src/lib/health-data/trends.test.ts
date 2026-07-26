import { describe, it, expect } from 'vitest'
import { computeMetricTrend } from './trends'
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

describe('computeMetricTrend', () => {
  it('returns insufficient_data with too few samples', () => {
    const summaries = [makeSummary('2026-07-25', { steps: 8000 }), makeSummary('2026-07-26', { steps: 8200 })]
    const trend = computeMetricTrend(summaries, 'steps', 7)
    expect(trend.direction).toBe('insufficient_data')
    expect(trend.sampleSize).toBe(2)
  })

  it('classifies a clearly increasing series', () => {
    const values = [400, 405, 415, 430, 450, 470]
    const summaries = values.map((sleepMinutes, i) => makeSummary(`2026-07-${20 + i}`, { sleepMinutes }))
    const trend = computeMetricTrend(summaries, 'sleep_duration', 30)
    expect(trend.direction).toBe('increasing')
    expect(trend.changeAbsolute).not.toBeNull()
    expect(trend.evidence).toContain('crescente')
  })

  it('classifies a clearly decreasing series', () => {
    const values = [70, 68, 65, 60, 55]
    const summaries = values.map((restingHeartRate, i) => makeSummary(`2026-07-${20 + i}`, { restingHeartRate }))
    const trend = computeMetricTrend(summaries, 'resting_heart_rate', 30)
    expect(trend.direction).toBe('decreasing')
  })

  it('classifies a flat series as stable', () => {
    const values = [8000, 8010, 7995, 8005, 8000]
    const summaries = values.map((steps, i) => makeSummary(`2026-07-${20 + i}`, { steps }))
    const trend = computeMetricTrend(summaries, 'steps', 30)
    expect(trend.direction).toBe('stable')
  })

  it('classifies a noisy zig-zag series as irregular', () => {
    const values = [80, 90, 70, 95, 65, 100]
    const summaries = values.map((steps, i) => makeSummary(`2026-07-${20 + i}`, { steps }))
    const trend = computeMetricTrend(summaries, 'steps', 30)
    expect(trend.direction).toBe('irregular')
  })

  it('only considers days with a value for the requested metric within the window', () => {
    const summaries = [
      makeSummary('2026-07-20', { steps: 8000 }),
      makeSummary('2026-07-21', {}),
      makeSummary('2026-07-22', { steps: 8500 }),
      makeSummary('2026-07-23', { steps: 9000 }),
    ]
    const trend = computeMetricTrend(summaries, 'steps', 7)
    expect(trend.sampleSize).toBe(3)
  })
})
