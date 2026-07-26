import { describe, it, expect } from 'vitest'
import { buildHealthDataRecord, normalizeUnit } from './normalization'
import type { NewHealthDataRecordInput } from './types'

describe('normalizeUnit', () => {
  it('keeps a value already in the canonical unit unchanged', () => {
    expect(normalizeUnit('weight', 80, 'kg')).toEqual({ value: 80, unit: 'kg' })
  })

  it('defaults to the canonical unit when none is given', () => {
    expect(normalizeUnit('steps', 8000)).toEqual({ value: 8000, unit: 'count' })
  })

  it('converts pounds to kilograms', () => {
    const result = normalizeUnit('weight', 176.37, 'lb')
    expect(result).not.toBeNull()
    expect(result!.value).toBeCloseTo(80, 1)
    expect(result!.unit).toBe('kg')
    expect(result!.originalUnit).toBe('lb')
  })

  it('converts meters to kilometers', () => {
    const result = normalizeUnit('distance', 5000, 'm')
    expect(result).not.toBeNull()
    expect(result!.value).toBeCloseTo(5, 5)
  })

  it('converts hours to minutes', () => {
    const result = normalizeUnit('sleep_duration', 7, 'hours')
    expect(result).not.toBeNull()
    expect(result!.value).toBe(420)
  })

  it('rejects an unsupported unit for the metric', () => {
    expect(normalizeUnit('weight', 80, 'stone')).toBeNull()
  })

  it('rejects a unit for a metric that has no conversion table', () => {
    expect(normalizeUnit('steps', 8000, 'miles')).toBeNull()
  })
})

describe('buildHealthDataRecord', () => {
  it('assembles a record with a generated id and importedAt', () => {
    const input: NewHealthDataRecordInput = {
      metric: 'steps',
      value: 8000,
      recordedAt: '2026-07-26T10:00:00.000Z',
      source: 'manual',
    }
    const record = buildHealthDataRecord(input, { value: 8000, unit: 'count' }, 'high')
    expect(record.id).toMatch(/^health-steps-/)
    expect(record.metric).toBe('steps')
    expect(record.value).toBe(8000)
    expect(record.unit).toBe('count')
    expect(record.quality).toBe('high')
    expect(record.importedAt).toBeTruthy()
  })

  it('records the original unit in metadata when a conversion happened', () => {
    const input: NewHealthDataRecordInput = {
      metric: 'weight',
      value: 176.37,
      unit: 'lb',
      recordedAt: '2026-07-26T10:00:00.000Z',
      source: 'manual',
    }
    const normalized = { value: 80, unit: 'kg', originalUnit: 'lb' }
    const record = buildHealthDataRecord(input, normalized, 'high')
    expect(record.metadata?.originalUnit).toBe('lb')
  })
})
