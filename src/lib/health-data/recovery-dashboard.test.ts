import { describe, it, expect, beforeEach } from 'vitest'
import { createBodyProgressEntry } from '../body-progress'
import { buildHealthRecoveryDashboard } from './recovery-dashboard'
import { createHealthDataRecord } from './storage'

const NOW = new Date('2026-07-26T12:00:00.000Z')

function isoDaysAgo(daysAgo: number): string {
  const d = new Date(NOW)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString()
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('buildHealthRecoveryDashboard', () => {
  it('returns an explicit empty state when there is no data at all', () => {
    const dashboard = buildHealthRecoveryDashboard('30d', NOW)
    expect(dashboard.hasAnyData).toBe(false)
    expect(dashboard.sleep.latestValue).toBeNull()
    expect(dashboard.sleep.baseline).toBeNull()
    expect(dashboard.weight.latestKg).toBeNull()
    expect(dashboard.conflicts).toEqual([])
    expect(dashboard.dailySeries).toEqual([])
  })

  it('builds sleep/RHR/steps views with baseline once 7+ days of data exist', () => {
    for (let day = 1; day <= 10; day++) {
      createHealthDataRecord({ metric: 'sleep_duration', value: 420, recordedAt: isoDaysAgo(day), source: 'manual' })
      createHealthDataRecord({ metric: 'resting_heart_rate', value: 55, recordedAt: isoDaysAgo(day), source: 'manual' })
      createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: isoDaysAgo(day), source: 'manual' })
    }
    // Última noite, valor diferente da baseline — para exercitar delta/dias acima.
    createHealthDataRecord({ metric: 'sleep_duration', value: 300, recordedAt: isoDaysAgo(0), source: 'manual' })

    const dashboard = buildHealthRecoveryDashboard('30d', NOW)

    expect(dashboard.hasAnyData).toBe(true)
    expect(dashboard.sleep.baseline).not.toBeNull()
    expect(dashboard.sleep.baseline!.sampleSize).toBe(11)
    expect(dashboard.sleep.latestValue).toBe(300)
    expect(dashboard.sleep.deltaFromBaseline).toBeLessThan(0)
    expect(dashboard.restingHeartRate.baseline).not.toBeNull()
    expect(dashboard.steps.baseline).not.toBeNull()
    expect(dashboard.dailySeries).toHaveLength(11)
    expect(dashboard.dailySeries[0].date < dashboard.dailySeries[dashboard.dailySeries.length - 1].date).toBe(true)
  })

  it('does not produce a baseline below the minimum sample size', () => {
    for (let day = 1; day <= 3; day++) {
      createHealthDataRecord({ metric: 'sleep_duration', value: 420, recordedAt: isoDaysAgo(day), source: 'manual' })
    }
    const dashboard = buildHealthRecoveryDashboard('30d', NOW)
    expect(dashboard.sleep.baseline).toBeNull()
    expect(dashboard.sleep.sampleDays).toBe(3)
  })

  it('reads weight from the Body Progress adapter, never duplicating it in health-data storage', () => {
    createBodyProgressEntry({ recordedAt: '2026-07-25', weightKg: 79.5 })
    createBodyProgressEntry({ recordedAt: '2026-07-20', weightKg: 80.2 })

    const dashboard = buildHealthRecoveryDashboard('30d', NOW)

    expect(dashboard.weight.latestKg).toBe(79.5)
    expect(dashboard.weight.latestDate).toBe('2026-07-25')
    expect(dashboard.weight.sampleSize).toBe(2)
    expect(dashboard.hasAnyData).toBe(true)
  })

  it('surfaces conflicts detected within the period', () => {
    createHealthDataRecord({ metric: 'steps', value: 5000, recordedAt: isoDaysAgo(1), source: 'manual' })
    createHealthDataRecord({ metric: 'steps', value: 15000, recordedAt: isoDaysAgo(1), source: 'json_import' })

    const dashboard = buildHealthRecoveryDashboard('30d', NOW)
    expect(dashboard.conflicts.length).toBeGreaterThan(0)
  })

  it('breaks down quality levels across the days that have data', () => {
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: isoDaysAgo(1), source: 'manual' })
    createHealthDataRecord({ metric: 'steps', value: 8000, recordedAt: isoDaysAgo(2), source: 'manual' })

    const dashboard = buildHealthRecoveryDashboard('30d', NOW)
    const totalCounted = dashboard.quality.high + dashboard.quality.medium + dashboard.quality.low + dashboard.quality.unknown
    expect(totalCounted).toBe(dashboard.quality.daysWithData)
    expect(dashboard.quality.daysWithData).toBe(2)
  })
})
