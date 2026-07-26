// Round-trip completo — Sprint 30 Parte 3 (seções 27-29). Exercita o
// pipeline real de importação (parse → preview → apply), nunca uma rota
// paralela: export → parseHealthDataJsonImport/parseHealthDataCsvImport →
// buildHealthImportPreview → applyHealthImportRecords → getAllHealthRecords.

import { describe, it, expect, beforeEach } from 'vitest'
import { createBodyProgressEntry, getBodyProgressEntries } from '../../body-progress'
import { createHealthDataRecord, resetHealthData } from '../storage'
import { getAllHealthRecords } from '../queries'
import { buildHealthImportPreview } from '../import-preview'
import { applyHealthImportRecords } from '../import-apply'
import { parseHealthDataJsonImport } from '../import-json'
import { parseHealthDataCsvImport } from '../import-csv'
import { getHealthRecordsForExport } from './filters'
import { buildHealthDataCanonicalExport, serializeHealthDataCanonicalExport } from './canonical-json'
import { buildHealthDataCanonicalCsv } from './canonical-csv'
import { compareHealthRecordSets } from './round-trip'

const NOW = new Date('2026-07-26T12:00:00.000Z')

beforeEach(() => {
  window.localStorage.clear()
})

describe('JSON export round-trip', () => {
  it('reimports semantically equivalent records through the real import pipeline', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-20T10:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'sleep_duration', value: 420, recordedAt: '2026-07-21T22:00:00.000Z', source: 'wellness' })

    const originalRecords = getHealthRecordsForExport({}, NOW)
    const serialized = serializeHealthDataCanonicalExport(buildHealthDataCanonicalExport(originalRecords, {}, NOW))

    resetHealthData()
    expect(getAllHealthRecords()).toHaveLength(0)

    const parsed = parseHealthDataJsonImport(serialized)
    expect(parsed.ok).toBe(true)
    const preview = buildHealthImportPreview('json', parsed.items)
    expect(preview.readyToImport).toBe(2)

    const applied = applyHealthImportRecords(preview.validRecords)
    expect(applied.ok).toBe(true)
    expect(applied.appliedCount).toBe(2)

    const restored = getAllHealthRecords()
    const comparison = compareHealthRecordSets(originalRecords, restored)
    expect(comparison.equivalent).toBe(true)
  })
})

describe('CSV export round-trip', () => {
  it('reimports semantically equivalent records through the real import pipeline', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-20T10:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'steps', value: 9000, recordedAt: '2026-07-21T10:00:00.000Z', source: 'csv_import' })

    const originalRecords = getHealthRecordsForExport({ metrics: ['steps'] }, NOW)
    const csv = buildHealthDataCanonicalCsv(originalRecords)

    resetHealthData()

    const parsed = parseHealthDataCsvImport(csv)
    expect(parsed.ok).toBe(true)
    const preview = buildHealthImportPreview('csv', parsed.items)
    expect(preview.readyToImport).toBe(2)

    const applied = applyHealthImportRecords(preview.validRecords)
    expect(applied.ok).toBe(true)

    const restored = getAllHealthRecords()
    const comparison = compareHealthRecordSets(originalRecords, restored)
    expect(comparison.equivalent).toBe(true)
  })
})

describe('weight round-trip via Body Progress', () => {
  it('reimports weight without duplicating Body Progress entries', () => {
    createBodyProgressEntry({ recordedAt: '2026-07-20', weightKg: 81.6466266 }) // ~180 lb

    const originalRecords = getHealthRecordsForExport({}, NOW)
    expect(originalRecords).toHaveLength(1)
    const serialized = serializeHealthDataCanonicalExport(buildHealthDataCanonicalExport(originalRecords, {}, NOW))

    // Reset apenas o domínio de Health Data — Body Progress permanece,
    // simulando reimportar num dispositivo/perfil sem esse histórico ainda.
    // Para testar "sem duplicação" de fato, limpamos Body Progress também
    // (fixture controlada) e reimportamos a partir do arquivo exportado.
    window.localStorage.removeItem('lrpg-fit:body-progress')
    resetHealthData()
    expect(getBodyProgressEntries()).toHaveLength(0)

    const parsed = parseHealthDataJsonImport(serialized)
    expect(parsed.ok).toBe(true)
    const preview = buildHealthImportPreview('json', parsed.items)
    expect(preview.readyToImport).toBe(1)

    const applied = applyHealthImportRecords(preview.validRecords)
    expect(applied.ok).toBe(true)
    expect(applied.appliedCount).toBe(1)

    expect(getBodyProgressEntries()).toHaveLength(1)
    expect(window.localStorage.getItem('lrpg-fit:health-data-records')).toBeNull()

    const restored = getAllHealthRecords()
    const comparison = compareHealthRecordSets(originalRecords, restored)
    expect(comparison.equivalent).toBe(true)
  })

  it('does not duplicate when reimporting into a profile that already has the same weight entry', () => {
    createBodyProgressEntry({ recordedAt: '2026-07-20', weightKg: 80 })
    const originalRecords = getHealthRecordsForExport({}, NOW)
    const serialized = serializeHealthDataCanonicalExport(buildHealthDataCanonicalExport(originalRecords, {}, NOW))

    const parsed = parseHealthDataJsonImport(serialized)
    const preview = buildHealthImportPreview('json', parsed.items)
    // Já existe o mesmo registro (mesma identidade determinística) — deduplicação evita a duplicata.
    expect(preview.readyToImport).toBe(0)
    expect(preview.duplicates).toBe(1)

    applyHealthImportRecords(preview.validRecords)
    expect(getBodyProgressEntries()).toHaveLength(1)
  })
})

describe('filters preserved in the export envelope', () => {
  it('round-trips a filtered subset (only steps) without pulling in other metrics', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-20T10:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'sleep_duration', value: 420, recordedAt: '2026-07-21T10:00:00.000Z', source: 'manual' })

    const filtered = getHealthRecordsForExport({ metrics: ['steps'] }, NOW)
    expect(filtered).toHaveLength(1)
    const serialized = serializeHealthDataCanonicalExport(buildHealthDataCanonicalExport(filtered, { metrics: ['steps'] }, NOW))

    resetHealthData()
    const parsed = parseHealthDataJsonImport(serialized)
    const preview = buildHealthImportPreview('json', parsed.items)
    applyHealthImportRecords(preview.validRecords)

    expect(getAllHealthRecords()).toHaveLength(1)
    expect(getAllHealthRecords()[0].metric).toBe('steps')
  })
})
