import { describe, it, expect, beforeEach } from 'vitest'
import { getWorkoutHistory, getLastWorkout, saveCompletedWorkout, resetWorkoutHistory, type CompletedWorkout } from './workout-history'

function workout(overrides: Partial<CompletedWorkout> & { id: string; completedAt: string }): CompletedWorkout {
  return {
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

beforeEach(() => {
  window.localStorage.clear()
})

describe('resetWorkoutHistory', () => {
  it('clears all completed workouts', () => {
    saveCompletedWorkout(workout({ id: 'w-1', completedAt: '2026-01-01T10:00:00.000Z' }))
    saveCompletedWorkout(workout({ id: 'w-2', completedAt: '2026-01-02T10:00:00.000Z' }))
    expect(getWorkoutHistory()).toHaveLength(2)

    resetWorkoutHistory()

    expect(getWorkoutHistory()).toEqual([])
    expect(getLastWorkout()).toBeNull()
  })

  it('is a no-op when there is nothing stored', () => {
    resetWorkoutHistory()
    expect(getWorkoutHistory()).toEqual([])
  })
})
