import { describe, it, expect } from 'vitest'
import {
  normalizeExerciseName,
  matchPlannedToPerformedExercises,
  buildPlannedPerformedComparison,
  resolvedExercisesFromPlannedWorkout,
} from './planned-performed-comparison'
import type { ResolvedProgramExercise } from './training-blocks'
import type { ExerciseRecord, CompletedWorkout } from './workout-history'
import type { PlannedWorkout, WorkoutTemplateSnapshot } from './planned-workouts'

function resolved(overrides: Partial<ResolvedProgramExercise> = {}): ResolvedProgramExercise {
  return {
    exerciseId: 'ex-1',
    exerciseName: 'Supino Reto',
    sets: 4,
    reps: '8',
    loadKg: 60,
    source: 'template',
    ...overrides,
  }
}

function record(overrides: Partial<ExerciseRecord> = {}): ExerciseRecord {
  return {
    exerciseId: 'ex-1',
    exerciseName: 'Supino Reto',
    sets: [
      { weight_kg: 60, reps: 8, isPr: false },
      { weight_kg: 60, reps: 8, isPr: false },
    ],
    ...overrides,
  }
}

describe('normalizeExerciseName', () => {
  it('lowercases, trims and strips accents/punctuation', () => {
    expect(normalizeExerciseName('  Supino Reto (Barra)! ')).toBe('supino reto barra')
    expect(normalizeExerciseName('Agachamento')).toBe(normalizeExerciseName('agachamento'))
  })
})

describe('matchPlannedToPerformedExercises', () => {
  it('matches by exerciseId first', () => {
    const result = matchPlannedToPerformedExercises([resolved()], [record()])
    expect(result).toHaveLength(1)
    expect(result[0].matchStatus).toBe('matched')
  })

  it('falls back to normalized name when exerciseId differs', () => {
    const planned = [resolved({ exerciseId: 'legacy-id', exerciseName: 'Supino Reto' })]
    const performed = [record({ exerciseId: 'catalog-id', exerciseName: 'supino reto' })]
    const result = matchPlannedToPerformedExercises(planned, performed)
    expect(result[0].matchStatus).toBe('matched')
  })

  it('marks ambiguous when multiple performed exercises share the same normalized name', () => {
    const planned = [resolved({ exerciseId: 'legacy-id', exerciseName: 'Supino' })]
    const performed = [
      record({ exerciseId: 'a', exerciseName: 'Supino' }),
      record({ exerciseId: 'b', exerciseName: 'Supino' }),
    ]
    const result = matchPlannedToPerformedExercises(planned, performed)
    const ambiguous = result.find((c) => c.matchStatus === 'ambiguous')
    expect(ambiguous).toBeDefined()
  })

  it('reports a planned exercise with no performed counterpart as planned_only', () => {
    const result = matchPlannedToPerformedExercises([resolved({ exerciseId: 'only-planned' })], [])
    expect(result[0].matchStatus).toBe('planned_only')
  })

  it('reports a performed exercise with no planned counterpart as performed_only', () => {
    const result = matchPlannedToPerformedExercises([], [record({ exerciseId: 'only-performed' })])
    expect(result[0].matchStatus).toBe('performed_only')
  })

  it('matches via explicit substitution link even when exerciseId and name both differ (Sprint 22)', () => {
    const planned = [resolved({ blockId: 'blk-1', exerciseId: 'ex-1', exerciseName: 'Supino Inclinado' })]
    const performed = [
      record({
        exerciseId: 'ex-2',
        exerciseName: 'Chest Press',
        plannedExerciseId: 'blk-1',
        substitution: {
          plannedExerciseId: 'blk-1',
          plannedExerciseName: 'Supino Inclinado',
          replacementExerciseId: 'ex-2',
          replacementExerciseName: 'Chest Press',
          reason: 'equipment',
          substitutedAt: '2026-01-01T10:00:00Z',
        },
      }),
    ]
    const result = matchPlannedToPerformedExercises(planned, performed)
    expect(result).toHaveLength(1)
    expect(result[0].matchStatus).toBe('matched')
    expect(result[0].wasSubstitution).toBe(true)
    expect(result[0].exerciseName).toBe('Chest Press')
    expect(result[0].substitutedFromExerciseName).toBe('Supino Inclinado')
    expect(result[0].substitutionReason).toBe('equipment')
  })

  it('does not mark a plain planned/performed match (no substitution field) as a substitution', () => {
    const planned = [resolved({ blockId: 'blk-1' })]
    const performed = [record({ plannedExerciseId: 'blk-1' })]
    const result = matchPlannedToPerformedExercises(planned, performed)
    expect(result[0].wasSubstitution).toBeUndefined()
  })

  it('falls back to position only when remaining counts match 1:1', () => {
    const planned = [resolved({ exerciseId: 'p1', exerciseName: 'Exercicio Custom' })]
    const performed = [record({ exerciseId: 'different-id', exerciseName: 'Nome Diferente' })]
    const result = matchPlannedToPerformedExercises(planned, performed)
    expect(result[0].matchStatus).toBe('matched')
  })

  it('does not calculate reps differences when planned reps is a range', () => {
    const planned = [resolved({ reps: '8-10' })]
    const performed = [record()]
    const result = matchPlannedToPerformedExercises(planned, performed)
    expect(result[0].differences?.repsComparable).toBe(false)
    expect(result[0].differences?.repsDifference).toBeUndefined()
  })

  it('leaves RIR/RPE differences undefined when performed data is unavailable', () => {
    const planned = [resolved({ rir: 2, rpe: 8 })]
    const performed = [record()]
    const result = matchPlannedToPerformedExercises(planned, performed)
    expect(result[0].differences?.rirDifference).toBeUndefined()
    expect(result[0].differences?.rpeDifference).toBeUndefined()
  })

  it('leaves volume difference undefined when planned load is not numeric', () => {
    const planned = [resolved({ loadKg: undefined, reps: 'AMRAP' })]
    const performed = [record()]
    const result = matchPlannedToPerformedExercises(planned, performed)
    expect(result[0].differences?.volumeDifferenceKg).toBeUndefined()
  })
})

describe('buildPlannedPerformedComparison', () => {
  function templateSnapshot(): WorkoutTemplateSnapshot {
    return {
      name: 'Treino A',
      exerciseBlocks: [{ id: 'blk-1', type: 'single', exercise: { id: 'ex-1', exerciseId: 'ex-1', exerciseName: 'Supino Reto' } }],
      capturedAt: new Date().toISOString(),
    }
  }

  function plannedWorkout(overrides: Partial<PlannedWorkout> = {}): PlannedWorkout {
    return {
      id: 'pw-1',
      date: '2026-07-20',
      weekday: 1,
      name: 'A',
      templateSnapshot: templateSnapshot(),
      status: 'pending',
      isOptional: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }
  }

  function completedWorkout(overrides: Partial<CompletedWorkout> = {}): CompletedWorkout {
    return {
      id: 'cw-1',
      workoutId: 'w-1',
      workoutName: 'Treino A',
      workoutColor: '#000',
      category: 'strength',
      startedAt: '2026-07-20T10:00:00.000Z',
      completedAt: '2026-07-20T11:00:00.000Z',
      durationSeconds: 3600,
      xpEarned: 10,
      exercises: [record()],
      prsCount: 0,
      ...overrides,
    }
  }

  it('marks dataStatus insufficient_data when there is no completed workout to compare', () => {
    const result = buildPlannedPerformedComparison(plannedWorkout(), [resolved()], undefined, '2026-07-25')
    expect(result.dataStatus).toBe('insufficient_data')
  })

  it('marks dataStatus available and maps status when the session is completed', () => {
    const pw = plannedWorkout({ status: 'done', execution: { completedWorkoutId: 'cw-1', updatedAt: '2026-07-20T11:00:00.000Z' } })
    const result = buildPlannedPerformedComparison(pw, [resolved()], completedWorkout(), '2026-07-25')
    expect(result.dataStatus).toBe('available')
    expect(result.status).toBe('completed')
    expect(result.sessionSummary.matchedExerciseCount).toBe(1)
  })

  it('maps pending sessions to not_due', () => {
    const result = buildPlannedPerformedComparison(plannedWorkout({ date: '2026-08-01' }), [resolved()], undefined, '2026-07-25')
    expect(result.status).toBe('not_due')
  })

  describe('resolvedExercisesFromPlannedWorkout', () => {
    it('builds resolved exercises straight from the frozen snapshot, without omitting undefined targets', () => {
      const pw = plannedWorkout()
      const result = resolvedExercisesFromPlannedWorkout(pw)
      expect(result).toEqual([
        {
          blockId: 'blk-1',
          exerciseId: 'ex-1',
          exerciseName: 'Supino Reto',
          sets: undefined,
          reps: undefined,
          loadKg: undefined,
          durationSeconds: undefined,
          distanceMeters: undefined,
          restSeconds: undefined,
          rir: undefined,
          rpe: undefined,
          tempo: undefined,
          notes: undefined,
          source: 'template',
        },
      ])
    })

    it('feeds directly into buildPlannedPerformedComparison end-to-end', () => {
      const pw = plannedWorkout({ status: 'done', execution: { completedWorkoutId: 'cw-1', updatedAt: '2026-07-20T11:00:00.000Z' } })
      const result = buildPlannedPerformedComparison(pw, resolvedExercisesFromPlannedWorkout(pw), completedWorkout(), '2026-07-25')
      expect(result.exerciseComparisons[0].matchStatus).toBe('matched')
    })
  })
})
