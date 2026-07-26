import { describe, it, expect, beforeEach } from 'vitest'
import {
  savePlannedWorkout,
  savePlannedWorkouts,
  updatePlannedWorkoutStatus,
  deletePlannedWorkout,
  deletePlannedWorkoutsInRange,
  getPlannedWorkouts,
  getPlannedWorkoutById,
  getPlannedWorkoutsByDate,
  getPlannedWorkoutsByDateRange,
  importPlannedWorkouts,
  resetPlannedWorkouts,
  skipPlannedWorkout,
  cancelPlannedWorkout,
  checkRescheduleConflict,
  reschedulePlannedWorkout,
  linkPlannedWorkoutToCompleted,
  startPlannedWorkoutExecution,
  revertPlannedWorkoutToPending,
  classifyCompletionTiming,
  completePlannedWorkoutExecution,
  updatePlannedWorkoutTemplateSnapshot,
  type WorkoutTemplateSnapshot,
} from './planned-workouts'

beforeEach(() => {
  window.localStorage.clear()
})

function snapshot(): WorkoutTemplateSnapshot {
  return {
    name: 'Treino A',
    exerciseBlocks: [{ id: 'blk-1', type: 'single', exercise: { id: 'ex-1', exerciseName: 'Supino' } }],
    capturedAt: new Date().toISOString(),
  }
}

describe('savePlannedWorkout', () => {
  it('creates a pending planned workout', () => {
    const pw = savePlannedWorkout({
      date: '2026-07-20',
      weekday: 1,
      name: 'Treino A',
      templateSnapshot: snapshot(),
      isOptional: false,
    })
    expect(pw.status).toBe('pending')
    expect(getPlannedWorkouts()).toHaveLength(1)
  })
})

describe('savePlannedWorkouts (bulk)', () => {
  it('inserts multiple with unique ids', () => {
    const created = savePlannedWorkouts([
      { date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false },
      { date: '2026-07-21', weekday: 2, name: 'B', templateSnapshot: snapshot(), isOptional: false },
    ])
    expect(created).toHaveLength(2)
    expect(created[0].id).not.toBe(created[1].id)
    expect(getPlannedWorkouts()).toHaveLength(2)
  })
})

describe('date range / date queries', () => {
  it('filters by date and range', () => {
    savePlannedWorkouts([
      { date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false },
      { date: '2026-07-22', weekday: 3, name: 'B', templateSnapshot: snapshot(), isOptional: false },
      { date: '2026-08-01', weekday: 6, name: 'C', templateSnapshot: snapshot(), isOptional: false },
    ])
    expect(getPlannedWorkoutsByDate('2026-07-20')).toHaveLength(1)
    expect(getPlannedWorkoutsByDateRange('2026-07-20', '2026-07-31')).toHaveLength(2)
  })
})

describe('updatePlannedWorkoutStatus', () => {
  it('updates status without touching other fields', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    const updated = updatePlannedWorkoutStatus(pw.id, 'done')
    expect(updated?.status).toBe('done')
    expect(updated?.name).toBe('A')
  })

  it('returns null for unknown id', () => {
    expect(updatePlannedWorkoutStatus('missing', 'done')).toBeNull()
  })
})

describe('startPlannedWorkoutExecution', () => {
  it('moves a pending workout to in_progress', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    const started = startPlannedWorkoutExecution(pw.id)
    expect(started?.status).toBe('in_progress')
  })

  it('refuses to start a workout that is not pending', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    updatePlannedWorkoutStatus(pw.id, 'done')
    expect(startPlannedWorkoutExecution(pw.id)).toBeNull()
  })

  it('returns null for unknown id', () => {
    expect(startPlannedWorkoutExecution('missing')).toBeNull()
  })
})

describe('revertPlannedWorkoutToPending', () => {
  it('reverts an in_progress workout back to pending', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    startPlannedWorkoutExecution(pw.id)
    const reverted = revertPlannedWorkoutToPending(pw.id)
    expect(reverted?.status).toBe('pending')
  })

  it('refuses to revert a workout that is not in_progress', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    expect(revertPlannedWorkoutToPending(pw.id)).toBeNull()
  })
})

describe('updatePlannedWorkoutTemplateSnapshot', () => {
  it('replaces snapshot fields without touching status/source', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    const updated = updatePlannedWorkoutTemplateSnapshot(pw.id, {
      exerciseBlocks: [{ id: 'blk-1', type: 'single', exercise: { id: 'ex-1', exerciseName: 'Supino', sets: 3 } }],
    })
    expect(updated?.templateSnapshot.exerciseBlocks[0].exercise.sets).toBe(3)
    expect(updated?.status).toBe('pending')
  })

  it('refuses to update a completed workout', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    linkPlannedWorkoutToCompleted(pw.id, 'wh-1')
    expect(updatePlannedWorkoutTemplateSnapshot(pw.id, { name: 'Novo nome' })).toBeNull()
  })

  it('refuses to update a cancelled workout', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    cancelPlannedWorkout(pw.id)
    expect(updatePlannedWorkoutTemplateSnapshot(pw.id, { name: 'Novo nome' })).toBeNull()
  })

  it('returns null for a nonexistent workout', () => {
    expect(updatePlannedWorkoutTemplateSnapshot('missing', { name: 'x' })).toBeNull()
  })
})

describe('deletePlannedWorkoutsInRange', () => {
  it('removes only items within range', () => {
    savePlannedWorkouts([
      { date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false },
      { date: '2026-08-01', weekday: 6, name: 'B', templateSnapshot: snapshot(), isOptional: false },
    ])
    const removed = deletePlannedWorkoutsInRange('2026-07-01', '2026-07-31')
    expect(removed).toBe(1)
    expect(getPlannedWorkouts()).toHaveLength(1)
    expect(getPlannedWorkouts()[0].date).toBe('2026-08-01')
  })
})

describe('deletePlannedWorkout', () => {
  it('removes a single item', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    deletePlannedWorkout(pw.id)
    expect(getPlannedWorkoutById(pw.id)).toBeNull()
  })
})

describe('skipPlannedWorkout', () => {
  it('marks as skipped with reason and note', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    const updated = skipPlannedWorkout(pw.id, 'travel', 'Viagem de trabalho')
    expect(updated?.status).toBe('skipped')
    expect(updated?.execution?.skippedReason).toBe('travel')
    expect(updated?.execution?.skippedNote).toBe('Viagem de trabalho')
    expect(updated?.execution?.skippedAt).toBeTruthy()
  })

  it('works without a reason', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    const updated = skipPlannedWorkout(pw.id)
    expect(updated?.status).toBe('skipped')
    expect(updated?.execution?.skippedReason).toBeUndefined()
  })
})

describe('cancelPlannedWorkout', () => {
  it('marks as cancelled, distinct from skipped', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    const updated = cancelPlannedWorkout(pw.id, 'Programa alterado')
    expect(updated?.status).toBe('cancelled')
    expect(updated?.execution?.cancellationReason).toBe('Programa alterado')
    expect(updated?.execution?.cancelledAt).toBeTruthy()
  })
})

describe('reschedulePlannedWorkout', () => {
  it('moves the date and records history without duplicating the session', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    const updated = reschedulePlannedWorkout(pw.id, '2026-07-22', 'Conflito de agenda')
    expect(updated?.date).toBe('2026-07-22')
    expect(getPlannedWorkouts()).toHaveLength(1)
    expect(updated?.execution?.reschedules).toHaveLength(1)
    expect(updated?.execution?.reschedules?.[0]).toMatchObject({
      from: '2026-07-20',
      to: '2026-07-22',
      reason: 'Conflito de agenda',
    })
  })

  it('preserves history across multiple reschedules without overwriting', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    reschedulePlannedWorkout(pw.id, '2026-07-22')
    const twice = reschedulePlannedWorkout(pw.id, '2026-07-25')
    expect(twice?.execution?.reschedules).toHaveLength(2)
    expect(twice?.execution?.reschedules?.[0].to).toBe('2026-07-22')
    expect(twice?.execution?.reschedules?.[1].to).toBe('2026-07-25')
  })

  it('checkRescheduleConflict reports existing sessions on the target date without moving anything', () => {
    savePlannedWorkout({ date: '2026-07-22', weekday: 3, name: 'B', templateSnapshot: snapshot(), isOptional: false })
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    const conflicts = checkRescheduleConflict('2026-07-22')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].name).toBe('B')
    expect(getPlannedWorkoutById(pw.id)?.date).toBe('2026-07-20')
  })
})

describe('linkPlannedWorkoutToCompleted', () => {
  it('sets status to done and stores the completed workout id', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    const updated = linkPlannedWorkoutToCompleted(pw.id, 'cw-123')
    expect(updated?.status).toBe('done')
    expect(updated?.execution?.completedWorkoutId).toBe('cw-123')
    expect(updated?.execution?.completedAt).toBeTruthy()
  })
})

describe('classifyCompletionTiming', () => {
  it('classifies same-day completion as on_time', () => {
    expect(classifyCompletionTiming({ date: '2026-07-20', execution: undefined }, '2026-07-20')).toBe('on_time')
  })

  it('classifies completion before the planned date as early', () => {
    expect(classifyCompletionTiming({ date: '2026-07-20', execution: undefined }, '2026-07-19')).toBe('early')
  })

  it('classifies completion after the planned date as late', () => {
    expect(classifyCompletionTiming({ date: '2026-07-20', execution: undefined }, '2026-07-21')).toBe('late')
  })

  it('classifies as rescheduled regardless of date match when reschedules exist', () => {
    const execution = { reschedules: [{ from: '2026-07-18', to: '2026-07-20', changedAt: '2026-07-18T00:00:00.000Z' }], updatedAt: '2026-07-18T00:00:00.000Z' }
    expect(classifyCompletionTiming({ date: '2026-07-20', execution }, '2026-07-20')).toBe('rescheduled')
  })
})

describe('completePlannedWorkoutExecution', () => {
  it('links, marks done, and stamps completionTiming in a single write', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    const updated = completePlannedWorkoutExecution(pw.id, 'cw-999', '2026-07-20')
    expect(updated?.status).toBe('done')
    expect(updated?.execution?.completedWorkoutId).toBe('cw-999')
    expect(updated?.execution?.completionTiming).toBe('on_time')
  })

  it('classifies a late completion', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    const updated = completePlannedWorkoutExecution(pw.id, 'cw-999', '2026-07-22')
    expect(updated?.execution?.completionTiming).toBe('late')
  })

  it('returns null for an unknown id', () => {
    expect(completePlannedWorkoutExecution('missing', 'cw-1', '2026-07-20')).toBeNull()
  })
})

describe('compatibility with legacy records', () => {
  it('accepts imported records without execution metadata', () => {
    const legacy = {
      id: 'pw-legacy',
      date: '2026-07-20',
      weekday: 1,
      name: 'Legado',
      templateSnapshot: snapshot(),
      status: 'done',
      isOptional: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const result = importPlannedWorkouts([legacy])
    expect(result.imported).toBe(1)
    expect(getPlannedWorkoutById('pw-legacy')?.execution).toBeUndefined()
  })
})

describe('import / reset', () => {
  it('imports valid, skips invalid/duplicate', () => {
    const pw = savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'A', templateSnapshot: snapshot(), isOptional: false })
    const result = importPlannedWorkouts([pw, { bad: true }, pw])
    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(3)

    resetPlannedWorkouts()
    const fresh = importPlannedWorkouts([pw])
    expect(fresh.imported).toBe(1)
    expect(getPlannedWorkouts()).toHaveLength(1)
  })
})
