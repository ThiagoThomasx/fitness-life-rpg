import { describe, it, expect } from 'vitest'
import { parseHealthDataJsonImport } from './import-json'

describe('parseHealthDataJsonImport — global errors', () => {
  it('rejects invalid JSON syntax', () => {
    const result = parseHealthDataJsonImport('{not json')
    expect(result.ok).toBe(false)
    expect(result.globalError).toBeTruthy()
  })

  it('rejects a JSON value that is not an object', () => {
    const result = parseHealthDataJsonImport('[1,2,3]')
    expect(result.ok).toBe(false)
  })

  it('rejects a missing version', () => {
    const result = parseHealthDataJsonImport(JSON.stringify({ records: [] }))
    expect(result.ok).toBe(false)
    expect(result.globalError).toMatch(/version/i)
  })

  it('rejects a version newer than supported', () => {
    const result = parseHealthDataJsonImport(JSON.stringify({ version: 99, records: [] }))
    expect(result.ok).toBe(false)
  })

  it('rejects a missing records array', () => {
    const result = parseHealthDataJsonImport(JSON.stringify({ version: 1 }))
    expect(result.ok).toBe(false)
    expect(result.globalError).toMatch(/records/i)
  })

  it('accepts an empty records array', () => {
    const result = parseHealthDataJsonImport(JSON.stringify({ version: 1, records: [] }))
    expect(result.ok).toBe(true)
    expect(result.items).toHaveLength(0)
  })
})

describe('parseHealthDataJsonImport — per-record errors', () => {
  it('parses a valid record', () => {
    const result = parseHealthDataJsonImport(
      JSON.stringify({
        version: 1,
        records: [
          {
            metric: 'steps',
            value: 8450,
            unit: 'count',
            recordedAt: '2026-07-26T20:00:00-03:00',
            source: 'json_import',
            externalId: 'example-001',
          },
        ],
      })
    )
    expect(result.ok).toBe(true)
    expect(result.items[0].input?.metric).toBe('steps')
    expect(result.items[0].input?.externalId).toBe('example-001')
  })

  it('flags a record with an unknown metric without blocking the rest', () => {
    const result = parseHealthDataJsonImport(
      JSON.stringify({
        version: 1,
        records: [
          { metric: 'unknown_metric', value: 1, recordedAt: '2026-07-26T10:00:00.000Z' },
          { metric: 'steps', value: 1000, recordedAt: '2026-07-26T10:00:00.000Z' },
        ],
      })
    )
    expect(result.items[0].error).toBeTruthy()
    expect(result.items[1].input).toBeDefined()
  })

  it('flags a record with a non-numeric value', () => {
    const result = parseHealthDataJsonImport(
      JSON.stringify({ version: 1, records: [{ metric: 'steps', value: 'lots', recordedAt: '2026-07-26T10:00:00.000Z' }] })
    )
    expect(result.items[0].error).toBeTruthy()
  })

  it('flags a record missing recordedAt', () => {
    const result = parseHealthDataJsonImport(JSON.stringify({ version: 1, records: [{ metric: 'steps', value: 100 }] }))
    expect(result.items[0].error).toBeTruthy()
  })

  it('defaults source to json_import when absent', () => {
    const result = parseHealthDataJsonImport(
      JSON.stringify({ version: 1, records: [{ metric: 'steps', value: 100, recordedAt: '2026-07-26T10:00:00.000Z' }] })
    )
    expect(result.items[0].input?.source).toBe('json_import')
  })

  it('flags a record with an unknown source', () => {
    const result = parseHealthDataJsonImport(
      JSON.stringify({
        version: 1,
        records: [{ metric: 'steps', value: 100, recordedAt: '2026-07-26T10:00:00.000Z', source: 'fitbit' }],
      })
    )
    expect(result.items[0].error).toBeTruthy()
  })

  it('does not accept an arbitrary object shape as a record', () => {
    const result = parseHealthDataJsonImport(
      JSON.stringify({ version: 1, records: [{ foo: 'bar' }] })
    )
    expect(result.items[0].error).toBeTruthy()
    expect(result.items[0].input).toBeUndefined()
  })
})
