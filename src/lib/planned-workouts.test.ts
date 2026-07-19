import { describe, it, expect, beforeEach } from 'vitest'
import {
  savePlannedWorkout,
  savePlannedWorkouts,
  updatePlannedWorkoutStatus,
  deletePlannedWorkout,
  deletePlannedWorkoutsInRange,
  getPlannedWorkouts,
  getPlannedWorkoutById,
  getPlannedWorkoutsByDate,
  getPlannedWorkoutsByDateRange,
  importPlannedWorkouts,
  resetPlannedWorkouts,
  type WorkoutTemplateSnapshot,
} from './planned-workouts'

beforeEach(() => {
  window.localStorage.clear()
})

function snapshot(): WorkoutTemplateSnapshot {
  return {
    name: 'Treino A',
    exerciseBlocks: [{ id: 'blk-1', type: 'single', exercise: { id: 'ex-1', exerciseName: 'Supino' } }],
    capturedAt: new Date().toISOString(),
  }
}

describe('savePlannedWorkout', () => {
  it('creates a pending planned workout', () => {
    const pw = savePlannedWorkout({
      date: '2026-07-20',
      weekday: 1,
      name: 'Treino A',
      templateSnapshot: snapshot(),
      isOptional: false,
    })
    expect(pw.status).toBe('pending')
    expect(getPlannedWorkouts()).toHaveLength(1)
  })
})

describe('savePlannedWorkouts (bulk)', () => {
  it('inserts multiple with unique ids', () => {
    const created = savePlannedWorkouts([
      { date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false },
      { date: '2026-07-21', weekday: 2, name: 'B', templateSnapshot: snapshot(), isOptional: false },
    ])
    expect(created).toHaveLength(2)
    expect(created[0].id).not.toBe(created[1].id)
    expect(getPlannedWorkouts()).toHaveLength(2)
  })
})

describe('date range / date queries', () => {
  it('filters by date and range', () => {
    savePlannedWorkouts([
      { date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false },
      { date: '2026-07-22', weekday: 3, name: 'B', templateSnapshot: snapshot(), isOptional: false },
      { date: '2026-08-01', weekday: 6, name: 'C', templateSnapshot: snapshot(), isOptional: false },
    ])
    expect(getPlannedWorkoutsByDate('2026-07-20')).toHaveLength(1)
    expect(getPlannedWorkoutsByDateRange('2026-07-20', '2026-07-31')).toHaveLength(2)
  })
})

describe('updatePlannedWorkoutStatus', () => {
  it('updates status without touching other fields', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    const updated = updatePlannedWorkoutStatus(pw.id, 'done')
    expect(updated?.status).toBe('done')
    expect(updated?.name).toBe('A')
  })

  it('returns null for unknown id', () => {
    expect(updatePlannedWorkoutStatus('missing', 'done')).toBeNull()
  })
})

describe('deletePlannedWorkoutsInRange', () => {
  it('removes only items within range', () => {
    savePlannedWorkouts([
      { date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false },
      { date: '2026-08-01', weekday: 6, name: 'B', templateSnapshot: snapshot(), isOptional: false },
    ])
    const removed = deletePlannedWorkoutsInRange('2026-07-01', '2026-07-31')
    expect(removed).toBe(1)
    expect(getPlannedWorkouts()).toHaveLength(1)
    expect(getPlannedWorkouts()[0].date).toBe('2026-08-01')
  })
})

describe('deletePlannedWorkout', () => {
  it('removes a single item', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    deletePlannedWorkout(pw.id)
    expect(getPlannedWorkoutById(pw.id)).toBeNull()
  })
})

describe('import / reset', () => {
  it('imports valid, skips invalid/duplicate', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    const result = importPlannedWorkouts([pw, { bad: true }, pw])
    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(3)

    resetPlannedWorkouts()
    const fresh = importPlannedWorkouts([pw])
    expect(fresh.imported).toBe(1)
    expect(getPlannedWorkouts()).toHaveLength(1)
  })
})
