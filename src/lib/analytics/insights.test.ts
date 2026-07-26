import { describe, it, expect } from 'vitest'
import { generateInsights } from './insights'
import type { CompletedWorkout, ExerciseRecord, SetRecord } from '../workout-history'
import type { PersonalRecordEvent } from '../personal-record-events'

const HISTORY_KEY = 'lrpg-fit:workout-history'
const CUSTOM_EXERCISES_KEY = 'lrpg-fit:custom-exercises'
const PR_EVENTS_KEY = 'lrpg-fit:personal-record-events'

const NOW = new Date('2026-07-25T12:00:00.000Z')

// IDs de src/lib/mock/data.ts com um único grupo muscular canônico após normalização.
const PEITO_EXERCISE_ID = 'ex-3'

function set(weight_kg: number, reps: number): SetRecord {
  return { weight_kg, reps, isPr: false }
}

function exerciseRecord(exerciseId: string, sets: SetRecord[]): ExerciseRecord {
  return { exerciseId, exerciseName: exerciseId, sets }
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

function prEvent(overrides: Partial<PersonalRecordEvent> & { achievedAt: string }): PersonalRecordEvent {
  return {
    id: `pr-${overrides.achievedAt}-${Math.random().toString(36).slice(2, 6)}`,
    workoutId: 'wt-1',
    exerciseId: PEITO_EXERCISE_ID,
    exerciseName: 'Supino Reto',
    recordType: 'max_load',
    newValue: 80,
    unit: 'kg',
    ...overrides,
  }
}

function seedHistory(history: CompletedWorkout[]) {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

function seedPrEvents(events: PersonalRecordEvent[]) {
  window.localStorage.setItem(PR_EVENTS_KEY, JSON.stringify(events))
}

function resetAll() {
  seedHistory([])
  seedPrEvents([])
  window.localStorage.removeItem(CUSTOM_EXERCISES_KEY)
}

describe('generateInsights — empty history', () => {
  it('returns no insights when there is no data at all', () => {
    resetAll()
    const insights = generateInsights('30d', NOW)
    expect(insights).toEqual([])
  })
})

describe('generateInsights — sustained volume increase', () => {
  it('fires when a muscle group volume strictly increases for 4 consecutive rolling weeks', () => {
    resetAll()
    seedHistory([
      workout({ completedAt: '2026-06-22T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(40, 1)])] }),
      workout({ completedAt: '2026-06-29T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(50, 1)])] }),
      workout({ completedAt: '2026-07-06T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 1)])] }),
      workout({ completedAt: '2026-07-13T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(70, 1)])] }),
      workout({ completedAt: '2026-07-20T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(80, 1)])] }),
    ])
    const insights = generateInsights('30d', NOW)
    const volumeInsight = insights.find((i) => i.id.startsWith('insights:sustained_volume_increase:peito'))
    expect(volumeInsight).toBeDefined()
    expect(volumeInsight?.explanation).toBe('Você aumentou seu volume em peito por 4 semanas consecutivas.')
    expect(volumeInsight?.category).toBe('volume')
  })

  it('does not fire when volume is flat/decreasing across the rolling weeks', () => {
    resetAll()
    seedHistory([
      workout({ completedAt: '2026-06-22T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(80, 1)])] }),
      workout({ completedAt: '2026-06-29T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 1)])] }),
      workout({ completedAt: '2026-07-06T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(70, 1)])] }),
      workout({ completedAt: '2026-07-13T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(50, 1)])] }),
      workout({ completedAt: '2026-07-20T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(90, 1)])] }),
    ])
    const insights = generateInsights('30d', NOW)
    expect(insights.find((i) => i.id.startsWith('insights:sustained_volume_increase'))).toBeUndefined()
  })
})

describe('generateInsights — muscle group not trained recently', () => {
  it('fires for a muscle group trained once, long enough ago to exceed the recovery multiplier', () => {
    resetAll()
    // 'core' tem RECOVERY_HOURS = 24h; 4x = 96h = 4 dias. 60 dias atrás é MUITO além disso.
    seedHistory([workout({ completedAt: '2026-05-26T10:00:00.000Z', exercises: [exerciseRecord('ex-17', [set(0, 20)])] })])
    const insights = generateInsights('all', NOW)
    const staleInsight = insights.find((i) => i.id.startsWith('insights:muscle_group_stale:core'))
    expect(staleInsight).toBeDefined()
    expect(staleInsight?.explanation).toContain('Você não treinou core há')
    expect(staleInsight?.category).toBe('recovery')
  })

  it('does not fire for a muscle group that was never trained (no baseline to compare)', () => {
    resetAll()
    seedHistory([])
    const insights = generateInsights('30d', NOW)
    expect(insights.find((i) => i.id.startsWith('insights:muscle_group_stale'))).toBeUndefined()
  })
})

describe('generateInsights — best month', () => {
  it('fires when the period spans at least two distinct months with different session counts', () => {
    resetAll()
    seedHistory([
      workout({ completedAt: '2026-02-05T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] }),
      workout({ completedAt: '2026-02-10T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] }),
      workout({ completedAt: '2026-02-15T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] }),
      workout({ completedAt: '2026-05-05T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] }),
    ])
    const insights = generateInsights('1y', NOW)
    const bestMonthInsight = insights.find((i) => i.id.startsWith('insights:best_month'))
    expect(bestMonthInsight).toBeDefined()
    expect(bestMonthInsight?.explanation).toBe('Seu melhor mês foi fevereiro de 2026.')
  })

  it('does not fire when only a single month has data (nothing to compare)', () => {
    resetAll()
    seedHistory([workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 8)])] })])
    const insights = generateInsights('30d', NOW)
    expect(insights.find((i) => i.id.startsWith('insights:best_month'))).toBeUndefined()
  })
})

describe('generateInsights — standout exercise evolution', () => {
  it('fires when the top evolving exercise has a meaningful (> stability tolerance) delta', () => {
    resetAll()
    seedHistory([
      // Ordem mais-recente-primeiro (mesma convenção de `getWorkoutHistory()`).
      workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(70, 8)])] }),
      workout({ completedAt: '2026-07-10T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(50, 8)])] }),
    ])
    const insights = generateInsights('30d', NOW)
    const evolutionInsight = insights.find((i) => i.id.startsWith('insights:standout_exercise_evolution'))
    expect(evolutionInsight).toBeDefined()
    expect(evolutionInsight?.category).toBe('performance')
  })

  it('does not fire when there is no exercise with at least 2 sessions', () => {
    resetAll()
    seedHistory([workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(50, 8)])] })])
    const insights = generateInsights('30d', NOW)
    expect(insights.find((i) => i.id.startsWith('insights:standout_exercise_evolution'))).toBeUndefined()
  })
})

describe('generateInsights — notable PR count', () => {
  it('fires when the period has a "high" confidence sample of PR events (6+)', () => {
    resetAll()
    seedHistory([workout({ completedAt: '2026-07-24T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(50, 8)])] })])
    seedPrEvents(
      Array.from({ length: 6 }, (_, i) => prEvent({ achievedAt: `2026-07-${10 + i}T10:00:00.000Z` }))
    )
    const insights = generateInsights('30d', NOW)
    const prInsight = insights.find((i) => i.id.startsWith('insights:pr_streak'))
    expect(prInsight).toBeDefined()
    expect(prInsight?.explanation).toBe('Você bateu 6 recordes pessoais no período selecionado.')
    expect(prInsight?.category).toBe('records')
  })

  it('does not fire below the "high" confidence sample threshold', () => {
    resetAll()
    seedPrEvents([prEvent({ achievedAt: '2026-07-10T10:00:00.000Z' })])
    const insights = generateInsights('30d', NOW)
    expect(insights.find((i) => i.id.startsWith('insights:pr_streak'))).toBeUndefined()
  })
})

describe('generateInsights — evidence and gating discipline', () => {
  it('every emitted insight cites at least one piece of evidence and tags the requested period', () => {
    resetAll()
    seedHistory([
      workout({ completedAt: '2026-06-22T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(40, 1)])] }),
      workout({ completedAt: '2026-06-29T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(50, 1)])] }),
      workout({ completedAt: '2026-07-06T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(60, 1)])] }),
      workout({ completedAt: '2026-07-13T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(70, 1)])] }),
      workout({ completedAt: '2026-07-20T10:00:00.000Z', exercises: [exerciseRecord(PEITO_EXERCISE_ID, [set(80, 1)])] }),
    ])
    const insights = generateInsights('30d', NOW)
    expect(insights.length).toBeGreaterThan(0)
    for (const insight of insights) {
      expect(insight.evidence.length).toBeGreaterThan(0)
      expect(insight.period).toBe('30d')
    }
  })
})
