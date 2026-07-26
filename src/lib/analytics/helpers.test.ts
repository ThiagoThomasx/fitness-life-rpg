import { describe, it, expect } from 'vitest'
import { resolvePeriodRange, filterByDateRange, comparePeriods, sampleConfidence } from './helpers'
import type { DateRange } from './types'

const NOW = new Date('2026-07-25T12:00:00.000Z')

describe('resolvePeriodRange', () => {
  it('resolves 7d ending at now', () => {
    const range = resolvePeriodRange('7d', NOW)
    expect(range.end).toEqual(NOW)
    expect(range.start.toISOString().slice(0, 10)).toBe('2026-07-18')
  })

  it('resolves 30d ending at now', () => {
    const range = resolvePeriodRange('30d', NOW)
    expect(range.start.toISOString().slice(0, 10)).toBe('2026-06-25')
  })

  it('resolves 90d ending at now', () => {
    const range = resolvePeriodRange('90d', NOW)
    expect(range.start.toISOString().slice(0, 10)).toBe('2026-04-26')
  })

  it('resolves 6m ending at now', () => {
    const range = resolvePeriodRange('6m', NOW)
    expect(range.start.toISOString().slice(0, 10)).toBe('2026-01-25')
  })

  it('resolves 1y ending at now', () => {
    const range = resolvePeriodRange('1y', NOW)
    expect(range.start.toISOString().slice(0, 10)).toBe('2025-07-25')
  })

  it('resolves all as an open-ended range starting from the epoch', () => {
    const range = resolvePeriodRange('all', NOW)
    expect(range.start.getTime()).toBe(0)
    expect(range.end).toEqual(NOW)
  })

  it('defaults now to the current date when omitted', () => {
    const before = Date.now()
    const range = resolvePeriodRange('7d')
    const after = Date.now()
    expect(range.end.getTime()).toBeGreaterThanOrEqual(before)
    expect(range.end.getTime()).toBeLessThanOrEqual(after)
  })
})

describe('filterByDateRange', () => {
  const range: DateRange = { start: new Date('2026-07-01T00:00:00Z'), end: new Date('2026-07-31T23:59:59Z') }

  it('returns an empty array for an empty input', () => {
    expect(filterByDateRange<{ date: string }>([], range, (i) => i.date)).toEqual([])
  })

  it('keeps every item when all are in range', () => {
    const items = [{ date: '2026-07-05' }, { date: '2026-07-20' }]
    expect(filterByDateRange(items, range, (i) => i.date)).toEqual(items)
  })

  it('excludes every item when all are out of range', () => {
    const items = [{ date: '2026-06-01' }, { date: '2026-08-15' }]
    expect(filterByDateRange(items, range, (i) => i.date)).toEqual([])
  })

  it('includes items exactly at the start boundary', () => {
    const items = [{ date: '2026-07-01T00:00:00Z' }]
    expect(filterByDateRange(items, range, (i) => i.date)).toEqual(items)
  })

  it('includes items exactly at the end boundary', () => {
    const items = [{ date: '2026-07-31T23:59:59Z' }]
    expect(filterByDateRange(items, range, (i) => i.date)).toEqual(items)
  })

  it('excludes items just outside the boundaries', () => {
    const items = [{ date: '2026-06-30T23:59:59Z' }, { date: '2026-08-01T00:00:00Z' }]
    expect(filterByDateRange(items, range, (i) => i.date)).toEqual([])
  })

  it('accepts Date objects returned by getDate', () => {
    const items = [{ when: new Date('2026-07-10T00:00:00Z') }]
    expect(filterByDateRange(items, range, (i) => i.when)).toEqual(items)
  })
})

describe('comparePeriods', () => {
  it('returns insufficient_data with null changePercent when both periods are zero', () => {
    expect(comparePeriods(0, 0)).toEqual({ changePercent: null, direction: 'insufficient_data' })
  })

  it('returns increasing with null changePercent when previous is zero and current is positive', () => {
    expect(comparePeriods(10, 0)).toEqual({ changePercent: null, direction: 'increasing' })
  })

  it('treats a swing within the ±5% tolerance as stable', () => {
    const result = comparePeriods(103, 100)
    expect(result.direction).toBe('stable')
    expect(result.changePercent).toBeCloseTo(3)
  })

  it('classifies a clear increase above tolerance', () => {
    const result = comparePeriods(120, 100)
    expect(result.direction).toBe('increasing')
    expect(result.changePercent).toBeCloseTo(20)
  })

  it('classifies a clear decrease below tolerance', () => {
    const result = comparePeriods(80, 100)
    expect(result.direction).toBe('decreasing')
    expect(result.changePercent).toBeCloseTo(-20)
  })

  it('classifies the exact tolerance boundary as stable', () => {
    const result = comparePeriods(105, 100)
    expect(result.direction).toBe('stable')
  })
})

describe('sampleConfidence', () => {
  it('returns insufficient for zero samples', () => {
    expect(sampleConfidence(0)).toBe('insufficient')
  })

  it('returns low for 1-2 samples', () => {
    expect(sampleConfidence(1)).toBe('low')
    expect(sampleConfidence(2)).toBe('low')
  })

  it('returns medium for 3-5 samples', () => {
    expect(sampleConfidence(3)).toBe('medium')
    expect(sampleConfidence(5)).toBe('medium')
  })

  it('returns high for 6 or more samples', () => {
    expect(sampleConfidence(6)).toBe('high')
    expect(sampleConfidence(100)).toBe('high')
  })
})
