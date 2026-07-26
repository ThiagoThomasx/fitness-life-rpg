import { describe, it, expect } from 'vitest'
import { computeReducedTarget, increaseVolumeConservatively, reduceVolumeEvenly } from './volume-math'
import type { VolumeChangeExerciseSnapshot } from './types'

const FOUR_EXERCISES: VolumeChangeExerciseSnapshot[] = [
  { exerciseId: 'leg-press', name: 'Leg Press', sets: 4 },
  { exerciseId: 'squat', name: 'Agachamento', sets: 4 },
  { exerciseId: 'ext', name: 'Extensora', sets: 4 },
  { exerciseId: 'curl', name: 'Mesa Flexora', sets: 4 },
]

describe('computeReducedTarget', () => {
  it('rounds down a percentage reduction', () => {
    expect(computeReducedTarget(FOUR_EXERCISES, 15)).toBe(14) // 16 * 0.85 = 13.6 -> 14
  })

  it('never goes below the minimum possible total (1 per exercise)', () => {
    expect(computeReducedTarget(FOUR_EXERCISES, 99)).toBe(4)
  })
})

describe('reduceVolumeEvenly', () => {
  it('matches the spec example: 16 -> 13 series, reducing 3 of 4 exercises by 1', () => {
    const result = reduceVolumeEvenly(FOUR_EXERCISES, 13)
    const sets = result.map((ex) => ex.sets)
    expect(sets.reduce((a, b) => a + b, 0)).toBe(13)
    expect(sets.filter((s) => s === 3)).toHaveLength(3)
    expect(sets.filter((s) => s === 4)).toHaveLength(1)
  })

  it('distributes reduction round-robin across multiple passes when needed', () => {
    const result = reduceVolumeEvenly(FOUR_EXERCISES, 8)
    expect(result.reduce((sum, ex) => sum + ex.sets, 0)).toBe(8)
    expect(result.every((ex) => ex.sets === 2)).toBe(true)
  })

  it('never reduces an exercise below the minimum (1 set)', () => {
    const result = reduceVolumeEvenly(FOUR_EXERCISES, 0)
    expect(result.every((ex) => ex.sets >= 1)).toBe(true)
    expect(result.reduce((sum, ex) => sum + ex.sets, 0)).toBe(4)
  })

  it('is a no-op when the target is already at or above current total', () => {
    const result = reduceVolumeEvenly(FOUR_EXERCISES, 20)
    expect(result).toEqual(FOUR_EXERCISES)
  })
})

describe('increaseVolumeConservatively', () => {
  it('increases +1 set across two exercises by default, never more', () => {
    const result = increaseVolumeConservatively(FOUR_EXERCISES, 2)
    const changed = result.filter((ex, i) => ex.sets !== FOUR_EXERCISES[i].sets)
    expect(changed).toHaveLength(2)
    expect(changed.every((ex) => ex.sets === 5)).toBe(true)
  })

  it('never increases the same exercise by more than maxIncreasePerExercise', () => {
    const result = increaseVolumeConservatively(FOUR_EXERCISES, 10, 2, 1)
    expect(result.reduce((sum, ex) => sum + ex.sets, 0)).toBe(4 * 4 + 2) // only 2 touched, +1 each
  })

  it('respects maxExercisesTouched even with a large target', () => {
    const result = increaseVolumeConservatively(FOUR_EXERCISES, 100, 1, 3)
    const touchedCount = result.filter((ex, i) => ex.sets !== FOUR_EXERCISES[i].sets).length
    expect(touchedCount).toBe(1)
  })
})
