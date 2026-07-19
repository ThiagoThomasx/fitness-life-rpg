import { describe, it, expect, beforeEach } from 'vitest'
import { evaluateGoalCompletion } from './training-goal-completion'
import { createGoal, pauseGoal, archiveGoal, completeGoal } from './training-goals'
import { createCycle, completeCycle } from './training-cycles'
import type { CompletedWorkout } from './workout-history'

beforeEach(() => {
  window.localStorage.clear()
})

function seedWorkout(
  completedAt: string,
  exerciseId: string,
  weightKg: number,
  reps: number,
  flags: { isWeightPr?: boolean } = {}
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
    prsCount: 0,
    exercises: [{ exerciseId, exerciseName: 'Supino reto', sets: [{ weight_kg: weightKg, reps, isPr: false }], ...flags }],
  }
  window.localStorage.setItem('lrpg-fit:workout-history', JSON.stringify([workout, ...history]))
}

describe('evaluateGoalCompletion safety rules', () => {
  it('never completes a paused goal', () => {
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!
    seedWorkout('2026-08-05T12:00:00.000Z', 'ex-1', 60, 5)
    const paused = pauseGoal(goal.id)!

    const result = evaluateGoalCompletion(paused, new Date('2026-08-10T12:00:00.000Z'))
    expect(result.shouldComplete).toBe(false)
    expect(result.reason).toBe('not_active')
  })

  it('never completes an archived goal', () => {
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!
    seedWorkout('2026-08-05T12:00:00.000Z', 'ex-1', 60, 5)
    const archived = archiveGoal(goal.id)!

    const result = evaluateGoalCompletion(archived, new Date('2026-08-10T12:00:00.000Z'))
    expect(result.shouldComplete).toBe(false)
    expect(result.reason).toBe('not_active')
  })

  it('never auto-completes an already-completed goal', () => {
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!
    const completed = completeGoal(goal.id)!

    const result = evaluateGoalCompletion(completed, new Date('2026-08-10T12:00:00.000Z'))
    expect(result.shouldComplete).toBe(false)
    expect(result.reason).toBe('not_active')
  })

  it('never auto-completes a custom goal, regardless of manual progress', () => {
    const goal = createGoal({ title: 'Melhorar técnica', type: 'custom', startDate: '2026-08-01' }).goal!
    const result = evaluateGoalCompletion(goal, new Date('2026-08-10T12:00:00.000Z'))
    expect(result.shouldComplete).toBe(false)
    expect(result.reason).toBe('manual_only')
  })

  it('completes an exercise_weight goal once the target is reached, with workout evidence', () => {
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!
    seedWorkout('2026-08-05T12:00:00.000Z', 'ex-1', 60, 5)

    const result = evaluateGoalCompletion(goal, new Date('2026-08-10T12:00:00.000Z'))
    expect(result.shouldComplete).toBe(true)
    expect(result.reason).toBe('evidence_sufficient')
    expect(result.evidence?.source).toBe('workout')
    expect(result.evidence?.value).toBe(60)
    expect(result.completedAt).toBeTruthy()
  })

  it('does not complete from pre-start data alone when the pre-start value is below target', () => {
    // Pre-start workout only establishes the inferred baseline (50kg) — it must
    // not, by itself, satisfy a higher target (60kg) without progress after start.
    seedWorkout('2026-07-01T12:00:00.000Z', 'ex-1', 50, 5)
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!

    const result = evaluateGoalCompletion(goal, new Date('2026-08-10T12:00:00.000Z'))
    expect(result.shouldComplete).toBe(false)
  })

  it('ignores a PR registered before the goal start date (personal_record type)', () => {
    seedWorkout('2026-07-01T12:00:00.000Z', 'ex-2', 80, 5, { isWeightPr: true })
    const goal = createGoal({
      title: 'Novo PR no agachamento', type: 'personal_record', startDate: '2026-08-01',
      exerciseId: 'ex-2', exerciseName: 'Agachamento', recordType: 'weight',
    }).goal!

    const result = evaluateGoalCompletion(goal, new Date('2026-08-10T12:00:00.000Z'))
    expect(result.shouldComplete).toBe(false)
  })

  it('never completes a weekly_volume goal during its current partial week', () => {
    const goal = createGoal({
      title: 'Volume semanal', type: 'weekly_volume', startDate: '2026-08-03',
      targetWeeklyVolumeKg: 100, targetWeeks: 1,
    }).goal!
    seedWorkout('2026-08-04T12:00:00.000Z', 'ex-1', 50, 2) // 100kg this week, but week not elapsed yet

    const result = evaluateGoalCompletion(goal, new Date('2026-08-05T12:00:00.000Z'))
    expect(result.shouldComplete).toBe(false)
  })

  it('ignores a cycle completed before the goal was created', () => {
    const cycle = createCycle({ name: 'Bloco antigo', goal: 'general', startDate: '2026-07-01' }).cycle!
    completeCycle(cycle.id)
    // Backdate the goal's createdAt to after the cycle's completion to simulate the unsafe ordering.
    const goal = createGoal({
      title: 'Concluir bloco antigo', type: 'cycle_completion', startDate: '2026-07-01', cycleId: cycle.id,
    }).goal!
    const backdatedCreated = { ...goal, createdAt: '2099-01-01T00:00:00.000Z' }

    const result = evaluateGoalCompletion(backdatedCreated, new Date('2099-02-01T12:00:00.000Z'))
    expect(result.shouldComplete).toBe(false)
    expect(result.reason).toBe('cycle_completed_before_goal_created')
  })

  it('completes a cycle_completion goal when the cycle finishes after goal creation', () => {
    const cycle = createCycle({ name: 'Bloco de força', goal: 'strength', startDate: '2026-08-01' }).cycle!
    const goal = createGoal({
      title: 'Concluir o bloco de força', type: 'cycle_completion', startDate: '2026-08-01', cycleId: cycle.id,
    }).goal!
    completeCycle(cycle.id)

    const result = evaluateGoalCompletion(goal, new Date('2026-09-01T12:00:00.000Z'))
    expect(result.shouldComplete).toBe(true)
    expect(result.evidence?.source).toBe('cycle')
  })

  it('is idempotent — re-evaluating an already-completed condition returns the same shouldComplete', () => {
    const goal = createGoal({
      title: 'Supino 60kg', type: 'exercise_weight', startDate: '2026-08-01',
      exerciseId: 'ex-1', exerciseName: 'Supino reto', targetValue: 60,
    }).goal!
    seedWorkout('2026-08-05T12:00:00.000Z', 'ex-1', 60, 5)

    const first = evaluateGoalCompletion(goal, new Date('2026-08-10T12:00:00.000Z'))
    const second = evaluateGoalCompletion(goal, new Date('2026-08-10T12:00:00.000Z'))
    expect(first.shouldComplete).toBe(true)
    expect(second.shouldComplete).toBe(true)
  })
})
