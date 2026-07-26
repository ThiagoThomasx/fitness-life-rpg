import { describe, it, expect } from 'vitest'
import { buildProposalDiff, formatChangesAsText } from './proposal-diff'
import type { FrequencyChangeSnapshot, ScheduleChangeSnapshot, VolumeChangeSnapshot } from './types'

describe('buildProposalDiff — volume', () => {
  const before: VolumeChangeSnapshot = {
    kind: 'volume',
    workoutId: 'w1',
    workoutName: 'Pernas',
    totalSets: 16,
    exercises: [
      { exerciseId: 'leg-press', name: 'Leg Press', sets: 4 },
      { exerciseId: 'squat', name: 'Agachamento', sets: 4 },
      { exerciseId: 'ext', name: 'Extensora', sets: 4 },
      { exerciseId: 'curl', name: 'Mesa Flexora', sets: 4 },
    ],
  }

  it('detects set_count changes per exercise', () => {
    const after: VolumeChangeSnapshot = {
      ...before,
      totalSets: 13,
      exercises: before.exercises.map((ex) =>
        ex.exerciseId === 'curl' ? ex : { ...ex, sets: 3 }
      ),
    }

    const changes = buildProposalDiff(before, after)
    const setChanges = changes.filter((c) => c.kind === 'set_count')
    expect(setChanges).toHaveLength(3)
    expect(setChanges.find((c) => c.target === 'Leg Press')).toMatchObject({ before: 4, after: 3 })

    const volumeChange = changes.find((c) => c.kind === 'volume_changed')
    expect(volumeChange).toMatchObject({ before: 16, after: 13, impact: '-3 séries no total' })
  })

  it('detects exercise removed and added', () => {
    const after: VolumeChangeSnapshot = {
      kind: 'volume',
      workoutId: 'w1',
      workoutName: 'Pernas',
      totalSets: 12,
      exercises: [
        { exerciseId: 'leg-press', name: 'Leg Press', sets: 4 },
        { exerciseId: 'squat', name: 'Agachamento', sets: 4 },
        { exerciseId: 'lunge', name: 'Afundo', sets: 4 },
      ],
    }

    const changes = buildProposalDiff(before, after)
    expect(changes.find((c) => c.kind === 'exercise_removed' && c.target === 'Extensora')).toBeTruthy()
    expect(changes.find((c) => c.kind === 'exercise_removed' && c.target === 'Mesa Flexora')).toBeTruthy()
    expect(changes.find((c) => c.kind === 'exercise_added' && c.target === 'Afundo')).toBeTruthy()
  })

  it('returns no changes when snapshots are identical', () => {
    expect(buildProposalDiff(before, before)).toEqual([])
  })
})

describe('buildProposalDiff — schedule', () => {
  it('detects date change', () => {
    const before: ScheduleChangeSnapshot = { kind: 'schedule', plannedWorkoutId: 'p1', workoutName: 'Pernas', date: '2026-07-25' }
    const after: ScheduleChangeSnapshot = { ...before, date: '2026-07-26' }
    const changes = buildProposalDiff(before, after)
    expect(changes).toEqual([
      expect.objectContaining({ kind: 'date_changed', before: '2026-07-25', after: '2026-07-26' }),
    ])
  })

  it('returns no changes when the date is unchanged', () => {
    const snapshot: ScheduleChangeSnapshot = { kind: 'schedule', plannedWorkoutId: 'p1', workoutName: 'Pernas', date: '2026-07-25' }
    expect(buildProposalDiff(snapshot, snapshot)).toEqual([])
  })
})

describe('buildProposalDiff — frequency', () => {
  it('detects frequency change', () => {
    const before: FrequencyChangeSnapshot = { kind: 'frequency', sessionsPerWeek: 5 }
    const after: FrequencyChangeSnapshot = { kind: 'frequency', sessionsPerWeek: 4 }
    const changes = buildProposalDiff(before, after)
    expect(changes).toEqual([
      expect.objectContaining({ kind: 'frequency_changed', before: 5, after: 4, impact: '-1 sessões/semana' }),
    ])
  })
})

describe('buildProposalDiff — mismatched or none snapshots', () => {
  it('returns no changes when snapshot kinds differ', () => {
    const volume: VolumeChangeSnapshot = { kind: 'volume', workoutId: 'w1', workoutName: 'Pernas', totalSets: 10, exercises: [] }
    const schedule: ScheduleChangeSnapshot = { kind: 'schedule', plannedWorkoutId: 'p1', workoutName: 'Pernas', date: '2026-07-25' }
    expect(buildProposalDiff(volume, schedule)).toEqual([])
  })

  it('returns no changes for "none" snapshots', () => {
    expect(buildProposalDiff({ kind: 'none' }, { kind: 'none' })).toEqual([])
  })
})

describe('formatChangesAsText', () => {
  it('formats changes as readable lines', () => {
    const lines = formatChangesAsText([
      { kind: 'set_count', target: 'Leg Press', before: 4, after: 3, rationale: 'x', impact: '-1 séries' },
    ])
    expect(lines).toEqual(['Leg Press: 4 → 3 (-1 séries)'])
  })
})
