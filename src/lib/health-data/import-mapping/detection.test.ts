import { describe, it, expect } from 'vitest'
import { buildDetectionResult, suggestColumnMappings, suggestCompatiblePresets, suggestMetric } from './detection'
import type { HealthImportFile, HealthImportMapping } from './types'

function makeMapping(overrides: Partial<HealthImportMapping> = {}): HealthImportMapping {
  return {
    id: 'preset-1',
    name: 'Preset',
    sourceFormat: 'csv',
    columns: { recordedAt: 'date', value: 'steps' },
    static: {},
    decimalSeparator: '.',
    delimiter: ',',
    transformations: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('suggestColumnMappings', () => {
  it('suggests recordedAt for common date aliases', () => {
    const suggestions = suggestColumnMappings(['date', 'steps'])
    expect(suggestions.find((s) => s.column === 'date')?.field).toBe('recordedAt')
  })

  it('suggests recordedAt for Portuguese "data"', () => {
    const suggestions = suggestColumnMappings(['data', 'passos'])
    expect(suggestions.find((s) => s.column === 'data')?.field).toBe('recordedAt')
  })

  it('suggests value for "steps" and "passos" as high confidence via metric alias fallback is not value', () => {
    const suggestions = suggestColumnMappings(['timestamp', 'step_count'])
    expect(suggestions.find((s) => s.column === 'timestamp')?.field).toBe('recordedAt')
  })

  it('suggests externalId for an "id" column', () => {
    const suggestions = suggestColumnMappings(['id'])
    expect(suggestions[0]).toEqual({ column: 'id', field: 'externalId', confidence: 'high' })
  })

  it('does not suggest a field for an unrelated column', () => {
    const suggestions = suggestColumnMappings(['notes'])
    expect(suggestions).toHaveLength(0)
  })

  it('never assigns two columns to the same field with high confidence', () => {
    const suggestions = suggestColumnMappings(['date', 'data'])
    const highConfidenceRecordedAt = suggestions.filter((s) => s.field === 'recordedAt' && s.confidence === 'high')
    expect(highConfidenceRecordedAt).toHaveLength(1)
  })
})

describe('suggestMetric', () => {
  it('suggests a metric from the file name with high confidence', () => {
    const suggestion = suggestMetric({ name: 'daily_steps.csv', header: ['date', 'value'] })
    expect(suggestion).toEqual({ metric: 'steps', confidence: 'high', evidence: expect.stringContaining('steps') })
  })

  it('suggests a metric from the header when the file name has no hint', () => {
    const suggestion = suggestMetric({ name: 'export.csv', header: ['date', 'heart_rate'] })
    expect(suggestion?.metric).toBe('resting_heart_rate')
    expect(suggestion?.confidence).toBe('medium')
  })

  it('returns null when nothing matches', () => {
    const suggestion = suggestMetric({ name: 'export.csv', header: ['date', 'notes'] })
    expect(suggestion).toBeNull()
  })
})

describe('suggestCompatiblePresets', () => {
  const file: HealthImportFile = { name: 'daily.csv', kind: 'csv', header: ['date', 'steps', 'unit'], sampleRows: [] }

  it('suggests a preset whose mapped columns are a subset of the header', () => {
    const preset = makeMapping({ columns: { recordedAt: 'date', value: 'steps' } })
    expect(suggestCompatiblePresets(file, [preset])).toEqual(['preset-1'])
  })

  it('does not suggest a preset requiring a column absent from the header', () => {
    const preset = makeMapping({ columns: { recordedAt: 'date', value: 'missing_column' } })
    expect(suggestCompatiblePresets(file, [preset])).toEqual([])
  })

  it('does not suggest a preset for a different source format', () => {
    const preset = makeMapping({ sourceFormat: 'json' })
    expect(suggestCompatiblePresets(file, [preset])).toEqual([])
  })

  it('does not suggest a preset with no mapped columns', () => {
    const preset = makeMapping({ columns: {} })
    expect(suggestCompatiblePresets(file, [preset])).toEqual([])
  })
})

describe('buildDetectionResult', () => {
  it('combines column, metric and preset suggestions', () => {
    const file: HealthImportFile = { name: 'daily_steps.csv', kind: 'csv', header: ['date', 'steps'], sampleRows: [] }
    const result = buildDetectionResult(file, [])
    expect(result.metricSuggestion?.metric).toBe('steps')
    expect(result.columnSuggestions.length).toBeGreaterThan(0)
    expect(result.presetSuggestions).toEqual([])
  })
})
