import { describe, it, expect, beforeEach } from 'vitest'
import { buildHealthContext, getRecentConflicts } from './consumer-context'
import { createHealthDataRecord } from './storage'

beforeEach(() => {
  window.localStorage.clear()
})

const NOW = new Date('2026-07-27T12:00:00.000Z')

function seedBaselineDays(metric: 'steps' | 'resting_heart_rate' | 'sleep_duration', valueForDay: (day: number) => number) {
  for (let day = 12; day <= 25; day++) {
    createHealthDataRecord({
      metric,
      value: valueForDay(day),
      recordedAt: `2026-07-${day}T08:00:00.000Z`,
      source: 'manual',
    })
  }
}

describe('buildHealthContext', () => {
  it('returns a valid empty context when there are no health records at all', () => {
    const context = buildHealthContext('2026-07-26', '30d', NOW)

    expect(context.hasSufficientData).toBe(false)
    expect(context.sleepMinutes).toBeUndefined()
    expect(context.restingHeartRate).toBeUndefined()
    expect(context.steps).toBeUndefined()
    expect(context.activityMinutes).toBeUndefined()
    expect(context.conflicts).toEqual([])
  })

  it('exposes a reliable sleep signal once baseline sample size is met', () => {
    seedBaselineDays('sleep_duration', () => 420)
    createHealthDataRecord({ metric: 'sleep_duration', value: 352, recordedAt: '2026-07-26T08:00:00.000Z', source: 'manual' })

    const context = buildHealthContext('2026-07-26', '30d', NOW)

    const expectedBaseline = (14 * 420 + 352) / 15

    expect(context.sleepMinutes?.value).toBe(352)
    expect(context.sleepMinutes?.baselineValue).toBeCloseTo(expectedBaseline, 1)
    expect(context.sleepMinutes?.delta).toBeCloseTo(352 - expectedBaseline, 1)
    expect(context.sleepMinutes?.reliable).toBe(true)
    expect(context.sleepMinutes?.reasons).toEqual([])
    expect(context.hasSufficientData).toBe(true)
  })

  it('marks a metric as unreliable when the sample size is insufficient for a baseline', () => {
    createHealthDataRecord({ metric: 'resting_heart_rate', value: 62, recordedAt: '2026-07-26T08:00:00.000Z', source: 'manual' })

    const context = buildHealthContext('2026-07-26', '30d', NOW)

    expect(context.restingHeartRate?.value).toBe(62)
    expect(context.restingHeartRate?.reliable).toBe(false)
    expect(context.restingHeartRate?.reasons).toContain('Amostra insuficiente para calcular uma linha de base confiável.')
    expect(context.restingHeartRate?.baselineValue).toBeUndefined()
  })

  it('marks a metric as unreliable when there is a medium/high severity conflict that day', () => {
    seedBaselineDays('steps', () => 8000)
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-26T08:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'steps', value: 20000, recordedAt: '2026-07-26T09:00:00.000Z', source: 'json_import' })

    const context = buildHealthContext('2026-07-26', '30d', NOW)

    expect(context.steps?.reliable).toBe(false)
    expect(context.steps?.reasons).toContain('Conflito entre fontes detectado para esta métrica neste dia.')
    expect(context.conflicts.length).toBeGreaterThan(0)
  })

  it('marks a metric as unreliable when quality is low', () => {
    seedBaselineDays('steps', () => 8000)
    createHealthDataRecord({
      metric: 'steps',
      value: 98_500,
      recordedAt: '2026-07-26T08:00:00.000Z',
      source: 'csv_import',
    })

    const context = buildHealthContext('2026-07-26', '30d', NOW)

    expect(context.steps?.quality.level).toBe('low')
    expect(context.steps?.reliable).toBe(false)
    expect(context.steps?.reasons).toContain('Qualidade dos dados baixa nesse dia.')
  })

  it('flags a signal as obsolete when the requested date is far in the past relative to now', () => {
    seedBaselineDays('sleep_duration', () => 420)
    createHealthDataRecord({ metric: 'sleep_duration', value: 400, recordedAt: '2026-01-01T08:00:00.000Z', source: 'manual' })

    const context = buildHealthContext('2026-01-01', 'all', NOW)

    expect(context.sleepMinutes?.reliable).toBe(false)
    expect(context.sleepMinutes?.reasons).toContain('Dado desatualizado para o período analisado.')
  })

  it('never throws and always returns hasSufficientData=false for a date with no summary', () => {
    const context = buildHealthContext('2026-07-01', '30d', NOW)
    expect(context.hasSufficientData).toBe(false)
  })
})

describe('getRecentConflicts', () => {
  it('delegates to analytics-queries getConflicts for the given period', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: '2026-07-26T10:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'steps', value: 15000, recordedAt: '2026-07-26T11:00:00.000Z', source: 'json_import' })

    expect(getRecentConflicts('7d', NOW)).toHaveLength(1)
  })
})
