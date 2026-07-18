import { describe, it, expect, beforeEach } from 'vitest'
import { calculateGoalProgress, DEFAULT_GOAL_PROGRESS_CONFIG } from './training-goal-progress'
import { createGoal, pauseGoal, completeGoal } from './training-goals'
import { getMilestonesForGoal } from './training-goal-milestones'
import type { CompletedWorkout } from './workout-history'

beforeEach(() => {
  window.localStorage.clear()
})

function seedWorkout(completedAt: string, exerciseId: string, sets: { weight_kg: number; reps: number }[]): void {
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
        exerciseId,
        exerciseName: 'Supino reto',
        sets: sets.map((s) => ({ ...s, isPr: false })),
      },
    ],
  }
  // Mais recente primeiro, igual a saveCompletedWorkout.
  window.localStorage.setItem('lrpg-fit:workout-history', JSON.stringify([workout, ...history]))
}

describe('exercise_weight progress', () => {
  it('infers baseline from history on/before startDate and tracks progress since then', () => {
    seedWorkout('2026-07-25T12:00:00.000Z', 'ex-1', [{ weight_kg: 50, reps: 8 }])
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!

    seedWorkout('2026-08-05T12:00:00.000Z', 'ex-1', [{ weight_kg: 55, reps: 6 }])

    const progress = calculateGoalProgress(goal, new Date('2026-08-10T12:00:00.000Z'))
    expect(progress.baselineValue).toBe(50)
    expect(progress.baselineInferred).toBe(true)
    expect(progress.currentValue).toBe(55)
    expect(progress.targetValue).toBe(60)
    expect(progress.progressPercentage).toBe(50)
    expect(progress.status).toBe('in_progress')
  })

  it('infers baseline from the first session after start when there is no prior history', () => {
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!
    seedWorkout('2026-08-02T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])

    const progress = calculateGoalProgress(goal, new Date('2026-08-05T12:00:00.000Z'))
    expect(progress.baselineValue).toBe(40)
    expect(progress.currentValue).toBe(40)
    expect(progress.progressPercentage).toBe(0)
    expect(progress.status).toBe('not_started')
  })

  it('reports not_started with no baseline when there is no history at all', () => {
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!

    const progress = calculateGoalProgress(goal, new Date('2026-08-05T12:00:00.000Z'))
    expect(progress.baselineValue).toBeUndefined()
    expect(progress.status).toBe('not_started')
  })

  it('respects a manually provided baselineValue over the inferred one', () => {
    seedWorkout('2026-07-25T12:00:00.000Z', 'ex-1', [{ weight_kg: 50, reps: 8 }])
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60, baselineValue: 45,
    }).goal!

    const progress = calculateGoalProgress(goal, new Date('2026-08-05T12:00:00.000Z'))
    expect(progress.baselineValue).toBe(45)
    expect(progress.baselineInferred).toBe(false)
  })

  it('caps progress at 100% and marks status completed once the target is met', () => {
    seedWorkout('2026-07-25T12:00:00.000Z', 'ex-1', [{ weight_kg: 50, reps: 8 }])
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!
    seedWorkout('2026-08-05T12:00:00.000Z', 'ex-1', [{ weight_kg: 65, reps: 5 }])

    const progress = calculateGoalProgress(goal, new Date('2026-08-10T12:00:00.000Z'))
    expect(progress.progressPercentage).toBe(100)
    expect(progress.status).toBe('completed')
    expect(progress.projection).toBeUndefined()
  })

  it('records milestones as they are crossed and keeps them once reached', () => {
    seedWorkout('2026-07-25T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!
    // baseline 40, target 60 -> range 20. 50kg = +10 = 50%.
    seedWorkout('2026-08-05T12:00:00.000Z', 'ex-1', [{ weight_kg: 50, reps: 6 }])

    const first = calculateGoalProgress(goal, new Date('2026-08-10T12:00:00.000Z'))
    expect(first.milestones.find((m) => m.percentage === 50)?.reachedAt).toBeTruthy()
    expect(first.milestones.find((m) => m.percentage === 75)?.reachedAt).toBeNull()

    // Deload back down — milestone must remain recorded historically.
    seedWorkout('2026-08-12T12:00:00.000Z', 'ex-1', [{ weight_kg: 42, reps: 8 }])
    const second = calculateGoalProgress(goal, new Date('2026-08-15T12:00:00.000Z'))
    expect(second.milestones.find((m) => m.percentage === 50)?.reachedAt).toBeTruthy()
    // 25% and 50% both crossed at once (50% implies 25% was passed too) — no duplicates on repeat reads.
    expect(getMilestonesForGoal(goal.id)).toHaveLength(2)
  })

  it('produces a projection only with the minimum sample size and a positive rate', () => {
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-07-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!
    seedWorkout('2026-07-01T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])

    const early = calculateGoalProgress(goal, new Date('2026-07-05T12:00:00.000Z'))
    expect(early.projection?.method).toBe('insufficient_data')
    expect(early.projection?.sampleSize).toBeLessThan(DEFAULT_GOAL_PROGRESS_CONFIG.minimumSamplesForProjection)

    seedWorkout('2026-07-08T12:00:00.000Z', 'ex-1', [{ weight_kg: 44, reps: 8 }])
    seedWorkout('2026-07-15T12:00:00.000Z', 'ex-1', [{ weight_kg: 48, reps: 8 }])

    const later = calculateGoalProgress(goal, new Date('2026-07-20T12:00:00.000Z'))
    expect(later.projection?.method).toBe('linear_recent_trend')
    expect(later.projection?.estimatedWeeksMin).toBeGreaterThan(0)
    expect(later.projection?.confidence).toBeDefined()
  })

  it('reports insufficient_data when the recent rate is flat or negative', () => {
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-07-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!
    seedWorkout('2026-07-01T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])
    seedWorkout('2026-07-08T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])
    seedWorkout('2026-07-15T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])

    const progress = calculateGoalProgress(goal, new Date('2026-07-20T12:00:00.000Z'))
    expect(progress.projection?.method).toBe('insufficient_data')
  })
})

describe('estimated_1rm progress', () => {
  it('uses the Epley-based estimate from exercise-records for baseline and current', () => {
    seedWorkout('2026-07-25T12:00:00.000Z', 'ex-1', [{ weight_kg: 50, reps: 5 }]) // 1RM ~58.3
    const goal = createGoal({
      title: '1RM 70kg', type: 'estimated_1rm', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 70,
    }).goal!

    const progress = calculateGoalProgress(goal, new Date('2026-08-05T12:00:00.000Z'))
    expect(progress.baselineValue).toBeCloseTo(50 * (1 + 5 / 30), 5)
  })
})

describe('exercise_reps progress', () => {
  it('reports zero progress before the target weight has been attempted', () => {
    const goal = createGoal({
      title: 'Supino 12 reps a 40kg', type: 'exercise_reps', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 40, targetReps: 12,
    }).goal!
    seedWorkout('2026-08-02T12:00:00.000Z', 'ex-1', [{ weight_kg: 30, reps: 15 }])

    const progress = calculateGoalProgress(goal, new Date('2026-08-05T12:00:00.000Z'))
    expect(progress.progressPercentage).toBeUndefined()
    expect(progress.status).toBe('in_progress')
  })

  it('completes only when weight AND reps are both met in the same set', () => {
    const goal = createGoal({
      title: 'Supino 12 reps a 40kg', type: 'exercise_reps', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 40, targetReps: 12,
    }).goal!
    seedWorkout('2026-08-02T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])

    const partial = calculateGoalProgress(goal, new Date('2026-08-05T12:00:00.000Z'))
    expect(partial.progressPercentage).toBe(67)
    expect(partial.status).not.toBe('completed')

    seedWorkout('2026-08-06T12:00:00.000Z', 'ex-1', [{ weight_kg: 42, reps: 12 }])
    const done = calculateGoalProgress(goal, new Date('2026-08-10T12:00:00.000Z'))
    expect(done.progressPercentage).toBe(100)
    expect(done.status).toBe('completed')
  })

  it('does not extrapolate reps from estimated 1RM — only the reps actually performed at/above target weight count', () => {
    const goal = createGoal({
      title: 'Supino 12 reps a 40kg', type: 'exercise_reps', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 40, targetReps: 12,
    }).goal!
    // 80kg x 3 reps clears the weight threshold (80 >= 40) and has a high estimated 1RM
    // (~87kg) that could naively suggest many reps at 40kg — but progress must reflect
    // only the 3 reps actually performed, not a 1RM-derived rep estimate.
    seedWorkout('2026-08-02T12:00:00.000Z', 'ex-1', [{ weight_kg: 80, reps: 3 }])

    const progress = calculateGoalProgress(goal, new Date('2026-08-05T12:00:00.000Z'))
    expect(progress.currentValue).toBe(3)
    expect(progress.progressPercentage).toBe(25)
  })
})

describe('weekly_sessions / consistency progress', () => {
  it('does not count the current, still-incomplete week as a failure', () => {
    const goal = createGoal({
      title: 'Treinar 3x por semana', type: 'weekly_sessions', startDate: '2026-08-03',
      targetValue: 3, targetWeeks: 4,
    }).goal!
    // 2026-08-03 is a Monday; only 1 session logged so far in the current week.
    seedWorkout('2026-08-04T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])

    const progress = calculateGoalProgress(goal, new Date('2026-08-05T12:00:00.000Z'))
    expect(progress.status).not.toBe('behind')
    expect(progress.explanation).toContain('em andamento')
  })

  it('counts a full week meeting the session target as successful', () => {
    const goal = createGoal({
      title: 'Treinar 3x por semana', type: 'weekly_sessions', startDate: '2026-08-03',
      targetValue: 3, targetWeeks: 2,
    }).goal!
    seedWorkout('2026-08-03T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])
    seedWorkout('2026-08-05T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])
    seedWorkout('2026-08-07T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])

    const progress = calculateGoalProgress(goal, new Date('2026-08-11T12:00:00.000Z'))
    expect(progress.currentValue).toBe(1)
    expect(progress.headline).toContain('1 de 2 semanas')
  })

  it('marks the consistency goal completed once all target weeks succeed', () => {
    const goal = createGoal({
      title: 'Consistência de 2 semanas', type: 'consistency', startDate: '2026-08-03',
      targetValue: 2, targetWeeks: 2,
    }).goal!
    seedWorkout('2026-08-03T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])
    seedWorkout('2026-08-05T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])
    seedWorkout('2026-08-10T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])
    seedWorkout('2026-08-12T12:00:00.000Z', 'ex-1', [{ weight_kg: 40, reps: 8 }])

    const progress = calculateGoalProgress(goal, new Date('2026-08-18T12:00:00.000Z'))
    expect(progress.status).toBe('completed')
    expect(progress.progressPercentage).toBe(100)
  })
})

describe('goal status overrides', () => {
  it('reports paused status without computing metrics', () => {
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!
    const paused = pauseGoal(goal.id)!

    const progress = calculateGoalProgress(paused, new Date('2026-08-05T12:00:00.000Z'))
    expect(progress.status).toBe('paused')
  })

  it('reports completed status with all milestones reached', () => {
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!
    const completed = completeGoal(goal.id)!

    const progress = calculateGoalProgress(completed, new Date('2026-08-05T12:00:00.000Z'))
    expect(progress.status).toBe('completed')
    expect(progress.milestones.every((m) => m.reachedAt)).toBe(true)
  })
})
