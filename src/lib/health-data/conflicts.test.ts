import { describe, it, expect } from 'vitest'
import { detectConflicts, getConflictsForDay } from './conflicts'
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

describe('detectConflicts', () => {
  it('returns no conflicts for an empty history', () => {
    expect(detectConflicts([])).toEqual([])
  })

  it('returns no conflict when only one source reports a metric that day', () => {
    const conflicts = detectConflicts([makeRecord({ value: 8000, source: 'manual' })])
    expect(conflicts).toEqual([])
  })

  it('flags a real conflict between two divergent sources', () => {
    const conflicts = detectConflicts([
      makeRecord({ id: 'a', value: 8000, source: 'manual' }),
      makeRecord({ id: 'b', value: 12300, source: 'json_import' }),
    ])
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].metric).toBe('steps')
    expect(conflicts[0].date).toBe('2026-07-26')
    expect(conflicts[0].sources.sort()).toEqual(['json_import', 'manual'])
    expect(conflicts[0].reason).toContain('Passos')
  })

  it('does not flag a duplicate value from two sources as a conflict', () => {
    const conflicts = detectConflicts([
      makeRecord({ id: 'a', value: 8000, source: 'manual' }),
      makeRecord({ id: 'b', value: 8050, source: 'json_import' }),
    ])
    expect(conflicts).toEqual([])
  })

  it('detects overlapping-source divergence for interval metrics', () => {
    const conflicts = detectConflicts([
      makeRecord({
        id: 'a',
        metric: 'sleep_duration',
        unit: 'minutes',
        value: 480,
        source: 'wellness',
        startAt: '2026-07-25T23:00:00.000Z',
        endAt: '2026-07-26T07:00:00.000Z',
      }),
      makeRecord({
        id: 'b',
        metric: 'sleep_duration',
        unit: 'minutes',
        value: 200,
        source: 'json_import',
        startAt: '2026-07-26T01:00:00.000Z',
        endAt: '2026-07-26T04:20:00.000Z',
      }),
    ])
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].metric).toBe('sleep_duration')
  })

  it('assigns higher severity to larger divergences', () => {
    const small = detectConflicts([
      makeRecord({ id: 'a', metric: 'resting_heart_rate', unit: 'bpm', value: 55, source: 'manual' }),
      makeRecord({ id: 'b', metric: 'resting_heart_rate', unit: 'bpm', value: 65, source: 'json_import' }),
    ])
    const large = detectConflicts([
      makeRecord({ id: 'a', metric: 'resting_heart_rate', unit: 'bpm', value: 50, source: 'manual' }),
      makeRecord({ id: 'b', metric: 'resting_heart_rate', unit: 'bpm', value: 100, source: 'json_import' }),
    ])
    expect(small[0].severity).toBe('low')
    expect(large[0].severity).toBe('high')
  })

  it('resolved-by-priority is future work: conflicts are only reported, never merged away', () => {
    const conflicts = detectConflicts([
      makeRecord({ id: 'a', value: 8000, source: 'manual' }),
      makeRecord({ id: 'b', value: 12300, source: 'json_import' }),
    ])
    expect(conflicts[0].recordIds.sort()).toEqual(['a', 'b'])
  })
})

describe('getConflictsForDay', () => {
  it('filters conflicts to a specific date', () => {
    const conflicts = detectConflicts([
      makeRecord({ id: 'a', value: 8000, source: 'manual', recordedAt: '2026-07-25T10:00:00.000Z' }),
      makeRecord({ id: 'b', value: 12300, source: 'json_import', recordedAt: '2026-07-25T10:00:00.000Z' }),
      makeRecord({ id: 'c', value: 9000, source: 'manual', recordedAt: '2026-07-26T10:00:00.000Z' }),
      makeRecord({ id: 'd', value: 15000, source: 'json_import', recordedAt: '2026-07-26T10:00:00.000Z' }),
    ])
    expect(getConflictsForDay(conflicts, '2026-07-26')).toHaveLength(1)
  })
})
