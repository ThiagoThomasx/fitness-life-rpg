import { describe, it, expect } from 'vitest'
import { computeDailyQuality } from './quality-aggregation'
import type { HealthDataConflict, HealthDataRecord } from './types'

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

function makeConflict(overrides: Partial<HealthDataConflict> = {}): HealthDataConflict {
  return {
    metric: 'steps',
    date: '2026-07-26',
    recordIds: ['a', 'b'],
    sources: ['manual', 'json_import'],
    reason: 'divergência de teste',
    severity: 'low',
    ...overrides,
  }
}

describe('computeDailyQuality', () => {
  it('returns unknown for a day with no records', () => {
    expect(computeDailyQuality([], [])).toEqual({ level: 'unknown', reasons: ['sem registros neste dia'] })
  })

  it('returns high when all records are high quality and there are no conflicts', () => {
    const quality = computeDailyQuality([makeRecord({ quality: 'high' }), makeRecord({ quality: 'high' })], [])
    expect(quality.level).toBe('high')
  })

  it('returns low when a high-severity conflict exists', () => {
    const quality = computeDailyQuality(
      [makeRecord({ quality: 'high' }), makeRecord({ quality: 'high' })],
      [makeConflict({ severity: 'high' })]
    )
    expect(quality.level).toBe('low')
  })

  it('returns low when most records are low/unknown quality', () => {
    const quality = computeDailyQuality(
      [makeRecord({ quality: 'low' }), makeRecord({ quality: 'unknown' }), makeRecord({ quality: 'high' })],
      []
    )
    expect(quality.level).toBe('low')
  })

  it('returns medium when there is a low-severity conflict but records are otherwise fine', () => {
    const quality = computeDailyQuality(
      [makeRecord({ quality: 'high' }), makeRecord({ quality: 'high' })],
      [makeConflict({ severity: 'low' })]
    )
    expect(quality.level).toBe('medium')
  })
})
