import { describe, it, expect, beforeEach } from 'vitest'
import { calculateGoalProgress } from './training-goal-progress'
import { createGoal } from './training-goals'
import type { CompletedWorkout } from './workout-history'

beforeEach(() => {
  window.localStorage.clear()
})

function seedWorkout(completedAt: string, weightKg: number, reps: number): void {
  const history: CompletedWorkout[] = JSON.parse(window.localStorage.getItem('lrpg-fit:workout-history') ?? '[]')
  const workout: CompletedWorkout = {
    id: `w-${completedAt}`,
    workoutId: 'wt-1',
    workoutName: 'Treino A',
    workoutColor: '#000',
    category: 'strength',
    startedAt: completedAt,
    completedAt,
    durationSeconds: 1800,
    xpEarned: 50,
    prsCount: 0,
    exercises: [
      {
        exerciseId: 'ex-1',
        exerciseName: 'Supino reto',
        sets: [{ weight_kg: weightKg, reps, isPr: false }],
      },
    ],
  }
  window.localStorage.setItem('lrpg-fit:workout-history', JSON.stringify([workout, ...history]))
}

describe('weekly_volume progress (accumulated)', () => {
  it('counts a fully-elapsed week meeting the target as successful', () => {
    const goal = createGoal({
      title: 'Volume semanal', type: 'weekly_volume', startDate: '2026-08-03',
      targetWeeklyVolumeKg: 1000, targetWeeks: 2, consecutiveWeeks: false,
    }).goal!
    // Week 1 (2026-08-03..09): 20 sets x 50kg = 1000kg
    seedWorkout('2026-08-04T12:00:00.000Z', 50, 20)

    const progress = calculateGoalProgress(goal, new Date('2026-08-11T12:00:00.000Z'))
    expect(progress.progressPercentage).toBe(50)
    expect(progress.status).toBe('in_progress')
  })

  it('never counts the current partial week as a failure', () => {
    const goal = createGoal({
      title: 'Volume semanal', type: 'weekly_volume', startDate: '2026-08-03',
      targetWeeklyVolumeKg: 1000, targetWeeks: 2, consecutiveWeeks: false,
    }).goal!

    // now falls inside week 1, before it fully elapses — no elapsed weeks yet.
    const progress = calculateGoalProgress(goal, new Date('2026-08-05T12:00:00.000Z'))
    expect(progress.status).toBe('not_started')
    expect(progress.progressPercentage).toBe(0)
  })

  it('completes when the accumulated successful weeks reach targetWeeks', () => {
    const goal = createGoal({
      title: 'Volume semanal', type: 'weekly_volume', startDate: '2026-08-03',
      targetWeeklyVolumeKg: 1000, targetWeeks: 2, consecutiveWeeks: false,
    }).goal!
    seedWorkout('2026-08-04T12:00:00.000Z', 50, 20) // week 1: 1000kg
    seedWorkout('2026-08-11T12:00:00.000Z', 50, 20) // week 2: 1000kg

    const progress = calculateGoalProgress(goal, new Date('2026-08-18T12:00:00.000Z'))
    expect(progress.status).toBe('completed')
    expect(progress.progressPercentage).toBe(100)
  })
})

describe('weekly_volume progress (consecutive)', () => {
  it('requires an unbroken streak — a failed week resets the count', () => {
    const goal = createGoal({
      title: 'Volume consecutivo', type: 'weekly_volume', startDate: '2026-08-03',
      targetWeeklyVolumeKg: 1000, targetWeeks: 3, consecutiveWeeks: true,
    }).goal!
    seedWorkout('2026-08-04T12:00:00.000Z', 50, 20) // week 1: success (1000kg)
    // week 2: no workout -> 0kg, fails, resets streak
    seedWorkout('2026-08-18T12:00:00.000Z', 50, 20) // week 3: success (1000kg)

    const progress = calculateGoalProgress(goal, new Date('2026-08-25T12:00:00.000Z'))
    // Longest streak is 1 (week 1 alone, or week 3 alone) — not the full target.
    expect(progress.progressPercentage).toBe(33)
    expect(progress.status).not.toBe('completed')
  })

  it('completes when the streak reaches targetWeeks consecutively', () => {
    const goal = createGoal({
      title: 'Volume consecutivo', type: 'weekly_volume', startDate: '2026-08-03',
      targetWeeklyVolumeKg: 1000, targetWeeks: 2, consecutiveWeeks: true,
    }).goal!
    seedWorkout('2026-08-04T12:00:00.000Z', 50, 20)
    seedWorkout('2026-08-11T12:00:00.000Z', 50, 20)

    const progress = calculateGoalProgress(goal, new Date('2026-08-18T12:00:00.000Z'))
    expect(progress.status).toBe('completed')
  })
})

describe('weekly_volume progress edge cases', () => {
  it('reports insufficient_data when volume-alvo or duração are missing', () => {
    const goal = createGoal({
      title: 'Volume incompleto', type: 'weekly_volume', startDate: '2026-08-03',
      targetWeeklyVolumeKg: 1000, targetWeeks: 2,
    }).goal!
    const incomplete = { ...goal, targetWeeklyVolumeKg: undefined }
    const progress = calculateGoalProgress(incomplete, new Date('2026-08-11T12:00:00.000Z'))
    expect(progress.status).toBe('insufficient_data')
  })
})
