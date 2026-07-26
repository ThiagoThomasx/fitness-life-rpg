import { describe, it, expect, beforeEach } from 'vitest'
import { createBodyProgressEntry } from '../body-progress'
import { getWeightRecordsFromBodyProgress } from './body-progress-adapter'

beforeEach(() => {
  window.localStorage.clear()
})

describe('getWeightRecordsFromBodyProgress', () => {
  it('returns no records when there are no body progress entries', () => {
    expect(getWeightRecordsFromBodyProgress()).toHaveLength(0)
  })

  it('derives a weight record from a body progress entry that has weight', () => {
    createBodyProgressEntry({ recordedAt: '2026-07-26', weightKg: 80 })
    const records = getWeightRecordsFromBodyProgress()
    expect(records).toHaveLength(1)
    expect(records[0].metric).toBe('weight')
    expect(records[0].value).toBe(80)
    expect(records[0].source).toBe('body_progress')
    expect(records[0].unit).toBe('kg')
  })

  it('skips entries with no weight', () => {
    createBodyProgressEntry({ recordedAt: '2026-07-26', notes: 'sem peso' })
    expect(getWeightRecordsFromBodyProgress()).toHaveLength(0)
  })

  it('does not persist anything — it is a pure read-only derivation', () => {
    createBodyProgressEntry({ recordedAt: '2026-07-26', weightKg: 80 })
    getWeightRecordsFromBodyProgress()
    expect(window.localStorage.getItem('lrpg-fit:health-data-records')).toBeNull()
  })
})
