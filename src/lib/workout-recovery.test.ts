import { describe, it, expect } from 'vitest'
import type { CompletedWorkout } from './workout-history'
import type { Exercise } from '@/types/database'
import {
  getMuscleRecoveryStates,
  getWorkoutRecoveryInfo,
  rankWorkoutsByRecovery,
  getRecommendedWorkout,
  formatTimeSinceCompleted,
  type RecoveryEligibleWorkout,
} from './workout-recovery'

const NOW = new Date('2026-07-12T12:00:00.000Z')

function exercise(id: string, muscleGroups: string[]): Exercise {
  return { id, workout_type_id: 'wt-1', name: id, muscle_groups: muscleGroups, equipment: [], instructions: null }
}

function completedWorkout(overrides: Partial<CompletedWorkout> & { workoutId: string; completedAt: string; exerciseIds: string[] }): CompletedWorkout {
  return {
    id: `session-${overrides.workoutId}-${overrides.completedAt}`,
    workoutId: overrides.workoutId,
    workoutName: overrides.workoutId,
    workoutColor: '#000',
    category: 'strength',
    startedAt: overrides.completedAt,
    completedAt: overrides.completedAt,
    durationSeconds: 1800,
    xpEarned: 50,
    prsCount: 0,
    exercises: overrides.exerciseIds.map((exerciseId) => ({
      exerciseId,
      exerciseName: exerciseId,
      sets: [{ weight_kg: 20, reps: 10, isPr: false }],
    })),
  }
}

function workout(id: string, name: string, exercises: Exercise[]): RecoveryEligibleWorkout {
  return { id, name, exercises }
}

const EX_CHEST = exercise('ex-chest', ['peitoral'])
const EX_LEGS = exercise('ex-legs', ['quadríceps'])
const EX_CARDIO = exercise('ex-cardio', ['cardiovascular'])
const ALL_EXERCISES = [EX_CHEST, EX_LEGS, EX_CARDIO]

describe('getMuscleRecoveryStates', () => {
  it('treats every muscle group as fully recovered when there is no history', () => {
    const states = getMuscleRecoveryStates([], ALL_EXERCISES, NOW)
    expect(states.peito.status).toBe('recovered')
    expect(states.peito.recoveryPercent).toBe(100)
    expect(states.peito.lastTrainedAt).toBeNull()
  })

  it('marks a muscle group fatigued shortly after training it', () => {
    const history = [completedWorkout({ workoutId: 'w-1', completedAt: '2026-07-12T06:00:00.000Z', exerciseIds: ['ex-chest'] })]
    const states = getMuscleRecoveryStates(history, ALL_EXERCISES, NOW)
    // 6h since training, peito recovers over 72h => ~8.3% recovered
    expect(states.peito.status).toBe('fatigued')
    expect(states.peito.hoursSinceTrained).toBeCloseTo(6, 5)
  })

  it('marks a muscle group partially recovered mid-window', () => {
    const history = [completedWorkout({ workoutId: 'w-1', completedAt: '2026-07-10T12:00:00.000Z', exerciseIds: ['ex-legs'] })]
    const states = getMuscleRecoveryStates(history, ALL_EXERCISES, NOW)
    // 48h since training, pernas recovers over 96h => 50% => partial
    expect(states.pernas.status).toBe('partial')
    expect(states.pernas.recoveryPercent).toBeCloseTo(50, 5)
  })

  it('marks a muscle group fully recovered once past its recovery window', () => {
    const history = [completedWorkout({ workoutId: 'w-1', completedAt: '2026-07-01T12:00:00.000Z', exerciseIds: ['ex-chest'] })]
    const states = getMuscleRecoveryStates(history, ALL_EXERCISES, NOW)
    expect(states.peito.status).toBe('recovered')
    expect(states.peito.recoveryPercent).toBe(100)
  })

  it('ignores exercises whose muscle groups do not map to a canonical group', () => {
    const history = [completedWorkout({ workoutId: 'w-1', completedAt: '2026-07-12T11:00:00.000Z', exerciseIds: ['ex-cardio'] })]
    const states = getMuscleRecoveryStates(history, ALL_EXERCISES, NOW)
    // cardiovascular has no canonical mapping, so no group should register that session
    for (const group of Object.values(states)) {
      expect(group.lastTrainedAt).toBeNull()
    }
  })
})

describe('getWorkoutRecoveryInfo', () => {
  it('flags a workout with no completed history as never done', () => {
    const w = workout('w-new', 'Treino Novo', [EX_CHEST])
    const info = getWorkoutRecoveryInfo(w, { history: [], allExercises: ALL_EXERCISES, now: NOW })
    expect(info.neverCompleted).toBe(true)
    expect(info.status).toBe('never')
    expect(info.reason).toContain('Novo treino')
  })

  it('flags the workout tied to the active session regardless of recovery', () => {
    const w = workout('w-1', 'Peito', [EX_CHEST])
    const history = [completedWorkout({ workoutId: 'w-1', completedAt: '2026-07-01T12:00:00.000Z', exerciseIds: ['ex-chest'] })]
    const info = getWorkoutRecoveryInfo(w, { history, allExercises: ALL_EXERCISES, now: NOW, activeWorkoutId: 'w-1' })
    expect(info.status).toBe('active')
    expect(info.score).toBe(-1)
    expect(info.reason).toContain('Sessão ativa')
  })

  it('treats a workout with no mappable muscle groups as always recovered', () => {
    const w = workout('w-cardio', 'Cardio', [EX_CARDIO])
    const history = [completedWorkout({ workoutId: 'w-cardio', completedAt: '2026-07-12T11:00:00.000Z', exerciseIds: ['ex-cardio'] })]
    const info = getWorkoutRecoveryInfo(w, { history, allExercises: ALL_EXERCISES, now: NOW })
    expect(info.muscleGroups).toEqual([])
    expect(info.status).toBe('recovered')
    expect(info.score).toBe(100)
  })

  it('reports fatigued status with a reason naming the most-fatigued group', () => {
    const w = workout('w-1', 'Peito', [EX_CHEST])
    const history = [completedWorkout({ workoutId: 'w-1', completedAt: '2026-07-12T06:00:00.000Z', exerciseIds: ['ex-chest'] })]
    const info = getWorkoutRecoveryInfo(w, { history, allExercises: ALL_EXERCISES, now: NOW })
    expect(info.status).toBe('fatigued')
    expect(info.reason).toContain('Peito')
  })

  it('scores a multi-group workout by its most-fatigued group, not the average', () => {
    // "w-mixed" nunca foi feito, mas seus grupos musculares (peito + pernas)
    // foram treinados por OUTROS treinos. Peito está muito fatigado (1h atrás);
    // pernas quase recuperado. O bônus de "nunca feito" não deve mascarar um
    // grupo muscular travado — o score continua dominado pelo pior grupo.
    const w = workout('w-mixed', 'Misto', [EX_CHEST, EX_LEGS])
    const history = [
      completedWorkout({ workoutId: 'other-1', completedAt: '2026-07-12T11:00:00.000Z', exerciseIds: ['ex-chest'] }),
      completedWorkout({ workoutId: 'other-2', completedAt: '2026-07-08T18:00:00.000Z', exerciseIds: ['ex-legs'] }),
    ]
    const info = getWorkoutRecoveryInfo(w, { history, allExercises: ALL_EXERCISES, now: NOW })
    expect(info.status).toBe('never')
    // peito: 1h/72h ≈ 1.4% recovered + bônus de 20 — deve dominar o score,
    // não a média com pernas (~90% recuperado)
    expect(info.score).toBeLessThan(30)
  })
})

describe('rankWorkoutsByRecovery', () => {
  it('returns an empty ranking for an empty workout list', () => {
    expect(rankWorkoutsByRecovery([], { history: [], allExercises: ALL_EXERCISES, now: NOW })).toEqual([])
  })

  it('never hides a workout, even when every group is fatigued', () => {
    const workouts = [workout('w-1', 'Peito', [EX_CHEST]), workout('w-2', 'Pernas', [EX_LEGS])]
    const history = [
      completedWorkout({ workoutId: 'w-1', completedAt: '2026-07-12T11:00:00.000Z', exerciseIds: ['ex-chest'] }),
      completedWorkout({ workoutId: 'w-2', completedAt: '2026-07-12T11:30:00.000Z', exerciseIds: ['ex-legs'] }),
    ]
    const ranked = rankWorkoutsByRecovery(workouts, { history, allExercises: ALL_EXERCISES, now: NOW })
    expect(ranked).toHaveLength(2)
    expect(ranked.every((r) => r.status === 'fatigued')).toBe(true)
  })

  it('breaks ties deterministically by oldest last-completed date, then by name', () => {
    const workouts = [workout('w-b', 'Bravo', [EX_CHEST]), workout('w-a', 'Alfa', [EX_CHEST])]
    // both never completed -> identical score -> tie-break falls to name
    const ranked = rankWorkoutsByRecovery(workouts, { history: [], allExercises: ALL_EXERCISES, now: NOW })
    expect(ranked.map((r) => r.workoutName)).toEqual(['Alfa', 'Bravo'])
  })

  it('ranks the least-fatigued workout first', () => {
    const workouts = [workout('w-1', 'Peito', [EX_CHEST]), workout('w-2', 'Pernas', [EX_LEGS])]
    const history = [
      // peito trained 1h ago (very fatigued), pernas trained 90h ago (nearly recovered)
      completedWorkout({ workoutId: 'w-1', completedAt: '2026-07-12T11:00:00.000Z', exerciseIds: ['ex-chest'] }),
      completedWorkout({ workoutId: 'w-2', completedAt: '2026-07-08T18:00:00.000Z', exerciseIds: ['ex-legs'] }),
    ]
    const ranked = rankWorkoutsByRecovery(workouts, { history, allExercises: ALL_EXERCISES, now: NOW })
    expect(ranked[0].workoutId).toBe('w-2')
  })
})

describe('getRecommendedWorkout', () => {
  it('returns null when the list is empty', () => {
    expect(getRecommendedWorkout([], { history: [], allExercises: ALL_EXERCISES, now: NOW })).toBeNull()
  })

  it('does not recommend the single workout when it has an active session', () => {
    const workouts = [workout('w-1', 'Peito', [EX_CHEST])]
    const result = getRecommendedWorkout(workouts, {
      history: [],
      allExercises: ALL_EXERCISES,
      now: NOW,
      activeWorkoutId: 'w-1',
    })
    expect(result).toBeNull()
  })

  it('recommends the top-ranked workout in the normal case', () => {
    const workouts = [workout('w-1', 'Peito', [EX_CHEST]), workout('w-2', 'Novo', [EX_LEGS])]
    const history = [completedWorkout({ workoutId: 'w-1', completedAt: '2026-07-12T06:00:00.000Z', exerciseIds: ['ex-chest'] })]
    const result = getRecommendedWorkout(workouts, { history, allExercises: ALL_EXERCISES, now: NOW })
    expect(result?.workoutId).toBe('w-2')
    expect(result?.reason).toContain('Novo treino')
  })
})

describe('formatTimeSinceCompleted', () => {
  it('reports never completed workouts explicitly', () => {
    expect(formatTimeSinceCompleted(null, NOW)).toBe('Nunca realizado')
  })

  it('formats a recent completion in hours', () => {
    expect(formatTimeSinceCompleted('2026-07-12T06:00:00.000Z', NOW)).toBe('há 6h')
  })

  it('formats an older completion in days', () => {
    expect(formatTimeSinceCompleted('2026-07-10T12:00:00.000Z', NOW)).toBe('há 2 dias')
  })

  it('uses singular day when exactly one day has passed', () => {
    expect(formatTimeSinceCompleted('2026-07-11T12:00:00.000Z', NOW)).toBe('há 1 dia')
  })
})
