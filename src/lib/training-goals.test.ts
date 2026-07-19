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
  updateGoalManualProgress,
  getGoalById,
  getActiveGoals,
  getPausedGoals,
  getCompletedGoals,
  getArchivedGoals,
  getTrainingGoals,
  importGoals,
  validateGoalInput,
  type NewTrainingGoalInput,
  type TrainingGoal,
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

const volumeGoalInput: NewTrainingGoalInput = {
  title: 'Manter volume semanal',
  type: 'weekly_volume',
  startDate: '2026-08-01',
  targetWeeklyVolumeKg: 12000,
  targetWeeks: 4,
  consecutiveWeeks: true,
}

const cycleCompletionGoalInput: NewTrainingGoalInput = {
  title: 'Concluir o bloco de força',
  type: 'cycle_completion',
  startDate: '2026-08-01',
  cycleId: 'cycle-1',
}

const personalRecordGoalInput: NewTrainingGoalInput = {
  title: 'Novo PR no agachamento',
  type: 'personal_record',
  startDate: '2026-08-01',
  exerciseId: 'ex-2',
  exerciseName: 'Agachamento',
  recordType: 'weight',
}

const customGoalInput: NewTrainingGoalInput = {
  title: 'Melhorar minha técnica no levantamento terra',
  type: 'custom',
  startDate: '2026-08-01',
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

  it('accepts a valid weekly_volume goal', () => {
    expect(validateGoalInput(volumeGoalInput)).toBeNull()
  })

  it('rejects a weekly_volume goal without targetWeeklyVolumeKg', () => {
    expect(validateGoalInput({ ...volumeGoalInput, targetWeeklyVolumeKg: undefined })).toContain('volume')
  })

  it('rejects a weekly_volume goal without targetWeeks', () => {
    expect(validateGoalInput({ ...volumeGoalInput, targetWeeks: undefined })).toContain('semanas')
  })

  it('accepts a valid cycle_completion goal', () => {
    expect(validateGoalInput(cycleCompletionGoalInput)).toBeNull()
  })

  it('rejects a cycle_completion goal without cycleId', () => {
    expect(validateGoalInput({ ...cycleCompletionGoalInput, cycleId: undefined })).toContain('ciclo')
  })

  it('accepts a valid personal_record goal', () => {
    expect(validateGoalInput(personalRecordGoalInput)).toBeNull()
  })

  it('rejects a personal_record goal without exerciseId', () => {
    expect(validateGoalInput({ ...personalRecordGoalInput, exerciseId: undefined })).toContain('exercício')
  })

  it('rejects a personal_record goal without a valid recordType', () => {
    expect(validateGoalInput({ ...personalRecordGoalInput, recordType: undefined })).toContain('recorde')
  })

  it('accepts a valid custom goal with only a title', () => {
    expect(validateGoalInput(customGoalInput)).toBeNull()
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

  it('creates a weekly_volume goal with volume fields, discarding unrelated fields', () => {
    const result = createGoal(volumeGoalInput)
    expect(result.ok).toBe(true)
    expect(result.goal?.targetWeeklyVolumeKg).toBe(12000)
    expect(result.goal?.consecutiveWeeks).toBe(true)
    expect(result.goal?.targetWeeks).toBe(4)
    expect(result.goal?.exerciseId).toBeUndefined()
  })

  it('creates a cycle_completion goal with cycleId, discarding unrelated fields', () => {
    const result = createGoal(cycleCompletionGoalInput)
    expect(result.ok).toBe(true)
    expect(result.goal?.cycleId).toBe('cycle-1')
    expect(result.goal?.targetWeeklyVolumeKg).toBeUndefined()
  })

  it('creates a personal_record goal with exerciseId and recordType', () => {
    const result = createGoal(personalRecordGoalInput)
    expect(result.ok).toBe(true)
    expect(result.goal?.exerciseId).toBe('ex-2')
    expect(result.goal?.recordType).toBe('weight')
    expect(result.goal?.cycleId).toBeUndefined()
  })

  it('creates a custom goal starting at 0% manual progress', () => {
    const result = createGoal(customGoalInput)
    expect(result.ok).toBe(true)
    expect(result.goal?.manualProgressPercentage).toBe(0)
  })
})

describe('updateGoalManualProgress', () => {
  it('updates manual progress for a custom goal', () => {
    const goal = createGoal(customGoalInput).goal!
    const updated = updateGoalManualProgress(goal.id, 40)
    expect(updated?.manualProgressPercentage).toBe(40)
  })

  it('clamps values outside 0-100', () => {
    const goal = createGoal(customGoalInput).goal!
    expect(updateGoalManualProgress(goal.id, 150)?.manualProgressPercentage).toBe(100)
    expect(updateGoalManualProgress(goal.id, -20)?.manualProgressPercentage).toBe(0)
  })

  it('refuses to update a non-custom goal', () => {
    const goal = createGoal(weightGoalInput).goal!
    expect(updateGoalManualProgress(goal.id, 50)).toBeNull()
  })

  it('refuses to update an archived custom goal', () => {
    const goal = createGoal(customGoalInput).goal!
    archiveGoal(goal.id)
    expect(updateGoalManualProgress(goal.id, 50)).toBeNull()
  })

  it('allows updating a paused custom goal', () => {
    const goal = createGoal(customGoalInput).goal!
    pauseGoal(goal.id)
    expect(updateGoalManualProgress(goal.id, 50)?.manualProgressPercentage).toBe(50)
  })
})

describe('backward compatibility with Sprint 18 goal shape', () => {
  it('accepts a Sprint-18-shaped goal (no new optional fields) via importGoals', () => {
    const legacyGoal: TrainingGoal = {
      id: 'goal-legacy',
      title: 'Meta antiga',
      type: 'exercise_weight',
      status: 'active',
      startDate: '2026-08-01',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      targetValue: 60,
      exerciseId: 'ex-1',
      exerciseName: 'Supino reto',
    }
    const result = importGoals([legacyGoal])
    expect(result.imported).toBe(1)
    expect(getGoalById('goal-legacy')?.targetWeeklyVolumeKg).toBeUndefined()
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
