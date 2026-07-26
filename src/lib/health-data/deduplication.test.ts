import { describe, it, expect } from 'vitest'
import { computeDedupKey, deduplicateRecords } from './deduplication'
import type { HealthDataRecord } from './types'

function makeRecord(overrides: Partial<HealthDataRecord> = {}): HealthDataRecord {
  return {
    id: overrides.id ?? `health-steps-${Math.random().toString(36).slice(2)}`,
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

describe('computeDedupKey', () => {
  it('prioritizes source + externalId when present', () => {
    const a = makeRecord({ externalId: 'ext-1', source: 'health_connect', recordedAt: '2026-07-26T10:00:00.000Z' })
    const b = makeRecord({ externalId: 'ext-1', source: 'health_connect', recordedAt: '2026-07-27T10:00:00.000Z', value: 9000 })
    expect(computeDedupKey(a)).toBe(computeDedupKey(b))
  })

  it('falls back to metric + source + recordedAt without externalId', () => {
    const a = makeRecord({ value: 8000 })
    const b = makeRecord({ value: 8000 })
    expect(computeDedupKey(a)).toBe(computeDedupKey(b))
  })

  it('treats different sources as different identities', () => {
    const a = makeRecord({ source: 'manual' })
    const b = makeRecord({ source: 'json_import' })
    expect(computeDedupKey(a)).not.toBe(computeDedupKey(b))
  })
})

describe('deduplicateRecords', () => {
  it('drops a candidate that duplicates an existing record', () => {
    const existing = [makeRecord({ id: 'a' })]
    const candidate = makeRecord({ id: 'b' })
    const result = deduplicateRecords(existing, [candidate])
    expect(result.unique).toHaveLength(0)
    expect(result.duplicates).toHaveLength(1)
  })

  it('keeps a candidate that does not duplicate anything', () => {
    const existing = [makeRecord({ id: 'a', recordedAt: '2026-07-25T10:00:00.000Z' })]
    const candidate = makeRecord({ id: 'b', recordedAt: '2026-07-26T10:00:00.000Z' })
    const result = deduplicateRecords(existing, [candidate])
    expect(result.unique).toHaveLength(1)
    expect(result.duplicates).toHaveLength(0)
  })

  it('deduplicates candidates against each other, keeping the first', () => {
    const candidate1 = makeRecord({ id: 'a' })
    const candidate2 = makeRecord({ id: 'b' })
    const result = deduplicateRecords([], [candidate1, candidate2])
    expect(result.unique).toHaveLength(1)
    expect(result.unique[0].id).toBe('a')
    expect(result.duplicates).toHaveLength(1)
  })

  it('treats records from different sources as distinct even with the same value/date', () => {
    const existing = [makeRecord({ id: 'a', source: 'manual' })]
    const candidate = makeRecord({ id: 'b', source: 'json_import' })
    const result = deduplicateRecords(existing, [candidate])
    expect(result.unique).toHaveLength(1)
  })
})
