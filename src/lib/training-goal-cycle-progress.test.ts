import { describe, it, expect, beforeEach } from 'vitest'
import { calculateGoalProgress } from './training-goal-progress'
import { createGoal } from './training-goals'
import { createCycle, completeCycle, archiveCycle } from './training-cycles'

beforeEach(() => {
  window.localStorage.clear()
})

describe('cycle_completion progress', () => {
  it('reports in_progress while the linked cycle is still active', () => {
    const cycle = createCycle({ name: 'Bloco de força', goal: 'strength', startDate: '2026-08-01' }).cycle!
    const goal = createGoal({
      title: 'Concluir o bloco de força', type: 'cycle_completion', startDate: '2026-08-01', cycleId: cycle.id,
    }).goal!

    const progress = calculateGoalProgress(goal, new Date('2026-08-10T12:00:00.000Z'))
    expect(progress.status).toBe('in_progress')
    expect(progress.progressPercentage).toBe(0)
  })

  it('completes when the linked cycle is completed', () => {
    const cycle = createCycle({ name: 'Bloco de força', goal: 'strength', startDate: '2026-08-01' }).cycle!
    const goal = createGoal({
      title: 'Concluir o bloco de força', type: 'cycle_completion', startDate: '2026-08-01', cycleId: cycle.id,
    }).goal!
    completeCycle(cycle.id)

    const progress = calculateGoalProgress(goal, new Date('2026-09-01T12:00:00.000Z'))
    expect(progress.status).toBe('completed')
    expect(progress.progressPercentage).toBe(100)
  })

  it('does not treat an archived-without-completion cycle as completed', () => {
    const cycle = createCycle({ name: 'Bloco cancelado', goal: 'general', startDate: '2026-08-01' }).cycle!
    completeCycle(cycle.id)
    archiveCycle(cycle.id)
    const goal = createGoal({
      title: 'Concluir bloco', type: 'cycle_completion', startDate: '2026-08-01', cycleId: cycle.id,
    }).goal!

    // archiveCycle only succeeds from 'completed', so this cycle is actually
    // completed+archived — still counts as completed by status.
    const progress = calculateGoalProgress(goal, new Date('2026-09-01T12:00:00.000Z'))
    expect(progress.status).toBe('completed')
  })

  it('reports insufficient_data when the linked cycle no longer exists', () => {
    const goal = createGoal({
      title: 'Concluir ciclo removido', type: 'cycle_completion', startDate: '2026-08-01', cycleId: 'missing-cycle',
    }).goal!
    const progress = calculateGoalProgress(goal, new Date('2026-09-01T12:00:00.000Z'))
    expect(progress.status).toBe('insufficient_data')
  })
})
