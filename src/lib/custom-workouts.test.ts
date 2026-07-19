import { describe, it, expect, beforeEach } from 'vitest'
import { saveCustomExercise, deleteCustomExercise, isCustomExerciseUsed } from './custom-workouts'
import { savePlannedWorkout } from './planned-workouts'
import { saveTrainingProgram } from './training-programs'
import type { WorkoutTemplateSnapshot } from './planned-workouts'

beforeEach(() => {
  window.localStorage.clear()
})

function snapshot(exerciseId: string): WorkoutTemplateSnapshot {
  return {
    name: 'Treino A',
    exerciseBlocks: [{ id: 'blk-1', type: 'single', exercise: { id: 'ex-1', exerciseId, exerciseName: 'Custom' } }],
    capturedAt: new Date().toISOString(),
  }
}

describe('isCustomExerciseUsed', () => {
  it('returns false for an exercise not referenced anywhere', () => {
    const ex = saveCustomExercise({ name: 'Livre', workout_type_id: 'wt-1', muscle_groups: [], equipment: [], instructions: null })
    expect(isCustomExerciseUsed(ex.id)).toBe(false)
  })

  it('returns true when referenced by a planned workout', () => {
    const ex = saveCustomExercise({ name: 'Usado', workout_type_id: 'wt-1', muscle_groups: [], equipment: [], instructions: null })
    savePlannedWorkout({
      date: '2026-07-20',
      weekday: 1,
      name: 'A',
      templateSnapshot: snapshot(ex.id),
      isOptional: false,
    })
    expect(isCustomExerciseUsed(ex.id)).toBe(true)
  })

  it('returns true when referenced by a training program', () => {
    const ex = saveCustomExercise({ name: 'EmPrograma', workout_type_id: 'wt-1', muscle_groups: [], equipment: [], instructions: null })
    saveTrainingProgram({
      name: 'Programa Teste',
      tags: [],
      weeks: [
        {
          id: 'week-1',
          weekNumber: 1,
          sessions: [{ id: 'sess-1', name: 'Treino A', templateSnapshot: snapshot(ex.id), isOptional: false }],
        },
      ],
    })
    expect(isCustomExerciseUsed(ex.id)).toBe(true)
  })
})

describe('deleteCustomExercise', () => {
  it('blocks deletion when the exercise is in use', () => {
    const ex = saveCustomExercise({ name: 'Usado', workout_type_id: 'wt-1', muscle_groups: [], equipment: [], instructions: null })
    savePlannedWorkout({
      date: '2026-07-20',
      weekday: 1,
      name: 'A',
      templateSnapshot: snapshot(ex.id),
      isOptional: false,
    })
    const result = deleteCustomExercise(ex.id, isCustomExerciseUsed(ex.id))
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('allows deletion when the exercise is not in use', () => {
    const ex = saveCustomExercise({ name: 'Livre', workout_type_id: 'wt-1', muscle_groups: [], equipment: [], instructions: null })
    const result = deleteCustomExercise(ex.id, isCustomExerciseUsed(ex.id))
    expect(result.ok).toBe(true)
  })
})
