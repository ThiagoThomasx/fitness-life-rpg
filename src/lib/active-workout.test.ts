import { describe, it, expect, beforeEach } from 'vitest'
import {
  savePlannedWorkout,
  updatePlannedWorkoutStatus,
  type PlannedWorkout,
  type WorkoutTemplateSnapshot,
} from './planned-workouts'
import {
  buildPlannedExecutionSnapshot,
  buildSourceFromPlannedWorkout,
  canStartPlannedWorkout,
  resolveExecutionExercise,
  FREE_WORKOUT_SOURCE,
} from './active-workout'
import type { Exercise } from '@/types/database'

beforeEach(() => {
  window.localStorage.clear()
})

function snapshot(): WorkoutTemplateSnapshot {
  return {
    name: 'Treino A',
    estimatedDurationMinutes: 45,
    exerciseBlocks: [
      {
        id: 'blk-1',
        type: 'single',
        exercise: {
          id: 'blk-ex-1',
          exerciseId: 'ex-1',
          exerciseName: 'Supino',
          sets: 3,
          reps: '8-10',
          loadKg: 60,
          restSeconds: 90,
          rir: 2,
        },
      },
      {
        id: 'blk-2',
        type: 'single',
        exercise: { id: 'blk-ex-2', exerciseName: 'Exercício sem vínculo' },
      },
    ],
    capturedAt: new Date().toISOString(),
  }
}

function makePlanned(overrides?: Partial<PlannedWorkout>): PlannedWorkout {
  return savePlannedWorkout({
    date: '2026-07-20',
    weekday: 1,
    name: 'Treino A',
    templateSnapshot: snapshot(),
    isOptional: false,
    ...overrides,
  })
}

describe('buildPlannedExecutionSnapshot', () => {
  it('freezes targets and estimated duration from the templateSnapshot', () => {
    const planned = makePlanned()
    const execSnapshot = buildPlannedExecutionSnapshot(planned)

    expect(execSnapshot.plannedWorkoutId).toBe(planned.id)
    expect(execSnapshot.estimatedDurationMinutes).toBe(45)
    expect(execSnapshot.exercises).toHaveLength(2)
    expect(execSnapshot.exercises[0]).toMatchObject({
      exerciseId: 'ex-1',
      exerciseName: 'Supino',
      targets: { sets: 3, reps: '8-10', loadKg: 60, restSeconds: 90, rir: 2 },
    })
    expect(execSnapshot.exercises[1].exerciseId).toBeUndefined()
  })
})

describe('buildSourceFromPlannedWorkout', () => {
  it('carries program/week/block linkage when present', () => {
    const planned = makePlanned({
      source: { programId: 'prog-1', programWeekId: 'week-1', programWeekNumber: 2, trainingBlockId: 'block-1' },
    })
    const source = buildSourceFromPlannedWorkout(planned)
    expect(source).toEqual({
      type: 'planned',
      plannedWorkoutId: planned.id,
      programId: 'prog-1',
      programVersion: undefined,
      programWeekId: 'week-1',
      programWeekNumber: 2,
      trainingBlockId: 'block-1',
      templateId: undefined,
      templateVersion: undefined,
    })
  })

  it('still produces a valid source with no program linkage (manual planned workout)', () => {
    const planned = makePlanned()
    expect(buildSourceFromPlannedWorkout(planned).type).toBe('planned')
  })
})

describe('canStartPlannedWorkout', () => {
  it('blocks when the planned workout does not exist', () => {
    expect(canStartPlannedWorkout(null, false)).toEqual({ ok: false, reason: 'not_found' })
  })

  it('blocks when a session is already active', () => {
    const planned = makePlanned()
    expect(canStartPlannedWorkout(planned, true)).toEqual({ ok: false, reason: 'already_active' })
  })

  it('blocks when the planned workout is not pending', () => {
    const planned = makePlanned()
    const done = updatePlannedWorkoutStatus(planned.id, 'done')
    expect(canStartPlannedWorkout(done, false)).toEqual({ ok: false, reason: 'not_pending' })
  })

  it('allows starting a pending planned workout with no active session', () => {
    const planned = makePlanned()
    expect(canStartPlannedWorkout(planned, false)).toEqual({ ok: true })
  })
})

describe('resolveExecutionExercise', () => {
  const known: Exercise = {
    id: 'ex-1',
    workout_type_id: 'wt-1',
    name: 'Supino',
    muscle_groups: ['peito'],
    equipment: ['barra'],
    instructions: null,
  }

  it('resolves to the full Exercise record when exerciseId matches', () => {
    const planned = makePlanned()
    const execSnapshot = buildPlannedExecutionSnapshot(planned)
    const resolved = resolveExecutionExercise(execSnapshot.exercises[0], [known])
    expect(resolved).toEqual(known)
  })

  it('falls back to a minimal stub preserving the planned name when unresolved', () => {
    const planned = makePlanned()
    const execSnapshot = buildPlannedExecutionSnapshot(planned)
    const resolved = resolveExecutionExercise(execSnapshot.exercises[1], [known])
    expect(resolved.name).toBe('Exercício sem vínculo')
    expect(resolved.muscle_groups).toEqual([])
  })
})

describe('FREE_WORKOUT_SOURCE', () => {
  it('is the default free-workout source', () => {
    expect(FREE_WORKOUT_SOURCE).toEqual({ type: 'free' })
  })
})
