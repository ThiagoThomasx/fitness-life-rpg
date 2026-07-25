import { describe, it, expect, beforeEach } from 'vitest'
import type { CompletedWorkout, ExerciseRecord, SetRecord } from './workout-history'
import {
  detectSessionRecordEvents,
  addPersonalRecordEvents,
  getPersonalRecordEvents,
  getPersonalRecordEventsForWorkout,
  getPersonalRecordEventsForExercise,
} from './personal-record-events'

const HISTORY_KEY = 'lrpg-fit:workout-history'

function set(weight_kg: number, reps: number): SetRecord {
  return { weight_kg, reps, isPr: false }
}

function exerciseRecord(overrides: Partial<ExerciseRecord> = {}): ExerciseRecord {
  return {
    exerciseId: 'ex-1',
    exerciseName: 'Supino Reto',
    sets: [set(60, 8)],
    ...overrides,
  }
}

function workout(overrides: Partial<CompletedWorkout> & { completedAt: string }): CompletedWorkout {
  return {
    id: `w-${overrides.completedAt}`,
    workoutId: 'wt-1',
    workoutName: 'Treino A',
    workoutColor: '#000',
    category: 'strength',
    startedAt: overrides.completedAt,
    durationSeconds: 1800,
    xpEarned: 50,
    prsCount: 0,
    exercises: [],
    ...overrides,
  }
}

function seedHistory(history: CompletedWorkout[]) {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('detectSessionRecordEvents', () => {
  it('detects first-time records as max_load/max_reps/etc. with no previousValue', () => {
    seedHistory([])
    const events = detectSessionRecordEvents([
      { exerciseId: 'ex-1', exerciseName: 'Supino Reto', sets: [{ weight_kg: 60, reps: 8 }] },
    ])
    const maxLoad = events.find((e) => e.recordType === 'max_load')
    expect(maxLoad).toBeDefined()
    expect(maxLoad?.previousValue).toBeUndefined()
    expect(maxLoad?.newValue).toBe(60)
    expect(maxLoad?.unit).toBe('kg')
  })

  it('detects a new record when it beats prior history', () => {
    seedHistory([workout({ completedAt: '2026-01-01T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(60, 8)] })] })])
    const events = detectSessionRecordEvents([
      { exerciseId: 'ex-1', exerciseName: 'Supino Reto', sets: [{ weight_kg: 65, reps: 8 }] },
    ])
    const maxLoad = events.find((e) => e.recordType === 'max_load')
    expect(maxLoad?.previousValue).toBe(60)
    expect(maxLoad?.newValue).toBe(65)
  })

  it('does not generate an event on a tie (strict >)', () => {
    seedHistory([workout({ completedAt: '2026-01-01T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(60, 8)] })] })])
    const events = detectSessionRecordEvents([
      { exerciseId: 'ex-1', exerciseName: 'Supino Reto', sets: [{ weight_kg: 60, reps: 8 }] },
    ])
    expect(events.find((e) => e.recordType === 'max_load')).toBeUndefined()
  })

  it('skips exercises with no sets', () => {
    seedHistory([])
    const events = detectSessionRecordEvents([{ exerciseId: 'ex-1', exerciseName: 'Supino Reto', sets: [] }])
    expect(events).toEqual([])
  })
})

describe('addPersonalRecordEvents', () => {
  it('persists events linked to a workoutId', () => {
    const saved = addPersonalRecordEvents('w-1', [
      { exerciseId: 'ex-1', exerciseName: 'Supino Reto', recordType: 'max_load', newValue: 65, unit: 'kg', achievedAt: '2026-01-01T10:00:00.000Z' },
    ])
    expect(saved).toHaveLength(1)
    expect(saved[0].workoutId).toBe('w-1')
    expect(getPersonalRecordEvents()).toHaveLength(1)
    expect(getPersonalRecordEventsForWorkout('w-1')).toHaveLength(1)
    expect(getPersonalRecordEventsForExercise('ex-1')).toHaveLength(1)
  })

  it('is idempotent per workoutId — a second call for the same session is a no-op', () => {
    addPersonalRecordEvents('w-1', [
      { exerciseId: 'ex-1', exerciseName: 'Supino Reto', recordType: 'max_load', newValue: 65, unit: 'kg', achievedAt: '2026-01-01T10:00:00.000Z' },
    ])
    const secondCall = addPersonalRecordEvents('w-1', [
      { exerciseId: 'ex-1', exerciseName: 'Supino Reto', recordType: 'max_load', newValue: 70, unit: 'kg', achievedAt: '2026-01-01T10:00:00.000Z' },
    ])
    expect(secondCall).toEqual([])
    expect(getPersonalRecordEvents()).toHaveLength(1)
    expect(getPersonalRecordEvents()[0].newValue).toBe(65)
  })

  it('does nothing when given an empty list', () => {
    const saved = addPersonalRecordEvents('w-1', [])
    expect(saved).toEqual([])
    expect(getPersonalRecordEvents()).toEqual([])
  })

  it('accumulates events across different workouts', () => {
    addPersonalRecordEvents('w-1', [
      { exerciseId: 'ex-1', exerciseName: 'Supino Reto', recordType: 'max_load', newValue: 65, unit: 'kg', achievedAt: '2026-01-01T10:00:00.000Z' },
    ])
    addPersonalRecordEvents('w-2', [
      { exerciseId: 'ex-2', exerciseName: 'Agachamento', recordType: 'max_load', newValue: 100, unit: 'kg', achievedAt: '2026-01-02T10:00:00.000Z' },
    ])
    expect(getPersonalRecordEvents()).toHaveLength(2)
  })
})
