import { describe, it, expect } from 'vitest'
import { buildCsvImportFile, inspectCsvHeader } from './inspection'

describe('inspectCsvHeader', () => {
  it('marks a fully canonical header as canonical', () => {
    const result = inspectCsvHeader(['metric', 'value', 'recordedAt'])
    expect(result.isCanonical).toBe(true)
  })

  it('marks a canonical header using Portuguese aliases as canonical', () => {
    const result = inspectCsvHeader(['Metrica', 'Valor', 'Data'])
    expect(result.isCanonical).toBe(true)
  })

  it('accepts recordedAt derived from startAt/endAt for canonical sleep files', () => {
    const result = inspectCsvHeader(['metric', 'startAt', 'endAt'])
    expect(result.isCanonical).toBe(true)
  })

  it('marks a header with an unrecognized value column as non-canonical', () => {
    const result = inspectCsvHeader(['date', 'steps'])
    expect(result.isCanonical).toBe(false)
  })

  it('marks a header missing metric as non-canonical', () => {
    const result = inspectCsvHeader(['value', 'recordedAt'])
    expect(result.isCanonical).toBe(false)
  })

  it('reports unresolved columns alongside resolved ones', () => {
    const result = inspectCsvHeader(['metric', 'value', 'recordedAt', 'notes'])
    expect(result.resolvedColumns).toEqual(['metric', 'value', 'recordedAt'])
    expect(result.unresolvedColumns).toEqual(['notes'])
  })
})

describe('buildCsvImportFile', () => {
  it('builds a HealthImportFile with header and a bounded sample of rows', () => {
    const rows = Array.from({ length: 10 }, (_, i) => `2026-07-${String(i + 1).padStart(2, '0')},${i}`).join('\n')
    const file = buildCsvImportFile('steps.csv', `date,steps\n${rows}`)
    expect(file.name).toBe('steps.csv')
    expect(file.kind).toBe('csv')
    expect(file.header).toEqual(['date', 'steps'])
    expect(file.sampleRows.length).toBeLessThanOrEqual(5)
  })
})
