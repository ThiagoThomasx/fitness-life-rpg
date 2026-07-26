import { describe, it, expect } from 'vitest'
import { compareHealthRecordSets } from './round-trip'
import type { HealthDataRecord } from '../types'

function record(overrides: Partial<HealthDataRecord> = {}): HealthDataRecord {
  return {
    id: 'health-steps-1',
    metric: 'steps',
    value: 8000,
    unit: 'count',
    recordedAt: '2026-07-20T10:00:00.000Z',
    source: 'manual',
    importedAt: '2026-07-20T10:05:00.000Z',
    quality: 'high',
    ...overrides,
  }
}

describe('compareHealthRecordSets', () => {
  it('is equivalent when only id/importedAt differ', () => {
    const a = [record({ id: 'a1', importedAt: '2026-07-20T10:05:00.000Z' })]
    const b = [record({ id: 'b1', importedAt: '2026-07-26T12:00:00.000Z' })]
    const result = compareHealthRecordSets(a, b)
    expect(result.equivalent).toBe(true)
  })

  it('detects a real value mismatch', () => {
    const a = [record({ value: 8000 })]
    const b = [record({ value: 8500 })]
    const result = compareHealthRecordSets(a, b)
    expect(result.equivalent).toBe(false)
    expect(result.onlyInA).toHaveLength(1)
    expect(result.onlyInB).toHaveLength(1)
  })

  it('detects a missing record', () => {
    const a = [record({ id: 'a1' }), record({ id: 'a2', recordedAt: '2026-07-21T10:00:00.000Z' })]
    const b = [record({ id: 'b1' })]
    const result = compareHealthRecordSets(a, b)
    expect(result.equivalent).toBe(false)
    expect(result.onlyInA).toHaveLength(1)
  })

  it('treats source/externalId/quality as equivalent for weight (Body Progress round-trip)', () => {
    const a = [record({ metric: 'weight', unit: 'kg', value: 80, source: 'json_import', externalId: 'orig-1', quality: 'medium' })]
    const b = [record({ metric: 'weight', unit: 'kg', value: 80, source: 'body_progress', externalId: 'bp-entry-1', quality: 'high' })]
    const result = compareHealthRecordSets(a, b)
    expect(result.equivalent).toBe(true)
  })

  it('still detects a real weight value mismatch', () => {
    const a = [record({ metric: 'weight', unit: 'kg', value: 80, source: 'json_import' })]
    const b = [record({ metric: 'weight', unit: 'kg', value: 81, source: 'body_progress' })]
    const result = compareHealthRecordSets(a, b)
    expect(result.equivalent).toBe(false)
  })

  it('matches duplicate records one-to-one (does not over- or under-count)', () => {
    const a = [record({ id: 'a1' }), record({ id: 'a2' })]
    const b = [record({ id: 'b1' })]
    const result = compareHealthRecordSets(a, b)
    expect(result.equivalent).toBe(false)
    expect(result.onlyInA).toHaveLength(1)
  })

  it('is equivalent for two identical empty sets', () => {
    expect(compareHealthRecordSets([], []).equivalent).toBe(true)
  })

  it('compares metadata content, not just presence', () => {
    const a = [record({ metadata: { note: 'a' } })]
    const b = [record({ metadata: { note: 'b' } })]
    expect(compareHealthRecordSets(a, b).equivalent).toBe(false)
  })
})
