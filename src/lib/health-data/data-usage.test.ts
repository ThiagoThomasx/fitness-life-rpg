import { describe, it, expect, beforeEach } from 'vitest'
import { buildHealthDataUsageExplainability } from './data-usage'
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

describe('buildHealthDataUsageExplainability', () => {
  it('marks every signal as unused with an explicit reason when there is no data at all', () => {
    const usage = buildHealthDataUsageExplainability('30d', NOW)
    expect(usage.hasSufficientData).toBe(false)
    expect(usage.signals).toHaveLength(4)
    expect(usage.signals.every((s) => !s.used && !s.hasData)).toBe(true)
    expect(usage.signals.every((s) => s.reasons.length > 0)).toBe(true)
  })

  it('always reports the same 4 consumers regardless of data state', () => {
    const usage = buildHealthDataUsageExplainability('30d', NOW)
    expect(usage.consumers).toEqual(['Readiness', 'Recovery', 'Fatigue', 'Coach'])
  })

  it('marks a signal as used once it has a reliable baseline and no conflicts', () => {
    for (let day = 1; day <= 10; day++) {
      createHealthDataRecord({ metric: 'sleep_duration', value: 420, recordedAt: isoDaysAgo(day), source: 'manual' })
    }
    createHealthDataRecord({ metric: 'sleep_duration', value: 430, recordedAt: isoDaysAgo(0), source: 'manual' })

    const usage = buildHealthDataUsageExplainability('30d', NOW)
    const sleep = usage.signals.find((s) => s.key === 'sleepMinutes')!
    expect(sleep.hasData).toBe(true)
    expect(sleep.used).toBe(true)
    expect(sleep.reasons).toEqual([])
    expect(usage.hasSufficientData).toBe(true)
  })

  it('blocks a signal with a stated reason when sources conflict on the same day', () => {
    createHealthDataRecord({ metric: 'steps', value: 5000, recordedAt: isoDaysAgo(0), source: 'manual' })
    createHealthDataRecord({ metric: 'steps', value: 20000, recordedAt: isoDaysAgo(0), source: 'json_import' })

    const usage = buildHealthDataUsageExplainability('30d', NOW)
    const steps = usage.signals.find((s) => s.key === 'steps')!
    expect(steps.hasData).toBe(true)
    expect(steps.used).toBe(false)
    expect(steps.reasons.length).toBeGreaterThan(0)
  })
})
