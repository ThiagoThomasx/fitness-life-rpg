import { describe, it, expect } from 'vitest'
import { computeRecordQuality } from './quality'
import type { NewHealthDataRecordInput } from './types'

describe('computeRecordQuality', () => {
  it('rates a complete manual entry as high quality', () => {
    const input: NewHealthDataRecordInput = {
      metric: 'steps',
      value: 8000,
      recordedAt: '2026-07-26T10:00:00.000Z',
      source: 'manual',
    }
    expect(computeRecordQuality(input).level).toBe('high')
  })

  it('rates an import source as at most medium', () => {
    const input: NewHealthDataRecordInput = {
      metric: 'steps',
      value: 8000,
      recordedAt: '2026-07-26T10:00:00.000Z',
      source: 'json_import',
    }
    expect(computeRecordQuality(input).level).not.toBe('high')
  })

  it('flags a sleep record with no start/end as lower quality', () => {
    const input: NewHealthDataRecordInput = {
      metric: 'sleep_duration',
      value: 420,
      recordedAt: '2026-07-26T07:00:00.000Z',
      source: 'manual',
    }
    const quality = computeRecordQuality(input)
    expect(quality.level).not.toBe('high')
    expect(quality.reasons.some((r) => r.includes('intervalo'))).toBe(true)
  })

  it('rates a sleep record with a full interval as high quality', () => {
    const input: NewHealthDataRecordInput = {
      metric: 'sleep_duration',
      value: 420,
      recordedAt: '2026-07-26T07:00:00.000Z',
      startAt: '2026-07-26T00:00:00.000Z',
      endAt: '2026-07-26T07:00:00.000Z',
      source: 'manual',
    }
    expect(computeRecordQuality(input).level).toBe('high')
  })

  it('flags a value near the plausible range edge', () => {
    const input: NewHealthDataRecordInput = {
      metric: 'resting_heart_rate',
      value: 21,
      recordedAt: '2026-07-26T07:00:00.000Z',
      source: 'manual',
    }
    const quality = computeRecordQuality(input)
    expect(quality.reasons.some((r) => r.includes('limite'))).toBe(true)
  })

  it('combines multiple low-confidence reasons into a low rating', () => {
    const input: NewHealthDataRecordInput = {
      metric: 'sleep_duration',
      value: 1439,
      recordedAt: '2026-07-26T07:00:00.000Z',
      source: 'csv_import',
    }
    expect(computeRecordQuality(input).level).toBe('low')
  })
})
