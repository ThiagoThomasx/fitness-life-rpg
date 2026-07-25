import { describe, it, expect, beforeEach } from 'vitest'
import type { CompletedWorkout, ExerciseRecord, SetRecord } from './workout-history'
import type { WorkoutReadinessCheckIn } from './readiness-check-ins'
import type { PlannedWorkout } from './planned-workouts'
import type { TrainingProgram } from './training-programs'
import { addPersonalRecordEvents } from './personal-record-events'
import { getWorkoutDetail, getHighlightSessions } from './workout-detail-engine'

const HISTORY_KEY = 'lrpg-fit:workout-history'
const CHECK_INS_KEY = 'lrpg-fit:readiness-check-ins'
const PLANNED_WORKOUTS_KEY = 'lrpg-fit:planned-workouts'
const PROGRAMS_KEY = 'lrpg-fit:training-programs'

function set(weight_kg: number, reps: number): SetRecord {
  return { weight_kg, reps, isPr: false }
}

function exerciseRecord(overrides: Partial<ExerciseRecord> = {}): ExerciseRecord {
  return {
    exerciseId: 'ex-1',
    exerciseName: 'Supino Reto',
    sets: [set(60, 8)],
    ...overrides,
  }
}

function workout(overrides: Partial<CompletedWorkout> & { id: string; completedAt: string }): CompletedWorkout {
  return {
    workoutId: 'wt-1',
    workoutName: 'Treino A',
    workoutColor: '#000',
    category: 'strength',
    startedAt: overrides.completedAt,
    durationSeconds: 1800,
    xpEarned: 50,
    prsCount: 0,
    exercises: [exerciseRecord()],
    ...overrides,
  }
}

function seedHistory(history: CompletedWorkout[]) {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

function seedCheckIns(checkIns: WorkoutReadinessCheckIn[]) {
  window.localStorage.setItem(CHECK_INS_KEY, JSON.stringify(checkIns))
}

function seedPlannedWorkouts(planned: PlannedWorkout[]) {
  window.localStorage.setItem(PLANNED_WORKOUTS_KEY, JSON.stringify(planned))
}

function seedPrograms(programs: TrainingProgram[]) {
  window.localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs))
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('getWorkoutDetail', () => {
  it('returns null for an unknown workout id', () => {
    seedHistory([])
    expect(getWorkoutDetail('missing')).toBeNull()
  })

  it('computes volume/sets/reps from the completed workout', () => {
    seedHistory([
      workout({
        id: 'w-1',
        completedAt: '2026-01-05T10:00:00.000Z',
        exercises: [exerciseRecord({ sets: [set(60, 8), set(60, 8)] })],
      }),
    ])
    const detail = getWorkoutDetail('w-1')
    expect(detail).not.toBeNull()
    expect(detail?.totalSets).toBe(2)
    expect(detail?.totalReps).toBe(16)
    expect(detail?.volumeKg).toBe(960)
  })

  it('links the readiness check-in and computes a readiness result', () => {
    seedCheckIns([
      { id: 'ci-1', createdAt: '2026-01-05T09:00:00.000Z', energy: 4, soreness: 2, sleepQuality: 4, motivation: 4 },
    ])
    seedHistory([workout({ id: 'w-1', completedAt: '2026-01-05T10:00:00.000Z', checkInId: 'ci-1' })])
    const detail = getWorkoutDetail('w-1')
    expect(detail?.checkIn?.id).toBe('ci-1')
    expect(detail?.readinessResult).not.toBeNull()
  })

  it('has no readiness result when the session has no check-in', () => {
    seedHistory([workout({ id: 'w-1', completedAt: '2026-01-05T10:00:00.000Z' })])
    const detail = getWorkoutDetail('w-1')
    expect(detail?.checkIn).toBeNull()
    expect(detail?.readinessResult).toBeNull()
  })

  it('resolves program info from the workout source', () => {
    seedPrograms([
      {
        id: 'prog-1',
        name: 'Hipertrofia 8 semanas',
        weeks: [],
      } as unknown as TrainingProgram,
    ])
    seedHistory([
      workout({
        id: 'w-1',
        completedAt: '2026-01-05T10:00:00.000Z',
        source: { programId: 'prog-1', programWeekNumber: 3 },
      }),
    ])
    const detail = getWorkoutDetail('w-1')
    expect(detail?.program).toEqual({
      programId: 'prog-1',
      programName: 'Hipertrofia 8 semanas',
      programWeekNumber: 3,
      plannedWorkoutId: undefined,
    })
  })

  it('builds a planned x performed comparison when the session came from the planner', () => {
    const plannedWorkout: PlannedWorkout = {
      id: 'pw-1',
      date: '2026-01-05',
      weekday: 1,
      name: 'Treino A',
      templateSnapshot: {
        name: 'Treino A',
        exerciseBlocks: [
          {
            id: 'block-1',
            exercise: { exerciseId: 'ex-1', exerciseName: 'Supino Reto', sets: 3, reps: '8' },
          },
        ],
        capturedAt: '2026-01-01T00:00:00.000Z',
      },
      status: 'done',
      isOptional: false,
      execution: { completedWorkoutId: 'w-1', updatedAt: '2026-01-05T10:00:00.000Z' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-05T10:00:00.000Z',
    } as unknown as PlannedWorkout
    seedPlannedWorkouts([plannedWorkout])
    seedHistory([
      workout({ id: 'w-1', completedAt: '2026-01-05T10:00:00.000Z', source: { plannedWorkoutId: 'pw-1' } }),
    ])
    const detail = getWorkoutDetail('w-1')
    expect(detail?.plannedWorkout?.id).toBe('pw-1')
    expect(detail?.comparison).not.toBeNull()
    expect(detail?.comparison?.plannedWorkoutId).toBe('pw-1')
  })

  it('includes personal record events linked to the workout', () => {
    seedHistory([workout({ id: 'w-1', completedAt: '2026-01-05T10:00:00.000Z' })])
    addPersonalRecordEvents('w-1', [
      { exerciseId: 'ex-1', exerciseName: 'Supino Reto', recordType: 'max_load', newValue: 60, unit: 'kg', achievedAt: '2026-01-05T10:00:00.000Z' },
    ])
    const detail = getWorkoutDetail('w-1')
    expect(detail?.recordEvents).toHaveLength(1)
  })
})

describe('getHighlightSessions', () => {
  it('returns nothing with an empty history', () => {
    seedHistory([])
    expect(getHighlightSessions()).toEqual([])
  })

  it('never repeats the same workout across categories', () => {
    seedHistory([
      workout({ id: 'w-volume', completedAt: '2026-01-01T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(200, 10)] })], xpEarned: 10, durationSeconds: 600 }),
      workout({ id: 'w-duration', completedAt: '2026-01-02T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(10, 1)] })], xpEarned: 5, durationSeconds: 5000 }),
      workout({ id: 'w-xp', completedAt: '2026-01-03T10:00:00.000Z', exercises: [exerciseRecord({ sets: [set(5, 1)] })], xpEarned: 500, durationSeconds: 300 }),
    ])
    const highlights = getHighlightSessions()
    expect(highlights.length).toBeGreaterThan(0)
    expect(highlights[0].reason).toBe('volume')
    expect(highlights[0].workout.id).toBe('w-volume')
    const ids = highlights.map((h) => h.workout.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('omits a category when no session has a positive value for it', () => {
    seedHistory([workout({ id: 'w-1', completedAt: '2026-01-01T10:00:00.000Z' })])
    const highlights = getHighlightSessions()
    expect(highlights.some((h) => h.reason === 'records')).toBe(false)
  })
})
