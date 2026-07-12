import { describe, it, expect, beforeEach } from 'vitest'
import { completeMission, getMissionCompletions, getDailyMissions, buildMissionsInput } from './daily-missions'

const BASE_INPUT = {
  hasDiaryToday: false,
  workoutsThisWeek: 0,
  totalWorkouts: 1, // >0 so manual missions aren't locked
  level: 1,
  sleepHoursToday: null,
  moodToday: null,
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('completeMission', () => {
  it('marks a mission done for today', () => {
    expect(getMissionCompletions()['pushups-20']).toBeUndefined()
    completeMission('pushups-20')
    expect(getMissionCompletions()['pushups-20']).toBe(true)
  })

  it('is idempotent: calling it twice does not create duplicate or malformed state', () => {
    completeMission('water-2l')
    completeMission('water-2l')
    const completions = getMissionCompletions()
    expect(completions['water-2l']).toBe(true)
    expect(Object.keys(completions).filter((k) => k === 'water-2l')).toHaveLength(1)
  })

  it('scopes completions to today only (a stale date key does not mark today done)', () => {
    window.localStorage.setItem(
      'lrpg-fit:missions-completed',
      JSON.stringify({ '2000-01-01': { 'squat-30': true } })
    )
    expect(getMissionCompletions()['squat-30']).toBeUndefined()
  })
})

describe('getDailyMissions status derivation', () => {
  it('reflects a manually completed mission as done', () => {
    completeMission('mobility-10min')
    const missions = getDailyMissions(BASE_INPUT)
    const mission = missions.find((m) => m.id === 'mobility-10min')
    expect(mission?.status).toBe('done')
  })

  it('locks beginner-gated missions when totalWorkouts is 0', () => {
    const missions = getDailyMissions({ ...BASE_INPUT, totalWorkouts: 0 })
    const mission = missions.find((m) => m.id === 'workout-this-week')
    expect(mission?.status).toBe('locked')
  })

  it('derives auto missions (e.g. diary-today) from input rather than manual completion', () => {
    const missions = getDailyMissions({ ...BASE_INPUT, hasDiaryToday: true })
    const mission = missions.find((m) => m.id === 'diary-today')
    expect(mission?.status).toBe('done')
  })
})

describe('buildMissionsInput', () => {
  it('does not throw with empty storage (first-use / vazio state)', () => {
    expect(() => buildMissionsInput()).not.toThrow()
  })
})
