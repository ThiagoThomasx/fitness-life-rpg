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
  formatPlannedTargets,
  deriveExerciseExecutionStatus,
  moveActiveExercise,
  validateActiveWorkoutAdaptations,
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

describe('formatPlannedTargets', () => {
  it('joins available fields and never shows an absent field as zero', () => {
    expect(formatPlannedTargets({ sets: 3, reps: '8-10', loadKg: 60, restSeconds: 90, rir: 2 })).toBe(
      '3x8-10 · 60kg · descanso 90s · RIR 2'
    )
  })

  it('falls back to a placeholder when no targets are set', () => {
    expect(formatPlannedTargets({})).toBe('Sem alvo definido')
  })

  it('shows sets alone when reps is absent', () => {
    expect(formatPlannedTargets({ sets: 4 })).toBe('4 séries')
  })

  it('shows rpe/tempo even when the value is 0', () => {
    expect(formatPlannedTargets({ rpe: 0, tempo: '2010' })).toBe('RPE 0 · tempo 2010')
  })
})

describe('deriveExerciseExecutionStatus', () => {
  it('is skipped only when explicitly persisted, regardless of sets', () => {
    expect(deriveExerciseExecutionStatus(3, 3, 'skipped')).toBe('skipped')
  })

  it('is pending when there are no sets', () => {
    expect(deriveExerciseExecutionStatus(0, 3, undefined)).toBe('pending')
  })

  it('is completed once sets reach the planned target', () => {
    expect(deriveExerciseExecutionStatus(3, 3, undefined)).toBe('completed')
  })

  it('is in_progress when below the planned target', () => {
    expect(deriveExerciseExecutionStatus(1, 3, undefined)).toBe('in_progress')
  })

  it('is in_progress when there is no planned target to compare against', () => {
    expect(deriveExerciseExecutionStatus(1, undefined, undefined)).toBe('in_progress')
  })
})

describe('moveActiveExercise', () => {
  it('moves an item up', () => {
    expect(moveActiveExercise(['a', 'b', 'c'], 1, 'up')).toEqual(['b', 'a', 'c'])
  })

  it('moves an item down', () => {
    expect(moveActiveExercise(['a', 'b', 'c'], 1, 'down')).toEqual(['a', 'c', 'b'])
  })

  it('no-ops when moving the first item up', () => {
    expect(moveActiveExercise(['a', 'b', 'c'], 0, 'up')).toEqual(['a', 'b', 'c'])
  })

  it('no-ops when moving the last item down', () => {
    expect(moveActiveExercise(['a', 'b', 'c'], 2, 'down')).toEqual(['a', 'b', 'c'])
  })

  it('no-ops on an out-of-range index', () => {
    expect(moveActiveExercise(['a', 'b'], 5, 'up')).toEqual(['a', 'b'])
  })
})

describe('validateActiveWorkoutAdaptations', () => {
  it('reports no issues for a healthy session', () => {
    const report = validateActiveWorkoutAdaptations([
      { exercise: { id: 'ex-1' }, sets: [], source: 'planned', plannedExerciseId: 'blk-1' },
      { exercise: { id: 'ex-2' }, sets: [], source: 'extra' },
    ])
    expect(report).toEqual({
      orphanSubstitutions: [],
      duplicatePlannedExerciseLinks: [],
      invalidExtraExercises: [],
      skippedExercisesWithCompletedSets: [],
    })
  })

  it('flags a substitution with no planned link as orphan', () => {
    const report = validateActiveWorkoutAdaptations([
      { exercise: { id: 'ex-1' }, sets: [], source: 'substitution' },
    ])
    expect(report.orphanSubstitutions).toEqual(['ex-1'])
  })

  it('flags an extra exercise that carries a plannedExerciseId', () => {
    const report = validateActiveWorkoutAdaptations([
      { exercise: { id: 'ex-1' }, sets: [], source: 'extra', plannedExerciseId: 'blk-1' },
    ])
    expect(report.invalidExtraExercises).toEqual(['ex-1'])
  })

  it('flags two rows linked to the same plannedExerciseId as duplicates', () => {
    const report = validateActiveWorkoutAdaptations([
      { exercise: { id: 'ex-1' }, sets: [], source: 'planned', plannedExerciseId: 'blk-1' },
      { exercise: { id: 'ex-2' }, sets: [], source: 'substitution', plannedExerciseId: 'blk-1' },
    ])
    expect(report.duplicatePlannedExerciseLinks).toEqual(['blk-1'])
  })

  it('flags a skipped exercise that still has completed sets', () => {
    const report = validateActiveWorkoutAdaptations([
      { exercise: { id: 'ex-1' }, sets: [{ weight_kg: 10, reps: 5 }], executionStatus: 'skipped' },
    ])
    expect(report.skippedExercisesWithCompletedSets).toEqual(['ex-1'])
  })
})
