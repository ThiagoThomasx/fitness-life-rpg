import { describe, it, expect } from 'vitest'
import { computeFatigueSignals } from './fatigue'
import type { CompletedWorkout, ExerciseRecord, SetRecord } from '../workout-history'
import type { WorkoutReadinessCheckIn } from '../readiness-check-ins'
import { createHealthDataRecord, HEALTH_DATA_RECORDS_KEY } from '../health-data'

const HISTORY_KEY = 'lrpg-fit:workout-history'
const CHECK_INS_KEY = 'lrpg-fit:readiness-check-ins'
const CUSTOM_EXERCISES_KEY = 'lrpg-fit:custom-exercises'
const NOW = new Date('2026-07-25T12:00:00.000Z')

// IDs de src/lib/mock/data.ts com um único grupo muscular canônico.
const PEITO_EXERCISE_ID = 'ex-3'
const COSTAS_EXERCISE_ID = 'ex-6'
const PERNAS_EXERCISE_ID = 'ex-9'
const OMBROS_EXERCISE_ID = 'ex-12'

function set(weight_kg: number, reps: number): SetRecord {
  return { weight_kg, reps, isPr: false }
}

function exerciseRecord(exerciseId: string, sets: SetRecord[], estimated1RMKg?: number | null): ExerciseRecord {
  return { exerciseId, exerciseName: exerciseId, sets, estimated1RMKg }
}

function workout(overrides: Partial<CompletedWorkout> & { completedAt: string; exercises: ExerciseRecord[] }): CompletedWorkout {
  return {
    id: `w-${overrides.completedAt}-${Math.random().toString(36).slice(2, 6)}`,
    workoutId: 'wt-1',
    workoutName: 'Treino A',
    workoutColor: '#000',
    category: 'strength',
    startedAt: overrides.completedAt,
    durationSeconds: 1800,
    xpEarned: 50,
    prsCount: 0,
    ...overrides,
  }
}

function badCheckIn(id: string, createdAt: string): WorkoutReadinessCheckIn {
  return { id, createdAt, energy: 1, soreness: 5, sleepQuality: 1, motivation: 1 }
}

function seedHistory(history: CompletedWorkout[]) {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

function seedCheckIns(checkIns: WorkoutReadinessCheckIn[]) {
  window.localStorage.setItem(CHECK_INS_KEY, JSON.stringify(checkIns))
}

function resetAll() {
  seedHistory([])
  seedCheckIns([])
  window.localStorage.removeItem(CUSTOM_EXERCISES_KEY)
  window.localStorage.removeItem(HEALTH_DATA_RECORDS_KEY)
}

describe('computeFatigueSignals — empty and small data', () => {
  it('returns a fully insufficient/empty report for an empty history and no check-ins', () => {
    resetAll()
    const report = computeFatigueSignals('30d', NOW)
    expect(report.readiness.totalCheckIns).toBe(0)
    expect(report.loadTrend).toBe('insufficient_data')
    expect(report.patterns).toEqual([])
    expect(report.period).toBe('30d')
    for (const mg of Object.keys(report.recoveryByMuscleGroup)) {
      expect(report.recoveryByMuscleGroup[mg as keyof typeof report.recoveryByMuscleGroup].status).toBe('recovered')
    }
  })

  it('does not crash with inconsistent/missing check-in data (no check-ins at all)', () => {
    resetAll()
    seedHistory([workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] })])
    expect(() => computeFatigueSignals('7d', NOW)).not.toThrow()
    const report = computeFatigueSignals('7d', NOW)
    expect(report.readiness.totalCheckIns).toBe(0)
  })

  it('does not crash when a workout references an exercise removed from the catalog', () => {
    resetAll()
    seedHistory([workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord('deleted-exercise-id', [set(60, 8)])] })])
    expect(() => computeFatigueSignals('30d', NOW)).not.toThrow()
  })

  it('respects the "all" period boundary without throwing, and reports insufficient_data load trend (no prior window to compare)', () => {
    resetAll()
    seedHistory([workout({ completedAt: '2020-01-01T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] })])
    const report = computeFatigueSignals('all', NOW)
    expect(report.loadTrend).toBe('insufficient_data')
    expect(report.patterns).toEqual([])
  })
})

describe('computeFatigueSignals — pattern detectors firing', () => {
  it('fires the high-load + low-readiness pattern when volume rises with no prior baseline and readiness is mostly low', () => {
    resetAll()
    seedHistory([
      workout({ completedAt: '2026-07-23T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8), set(60, 8)])] }),
      workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8), set(60, 8)])] }),
    ])
    seedCheckIns([
      badCheckIn('c-1', '2026-07-22T09:00:00.000Z'),
      badCheckIn('c-2', '2026-07-23T09:00:00.000Z'),
      badCheckIn('c-3', '2026-07-24T09:00:00.000Z'),
    ])
    const report = computeFatigueSignals('7d', NOW)
    expect(report.loadTrend).toBe('increasing')
    expect(report.patterns.some((p) => p.id.startsWith('fatigue:high_load_low_readiness:'))).toBe(true)
    const pattern = report.patterns.find((p) => p.id.startsWith('fatigue:high_load_low_readiness:'))!
    expect(pattern.category).toBe('fatigue')
    expect(pattern.severity).toBe('attention')
    expect(pattern.evidence.length).toBeGreaterThan(0)
    // Nunca linguagem prescritiva/médica.
    expect(pattern.explanation.toLowerCase()).not.toMatch(/descanse|procure um médico|deve/i)
  })

  it('fires the high-load + majority-fatigued pattern when most muscle groups were trained very recently', () => {
    resetAll()
    seedHistory([
      workout({
        completedAt: '2026-07-25T08:00:00.000Z',
        exercises: [
          exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)]),
          exerciseRecord(COSTAS_EXERCISE_ID, [set(50, 8)]),
          exerciseRecord(PERNAS_EXERCISE_ID, [set(80, 10)]),
          exerciseRecord(OMBROS_EXERCISE_ID, [set(30, 10)]),
        ],
      }),
      workout({
        completedAt: '2026-07-25T09:00:00.000Z',
        exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])],
      }),
    ])
    const report = computeFatigueSignals('7d', NOW)
    const fatiguedGroups = Object.values(report.recoveryByMuscleGroup).filter((s) => s.status !== 'recovered')
    expect(fatiguedGroups.length).toBeGreaterThanOrEqual(4)
    expect(report.patterns.some((p) => p.id.startsWith('fatigue:high_load_majority_fatigued:'))).toBe(true)
  })

  it('fires the low-readiness + declining-1RM pattern when estimated 1RM drops between windows', () => {
    resetAll()
    seedHistory([
      // Previous 7-day window: higher estimated 1RM.
      workout({ completedAt: '2026-07-12T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)], 100)] }),
      // Current 7-day window: lower estimated 1RM.
      workout({ completedAt: '2026-07-23T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(40, 8)], 50)] }),
      workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(40, 8)], 50)] }),
    ])
    seedCheckIns([
      badCheckIn('c-1', '2026-07-22T09:00:00.000Z'),
      badCheckIn('c-2', '2026-07-23T09:00:00.000Z'),
      badCheckIn('c-3', '2026-07-24T09:00:00.000Z'),
    ])
    const report = computeFatigueSignals('7d', NOW)
    expect(report.patterns.some((p) => p.id.startsWith('fatigue:low_readiness_declining_performance:'))).toBe(true)
  })
})

describe('computeFatigueSignals — pattern detectors NOT firing (insufficient data)', () => {
  it('does not fire high-load + low-readiness with only a single session in the period', () => {
    resetAll()
    seedHistory([workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] })])
    seedCheckIns([badCheckIn('c-1', '2026-07-24T09:00:00.000Z'), badCheckIn('c-2', '2026-07-23T09:00:00.000Z')])
    const report = computeFatigueSignals('7d', NOW)
    expect(report.patterns.some((p) => p.id.startsWith('fatigue:high_load_low_readiness:'))).toBe(false)
  })

  it('does not fire high-load + low-readiness with only a single check-in', () => {
    resetAll()
    seedHistory([
      workout({ completedAt: '2026-07-23T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] }),
      workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] }),
    ])
    seedCheckIns([badCheckIn('c-1', '2026-07-24T09:00:00.000Z')])
    const report = computeFatigueSignals('7d', NOW)
    expect(report.patterns.some((p) => p.id.startsWith('fatigue:high_load_low_readiness:'))).toBe(false)
  })

  it('does not fire any pattern when readiness is consistently high', () => {
    resetAll()
    seedHistory([
      workout({ completedAt: '2026-07-23T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] }),
      workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] }),
    ])
    seedCheckIns([
      { id: 'c-1', createdAt: '2026-07-23T09:00:00.000Z', energy: 5, soreness: 1, sleepQuality: 5, motivation: 5 },
      { id: 'c-2', createdAt: '2026-07-24T09:00:00.000Z', energy: 5, soreness: 1, sleepQuality: 5, motivation: 5 },
    ])
    const report = computeFatigueSignals('7d', NOW)
    expect(report.patterns).toEqual([])
  })
})

// ─── Health Data patterns (Sprint 28 Parte 4) ──────────────────────────────────

describe('computeFatigueSignals — health data patterns', () => {
  it('does not fire any health pattern with zero health records', () => {
    resetAll()
    const report = computeFatigueSignals('30d', NOW)
    expect(report.patterns.some((p) => p.id.startsWith('fatigue:health_'))).toBe(false)
  })

  it('fires sleep deficit pattern only after 3 consecutive days 60+ min below baseline', () => {
    resetAll()
    for (let day = 6; day <= 19; day++) {
      createHealthDataRecord({
        metric: 'sleep_duration',
        value: 420,
        recordedAt: `2026-07-${String(day).padStart(2, '0')}T08:00:00.000Z`,
        source: 'manual',
      })
    }
    // Only 2 deficit days — should not fire yet.
    createHealthDataRecord({ metric: 'sleep_duration', value: 340, recordedAt: '2026-07-24T08:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'sleep_duration', value: 340, recordedAt: '2026-07-25T08:00:00.000Z', source: 'manual' })
    let report = computeFatigueSignals('30d', NOW)
    expect(report.patterns.some((p) => p.id.startsWith('fatigue:health_sleep_deficit:'))).toBe(false)

    // Add the third consecutive deficit day.
    createHealthDataRecord({ metric: 'sleep_duration', value: 340, recordedAt: '2026-07-23T08:00:00.000Z', source: 'manual' })
    report = computeFatigueSignals('30d', NOW)
    const pattern = report.patterns.find((p) => p.id.startsWith('fatigue:health_sleep_deficit:'))
    expect(pattern).toBeDefined()
    expect(pattern?.evidence.length).toBeGreaterThan(0)
  })

  it('fires resting HR elevated pattern only after 3 consecutive days 5+ bpm above baseline', () => {
    resetAll()
    for (let day = 6; day <= 19; day++) {
      createHealthDataRecord({
        metric: 'resting_heart_rate',
        value: 58,
        recordedAt: `2026-07-${String(day).padStart(2, '0')}T08:00:00.000Z`,
        source: 'manual',
      })
    }
    createHealthDataRecord({ metric: 'resting_heart_rate', value: 64, recordedAt: '2026-07-23T08:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'resting_heart_rate', value: 64, recordedAt: '2026-07-24T08:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'resting_heart_rate', value: 64, recordedAt: '2026-07-25T08:00:00.000Z', source: 'manual' })

    const report = computeFatigueSignals('30d', NOW)
    expect(report.patterns.some((p) => p.id.startsWith('fatigue:health_resting_hr_elevated:'))).toBe(true)
  })

  it('does not fire a false positive from a single isolated elevated day', () => {
    resetAll()
    for (let day = 6; day <= 19; day++) {
      createHealthDataRecord({
        metric: 'resting_heart_rate',
        value: 58,
        recordedAt: `2026-07-${String(day).padStart(2, '0')}T08:00:00.000Z`,
        source: 'manual',
      })
    }
    createHealthDataRecord({ metric: 'resting_heart_rate', value: 64, recordedAt: '2026-07-25T08:00:00.000Z', source: 'manual' })

    const report = computeFatigueSignals('30d', NOW)
    expect(report.patterns.some((p) => p.id.startsWith('fatigue:health_resting_hr_elevated:'))).toBe(false)
  })

  it('does not fire when sample size is insufficient for a baseline', () => {
    resetAll()
    createHealthDataRecord({ metric: 'resting_heart_rate', value: 70, recordedAt: '2026-07-23T08:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'resting_heart_rate', value: 70, recordedAt: '2026-07-24T08:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'resting_heart_rate', value: 70, recordedAt: '2026-07-25T08:00:00.000Z', source: 'manual' })

    const report = computeFatigueSignals('30d', NOW)
    expect(report.patterns.some((p) => p.id.startsWith('fatigue:health_'))).toBe(false)
  })

  it('does not use a day with a medium/high conflict for the recurring window', () => {
    resetAll()
    for (let day = 6; day <= 19; day++) {
      createHealthDataRecord({
        metric: 'resting_heart_rate',
        value: 58,
        recordedAt: `2026-07-${String(day).padStart(2, '0')}T08:00:00.000Z`,
        source: 'manual',
      })
    }
    createHealthDataRecord({ metric: 'resting_heart_rate', value: 64, recordedAt: '2026-07-23T08:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'resting_heart_rate', value: 64, recordedAt: '2026-07-24T08:00:00.000Z', source: 'manual' })
    // Conflicting sources on the most recent day — should exclude it from the reliable window.
    createHealthDataRecord({ metric: 'resting_heart_rate', value: 64, recordedAt: '2026-07-25T08:00:00.000Z', source: 'manual' })
    createHealthDataRecord({ metric: 'resting_heart_rate', value: 90, recordedAt: '2026-07-25T09:00:00.000Z', source: 'csv_import' })

    const report = computeFatigueSignals('30d', NOW)
    expect(report.patterns.some((p) => p.id.startsWith('fatigue:health_resting_hr_elevated:'))).toBe(false)
  })
})
