import { describe, it, expect, beforeEach } from 'vitest'
import { calculateGoalProgress } from './training-goal-progress'
import { createGoal } from './training-goals'
import type { CompletedWorkout } from './workout-history'

beforeEach(() => {
  window.localStorage.clear()
})

function seedWorkout(
  completedAt: string,
  flags: { isWeightPr?: boolean; isRepsPr?: boolean; isVolumePr?: boolean; isFirstTime?: boolean }
): void {
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
    prsCount: 1,
    exercises: [
      {
        exerciseId: 'ex-2',
        exerciseName: 'Agachamento',
        sets: [{ weight_kg: 80, reps: 5, isPr: true }],
        ...flags,
      },
    ],
  }
  window.localStorage.setItem('lrpg-fit:workout-history', JSON.stringify([workout, ...history]))
}

describe('personal_record progress', () => {
  it('reports in_progress with no matching PR yet', () => {
    const goal = createGoal({
      title: 'Novo PR no agachamento', type: 'personal_record', startDate: '2026-08-01',
      exerciseId: 'ex-2', exerciseName: 'Agachamento', recordType: 'weight',
    }).goal!

    const progress = calculateGoalProgress(goal, new Date('2026-08-05T12:00:00.000Z'))
    expect(progress.status).toBe('in_progress')
  })

  it('completes when a matching PR is registered after the goal start date', () => {
    const goal = createGoal({
      title: 'Novo PR no agachamento', type: 'personal_record', startDate: '2026-08-01',
      exerciseId: 'ex-2', exerciseName: 'Agachamento', recordType: 'weight',
    }).goal!
    seedWorkout('2026-08-05T12:00:00.000Z', { isWeightPr: true })

    const progress = calculateGoalProgress(goal, new Date('2026-08-10T12:00:00.000Z'))
    expect(progress.status).toBe('completed')
    expect(progress.progressPercentage).toBe(100)
  })

  it('ignores a PR registered before the goal start date', () => {
    seedWorkout('2026-07-15T12:00:00.000Z', { isWeightPr: true })
    const goal = createGoal({
      title: 'Novo PR no agachamento', type: 'personal_record', startDate: '2026-08-01',
      exerciseId: 'ex-2', exerciseName: 'Agachamento', recordType: 'weight',
    }).goal!

    const progress = calculateGoalProgress(goal, new Date('2026-08-10T12:00:00.000Z'))
    expect(progress.status).toBe('in_progress')
  })

  it('does not match a PR of a different recordType', () => {
    const goal = createGoal({
      title: 'Novo PR no agachamento', type: 'personal_record', startDate: '2026-08-01',
      exerciseId: 'ex-2', exerciseName: 'Agachamento', recordType: 'reps',
    }).goal!
    seedWorkout('2026-08-05T12:00:00.000Z', { isWeightPr: true, isRepsPr: false })

    const progress = calculateGoalProgress(goal, new Date('2026-08-10T12:00:00.000Z'))
    expect(progress.status).toBe('in_progress')
  })

  it('reports insufficient_data when exercise or recordType are missing', () => {
    const goal = createGoal({
      title: 'Novo PR no agachamento', type: 'personal_record', startDate: '2026-08-01',
      exerciseId: 'ex-2', exerciseName: 'Agachamento', recordType: 'weight',
    }).goal!
    const incomplete = { ...goal, recordType: undefined }

    const progress = calculateGoalProgress(incomplete, new Date('2026-08-10T12:00:00.000Z'))
    expect(progress.status).toBe('insufficient_data')
  })
})
