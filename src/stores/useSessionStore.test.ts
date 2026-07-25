import { describe, it, expect, beforeEach } from 'vitest'
import { useSessionStore } from './useSessionStore'
import type { WorkoutSession, Exercise } from '@/types/database'
import { FREE_WORKOUT_SOURCE, type ActiveWorkoutSource, type PlannedWorkoutExecutionSnapshot } from '@/lib/active-workout'

function makeSession(): WorkoutSession {
  return {
    id: 'session-1',
    workout_id: 'pw-1',
    user_id: 'mock-user-id',
    started_at: new Date().toISOString(),
    completed_at: null,
    xp_earned: 0,
    intensity_multiplier: 1,
    notes: null,
  }
}

function makeExercise(id: string, name = 'Supino'): Exercise {
  return { id, workout_type_id: 'wt-1', name, muscle_groups: ['peito'], equipment: [], instructions: null }
}

const plannedSource: ActiveWorkoutSource = { type: 'planned', plannedWorkoutId: 'pw-1' }

function plannedSnapshot(): PlannedWorkoutExecutionSnapshot {
  return {
    plannedWorkoutId: 'pw-1',
    name: 'Treino A',
    exercises: [
      { id: 'blk-1', exerciseId: 'ex-1', exerciseName: 'Supino', targets: { sets: 3, reps: '8-10' } },
    ],
    capturedAt: new Date().toISOString(),
  }
}

beforeEach(() => {
  window.localStorage.clear()
  useSessionStore.getState().endSession()
})

describe('startSession', () => {
  it('defaults to the free source with no planned snapshot when no options are given', () => {
    useSessionStore.getState().startSession(makeSession())
    expect(useSessionStore.getState().source).toEqual(FREE_WORKOUT_SOURCE)
    expect(useSessionStore.getState().plannedSnapshot).toBeNull()
    expect(useSessionStore.getState().status).toBe('active')
  })

  it('persists source and plannedSnapshot when provided', () => {
    const snapshot = plannedSnapshot()
    useSessionStore.getState().startSession(makeSession(), { source: plannedSource, plannedSnapshot: snapshot })
    expect(useSessionStore.getState().source).toEqual(plannedSource)
    expect(useSessionStore.getState().plannedSnapshot).toEqual(snapshot)
  })
})

describe('addExercise with meta', () => {
  it('tags a planned exercise with source/plannedExerciseId/plannedTargets', () => {
    useSessionStore.getState().startSession(makeSession(), { source: plannedSource, plannedSnapshot: plannedSnapshot() })
    useSessionStore.getState().addExercise(makeExercise('ex-1'), {
      source: 'planned',
      plannedExerciseId: 'blk-1',
      plannedTargets: { sets: 3, reps: '8-10' },
    })
    const [row] = useSessionStore.getState().activeSets
    expect(row.source).toBe('planned')
    expect(row.plannedExerciseId).toBe('blk-1')
    expect(row.plannedTargets).toEqual({ sets: 3, reps: '8-10' })
  })

  it('leaves source/plannedExerciseId undefined for free workouts (no meta)', () => {
    useSessionStore.getState().startSession(makeSession())
    useSessionStore.getState().addExercise(makeExercise('ex-1'))
    const [row] = useSessionStore.getState().activeSets
    expect(row.source).toBeUndefined()
    expect(row.plannedExerciseId).toBeUndefined()
  })
})

describe('substituteExercise', () => {
  function startWithPlannedExercise() {
    useSessionStore.getState().startSession(makeSession(), { source: plannedSource, plannedSnapshot: plannedSnapshot() })
    useSessionStore.getState().addExercise(makeExercise('ex-1'), {
      source: 'planned',
      plannedExerciseId: 'blk-1',
      plannedTargets: { sets: 3, reps: '8-10' },
    })
  }

  it('replaces the exercise, tags source substitution, and records the substitution', () => {
    startWithPlannedExercise()
    const replacement = makeExercise('ex-2', 'Supino inclinado')
    useSessionStore.getState().substituteExercise('ex-1', replacement, 'equipment', 'sem banco livre')

    const [row] = useSessionStore.getState().activeSets
    expect(row.exercise).toEqual(replacement)
    expect(row.source).toBe('substitution')
    expect(row.substitution).toMatchObject({
      plannedExerciseId: 'blk-1',
      plannedExerciseName: 'Supino',
      replacementExerciseId: 'ex-2',
      replacementExerciseName: 'Supino inclinado',
      reason: 'equipment',
      note: 'sem banco livre',
    })
    // plannedTargets preservados — a referência planejada não muda com a substituição.
    expect(row.plannedTargets).toEqual({ sets: 3, reps: '8-10' })
  })

  it('clears existing sets on substitution instead of carrying them over silently', () => {
    startWithPlannedExercise()
    useSessionStore.getState().addSet('ex-1', { exercise_id: 'ex-1', set_number: 1, weight_kg: 60, reps: 8 })
    useSessionStore.getState().substituteExercise('ex-1', makeExercise('ex-2', 'Supino inclinado'))
    const [row] = useSessionStore.getState().activeSets
    expect(row.sets).toEqual([])
  })

  it('does nothing when the exercise has no planned origin (free workout)', () => {
    useSessionStore.getState().startSession(makeSession())
    useSessionStore.getState().addExercise(makeExercise('ex-1'))
    useSessionStore.getState().substituteExercise('ex-1', makeExercise('ex-2'))
    const [row] = useSessionStore.getState().activeSets
    expect(row.exercise.id).toBe('ex-1')
    expect(row.source).toBeUndefined()
  })

  it('preserves the original planned name across a second substitution', () => {
    startWithPlannedExercise()
    useSessionStore.getState().substituteExercise('ex-1', makeExercise('ex-2', 'Supino inclinado'))
    useSessionStore.getState().substituteExercise('ex-2', makeExercise('ex-3', 'Crucifixo'))
    const [row] = useSessionStore.getState().activeSets
    expect(row.substitution?.plannedExerciseName).toBe('Supino')
    expect(row.substitution?.replacementExerciseName).toBe('Crucifixo')
  })

  it('does not substitute into an exercise id already present in another row', () => {
    startWithPlannedExercise()
    useSessionStore.getState().addExercise(makeExercise('ex-2', 'Puxada'))
    useSessionStore.getState().substituteExercise('ex-1', makeExercise('ex-2', 'Puxada'))
    expect(useSessionStore.getState().activeSets).toHaveLength(2)
    expect(useSessionStore.getState().activeSets[0].exercise.id).toBe('ex-1')
  })
})

describe('revertExerciseSubstitution', () => {
  it('restores the original planned exercise, clears substitution and sets', () => {
    useSessionStore.getState().startSession(makeSession(), { source: plannedSource, plannedSnapshot: plannedSnapshot() })
    useSessionStore.getState().addExercise(makeExercise('ex-1'), {
      source: 'planned',
      plannedExerciseId: 'blk-1',
      plannedTargets: { sets: 3, reps: '8-10' },
    })
    useSessionStore.getState().substituteExercise('ex-1', makeExercise('ex-2', 'Supino inclinado'))
    useSessionStore.getState().addSet('ex-2', { exercise_id: 'ex-2', set_number: 1, weight_kg: 40, reps: 10 })

    useSessionStore.getState().revertExerciseSubstitution('ex-2')

    const [row] = useSessionStore.getState().activeSets
    expect(row.exercise.id).toBe('ex-1')
    expect(row.source).toBe('planned')
    expect(row.substitution).toBeUndefined()
    expect(row.sets).toEqual([])
    expect(row.plannedTargets).toEqual({ sets: 3, reps: '8-10' })
  })

  it('does nothing when the exercise was never substituted', () => {
    useSessionStore.getState().startSession(makeSession())
    useSessionStore.getState().addExercise(makeExercise('ex-1'))
    useSessionStore.getState().revertExerciseSubstitution('ex-1')
    expect(useSessionStore.getState().activeSets[0].exercise.id).toBe('ex-1')
  })
})

describe('skipExercise / restoreExercise', () => {
  it('marks an exercise as skipped without touching its sets by default', () => {
    useSessionStore.getState().startSession(makeSession())
    useSessionStore.getState().addExercise(makeExercise('ex-1'))
    useSessionStore.getState().addSet('ex-1', { exercise_id: 'ex-1', set_number: 1, weight_kg: 10, reps: 5 })
    useSessionStore.getState().skipExercise('ex-1')
    const [row] = useSessionStore.getState().activeSets
    expect(row.executionStatus).toBe('skipped')
    expect(row.sets).toHaveLength(1)
  })

  it('clears sets when clearSets is requested', () => {
    useSessionStore.getState().startSession(makeSession())
    useSessionStore.getState().addExercise(makeExercise('ex-1'))
    useSessionStore.getState().addSet('ex-1', { exercise_id: 'ex-1', set_number: 1, weight_kg: 10, reps: 5 })
    useSessionStore.getState().skipExercise('ex-1', { clearSets: true })
    expect(useSessionStore.getState().activeSets[0].sets).toEqual([])
  })

  it('restores a skipped exercise back to pending', () => {
    useSessionStore.getState().startSession(makeSession())
    useSessionStore.getState().addExercise(makeExercise('ex-1'))
    useSessionStore.getState().skipExercise('ex-1')
    useSessionStore.getState().restoreExercise('ex-1')
    expect(useSessionStore.getState().activeSets[0].executionStatus).toBeUndefined()
  })
})

describe('moveExercise', () => {
  it('moves an exercise up and down, and no-ops at the boundaries', () => {
    useSessionStore.getState().startSession(makeSession())
    useSessionStore.getState().addExercise(makeExercise('ex-1', 'A'))
    useSessionStore.getState().addExercise(makeExercise('ex-2', 'B'))
    useSessionStore.getState().addExercise(makeExercise('ex-3', 'C'))

    useSessionStore.getState().moveExercise('ex-1', 'up')
    expect(useSessionStore.getState().activeSets.map((s) => s.exercise.id)).toEqual(['ex-1', 'ex-2', 'ex-3'])

    useSessionStore.getState().moveExercise('ex-2', 'up')
    expect(useSessionStore.getState().activeSets.map((s) => s.exercise.id)).toEqual(['ex-2', 'ex-1', 'ex-3'])

    useSessionStore.getState().moveExercise('ex-3', 'down')
    expect(useSessionStore.getState().activeSets.map((s) => s.exercise.id)).toEqual(['ex-2', 'ex-1', 'ex-3'])
  })
})

describe('pauseSession / resumeSession', () => {
  it('pauses and resumes, recording pausedAt', () => {
    useSessionStore.getState().startSession(makeSession())
    useSessionStore.getState().pauseSession()
    expect(useSessionStore.getState().status).toBe('paused')
    expect(useSessionStore.getState().pausedAt).not.toBeNull()

    useSessionStore.getState().resumeSession()
    expect(useSessionStore.getState().status).toBe('active')
    expect(useSessionStore.getState().pausedAt).toBeNull()
  })

  it('does not restart startedAt or duplicate the session on resume', () => {
    const session = makeSession()
    useSessionStore.getState().startSession(session)
    useSessionStore.getState().pauseSession()
    useSessionStore.getState().resumeSession()
    expect(useSessionStore.getState().activeSession).toEqual(session)
  })
})

describe('endSession', () => {
  it('resets status/pausedAt back to defaults', () => {
    useSessionStore.getState().startSession(makeSession())
    useSessionStore.getState().pauseSession()
    useSessionStore.getState().endSession()
    expect(useSessionStore.getState().status).toBe('active')
    expect(useSessionStore.getState().pausedAt).toBeNull()
    expect(useSessionStore.getState().activeSession).toBeNull()
  })
})
