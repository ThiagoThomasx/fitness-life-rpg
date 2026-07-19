import { describe, it, expect } from 'vitest'
import { classifyTrend, DEFAULT_TREND_CONFIG, type TrendPoint } from './trend-math'

function series(values: number[], startDate = '2026-08-01'): TrendPoint[] {
  const start = new Date(startDate + 'T12:00:00')
  return values.map((value, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return { date: d.toISOString().slice(0, 10), value }
  })
}

describe('classifyTrend', () => {
  it('returns insufficient_data below the minimum sample size', () => {
    const result = classifyTrend(series([80, 79]), DEFAULT_TREND_CONFIG)
    expect(result.trend).toBe('insufficient_data')
    expect(result.sampleSize).toBe(2)
  })

  it('classifies a clearly increasing series', () => {
    const result = classifyTrend(series([70, 72, 74, 76, 78]), DEFAULT_TREND_CONFIG)
    expect(result.trend).toBe('increasing')
  })

  it('classifies a clearly decreasing series', () => {
    const result = classifyTrend(series([80, 78, 76, 74, 72]), DEFAULT_TREND_CONFIG)
    expect(result.trend).toBe('decreasing')
  })

  it('classifies a flat series as stable', () => {
    const result = classifyTrend(series([80, 80.1, 79.9, 80, 80.05]), DEFAULT_TREND_CONFIG)
    expect(result.trend).toBe('stable')
  })

  it('classifies a zig-zagging series as irregular', () => {
    const result = classifyTrend(series([80, 85, 78, 86, 77, 88]), DEFAULT_TREND_CONFIG)
    expect(result.trend).toBe('irregular')
  })

  it('is unordered-input safe (sorts internally by date)', () => {
    const points = series([70, 72, 74, 76, 78])
    const shuffled = [points[3], points[0], points[4], points[1], points[2]]
    const result = classifyTrend(shuffled, DEFAULT_TREND_CONFIG)
    expect(result.trend).toBe('increasing')
  })

  it('only considers the recent window, not the full history', () => {
    // Older history trending down, but the most recent window is flat.
    const older = series([100, 95, 90, 85], '2026-01-01')
    const recentFlat = series([80, 80.1, 79.9, 80, 80.05], '2026-08-01')
    const result = classifyTrend([...older, ...recentFlat], { ...DEFAULT_TREND_CONFIG, recentWindowEntries: 5 })
    expect(result.trend).toBe('stable')
  })
})
