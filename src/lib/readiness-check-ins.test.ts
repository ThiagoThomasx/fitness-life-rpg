import { describe, it, expect, beforeEach } from 'vitest'
import { saveCheckIn, getCheckIns, importCheckIns, type WorkoutReadinessCheckIn } from './readiness-check-ins'

beforeEach(() => {
  window.localStorage.clear()
})

const baseCheckIn: WorkoutReadinessCheckIn = {
  id: 'check-1',
  createdAt: '2026-08-01T08:00:00.000Z',
  energy: 4,
  soreness: 2,
  sleepQuality: 5,
  motivation: 4,
}

describe('WorkoutReadinessCheckIn — Sprint 19 wellness fields', () => {
  it('saves a check-in without the optional wellness fields (legacy shape)', () => {
    saveCheckIn(baseCheckIn)
    expect(getCheckIns()).toHaveLength(1)
    expect(getCheckIns()[0].stress).toBeUndefined()
    expect(getCheckIns()[0].mood).toBeUndefined()
  })

  it('saves a check-in with stress, mood and sleepHours filled in', () => {
    saveCheckIn({ ...baseCheckIn, stress: 3, mood: 5, sleepHours: 7.5 })
    const saved = getCheckIns()[0]
    expect(saved.stress).toBe(3)
    expect(saved.mood).toBe(5)
    expect(saved.sleepHours).toBe(7.5)
  })

  it('rejects an invalid stress rating on save (no-op)', () => {
    saveCheckIn({ ...baseCheckIn, stress: 9 } as unknown as WorkoutReadinessCheckIn)
    expect(getCheckIns()).toHaveLength(0)
  })

  it('rejects a negative sleepHours on save (no-op)', () => {
    saveCheckIn({ ...baseCheckIn, sleepHours: -1 })
    expect(getCheckIns()).toHaveLength(0)
  })

  it('imports legacy check-ins (pre-Sprint 19, no wellness fields) without error', () => {
    const result = importCheckIns([baseCheckIn])
    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(0)
  })

  it('imports check-ins that include the new wellness fields', () => {
    const result = importCheckIns([{ ...baseCheckIn, id: 'check-2', stress: 2, mood: 4 }])
    expect(result.imported).toBe(1)
  })
})
