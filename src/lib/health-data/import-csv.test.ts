import { describe, it, expect } from 'vitest'
import { parseHealthDataCsvImport } from './import-csv'

describe('parseHealthDataCsvImport — header', () => {
  it('rejects an empty file', () => {
    const result = parseHealthDataCsvImport('')
    expect(result.ok).toBe(false)
  })

  it('rejects a header without a metric column', () => {
    const result = parseHealthDataCsvImport('value,recordedAt\n8000,2026-07-26T10:00:00.000Z')
    expect(result.ok).toBe(false)
    expect(result.globalError).toMatch(/metric/i)
  })

  it('accepts canonical column names', () => {
    const result = parseHealthDataCsvImport(
      'metric,value,unit,recordedAt,source,externalId\nsteps,8000,count,2026-07-26T10:00:00.000Z,csv_import,row-1'
    )
    expect(result.ok).toBe(true)
    expect(result.items[0].input?.metric).toBe('steps')
    expect(result.items[0].input?.externalId).toBe('row-1')
  })

  it('maps Portuguese column aliases (Data/Métrica/Valor/Unidade)', () => {
    const result = parseHealthDataCsvImport('Métrica,Valor,Unidade,Data\nsteps,8000,count,2026-07-26T10:00:00.000Z')
    expect(result.ok).toBe(true)
    expect(result.items[0].input?.metric).toBe('steps')
    expect(result.items[0].input?.value).toBe(8000)
    expect(result.items[0].input?.recordedAt).toBe('2026-07-26T10:00:00.000Z')
  })
})

describe('parseHealthDataCsvImport — row validation', () => {
  it('reports the CSV line number for an invalid row without blocking others', () => {
    const result = parseHealthDataCsvImport(
      'metric,value,recordedAt\n' +
        'unknown_metric,100,2026-07-26T10:00:00.000Z\n' +
        'steps,8000,2026-07-26T10:00:00.000Z'
    )
    expect(result.items[0].error).toBeTruthy()
    expect(result.items[0].index).toBe(2)
    expect(result.items[1].input).toBeDefined()
    expect(result.items[1].index).toBe(3)
  })

  it('rejects a row with a non-numeric value', () => {
    const result = parseHealthDataCsvImport('metric,value,recordedAt\nsteps,abc,2026-07-26T10:00:00.000Z')
    expect(result.items[0].error).toBeTruthy()
  })

  it('rejects a row missing recordedAt with no startAt/endAt fallback', () => {
    const result = parseHealthDataCsvImport('metric,value\nsteps,8000')
    expect(result.items[0].error).toBeTruthy()
  })

  it('derives sleep_duration value from startAt/endAt when value is blank', () => {
    const result = parseHealthDataCsvImport(
      'metric,value,startAt,endAt\nsleep_duration,,2026-07-26T00:00:00.000Z,2026-07-26T07:00:00.000Z'
    )
    expect(result.items[0].input?.value).toBe(420)
  })

  it('derives recordedAt from endAt when the column is absent for sleep', () => {
    const result = parseHealthDataCsvImport(
      'metric,value,startAt,endAt\nsleep_duration,420,2026-07-26T00:00:00.000Z,2026-07-26T07:00:00.000Z'
    )
    expect(result.items[0].input?.recordedAt).toBe('2026-07-26T07:00:00.000Z')
  })

  it('defaults source to csv_import when the column is absent', () => {
    const result = parseHealthDataCsvImport('metric,value,recordedAt\nsteps,8000,2026-07-26T10:00:00.000Z')
    expect(result.items[0].input?.source).toBe('csv_import')
  })

  it('rejects a row with an unknown source value', () => {
    const result = parseHealthDataCsvImport('metric,value,recordedAt,source\nsteps,8000,2026-07-26T10:00:00.000Z,fitbit')
    expect(result.items[0].error).toBeTruthy()
  })
})
