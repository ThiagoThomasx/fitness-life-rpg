import { describe, it, expect } from 'vitest'
import { applyMappingToCsv, applyMappingToRow, validateMapping } from './mapping'
import { parseCsvText } from '../csv-parser'
import type { HealthImportMapping } from './types'

function makeMapping(overrides: Partial<HealthImportMapping> = {}): HealthImportMapping {
  return {
    id: 'preset-1',
    name: 'Preset',
    sourceFormat: 'csv',
    columns: { recordedAt: 'date', value: 'steps' },
    static: { metric: 'steps' },
    decimalSeparator: '.',
    delimiter: ',',
    transformations: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('validateMapping', () => {
  it('accepts a mapping with all required fields resolved', () => {
    const result = validateMapping(makeMapping())
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects a mapping missing recordedAt and startAt/endAt', () => {
    const mapping = makeMapping({ columns: { value: 'steps' } })
    const result = validateMapping(mapping)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'recordedAt')).toBe(true)
  })

  it('accepts recordedAt derived from startAt/endAt only', () => {
    const mapping = makeMapping({ columns: { startAt: 'start', endAt: 'end' }, static: { metric: 'sleep_duration' } })
    const result = validateMapping(mapping)
    expect(result.errors.some((e) => e.field === 'recordedAt')).toBe(false)
  })

  it('rejects a mapping missing metric (no column, no static)', () => {
    const mapping = makeMapping({ static: {} })
    const result = validateMapping(mapping)
    expect(result.errors.some((e) => e.field === 'metric')).toBe(true)
  })

  it('accepts metric resolved via a column instead of a static value', () => {
    const mapping = makeMapping({ columns: { recordedAt: 'date', value: 'value', metric: 'metric' }, static: {} })
    expect(validateMapping(mapping).valid).toBe(true)
  })

  it('rejects two fields mapped to the same column', () => {
    const mapping = makeMapping({ columns: { recordedAt: 'date', value: 'date' } })
    const result = validateMapping(mapping)
    expect(result.errors.some((e) => e.field === 'general')).toBe(true)
  })

  it('rejects a mapping with no value and no startAt/endAt to derive it', () => {
    const mapping = makeMapping({ columns: { recordedAt: 'date' } })
    const result = validateMapping(mapping)
    expect(result.errors.some((e) => e.field === 'value')).toBe(true)
  })
})

describe('applyMappingToRow', () => {
  it('maps a simple date,value row to a valid input', () => {
    const mapping = makeMapping()
    const header = ['date', 'steps']
    const item = applyMappingToRow(mapping, header, ['2026-07-12', '8250'], 2)
    expect(item.error).toBeUndefined()
    expect(item.input).toEqual({
      metric: 'steps',
      value: 8250,
      unit: undefined,
      recordedAt: '2026-07-12T00:00:00.000Z',
      startAt: undefined,
      endAt: undefined,
      source: 'csv_import',
      externalId: undefined,
    })
  })

  it('applies an explicit date format from the mapping', () => {
    const mapping = makeMapping({ dateFormat: 'DD/MM/YYYY' })
    const item = applyMappingToRow(mapping, ['date', 'steps'], ['12/07/2026', '8250'], 2)
    expect(item.error).toBeUndefined()
    expect(item.input?.recordedAt).toBe('2026-07-12T00:00:00.000Z')
  })

  it('applies a parse_number transformation for a comma-decimal value column', () => {
    const mapping = makeMapping({
      static: { metric: 'weight' },
      columns: { recordedAt: 'date', value: 'weight' },
      transformations: [{ field: 'value', transformation: { kind: 'parse_number', decimalSeparator: ',' } }],
    })
    const item = applyMappingToRow(mapping, ['date', 'weight'], ['2026-07-12', '72,5'], 2)
    expect(item.error).toBeUndefined()
    expect(item.input?.value).toBe(72.5)
  })

  it('applies a unit conversion by using the fixed unit column value', () => {
    const mapping = makeMapping({
      static: { metric: 'weight' },
      columns: { recordedAt: 'date', value: 'weight', unit: 'unit' },
    })
    const item = applyMappingToRow(mapping, ['date', 'weight', 'unit'], ['2026-07-12', '180', 'lb'], 2)
    expect(item.error).toBeUndefined()
    expect(item.input?.unit).toBe('lb')
  })

  it('applies a map_value transformation to a textual quality column', () => {
    const mapping = makeMapping({
      static: { metric: 'sleep_quality' },
      columns: { recordedAt: 'date', value: 'quality' },
      transformations: [{ field: 'value', transformation: { kind: 'map_value', valueMap: { Boa: 4, Excelente: 5 } } }],
    })
    const item = applyMappingToRow(mapping, ['date', 'quality'], ['2026-07-12', 'Boa'], 2)
    expect(item.error).toBeUndefined()
    expect(item.input?.value).toBe(4)
  })

  it('derives sleep duration from startAt/endAt when value is absent', () => {
    const mapping = makeMapping({
      static: { metric: 'sleep_duration' },
      columns: { startAt: 'start', endAt: 'end' },
      transformations: [{ field: 'value', transformation: { kind: 'derive_sleep_duration' } }],
    })
    const item = applyMappingToRow(
      mapping,
      ['start', 'end'],
      ['2026-07-12T22:00:00.000Z', '2026-07-13T06:00:00.000Z'],
      2
    )
    expect(item.error).toBeUndefined()
    expect(item.input?.value).toBe(480)
    expect(item.input?.recordedAt).toBe('2026-07-13T06:00:00.000Z')
  })

  it('reports an error for an unmapped required metric column', () => {
    const mapping = makeMapping({ static: {}, columns: { recordedAt: 'date', value: 'steps', metric: 'kind' } })
    const item = applyMappingToRow(mapping, ['date', 'steps'], ['2026-07-12', '8250'], 2)
    expect(item.error).toContain('não encontrada')
  })

  it('reports an error for a non-numeric value column', () => {
    const mapping = makeMapping()
    const item = applyMappingToRow(mapping, ['date', 'steps'], ['2026-07-12', 'abc'], 2)
    expect(item.error).toBeDefined()
  })

  it('reports an error for an unresolvable date', () => {
    const mapping = makeMapping()
    const item = applyMappingToRow(mapping, ['date', 'steps'], ['not-a-date', '8250'], 2)
    expect(item.error).toBeDefined()
  })

  it('applies a fixed source override', () => {
    const mapping = makeMapping({ static: { metric: 'steps', source: 'manual' } })
    const item = applyMappingToRow(mapping, ['date', 'steps'], ['2026-07-12', '8250'], 2)
    expect(item.input?.source).toBe('manual')
  })
})

describe('applyMappingToCsv', () => {
  it('maps every row of a parsed CSV and reports the correct line numbers', () => {
    const { header, rows } = parseCsvText('date,steps\n2026-07-10,8000\n2026-07-11,9000')
    const mapping = makeMapping()
    const result = applyMappingToCsv(mapping, header, rows)
    expect(result.ok).toBe(true)
    expect(result.items).toHaveLength(2)
    expect(result.items[0].index).toBe(2)
    expect(result.items[1].index).toBe(3)
    expect(result.items.every((i) => i.error === undefined)).toBe(true)
  })

  it('returns a global error and no items for an invalid mapping', () => {
    const { header, rows } = parseCsvText('date,steps\n2026-07-10,8000')
    const mapping = makeMapping({ static: {}, columns: { value: 'steps' } })
    const result = applyMappingToCsv(mapping, header, rows)
    expect(result.ok).toBe(false)
    expect(result.globalError).toBeDefined()
    expect(result.items).toEqual([])
  })

  it('reports individual row errors without discarding the rest of the file', () => {
    const { header, rows } = parseCsvText('date,steps\n2026-07-10,8000\nnot-a-date,9000')
    const mapping = makeMapping()
    const result = applyMappingToCsv(mapping, header, rows)
    expect(result.ok).toBe(true)
    expect(result.items[0].error).toBeUndefined()
    expect(result.items[1].error).toBeDefined()
  })
})
