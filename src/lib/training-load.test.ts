import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildTrainingWeek,
  getWeekBoundaries,
  getWeekEnd,
  getPreviousWeekStart,
  getWeekSummaries,
  getWeeklyAggregateStats,
  DEFAULT_TRAINING_LOAD_CONFIG,
} from './training-load'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('./workout-history', () => ({ getWorkoutHistory: vi.fn(() => []) }))
vi.mock('./custom-workouts', () => ({
  getCustomWorkouts: vi.fn(() => []),
  getAllExercises: vi.fn(() => []),
}))
vi.mock('./weekly-plan', () => ({
  getWeekStart: vi.fn((d?: Date) => {
    const date = d ?? new Date('2026-07-14')
    const day = date.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const copy = new Date(date)
    copy.setDate(copy.getDate() + diff)
    return copy.toISOString().slice(0, 10)
  }),
  getCurrentWeekPlan: vi.fn(() => null),
}))
vi.mock('./session-plan-changes', () => ({
  getSkippedWorkoutIds: vi.fn(() => []),
}))
vi.mock('./exercise-records', () => ({
  calculateVolumeKg: vi.fn((sets: { weight_kg: number; reps: number }[]) =>
    sets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0)
  ),
}))
vi.mock('./muscle-groups', () => ({
  normalizeMuscleGroups: vi.fn((raw: string[]) => {
    const map: Record<string, string> = {
      peitoral: 'peito',
      'peitoral superior': 'peito',
      peito: 'peito',
      costas: 'costas',
      latíssimo: 'costas',
      'costas média': 'costas',
      quadríceps: 'pernas',
      glúteos: 'pernas',
      pernas: 'pernas',
      ombros: 'ombros',
      bíceps: 'biceps',
      biceps: 'biceps',
      tríceps: 'triceps',
      triceps: 'triceps',
      core: 'core',
      abdômen: 'core',
    }
    const seen = new Set<string>()
    const result: string[] = []
    for (const r of raw) {
      const canon = map[r.toLowerCase()] ?? map[r]
      if (canon && !seen.has(canon)) { seen.add(canon); result.push(canon) }
    }
    return result
  }),
  MUSCLE_GROUP_LABELS: {
    peito: 'Peito', costas: 'Costas', pernas: 'Pernas',
    ombros: 'Ombros', biceps: 'Bíceps', triceps: 'Tríceps', core: 'Core',
  },
}))

import { getWorkoutHistory } from './workout-history'
import { getCustomWorkouts, getAllExercises } from './custom-workouts'
import { getCurrentWeekPlan } from './weekly-plan'
import { getSkippedWorkoutIds } from './session-plan-changes'

const mockGetWorkoutHistory = vi.mocked(getWorkoutHistory)
const mockGetCustomWorkouts = vi.mocked(getCustomWorkouts)
const mockGetAllExercises = vi.mocked(getAllExercises)
const mockGetCurrentWeekPlan = vi.mocked(getCurrentWeekPlan)
const mockGetSkippedIds = vi.mocked(getSkippedWorkoutIds)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWorkout(
  id: string,
  completedAt: string,
  workoutId = 'cw-1',
  exercises: { exerciseId: string; sets: { weight_kg: number; reps: number }[] }[] = []
) {
  return {
    id,
    workoutId,
    workoutName: 'Treino A',
    workoutColor: '#fff',
    category: 'strength',
    startedAt: completedAt,
    completedAt,
    durationSeconds: 3600,
    xpEarned: 50,
    exercises: exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseId,
      sets: ex.sets.map((s) => ({ ...s, isPr: false })),
    })),
    prsCount: 0,
  }
}

function makeExercise(id: string, muscleGroups: string[]) {
  return {
    id,
    workout_type_id: 'wt-1',
    name: id,
    muscle_groups: muscleGroups,
    equipment: [],
    instructions: null,
  }
}

beforeEach(() => {
  mockGetWorkoutHistory.mockReturnValue([])
  mockGetCustomWorkouts.mockReturnValue([])
  mockGetAllExercises.mockReturnValue([])
  mockGetCurrentWeekPlan.mockReturnValue(null)
  mockGetSkippedIds.mockReturnValue([])
})

// ─── Week boundaries ──────────────────────────────────────────────────────────

describe('getWeekBoundaries', () => {
  it('returns Monday–Sunday for a mid-week date', () => {
    const { startDate, endDate } = getWeekBoundaries(new Date('2026-07-15T12:00:00Z'))
    expect(startDate).toBe('2026-07-13')
    expect(endDate).toBe('2026-07-19')
  })

  it('getWeekEnd adds 6 days', () => {
    expect(getWeekEnd('2026-07-13')).toBe('2026-07-19')
  })

  it('getPreviousWeekStart subtracts 7 days', () => {
    expect(getPreviousWeekStart('2026-07-13')).toBe('2026-07-06')
  })

  it('week crossing month boundary', () => {
    const end = getWeekEnd('2026-07-27')
    expect(end).toBe('2026-08-02')
  })

  it('week crossing year boundary', () => {
    expect(getWeekEnd('2025-12-29')).toBe('2026-01-04')
  })
})

// ─── Empty week ───────────────────────────────────────────────────────────────

describe('buildTrainingWeek — empty week', () => {
  it('returns zero counts when no history', () => {
    const week = buildTrainingWeek(new Date('2026-07-14'))
    expect(week.totalCompletedSessions).toBe(0)
    expect(week.completedVolumeKg).toBe(0)
    expect(week.totalSets).toBe(0)
    expect(week.totalReps).toBe(0)
    expect(week.status).toBe('insufficient_data')
  })

  it('has 7 muscle group slots with not_planned status', () => {
    const week = buildTrainingWeek(new Date('2026-07-14'))
    expect(week.muscleGroups.length).toBe(7)
    week.muscleGroups.forEach((mg) => expect(mg.completedSessions).toBe(0))
  })

  it('returns insufficient_data priority when no sessions', () => {
    const week = buildTrainingWeek(new Date('2026-07-14'))
    expect(week.priorities[0].type).toBe('insufficient_data')
  })
})

// ─── Session counting ─────────────────────────────────────────────────────────

describe('buildTrainingWeek — session counting', () => {
  it('counts completed sessions in the current week', () => {
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z'),
      makeWorkout('w2', '2026-07-15T10:00:00Z'),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    expect(week.totalCompletedSessions).toBe(2)
  })

  it('excludes sessions from previous weeks', () => {
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('old', '2026-07-05T10:00:00Z'), // previous week
      makeWorkout('cur', '2026-07-14T10:00:00Z'), // current week (Tuesday)
    ])
    const week = buildTrainingWeek(new Date('2026-07-15T12:00:00Z'))
    expect(week.totalCompletedSessions).toBe(1)
  })

  it('marks session as free when workoutId not in custom workouts', () => {
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z', 'mock-workout-id'),
    ])
    mockGetCustomWorkouts.mockReturnValue([])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    expect(week.completedSessions[0].isFreeSession).toBe(true)
    expect(week.totalFreeSessions).toBe(1)
  })

  it('marks session as non-free when workoutId in custom workouts', () => {
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z', 'cw-1'),
    ])
    mockGetCustomWorkouts.mockReturnValue([
      { id: 'cw-1', name: 'A', workoutTypeId: 'wt-1', exerciseIds: [], targets: [], estimatedMinutes: 60, createdAt: '2026-01-01' },
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    expect(week.completedSessions[0].isFreeSession).toBe(false)
    expect(week.totalFreeSessions).toBe(0)
  })
})

// ─── Volume calculation ───────────────────────────────────────────────────────

describe('buildTrainingWeek — volume', () => {
  it('sums volume across all sessions', () => {
    mockGetAllExercises.mockReturnValue([makeExercise('ex-1', ['peitoral'])])
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z', 'cw-1', [
        { exerciseId: 'ex-1', sets: [{ weight_kg: 60, reps: 10 }, { weight_kg: 60, reps: 10 }] },
      ]),
      makeWorkout('w2', '2026-07-15T10:00:00Z', 'cw-1', [
        { exerciseId: 'ex-1', sets: [{ weight_kg: 80, reps: 8 }] },
      ]),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    // (60*10 + 60*10) + (80*8) = 1200 + 640 = 1840
    expect(week.completedVolumeKg).toBe(1840)
  })

  it('zero-weight exercises do not inflate volume', () => {
    mockGetAllExercises.mockReturnValue([makeExercise('ex-1', ['core'])])
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z', 'cw-1', [
        { exerciseId: 'ex-1', sets: [{ weight_kg: 0, reps: 20 }] },
      ]),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    expect(week.completedVolumeKg).toBe(0)
  })
})

// ─── Muscle group distribution ────────────────────────────────────────────────

describe('buildTrainingWeek — muscle groups', () => {
  it('volume goes to primary group only (no double counting)', () => {
    // Supino: ['peitoral', 'tríceps', 'ombros'] — primary = peito
    mockGetAllExercises.mockReturnValue([
      makeExercise('ex-1', ['peitoral', 'tríceps', 'ombros']),
    ])
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z', 'cw-1', [
        { exerciseId: 'ex-1', sets: [{ weight_kg: 60, reps: 10 }] },
      ]),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    const peito = week.muscleGroups.find((m) => m.muscleGroup === 'peito')!
    const triceps = week.muscleGroups.find((m) => m.muscleGroup === 'triceps')!
    const ombros = week.muscleGroups.find((m) => m.muscleGroup === 'ombros')!

    expect(peito.totalVolumeKg).toBe(600) // 60 * 10
    expect(triceps.totalVolumeKg).toBe(0) // secondary — no volume
    expect(ombros.totalVolumeKg).toBe(0) // secondary — no volume
  })

  it('counts sets for primary group only', () => {
    mockGetAllExercises.mockReturnValue([
      makeExercise('ex-1', ['costas', 'bíceps']),
    ])
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z', 'cw-1', [
        { exerciseId: 'ex-1', sets: [{ weight_kg: 50, reps: 10 }, { weight_kg: 50, reps: 10 }] },
      ]),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    const costas = week.muscleGroups.find((m) => m.muscleGroup === 'costas')!
    const biceps = week.muscleGroups.find((m) => m.muscleGroup === 'biceps')!
    expect(costas.totalSets).toBe(2)
    expect(biceps.totalSets).toBe(0)
  })

  it('handles exercise with no recognized muscle group', () => {
    mockGetAllExercises.mockReturnValue([
      makeExercise('ex-1', ['cardiovascular', 'corpo todo']),
    ])
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z', 'cw-1', [
        { exerciseId: 'ex-1', sets: [{ weight_kg: 0, reps: 30 }] },
      ]),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    // No group should receive volume
    week.muscleGroups.forEach((mg) => expect(mg.totalVolumeKg).toBe(0))
  })

  it('exercise not in exercise list is ignored gracefully', () => {
    mockGetAllExercises.mockReturnValue([])
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z', 'cw-1', [
        { exerciseId: 'ex-unknown', sets: [{ weight_kg: 50, reps: 10 }] },
      ]),
    ])
    expect(() => buildTrainingWeek(new Date('2026-07-14'))).not.toThrow()
  })
})

// ─── Concentration detection ──────────────────────────────────────────────────

describe('concentration detection', () => {
  it('detects high concentration when same muscle trained < 24h apart', () => {
    mockGetAllExercises.mockReturnValue([makeExercise('ex-1', ['peitoral'])])
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T08:00:00Z', 'cw-1', [
        { exerciseId: 'ex-1', sets: [{ weight_kg: 60, reps: 10 }] },
      ]),
      makeWorkout('w2', '2026-07-14T20:00:00Z', 'cw-1', [
        { exerciseId: 'ex-1', sets: [{ weight_kg: 60, reps: 10 }] },
      ]),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    const peito = week.muscleGroups.find((m) => m.muscleGroup === 'peito')!
    expect(peito.concentrationWarning).toBe(true)
    expect(peito.status).toBe('high_concentration')
  })

  it('no concentration warning when sessions more than 24h apart', () => {
    mockGetAllExercises.mockReturnValue([makeExercise('ex-1', ['peitoral'])])
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-13T08:00:00Z', 'cw-1', [
        { exerciseId: 'ex-1', sets: [{ weight_kg: 60, reps: 10 }] },
      ]),
      makeWorkout('w2', '2026-07-15T10:00:00Z', 'cw-1', [
        { exerciseId: 'ex-1', sets: [{ weight_kg: 60, reps: 10 }] },
      ]),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    const peito = week.muscleGroups.find((m) => m.muscleGroup === 'peito')!
    expect(peito.concentrationWarning).toBe(false)
  })
})

// ─── Plan adherence ───────────────────────────────────────────────────────────

describe('plan adherence', () => {
  it('status is not_planned when no weekly plan exists', () => {
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z'),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    expect(week.adherence.status).toBe('not_planned')
    expect(week.adherence.planned).toBe(0)
  })

  it('status is complete when sessions >= planned', () => {
    mockGetCurrentWeekPlan.mockReturnValue({
      weekStart: '2026-07-13',
      focus: 'foco',
      goals: { workouts: 2, diary: 3, nutrition: 3, missions: 5 },
      completedAt: null,
      xpEarned: 0,
    })
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z'),
      makeWorkout('w2', '2026-07-15T10:00:00Z'),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    expect(week.adherence.status).toBe('complete')
  })

  it('skipped sessions are counted', () => {
    mockGetSkippedIds.mockReturnValue(['cw-1'])
    mockGetCurrentWeekPlan.mockReturnValue({
      weekStart: '2026-07-13',
      focus: '',
      goals: { workouts: 3, diary: 3, nutrition: 3, missions: 5 },
      completedAt: null,
      xpEarned: 0,
    })
    const week = buildTrainingWeek(new Date('2026-07-14'))
    expect(week.adherence.skipped).toBe(1)
    expect(week.skippedWorkoutIds).toContain('cw-1')
  })
})

// ─── Weekly comparison ────────────────────────────────────────────────────────

describe('weekly comparison', () => {
  it('returns null when no previous week data', () => {
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z'),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    expect(week.comparison).toBeNull()
  })

  it('computes volume change percentage correctly', () => {
    mockGetAllExercises.mockReturnValue([makeExercise('ex-1', ['peitoral'])])
    mockGetWorkoutHistory.mockReturnValue([
      // Current week: 1000 kg
      makeWorkout('cur', '2026-07-14T10:00:00Z', 'cw-1', [
        { exerciseId: 'ex-1', sets: [{ weight_kg: 100, reps: 10 }] },
      ]),
      // Previous week: 500 kg
      makeWorkout('prev', '2026-07-07T10:00:00Z', 'cw-1', [
        { exerciseId: 'ex-1', sets: [{ weight_kg: 50, reps: 10 }] },
      ]),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    expect(week.comparison?.volumeChangePct).toBeCloseTo(100, 0) // +100%
  })

  it('counts sessions change', () => {
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('cur1', '2026-07-14T10:00:00Z'),
      makeWorkout('cur2', '2026-07-15T10:00:00Z'),
      makeWorkout('cur3', '2026-07-16T10:00:00Z'),
      makeWorkout('prev1', '2026-07-07T10:00:00Z'),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    expect(week.comparison?.sessionsChange).toBe(2) // 3 - 1
    expect(week.comparison?.previousWeekSessions).toBe(1)
  })
})

// ─── Priorities ───────────────────────────────────────────────────────────────

describe('priorities', () => {
  it('generates complete_planned_session when behind plan', () => {
    mockGetCurrentWeekPlan.mockReturnValue({
      weekStart: '2026-07-13',
      focus: '',
      goals: { workouts: 4, diary: 3, nutrition: 3, missions: 5 },
      completedAt: null,
      xpEarned: 0,
    })
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-13T10:00:00Z'),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    const sessionPriority = week.priorities.find((p) => p.type === 'complete_planned_session')
    expect(sessionPriority).toBeDefined()
  })

  it('generates maintain_current_plan when on track with no plan', () => {
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z'),
      makeWorkout('w2', '2026-07-15T10:00:00Z'),
      makeWorkout('w3', '2026-07-16T10:00:00Z'),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'))
    const p = week.priorities.find((p) => p.type === 'maintain_current_plan')
    expect(p).toBeDefined()
  })

  it('limits priorities to 3', () => {
    const week = buildTrainingWeek(new Date('2026-07-14'))
    expect(week.priorities.length).toBeLessThanOrEqual(3)
  })
})

// ─── Weekly status ────────────────────────────────────────────────────────────

describe('weekly status', () => {
  it('insufficient_data when fewer than minimumSessionsForAnalysis in all history', () => {
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z'),
    ])
    const week = buildTrainingWeek(new Date('2026-07-14'), {
      ...DEFAULT_TRAINING_LOAD_CONFIG,
      minimumSessionsForAnalysis: 2,
    })
    expect(week.status).toBe('insufficient_data')
  })

  it('completed when sessions >= planned', () => {
    mockGetCurrentWeekPlan.mockReturnValue({
      weekStart: '2026-07-13',
      focus: '',
      goals: { workouts: 3, diary: 3, nutrition: 3, missions: 5 },
      completedAt: null,
      xpEarned: 0,
    })
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z'),
      makeWorkout('w2', '2026-07-15T10:00:00Z'),
      makeWorkout('w3', '2026-07-16T10:00:00Z'),
      makeWorkout('old', '2026-06-30T10:00:00Z'),
      makeWorkout('old2', '2026-06-23T10:00:00Z'),
    ])
    const week = buildTrainingWeek(new Date('2026-07-15T12:00:00Z'))
    expect(week.status).toBe('completed')
  })
})

// ─── Historical summaries ─────────────────────────────────────────────────────

describe('getWeekSummaries', () => {
  it('returns requested number of summaries', () => {
    const summaries = getWeekSummaries(4)
    expect(summaries.length).toBe(4)
  })

  it('current week with no data returns zero counts', () => {
    const [current] = getWeekSummaries(1)
    expect(current.totalSessions).toBe(0)
    expect(current.totalVolumeKg).toBe(0)
  })
})

// ─── Aggregate stats ──────────────────────────────────────────────────────────

describe('getWeeklyAggregateStats', () => {
  it('returns zero stats when no history', () => {
    const stats = getWeeklyAggregateStats()
    expect(stats.averageSessionsPerWeek).toBe(0)
    expect(stats.weeksWithData).toBe(0)
    expect(stats.mostTrainedMuscleGroup).toBeNull()
  })

  it('counts free sessions all time', () => {
    mockGetWorkoutHistory.mockReturnValue([
      makeWorkout('w1', '2026-07-14T10:00:00Z', 'mock-id'),
      makeWorkout('w2', '2026-07-14T10:00:00Z', 'cw-1'),
    ])
    mockGetCustomWorkouts.mockReturnValue([
      { id: 'cw-1', name: 'A', workoutTypeId: 'wt-1', exerciseIds: [], targets: [], estimatedMinutes: 60, createdAt: '2026-01-01' },
    ])
    const stats = getWeeklyAggregateStats(1)
    expect(stats.totalFreeSessionsAllTime).toBe(1)
  })
})
