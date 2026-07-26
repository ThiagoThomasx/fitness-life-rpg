import { describe, it, expect, beforeEach } from 'vitest'
import { createBodyProgressEntry } from '../body-progress'
import { buildHealthImportPreview } from './import-preview'
import { createHealthDataRecord } from './storage'
import type { ParsedImportItem } from './import-json'

beforeEach(() => {
  window.localStorage.clear()
})

function items(...parsedItems: ParsedImportItem[]): ParsedImportItem[] {
  return parsedItems
}

describe('buildHealthImportPreview — counts', () => {
  it('classifies a fully valid batch as ready to import', () => {
    const preview = buildHealthImportPreview(
      'json',
      items(
        { index: 0, input: { metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'json_import' } },
        { index: 1, input: { metric: 'steps', value: 9000, recordedAt: '2026-07-27T10:00:00.000Z', source: 'json_import' } }
      )
    )
    expect(preview.total).toBe(2)
    expect(preview.readyToImport).toBe(2)
    expect(preview.invalid).toBe(0)
    expect(preview.duplicates).toBe(0)
  })

  it('counts parse-level errors as invalid', () => {
    const preview = buildHealthImportPreview('json', items({ index: 0, error: 'Métrica desconhecida.' }))
    expect(preview.invalid).toBe(1)
    expect(preview.invalidRecords[0].reason).toBe('Métrica desconhecida.')
  })

  it('counts a value outside the plausible range as invalid, not a duplicate', () => {
    const preview = buildHealthImportPreview(
      'json',
      items({ index: 0, input: { metric: 'steps', value: -5, recordedAt: '2026-07-26T10:00:00.000Z', source: 'json_import' } })
    )
    expect(preview.invalid).toBe(1)
    expect(preview.duplicates).toBe(0)
  })

  it('rejects an unsupported unit as invalid', () => {
    const preview = buildHealthImportPreview(
      'json',
      items({
        index: 0,
        input: { metric: 'weight', value: 80, unit: 'stone', recordedAt: '2026-07-26T10:00:00.000Z', source: 'json_import' },
      })
    )
    expect(preview.invalid).toBe(1)
  })

  it('detects a duplicate against an already-existing record from the same source (e.g. a repeated import)', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'json_import' })
    const preview = buildHealthImportPreview(
      'json',
      items({ index: 0, input: { metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'json_import' } })
    )
    expect(preview.duplicates).toBe(1)
    expect(preview.readyToImport).toBe(0)
  })

  it('does not treat the same value/date from a different source as a duplicate (conflict, not duplication)', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'manual' })
    const preview = buildHealthImportPreview(
      'json',
      items({ index: 0, input: { metric: 'steps', value: 8450, recordedAt: '2026-07-26T10:00:00.000Z', source: 'json_import' } })
    )
    expect(preview.duplicates).toBe(0)
    expect(preview.readyToImport).toBe(1)
  })

  it('detects duplicates within the same file', () => {
    const preview = buildHealthImportPreview(
      'json',
      items(
        { index: 0, input: { metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'json_import' } },
        { index: 1, input: { metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'json_import' } }
      )
    )
    expect(preview.readyToImport).toBe(1)
    expect(preview.duplicates).toBe(1)
  })

  it('treats a weight import as a duplicate when it matches an existing Body Progress entry', () => {
    createBodyProgressEntry({ recordedAt: '2026-07-26', weightKg: 80 })
    const preview = buildHealthImportPreview(
      'json',
      items({
        index: 0,
        input: {
          metric: 'weight',
          value: 80,
          recordedAt: '2026-07-26T12:00:00.000Z',
          source: 'json_import',
        },
      })
    )
    expect(preview.duplicates).toBe(1)
  })

  it('computes a quality breakdown across ready-to-import records', () => {
    const preview = buildHealthImportPreview(
      'json',
      items({
        index: 0,
        input: { metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'json_import' },
      })
    )
    expect(preview.qualityBreakdown.high + preview.qualityBreakdown.medium + preview.qualityBreakdown.low + preview.qualityBreakdown.unknown).toBe(1)
  })

  it('returns an empty preview for an empty item list', () => {
    const preview = buildHealthImportPreview('csv', [])
    expect(preview.total).toBe(0)
    expect(preview.readyToImport).toBe(0)
  })
})
