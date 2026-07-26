import { describe, it, expect } from 'vitest'
import { buildHealthDataCanonicalCsv, CANONICAL_CSV_HEADERS } from './canonical-csv'
import { parseHealthDataCsvImport } from '../import-csv'
import { inspectCsvHeader } from '../import-mapping/inspection'
import { parseCsvText } from '../csv-parser'
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

describe('buildHealthDataCanonicalCsv', () => {
  it('writes the documented canonical header', () => {
    const csv = buildHealthDataCanonicalCsv([])
    expect(csv).toBe(CANONICAL_CSV_HEADERS.join(','))
  })

  it('writes one row per record', () => {
    const csv = buildHealthDataCanonicalCsv([record(), record({ id: 'health-steps-2', value: 9000 })])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(3) // header + 2 rows
  })

  it('serializes metadata as JSON and leaves it empty when absent', () => {
    const csv = buildHealthDataCanonicalCsv([record({ metadata: { note: 'ok' } }), record({ id: 'h2' })])
    const [, row1, row2] = csv.split('\n')
    expect(row1).toContain('"{""note"":""ok""}"')
    expect(row2.endsWith(',')).toBe(true)
  })

  it('escapes a semicolon inside a value', () => {
    const csv = buildHealthDataCanonicalCsv([record({ externalId: 'a;b' })])
    expect(csv.split('\n')[1]).toContain('"a;b"')
  })

  it('escapes a comma inside metadata JSON', () => {
    const csv = buildHealthDataCanonicalCsv([record({ metadata: { a: 1, b: 2 } })])
    expect(csv).toContain('"{""a"":1,""b"":2}"')
  })

  it('neutralizes a formula-injection attempt in externalId', () => {
    const csv = buildHealthDataCanonicalCsv([record({ externalId: '=CMD|calc' })])
    expect(csv.split('\n')[1]).toContain("'=CMD|calc")
  })

  it('does not neutralize a negative numeric value', () => {
    const csv = buildHealthDataCanonicalCsv([record({ metric: 'weight', value: -5, unit: 'kg' })])
    const row = csv.split('\n')[1]
    expect(row.split(',')[1]).toBe('-5')
  })

  it('handles UTF-8 content in fields', () => {
    const csv = buildHealthDataCanonicalCsv([record({ externalId: 'café ☕' })])
    expect(csv).toContain('café ☕')
  })
})

describe('CSV export round-trip through the existing importer', () => {
  it('is recognized as canonical (skips the mapping wizard)', () => {
    const csv = buildHealthDataCanonicalCsv([record()])
    const { header } = parseCsvText(csv)
    expect(inspectCsvHeader(header).isCanonical).toBe(true)
  })

  it('is accepted by parseHealthDataCsvImport unchanged', () => {
    const records = [record(), record({ id: 'h2', value: 9000, recordedAt: '2026-07-21T10:00:00.000Z' })]
    const csv = buildHealthDataCanonicalCsv(records)
    const parsed = parseHealthDataCsvImport(csv)
    expect(parsed.ok).toBe(true)
    expect(parsed.items).toHaveLength(2)
    expect(parsed.items.every((item) => item.error === undefined)).toBe(true)
  })

  it('preserves metric/value/unit/recordedAt/source/externalId through serialization', () => {
    const csv = buildHealthDataCanonicalCsv([record({ externalId: 'ext-1' })])
    const parsed = parseHealthDataCsvImport(csv)
    expect(parsed.items[0].input).toMatchObject({
      metric: 'steps',
      value: 8000,
      unit: 'count',
      recordedAt: '2026-07-20T10:00:00.000Z',
      source: 'manual',
      externalId: 'ext-1',
    })
  })

  it('produces only a header line for an empty record set', () => {
    const parsed = parseCsvText(buildHealthDataCanonicalCsv([]))
    expect(parsed.rows).toHaveLength(0)
  })
})
