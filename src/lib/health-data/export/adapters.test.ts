import { describe, it, expect } from 'vitest'
import {
  canonicalJsonAdapter,
  canonicalCsvAdapter,
  mappedCsvAdapter,
  detectHealthImportAdapter,
} from './adapters'
import type { HealthImportMapping } from '../import-mapping/types'

const CANONICAL_JSON = JSON.stringify({
  version: 1,
  records: [{ metric: 'steps', value: 8000, recordedAt: '2026-07-20T10:00:00.000Z' }],
})

const CANONICAL_CSV = 'metric,value,unit,recordedAt,source,externalId,startAt,endAt\nsteps,8000,count,2026-07-20T10:00:00.000Z,manual,,,'

const NON_CANONICAL_CSV = 'Passos,Data\n8000,20/07/2026'

describe('canonicalJsonAdapter', () => {
  it('handles a canonical JSON file', () => {
    expect(canonicalJsonAdapter.canHandle({ name: 'a.json', text: CANONICAL_JSON })).toBe(true)
  })

  it('does not handle a CSV file', () => {
    expect(canonicalJsonAdapter.canHandle({ name: 'a.csv', text: CANONICAL_CSV })).toBe(false)
  })

  it('parses into ParsedImportItem[] without a mapping', async () => {
    const items = await canonicalJsonAdapter.parse({ name: 'a.json', text: CANONICAL_JSON })
    expect(items).toHaveLength(1)
    expect(items[0].input?.metric).toBe('steps')
  })

  it('throws on structurally invalid JSON', async () => {
    await expect(canonicalJsonAdapter.parse({ name: 'a.json', text: '{"version": 1}' })).rejects.toThrow()
  })
})

describe('canonicalCsvAdapter', () => {
  it('handles a canonical CSV file', () => {
    expect(canonicalCsvAdapter.canHandle({ name: 'a.csv', text: CANONICAL_CSV })).toBe(true)
  })

  it('does not handle a non-canonical CSV file', () => {
    expect(canonicalCsvAdapter.canHandle({ name: 'a.csv', text: NON_CANONICAL_CSV })).toBe(false)
  })

  it('parses into ParsedImportItem[] without a mapping', async () => {
    const items = await canonicalCsvAdapter.parse({ name: 'a.csv', text: CANONICAL_CSV })
    expect(items).toHaveLength(1)
    expect(items[0].input?.metric).toBe('steps')
  })
})

describe('mappedCsvAdapter', () => {
  it('handles any CSV with a header, canonical or not', () => {
    expect(mappedCsvAdapter.canHandle({ name: 'a.csv', text: NON_CANONICAL_CSV })).toBe(true)
  })

  it('requires a mapping to parse', async () => {
    await expect(mappedCsvAdapter.parse({ name: 'a.csv', text: NON_CANONICAL_CSV })).rejects.toThrow()
  })

  it('parses using a supplied mapping', async () => {
    const mapping: HealthImportMapping = {
      id: 'm1',
      name: 'Passos PT',
      sourceFormat: 'csv',
      columns: { value: 'Passos', recordedAt: 'Data' },
      static: { metric: 'steps' },
      dateFormat: 'DD/MM/YYYY',
      decimalSeparator: '.',
      delimiter: ',',
      transformations: [],
      createdAt: '2026-07-20T10:00:00.000Z',
      updatedAt: '2026-07-20T10:00:00.000Z',
    }
    const items = await mappedCsvAdapter.parse({ name: 'a.csv', text: NON_CANONICAL_CSV }, { mapping })
    expect(items).toHaveLength(1)
    expect(items[0].input?.metric).toBe('steps')
    expect(items[0].input?.value).toBe(8000)
  })
})

describe('detectHealthImportAdapter', () => {
  it('selects canonical-json first', () => {
    expect(detectHealthImportAdapter({ name: 'a.json', text: CANONICAL_JSON })?.id).toBe('canonical-json')
  })

  it('selects canonical-csv for a canonical CSV', () => {
    expect(detectHealthImportAdapter({ name: 'a.csv', text: CANONICAL_CSV })?.id).toBe('canonical-csv')
  })

  it('falls back to mapped-csv for a non-canonical CSV', () => {
    expect(detectHealthImportAdapter({ name: 'a.csv', text: NON_CANONICAL_CSV })?.id).toBe('mapped-csv')
  })

  it('returns null for an unparsable file', () => {
    expect(detectHealthImportAdapter({ name: 'a.txt', text: '' })).toBeNull()
  })
})
