import { describe, it, expect } from 'vitest'
import { buildHealthDataCanonicalExport, serializeHealthDataCanonicalExport } from './canonical-json'
import { parseHealthDataJsonImport } from '../import-json'
import type { HealthDataRecord } from '../types'

const NOW = new Date('2026-07-26T12:00:00.000Z')

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

describe('buildHealthDataCanonicalExport', () => {
  it('includes version, exportedAt, filters, recordCount and records', () => {
    const records = [record()]
    const payload = buildHealthDataCanonicalExport(records, { period: '30d' }, NOW)
    expect(payload.version).toBe(1)
    expect(payload.exportedAt).toBe('2026-07-26T12:00:00.000Z')
    expect(payload.filters).toEqual({ period: '30d' })
    expect(payload.recordCount).toBe(1)
    expect(payload.records).toEqual(records)
  })

  it('produces an empty export for an empty record set', () => {
    const payload = buildHealthDataCanonicalExport([], {}, NOW)
    expect(payload.recordCount).toBe(0)
    expect(payload.records).toEqual([])
  })
})

describe('JSON export round-trip through the existing importer', () => {
  it('is accepted by parseHealthDataJsonImport unchanged', () => {
    const records = [record(), record({ id: 'health-steps-2', value: 9000, recordedAt: '2026-07-21T10:00:00.000Z' })]
    const payload = buildHealthDataCanonicalExport(records, {}, NOW)
    const serialized = serializeHealthDataCanonicalExport(payload)

    const parsed = parseHealthDataJsonImport(serialized)
    expect(parsed.ok).toBe(true)
    expect(parsed.items).toHaveLength(2)
    expect(parsed.items.every((item) => item.error === undefined)).toBe(true)
  })

  it('preserves metric/value/unit/recordedAt/source/externalId through serialization', () => {
    const records = [record({ externalId: 'ext-1', unit: 'count' })]
    const payload = buildHealthDataCanonicalExport(records, {}, NOW)
    const parsed = parseHealthDataJsonImport(serializeHealthDataCanonicalExport(payload))

    expect(parsed.items[0].input).toMatchObject({
      metric: 'steps',
      value: 8000,
      recordedAt: '2026-07-20T10:00:00.000Z',
      source: 'manual',
      externalId: 'ext-1',
    })
  })

  it('extra export metadata (exportedAt, filters, recordCount) does not break import', () => {
    const payload = buildHealthDataCanonicalExport([record()], { metrics: ['steps'], sources: ['manual'] }, NOW)
    const parsed = parseHealthDataJsonImport(serializeHealthDataCanonicalExport(payload))
    expect(parsed.ok).toBe(true)
  })
})
