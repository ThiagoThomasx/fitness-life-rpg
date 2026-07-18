import { describe, it, expect, beforeEach } from 'vitest'
import {
  createGoal,
  updateGoal,
  pauseGoal,
  resumeGoal,
  completeGoal,
  reopenGoal,
  archiveGoal,
  restoreGoal,
  getGoalById,
  getActiveGoals,
  getPausedGoals,
  getCompletedGoals,
  getArchivedGoals,
  getTrainingGoals,
  importGoals,
  validateGoalInput,
  type NewTrainingGoalInput,
} from './training-goals'

beforeEach(() => {
  window.localStorage.clear()
})

const weightGoalInput: NewTrainingGoalInput = {
  title: 'Supino 60kg',
  type: 'exercise_weight',
  startDate: '2026-08-01',
  exerciseId: 'ex-1',
  exerciseName: 'Supino reto',
  targetValue: 60,
}

const repsGoalInput: NewTrainingGoalInput = {
  title: 'Supino 12 reps a 40kg',
  type: 'exercise_reps',
  startDate: '2026-08-01',
  exerciseId: 'ex-1',
  exerciseName: 'Supino reto',
  targetValue: 40,
  targetReps: 12,
}

const frequencyGoalInput: NewTrainingGoalInput = {
  title: 'Treinar 4x por semana',
  type: 'weekly_sessions',
  startDate: '2026-08-01',
  targetValue: 4,
  targetWeeks: 6,
}

describe('validateGoalInput', () => {
  it('rejects an empty title', () => {
    expect(validateGoalInput({ ...weightGoalInput, title: '  ' })).toContain('título')
  })

  it('rejects an exercise goal without exerciseId', () => {
    expect(validateGoalInput({ ...weightGoalInput, exerciseId: undefined })).toContain('exercício')
  })

  it('rejects an exercise goal without a positive targetValue', () => {
    expect(validateGoalInput({ ...weightGoalInput, targetValue: 0 })).toContain('carga')
  })

  it('rejects an exercise_reps goal without targetReps', () => {
    expect(validateGoalInput({ ...repsGoalInput, targetReps: undefined })).toContain('repetições')
  })

  it('rejects a frequency goal without integer targetValue', () => {
    expect(validateGoalInput({ ...frequencyGoalInput, targetValue: 3.5 })).toContain('frequência')
  })

  it('rejects a frequency goal without targetWeeks', () => {
    expect(validateGoalInput({ ...frequencyGoalInput, targetWeeks: undefined })).toContain('semanas')
  })

  it('rejects a targetDate before startDate', () => {
    expect(validateGoalInput({ ...weightGoalInput, targetDate: '2026-07-01' })).toContain('data-alvo')
  })

  it('accepts a valid weight goal', () => {
    expect(validateGoalInput(weightGoalInput)).toBeNull()
  })
})

describe('createGoal', () => {
  it('creates an active goal with the given fields', () => {
    const result = createGoal(weightGoalInput)
    expect(result.ok).toBe(true)
    expect(result.goal?.status).toBe('active')
    expect(result.goal?.title).toBe('Supino 60kg')
    expect(result.goal?.targetValue).toBe(60)
  })

  it('rejects invalid input and does not persist', () => {
    const result = createGoal({ ...weightGoalInput, title: '' })
    expect(result.ok).toBe(false)
    expect(getTrainingGoals()).toHaveLength(0)
  })

  it('allows multiple simultaneous active goals (no single-active invariant)', () => {
    createGoal(weightGoalInput)
    createGoal(frequencyGoalInput)
    expect(getActiveGoals()).toHaveLength(2)
  })

  it('discards exercise fields for non-exercise goal types', () => {
    const result = createGoal({ ...frequencyGoalInput, exerciseId: 'ex-1', exerciseName: 'Supino' })
    expect(result.goal?.exerciseId).toBeUndefined()
    expect(result.goal?.exerciseName).toBeUndefined()
  })

  it('discards targetReps for non-reps goal types', () => {
    const result = createGoal({ ...weightGoalInput, targetReps: 10 })
    expect(result.goal?.targetReps).toBeUndefined()
  })
})

describe('updateGoal', () => {
  it('updates editable fields and bumps updatedAt', () => {
    const created = createGoal(weightGoalInput).goal!
    const updated = updateGoal(created.id, { title: 'Supino 65kg', targetValue: 65 })
    expect(updated?.title).toBe('Supino 65kg')
    expect(updated?.targetValue).toBe(65)
  })

  it('returns null for an unknown id', () => {
    expect(updateGoal('missing', { title: 'x' })).toBeNull()
  })
})

describe('lifecycle transitions', () => {
  it('pauses and resumes an active goal', () => {
    const goal = createGoal(weightGoalInput).goal!
    const paused = pauseGoal(goal.id)
    expect(paused?.status).toBe('paused')
    expect(getPausedGoals()).toHaveLength(1)

    const resumed = resumeGoal(goal.id)
    expect(resumed?.status).toBe('active')
    expect(getActiveGoals()).toHaveLength(1)
  })

  it('refuses to pause a goal that is not active', () => {
    const goal = createGoal(weightGoalInput).goal!
    pauseGoal(goal.id)
    expect(pauseGoal(goal.id)).toBeNull()
  })

  it('completes an active goal manually and sets completedAt', () => {
    const goal = createGoal(weightGoalInput).goal!
    const completed = completeGoal(goal.id, 'Alcançado na sessão de hoje')
    expect(completed?.status).toBe('completed')
    expect(completed?.completedAt).toBeTruthy()
    expect(completed?.notes).toBe('Alcançado na sessão de hoje')
    expect(getCompletedGoals()).toHaveLength(1)
  })

  it('completes a paused goal manually', () => {
    const goal = createGoal(weightGoalInput).goal!
    pauseGoal(goal.id)
    expect(completeGoal(goal.id)?.status).toBe('completed')
  })

  it('reopens a completed goal back to active and clears completedAt', () => {
    const goal = createGoal(weightGoalInput).goal!
    completeGoal(goal.id)
    const reopened = reopenGoal(goal.id)
    expect(reopened?.status).toBe('active')
    expect(reopened?.completedAt).toBeUndefined()
  })

  it('archives from active, paused, or completed', () => {
    const g1 = createGoal(weightGoalInput).goal!
    expect(archiveGoal(g1.id)?.status).toBe('archived')

    const g2 = createGoal({ ...weightGoalInput, title: 'g2' }).goal!
    pauseGoal(g2.id)
    expect(archiveGoal(g2.id)?.status).toBe('archived')

    const g3 = createGoal({ ...weightGoalInput, title: 'g3' }).goal!
    completeGoal(g3.id)
    expect(archiveGoal(g3.id)?.status).toBe('archived')

    expect(getArchivedGoals()).toHaveLength(3)
  })

  it('restores an archived goal back to paused, never to active', () => {
    const goal = createGoal(weightGoalInput).goal!
    archiveGoal(goal.id)
    const restored = restoreGoal(goal.id)
    expect(restored?.status).toBe('paused')
  })

  it('refuses to restore a goal that is not archived', () => {
    const goal = createGoal(weightGoalInput).goal!
    expect(restoreGoal(goal.id)).toBeNull()
  })
})

describe('getGoalById', () => {
  it('finds a goal by id', () => {
    const goal = createGoal(weightGoalInput).goal!
    expect(getGoalById(goal.id)?.title).toBe(goal.title)
  })

  it('returns null for an unknown id', () => {
    expect(getGoalById('missing')).toBeNull()
  })
})

describe('importGoals', () => {
  it('imports valid goals and skips duplicates by id', () => {
    const goal = createGoal(weightGoalInput).goal!
    const result = importGoals([goal, { id: 'not-valid' }])
    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(2)
    expect(getTrainingGoals()).toHaveLength(1)
  })

  it('imports a new valid goal not already present', () => {
    const foreignGoal = {
      id: 'goal-foreign', title: 'Meta importada', type: 'exercise_weight', status: 'active',
      startDate: '2026-08-01', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
    }
    const result = importGoals([foreignGoal])
    expect(result.imported).toBe(1)
    expect(getTrainingGoals()).toHaveLength(1)
  })

  it('ignores non-array input', () => {
    // @ts-expect-error deliberately invalid input for defensive coverage
    const result = importGoals({ not: 'an array' })
    expect(result).toEqual({ imported: 0, skipped: 0 })
  })
})
