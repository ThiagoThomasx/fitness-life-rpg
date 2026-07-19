import { describe, expect, it } from 'vitest'
import {
  buildBodyProgressCsv,
  buildBodyWellnessMarkdownReport,
  buildWellnessCsv,
  filterBodyProgressByPeriod,
  filterCheckInsByPeriod,
  resolveExportPeriodRange,
} from './body-wellness-export'
import type { BodyProgressEntry } from './body-progress'
import type { WorkoutReadinessCheckIn } from './readiness-check-ins'

function entry(overrides: Partial<BodyProgressEntry> = {}): BodyProgressEntry {
  return {
    id: 'e1',
    recordedAt: '2026-06-01',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

function checkIn(overrides: Partial<WorkoutReadinessCheckIn> = {}): WorkoutReadinessCheckIn {
  return {
    id: 'c1',
    createdAt: '2026-06-01T08:00:00.000Z',
    energy: 3,
    soreness: 3,
    sleepQuality: 3,
    motivation: 3,
    ...overrides,
  }
}

describe('resolveExportPeriodRange', () => {
  it('returns null for "all"', () => {
    expect(resolveExportPeriodRange('all')).toBeNull()
  })

  it('resolves a 30-day window ending today', () => {
    const now = new Date('2026-06-30T12:00:00.000Z')
    const range = resolveExportPeriodRange('last30', now)
    expect(range).toEqual({ startDate: '2026-06-01', endDate: '2026-06-30' })
  })

  it('resolves a 90-day window ending today', () => {
    const now = new Date('2026-06-30T12:00:00.000Z')
    const range = resolveExportPeriodRange('last90', now)
    expect(range?.endDate).toBe('2026-06-30')
  })
})

describe('filterBodyProgressByPeriod', () => {
  it('keeps all entries when period is "all"', () => {
    const entries = [entry({ recordedAt: '2020-01-01' }), entry({ recordedAt: '2026-06-30' })]
    expect(filterBodyProgressByPeriod(entries, 'all')).toHaveLength(2)
  })

  it('excludes entries outside the window', () => {
    const now = new Date('2026-06-30T12:00:00.000Z')
    const entries = [entry({ id: 'old', recordedAt: '2020-01-01' }), entry({ id: 'new', recordedAt: '2026-06-15' })]
    const result = filterBodyProgressByPeriod(entries, 'last30', now)
    expect(result.map((e) => e.id)).toEqual(['new'])
  })
})

describe('filterCheckInsByPeriod', () => {
  it('excludes check-ins outside the window', () => {
    const now = new Date('2026-06-30T12:00:00.000Z')
    const checkIns = [
      checkIn({ id: 'old', createdAt: '2020-01-01T08:00:00.000Z' }),
      checkIn({ id: 'new', createdAt: '2026-06-15T08:00:00.000Z' }),
    ]
    const result = filterCheckInsByPeriod(checkIns, 'last30', now)
    expect(result.map((c) => c.id)).toEqual(['new'])
  })
})

describe('buildBodyProgressCsv', () => {
  it('includes the stable header row', () => {
    const csv = buildBodyProgressCsv([])
    expect(csv).toBe(
      'recorded_at,weight_kg,waist_cm,abdomen_cm,chest_cm,hips_cm,right_arm_cm,left_arm_cm,right_thigh_cm,left_thigh_cm,right_calf_cm,left_calf_cm,neck_cm,custom_measurements,cycle_id,notes,photo_count'
    )
  })

  it('serializes a full entry with measurements, custom measurements and photo count', () => {
    const e = entry({
      weightKg: 82.5,
      measurements: { waistCm: 90, custom: [{ id: 'c1', label: 'Punho', valueCm: 17 }] },
      cycleId: 'cycle-1',
      photoIds: ['p1', 'p2'],
    })
    const csv = buildBodyProgressCsv([e])
    const row = csv.split('\n')[1]
    expect(row).toContain('82.5')
    expect(row).toContain('90')
    expect(row).toContain('Punho:17')
    expect(row).toContain('cycle-1')
    expect(row).toContain('2') // photo_count
  })

  it('leaves absent fields empty rather than using zero', () => {
    const csv = buildBodyProgressCsv([entry()])
    const row = csv.split('\n')[1]
    expect(row.split(',')[1]).toBe('') // weight_kg absent
  })

  it('escapes notes containing commas, quotes and newlines', () => {
    const csv = buildBodyProgressCsv([entry({ notes: 'Peso, medido às 8h "em jejum"\nsegunda linha' })])
    const row = csv.split('\n').slice(1).join('\n')
    expect(row).toContain('"Peso, medido às 8h ""em jejum""')
  })

  it('sorts rows by recorded date', () => {
    const csv = buildBodyProgressCsv([entry({ id: 'b', recordedAt: '2026-06-10' }), entry({ id: 'a', recordedAt: '2026-06-01' })])
    const lines = csv.split('\n')
    expect(lines[1].startsWith('2026-06-01')).toBe(true)
    expect(lines[2].startsWith('2026-06-10')).toBe(true)
  })
})

describe('buildWellnessCsv', () => {
  it('includes the stable header row with an always-empty readiness_score column', () => {
    const csv = buildWellnessCsv([])
    expect(csv).toBe('recorded_at,energy,soreness,sleep_quality,sleep_hours,motivation,stress,mood,readiness_score,notes')
  })

  it('serializes optional fields when present and leaves them empty when absent', () => {
    const withOptional = buildWellnessCsv([checkIn({ stress: 2, mood: 4, sleepHours: 7.5 })])
    const rowWith = withOptional.split('\n')[1]
    expect(rowWith).toContain('7.5')

    const withoutOptional = buildWellnessCsv([checkIn()])
    const rowWithout = withoutOptional.split('\n')[1].split(',')
    // stress, mood, sleep_hours columns should be empty
    expect(rowWithout[4]).toBe('') // sleep_hours
    expect(rowWithout[6]).toBe('') // stress
    expect(rowWithout[7]).toBe('') // mood
  })

  it('never fabricates a readiness score', () => {
    const csv = buildWellnessCsv([checkIn()])
    const row = csv.split('\n')[1].split(',')
    expect(row[8]).toBe('') // readiness_score always empty
  })
})

describe('buildBodyWellnessMarkdownReport', () => {
  it('reports insufficient data for empty history without crashing', () => {
    const md = buildBodyWellnessMarkdownReport({ entries: [], checkIns: [], period: 'all' })
    expect(md).toContain('# Progresso corporal e bem-estar')
    expect(md).toContain('Nenhum registro corporal neste período.')
    expect(md).toContain('Nenhum check-in de bem-estar neste período.')
    expect(md).toContain('Sem check-ins suficientes para calcular associações.')
  })

  it('includes the mandatory limitations section', () => {
    const md = buildBodyWellnessMarkdownReport({ entries: [], checkIns: [], period: 'all' })
    expect(md).toContain('## Limitações dos dados')
    expect(md).toContain('Fotos de progresso não fazem parte deste relatório.')
  })

  it('never mentions photos as included data', () => {
    const md = buildBodyWellnessMarkdownReport({
      entries: [entry({ photoIds: ['p1'] })],
      checkIns: [],
      period: 'all',
    })
    expect(md).not.toMatch(/anexo|incluídas as fotos/i)
  })
})
