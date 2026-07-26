import { describe, it, expect, beforeEach } from 'vitest'
import { buildHealthTrainingRelationships, MIN_RELATIONSHIP_GROUP_SAMPLE } from './relationships'
import { createHealthDataRecord } from './storage'
import type { CompletedWorkout } from '../workout-history'
import type { WorkoutReadinessCheckIn } from '../readiness-check-ins'

const NOW = new Date('2026-07-26T12:00:00.000Z')
const HISTORY_KEY = 'lrpg-fit:workout-history'
const CHECK_INS_KEY = 'lrpg-fit:readiness-check-ins'

function isoDaysAgo(daysAgo: number): string {
  const d = new Date(NOW)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString()
}

function seedWorkout(daysAgo: number, volumeKg: number): CompletedWorkout {
  return {
    id: `w-${daysAgo}`,
    workoutId: 'wk',
    workoutName: 'Treino',
    workoutColor: '#000',
    category: 'strength',
    startedAt: isoDaysAgo(daysAgo),
    completedAt: isoDaysAgo(daysAgo),
    durationSeconds: 3000,
    xpEarned: 50,
    exercises: [
      {
        exerciseId: 'ex-1',
        exerciseName: 'Supino',
        sets: [{ weight_kg: volumeKg, reps: 1, isPr: false }],
      },
    ],
    prsCount: 0,
  }
}

function seedCheckIn(daysAgo: number, energy: 1 | 2 | 3 | 4 | 5): WorkoutReadinessCheckIn {
  return {
    id: `c-${daysAgo}`,
    createdAt: isoDaysAgo(daysAgo),
    energy,
    soreness: 3,
    sleepQuality: 3,
    motivation: 3,
  }
}

function seedWorkoutsAndCheckIns(workouts: CompletedWorkout[], checkIns: WorkoutReadinessCheckIn[]): void {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(workouts))
  window.localStorage.setItem(CHECK_INS_KEY, JSON.stringify(checkIns))
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('buildHealthTrainingRelationships', () => {
  it('returns 4 relationships, all with insufficient sample when there is no data', () => {
    const relationships = buildHealthTrainingRelationships('90d', NOW)
    expect(relationships).toHaveLength(4)
    expect(relationships.every((r) => !r.sufficientSample)).toBe(true)
    expect(relationships.every((r) => r.minSampleRequired === MIN_RELATIONSHIP_GROUP_SAMPLE)).toBe(true)
  })

  it('compares session volume between nights below and at/above the sleep baseline', () => {
    const workouts: CompletedWorkout[] = []
    const checkIns: WorkoutReadinessCheckIn[] = []

    // 6 nights of low sleep (300min) -> low-volume sessions, low reported energy.
    for (let day = 1; day <= 6; day++) {
      createHealthDataRecord({ metric: 'sleep_duration', value: 300, recordedAt: isoDaysAgo(day), source: 'manual' })
      workouts.push(seedWorkout(day, 200))
      checkIns.push(seedCheckIn(day, 2))
    }
    // 6 nights of high sleep (500min) -> high-volume sessions, high reported energy.
    for (let day = 7; day <= 12; day++) {
      createHealthDataRecord({ metric: 'sleep_duration', value: 500, recordedAt: isoDaysAgo(day), source: 'manual' })
      workouts.push(seedWorkout(day, 2000))
      checkIns.push(seedCheckIn(day, 4))
    }
    seedWorkoutsAndCheckIns(workouts, checkIns)

    const relationships = buildHealthTrainingRelationships('90d', NOW)
    const sleepVolume = relationships.find((r) => r.id === 'sleep_x_volume')!
    const sleepReadiness = relationships.find((r) => r.id === 'sleep_x_readiness')!

    expect(sleepVolume.sufficientSample).toBe(true)
    expect(sleepVolume.belowBaseline.sampleSize).toBe(6)
    expect(sleepVolume.atOrAboveBaseline.sampleSize).toBe(6)
    expect(sleepVolume.belowBaseline.averageOutcome).toBeLessThan(sleepVolume.atOrAboveBaseline.averageOutcome!)
    expect(sleepVolume.evidenceText).toContain('menor')
    expect(sleepVolume.evidenceText).not.toMatch(/causou|causa/i)

    expect(sleepReadiness.sufficientSample).toBe(true)
    expect(sleepReadiness.belowBaseline.averageOutcome).toBe(2)
    expect(sleepReadiness.atOrAboveBaseline.averageOutcome).toBe(4)
  })

  it('marks a relationship as insufficient when a group has fewer than the minimum sample', () => {
    // Only 3 low-sleep days with matching sessions — below MIN_RELATIONSHIP_GROUP_SAMPLE.
    for (let day = 1; day <= 3; day++) {
      createHealthDataRecord({ metric: 'sleep_duration', value: 300, recordedAt: isoDaysAgo(day), source: 'manual' })
    }
    for (let day = 4; day <= 10; day++) {
      createHealthDataRecord({ metric: 'sleep_duration', value: 500, recordedAt: isoDaysAgo(day), source: 'manual' })
    }
    const workouts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => seedWorkout(d, 500))
    seedWorkoutsAndCheckIns(workouts, [])

    const relationships = buildHealthTrainingRelationships('90d', NOW)
    const sleepVolume = relationships.find((r) => r.id === 'sleep_x_volume')!
    expect(sleepVolume.sufficientSample).toBe(false)
    expect(sleepVolume.evidenceText).toContain('Amostra insuficiente')
  })

  it('never claims causation in evidence text, even with a clear observed difference', () => {
    for (let day = 1; day <= 6; day++) {
      createHealthDataRecord({ metric: 'resting_heart_rate', value: 50, recordedAt: isoDaysAgo(day), source: 'manual' })
    }
    for (let day = 7; day <= 13; day++) {
      createHealthDataRecord({ metric: 'resting_heart_rate', value: 70, recordedAt: isoDaysAgo(day), source: 'manual' })
    }
    const checkIns = [
      ...[1, 2, 3, 4, 5, 6].map((d) => seedCheckIn(d, 4)),
      ...[7, 8, 9, 10, 11, 12, 13].map((d) => seedCheckIn(d, 2)),
    ]
    seedWorkoutsAndCheckIns([], checkIns)

    const relationships = buildHealthTrainingRelationships('90d', NOW)
    for (const r of relationships) {
      expect(r.evidenceText).not.toMatch(/causou|causa\b/i)
    }
  })

  it('produces a "semelhante" evidence text when the two groups barely differ', () => {
    for (let day = 1; day <= 6; day++) {
      createHealthDataRecord({ metric: 'activity_duration', value: 40, recordedAt: isoDaysAgo(day), source: 'manual' })
    }
    for (let day = 7; day <= 12; day++) {
      createHealthDataRecord({ metric: 'activity_duration', value: 60, recordedAt: isoDaysAgo(day), source: 'manual' })
    }
    const workouts = [
      ...[1, 2, 3, 4, 5, 6].map((d) => seedWorkout(d, 1000)),
      ...[7, 8, 9, 10, 11, 12].map((d) => seedWorkout(d, 1010)),
    ]
    seedWorkoutsAndCheckIns(workouts, [])

    const relationships = buildHealthTrainingRelationships('90d', NOW)
    const activityVolume = relationships.find((r) => r.id === 'activity_x_volume')!
    expect(activityVolume.sufficientSample).toBe(true)
    expect(activityVolume.evidenceText).toContain('semelhante')
  })
})
