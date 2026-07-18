import { describe, it, expect, vi } from 'vitest'
import { buildCycleSummary } from './training-cycle-summary'
import type { TrainingCycle } from './training-cycles'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('./workout-history', () => ({ getWorkoutHistory: vi.fn(() => mockHistory) }))
vi.mock('./custom-workouts', () => ({
  getCustomWorkouts: vi.fn(() => [{ id: 'cw-1', name: 'Treino A' }]),
  getAllExercises: vi.fn(() => [
    { id: 'ex-supino', muscle_groups: ['peitoral'] },
    { id: 'ex-remada', muscle_groups: ['costas'] },
  ]),
}))
vi.mock('./readiness-check-ins', () => ({ getCheckIns: vi.fn(() => []) }))
vi.mock('./weekly-plan', () => ({
  getWeekStart: vi.fn((d: Date) => {
    const date = new Date(d)
    const day = date.getDay()
    const diff = day === 0 ? -6 : 1 - day
    date.setDate(date.getDate() + diff)
    return date.toISOString().slice(0, 10)
  }),
}))

let mockHistory: unknown[] = []

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWorkout(
  id: string,
  completedAt: string,
  exercises: { exerciseId: string; exerciseName: string; sets: { weight_kg: number; reps: number }[]; isWeightPr?: boolean; isFirstTime?: boolean }[],
  opts: { workoutId?: string; prsCount?: number } = {}
) {
  return {
    id,
    workoutId: opts.workoutId ?? 'cw-1',
    workoutName: 'Treino A',
    workoutColor: '#fff',
    category: 'strength',
    startedAt: completedAt,
    completedAt,
    durationSeconds: 3600,
    xpEarned: 50,
    exercises,
    prsCount: opts.prsCount ?? 0,
  }
}

function makeCycle(overrides: Partial<TrainingCycle> = {}): TrainingCycle {
  return {
    id: 'cycle-1',
    name: 'Bloco de teste',
    goal: 'strength',
    startDate: '2026-08-03', // Monday
    status: 'active',
    createdAt: '2026-08-03T12:00:00.000Z',
    updatedAt: '2026-08-03T12:00:00.000Z',
    ...overrides,
  }
}

describe('buildCycleSummary', () => {
  it('returns zeroed metrics for a cycle with no sessions', () => {
    mockHistory = []
    const summary = buildCycleSummary(makeCycle(), new Date('2026-08-10T12:00:00Z'))
    expect(summary.totalSessions).toBe(0)
    expect(summary.totalVolumeKg).toBe(0)
    expect(summary.trend).toBe('insufficient_data')
    expect(summary.exercises).toEqual([])
  })

  it('excludes sessions outside the cycle date range', () => {
    mockHistory = [
      makeWorkout('w-before', '2026-07-01T12:00:00Z', [
        { exerciseId: 'ex-supino', exerciseName: 'Supino', sets: [{ weight_kg: 40, reps: 10 }] },
      ]),
      makeWorkout('w-inside', '2026-08-05T12:00:00Z', [
        { exerciseId: 'ex-supino', exerciseName: 'Supino', sets: [{ weight_kg: 42, reps: 10 }] },
      ]),
    ]
    const summary = buildCycleSummary(makeCycle(), new Date('2026-08-10T12:00:00Z'))
    expect(summary.totalSessions).toBe(1)
  })

  it('separates free sessions from plan sessions using custom workout ids', () => {
    mockHistory = [
      makeWorkout('w1', '2026-08-05T12:00:00Z', [], { workoutId: 'cw-1' }),
      makeWorkout('w2', '2026-08-06T12:00:00Z', [], { workoutId: 'free-workout' }),
    ]
    const summary = buildCycleSummary(makeCycle(), new Date('2026-08-10T12:00:00Z'))
    expect(summary.totalSessions).toBe(2)
    expect(summary.freeSessions).toBe(1)
    expect(summary.plannedSessions).toBe(1)
  })

  it('classifies exercise status as improving/stagnant/regressing/insufficient_data', () => {
    // getWorkoutHistory() retorna do mais recente para o mais antigo — mesma ordem aqui.
    mockHistory = [
      makeWorkout('w2', '2026-08-10T12:00:00Z', [
        { exerciseId: 'ex-supino', exerciseName: 'Supino', sets: [{ weight_kg: 45, reps: 10 }] }, // improving
        { exerciseId: 'ex-remada', exerciseName: 'Remada', sets: [{ weight_kg: 25, reps: 10 }] }, // regressing (-5kg)
      ]),
      makeWorkout('w1', '2026-08-03T12:00:00Z', [
        { exerciseId: 'ex-supino', exerciseName: 'Supino', sets: [{ weight_kg: 40, reps: 10 }] },
        { exerciseId: 'ex-remada', exerciseName: 'Remada', sets: [{ weight_kg: 30, reps: 10 }] },
      ]),
    ]
    const summary = buildCycleSummary(makeCycle(), new Date('2026-08-17T12:00:00Z'))
    const supino = summary.exercises.find((e) => e.exerciseId === 'ex-supino')
    const remada = summary.exercises.find((e) => e.exerciseId === 'ex-remada')
    expect(supino?.status).toBe('improving')
    expect(remada?.status).toBe('regressing')
  })

  it('marks a single-session exercise as insufficient_data', () => {
    mockHistory = [
      makeWorkout('w1', '2026-08-03T12:00:00Z', [
        { exerciseId: 'ex-supino', exerciseName: 'Supino', sets: [{ weight_kg: 40, reps: 10 }] },
      ]),
    ]
    const summary = buildCycleSummary(makeCycle(), new Date('2026-08-10T12:00:00Z'))
    expect(summary.exercises[0].status).toBe('insufficient_data')
  })

  it('sums PRs across sessions in range', () => {
    mockHistory = [
      makeWorkout('w1', '2026-08-03T12:00:00Z', [], { prsCount: 2 }),
      makeWorkout('w2', '2026-08-10T12:00:00Z', [], { prsCount: 1 }),
    ]
    const summary = buildCycleSummary(makeCycle(), new Date('2026-08-17T12:00:00Z'))
    expect(summary.totalPrs).toBe(3)
  })

  it('reports insufficient_data trend with fewer than 3 weeks of volume data', () => {
    mockHistory = [
      makeWorkout('w1', '2026-08-03T12:00:00Z', [
        { exerciseId: 'ex-supino', exerciseName: 'Supino', sets: [{ weight_kg: 40, reps: 10 }] },
      ]),
      makeWorkout('w2', '2026-08-10T12:00:00Z', [
        { exerciseId: 'ex-supino', exerciseName: 'Supino', sets: [{ weight_kg: 50, reps: 10 }] },
      ]),
    ]
    const summary = buildCycleSummary(makeCycle(), new Date('2026-08-17T12:00:00Z'))
    expect(summary.trend).toBe('insufficient_data')
  })

  it('detects an increasing volume trend across weeks', () => {
    mockHistory = [
      makeWorkout('w1', '2026-08-03T12:00:00Z', [
        { exerciseId: 'ex-supino', exerciseName: 'Supino', sets: [{ weight_kg: 40, reps: 10 }] },
      ]),
      makeWorkout('w2', '2026-08-10T12:00:00Z', [
        { exerciseId: 'ex-supino', exerciseName: 'Supino', sets: [{ weight_kg: 60, reps: 10 }] },
      ]),
      makeWorkout('w3', '2026-08-17T12:00:00Z', [
        { exerciseId: 'ex-supino', exerciseName: 'Supino', sets: [{ weight_kg: 90, reps: 10 }] },
      ]),
    ]
    const summary = buildCycleSummary(makeCycle(), new Date('2026-08-24T12:00:00Z'))
    expect(summary.trend).toBe('increasing')
  })

  it('handles a cycle spanning a month/year boundary', () => {
    mockHistory = [
      makeWorkout('w1', '2026-12-28T12:00:00Z', [
        { exerciseId: 'ex-supino', exerciseName: 'Supino', sets: [{ weight_kg: 40, reps: 10 }] },
      ]),
      makeWorkout('w2', '2027-01-05T12:00:00Z', [
        { exerciseId: 'ex-supino', exerciseName: 'Supino', sets: [{ weight_kg: 45, reps: 10 }] },
      ]),
    ]
    const cycle = makeCycle({ startDate: '2026-12-21' })
    const summary = buildCycleSummary(cycle, new Date('2027-01-10T12:00:00Z'))
    expect(summary.totalSessions).toBe(2)
    expect(summary.completedWeeks).toBeGreaterThanOrEqual(3)
  })

  it('uses completedAt as the end date for a completed cycle instead of now', () => {
    mockHistory = [
      makeWorkout('w-in-range', '2026-08-05T12:00:00Z', []),
      makeWorkout('w-after-close', '2026-09-01T12:00:00Z', []),
    ]
    const cycle = makeCycle({ status: 'completed', completedAt: '2026-08-15T12:00:00.000Z' })
    const summary = buildCycleSummary(cycle, new Date('2026-09-10T12:00:00Z'))
    expect(summary.totalSessions).toBe(1)
    expect(summary.endDate).toBe('2026-08-15')
  })
})
