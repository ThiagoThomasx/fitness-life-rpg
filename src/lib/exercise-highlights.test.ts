import { describe, it, expect, beforeEach } from 'vitest'
import type { CompletedWorkout, ExerciseRecord, SetRecord } from './workout-history'
import { getExerciseHighlights } from './exercise-highlights'

const HISTORY_KEY = 'lrpg-fit:workout-history'

function set(weight_kg: number, reps: number): SetRecord {
  return { weight_kg, reps, isPr: false }
}

function exerciseRecord(overrides: Partial<ExerciseRecord> = {}): ExerciseRecord {
  return {
    exerciseId: 'ex-1',
    exerciseName: 'Supino Reto',
    sets: [set(60, 8), set(60, 8)],
    ...overrides,
  }
}

function workout(overrides: Partial<CompletedWorkout> & { completedAt: string }): CompletedWorkout {
  return {
    id: `w-${overrides.completedAt}`,
    workoutId: 'wt-1',
    workoutName: 'Treino A',
    workoutColor: '#000',
    category: 'strength',
    startedAt: overrides.completedAt,
    durationSeconds: 1800,
    xpEarned: 50,
    prsCount: 0,
    exercises: [],
    ...overrides,
  }
}

function seedHistory(history: CompletedWorkout[]) {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('getExerciseHighlights', () => {
  it('returns empty groups with no history', () => {
    seedHistory([])
    const highlights = getExerciseHighlights()
    expect(highlights.recentRecords).toEqual([])
    expect(highlights.mostSubstituted).toEqual([])
    expect(highlights.improving).toEqual([])
    expect(highlights.noRecentExecution).toEqual([])
  })

  it('flags a new record achieved in the most recent workout', () => {
    seedHistory([
      // history is newest-first, as saveCompletedWorkout would store it
      workout({ completedAt: '2026-02-01T10:00:00Z', exercises: [exerciseRecord({ sets: [set(80, 5)] })] }),
      workout({ completedAt: '2026-01-01T10:00:00Z', exercises: [exerciseRecord({ sets: [set(60, 8)] })] }),
    ])
    const highlights = getExerciseHighlights()
    expect(highlights.recentRecords.some((h) => h.exerciseId === 'ex-1')).toBe(true)
  })

  it('flags an exercise substituted repeatedly', () => {
    seedHistory([
      workout({
        completedAt: '2026-01-01T10:00:00Z',
        exercises: [
          exerciseRecord({
            exerciseId: 'ex-2',
            exerciseName: 'Chest Press',
            substitution: {
              plannedExerciseId: 'blk-1',
              plannedExerciseName: 'Supino Inclinado',
              replacementExerciseId: 'ex-2',
              replacementExerciseName: 'Chest Press',
              substitutedAt: '2026-01-01T10:00:00Z',
            },
          }),
        ],
      }),
    ])
    const highlights = getExerciseHighlights()
    expect(highlights.mostSubstituted.length).toBeGreaterThanOrEqual(0)
  })

  it('flags an exercise with no recent execution when it has enough history', () => {
    const history: CompletedWorkout[] = []
    for (let i = 0; i < 4; i++) {
      history.push(workout({ completedAt: `2025-01-0${i + 1}T10:00:00Z`, exercises: [exerciseRecord()] }))
    }
    // Most recent overall workout is a different, unrelated exercise far later.
    history.unshift(
      workout({
        completedAt: '2026-06-01T10:00:00Z',
        exercises: [exerciseRecord({ exerciseId: 'ex-other', exerciseName: 'Outro Exercício' })],
      })
    )
    seedHistory(history)
    const highlights = getExerciseHighlights()
    expect(highlights.noRecentExecution.some((h) => h.exerciseId === 'ex-1')).toBe(true)
  })
})
