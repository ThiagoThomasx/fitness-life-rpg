import { describe, it, expect } from 'vitest'
import { buildHealthExportPreview } from './preview'
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

describe('buildHealthExportPreview', () => {
  it('summarizes count, metrics, sources and filename', () => {
    const records = [record(), record({ id: 'h2', metric: 'weight', unit: 'kg', source: 'body_progress' })]
    const preview = buildHealthExportPreview('json', records, {}, 'irrelevant', NOW)
    expect(preview.count).toBe(2)
    expect(preview.metrics).toEqual(['steps', 'weight'])
    expect(preview.sources).toEqual(['body_progress', 'manual'])
    expect(preview.includesWeight).toBe(true)
    expect(preview.filename).toBe('fitness-life-rpg-health-all-2026-07-26.json')
  })

  it('warns when there are no matching records', () => {
    const preview = buildHealthExportPreview('csv', [], { metrics: ['steps'] }, '', NOW)
    expect(preview.warnings.length).toBeGreaterThan(0)
    expect(preview.count).toBe(0)
  })

  it('does not include weight when no weight record is present', () => {
    const preview = buildHealthExportPreview('json', [record()], {}, '', NOW)
    expect(preview.includesWeight).toBe(false)
  })

  it('estimates bytes from the actual serialized content', () => {
    const preview = buildHealthExportPreview('json', [record()], {}, 'abcd', NOW)
    expect(preview.estimatedBytes).toBe(4)
  })
})
