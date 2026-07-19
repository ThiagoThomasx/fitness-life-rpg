import { describe, it, expect } from 'vitest'
import {
  validateTrainingBlocks,
  resolveProgramSessionForWeek,
  resolveProgramSessionSnapshot,
  buildManualDeloadOverrides,
  compareProgramWeeks,
  validateProgramProgressionIntegrity,
  calculatePlannedVolume,
  findProgramSessionOverride,
  type TrainingBlock,
  type ProgramSessionOverride,
  type ResolvedProgramExercise,
} from './training-blocks'
import type { TrainingProgram, TrainingProgramSession, TrainingProgramWeek, WorkoutTemplateSnapshot } from './training-programs'

function snapshot(exercises: { id: string; name: string; sets?: number; reps?: string; loadKg?: number }[]): WorkoutTemplateSnapshot {
  return {
    name: 'Treino A',
    exerciseBlocks: exercises.map((e) => ({
      id: e.id,
      type: 'single' as const,
      exercise: { id: `ex-${e.id}`, exerciseName: e.name, sets: e.sets, reps: e.reps, loadKg: e.loadKg },
    })),
    capturedAt: new Date().toISOString(),
  }
}

function session(overrides: Partial<TrainingProgramSession> = {}): TrainingProgramSession {
  return {
    id: 'sess-1',
    name: 'Treino A',
    templateSnapshot: snapshot([{ id: 'blk-1', name: 'Supino', sets: 4, reps: '8', loadKg: 60 }]),
    isOptional: false,
    ...overrides,
  }
}

function week(overrides: Partial<TrainingProgramWeek> = {}): TrainingProgramWeek {
  return { id: 'week-1', weekNumber: 1, sessions: [session()], ...overrides }
}

function program(overrides: Partial<TrainingProgram> = {}): TrainingProgram {
  return {
    id: 'prog-1',
    name: 'Programa Teste',
    weeks: [week()],
    tags: [],
    isFavorite: false,
    isArchived: false,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ─── validateTrainingBlocks ─────────────────────────────────────────────────────

describe('validateTrainingBlocks', () => {
  it('accepts contiguous non-overlapping blocks within range', () => {
    const blocks: TrainingBlock[] = [
      { id: 'b1', name: 'Base', startWeek: 1, endWeek: 3 },
      { id: 'b2', name: 'Pico', startWeek: 4, endWeek: 6 },
    ]
    expect(validateTrainingBlocks(blocks, 6).ok).toBe(true)
  })

  it('rejects startWeek greater than endWeek', () => {
    const blocks: TrainingBlock[] = [{ id: 'b1', name: 'Base', startWeek: 5, endWeek: 2 }]
    const result = validateTrainingBlocks(blocks, 6)
    expect(result.ok).toBe(false)
    expect(result.errors[0].type).toBe('invalid_range')
  })

  it('rejects a block outside the program week range', () => {
    const blocks: TrainingBlock[] = [{ id: 'b1', name: 'Base', startWeek: 1, endWeek: 8 }]
    const result = validateTrainingBlocks(blocks, 6)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.type === 'invalid_range')).toBe(true)
  })

  it('rejects overlapping blocks', () => {
    const blocks: TrainingBlock[] = [
      { id: 'b1', name: 'Base', startWeek: 1, endWeek: 4 },
      { id: 'b2', name: 'Pico', startWeek: 3, endWeek: 6 },
    ]
    const result = validateTrainingBlocks(blocks, 6)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.type === 'overlap' && e.blockId === 'b1')).toBe(true)
    expect(result.errors.some((e) => e.type === 'overlap' && e.blockId === 'b2')).toBe(true)
  })

  it('allows an empty block list', () => {
    expect(validateTrainingBlocks([], 6).ok).toBe(true)
  })
})

// ─── resolveProgramSessionForWeek ───────────────────────────────────────────────

describe('resolveProgramSessionForWeek', () => {
  it('resolves exercises from template snapshot when there is no override', () => {
    const p = program()
    const resolved = resolveProgramSessionForWeek(p, p.weeks[0], p.weeks[0].sessions[0])
    expect(resolved.exercises).toHaveLength(1)
    expect(resolved.exercises[0].source).toBe('template')
    expect(resolved.exercises[0].loadKg).toBe(60)
    expect(resolved.isDeload).toBe(false)
  })

  it('applies a weekly override on top of the snapshot', () => {
    const override: ProgramSessionOverride = {
      id: 'ovr-1',
      weekId: 'week-1',
      sessionId: 'sess-1',
      exerciseOverrides: [{ exerciseBlockId: 'blk-1', loadKg: 65 }],
      createdAt: '',
      updatedAt: '',
    }
    const p = program({ sessionOverrides: [override] })
    const resolved = resolveProgramSessionForWeek(p, p.weeks[0], p.weeks[0].sessions[0])
    expect(resolved.exercises[0].loadKg).toBe(65)
    expect(resolved.exercises[0].sets).toBe(4) // inherited, not overridden
    expect(resolved.exercises[0].source).toBe('weekly_override')
  })

  it('excludes an exercise when the override action is skip', () => {
    const override: ProgramSessionOverride = {
      id: 'ovr-1',
      weekId: 'week-1',
      sessionId: 'sess-1',
      exerciseOverrides: [{ exerciseBlockId: 'blk-1', action: 'skip' }],
      createdAt: '',
      updatedAt: '',
    }
    const p = program({ sessionOverrides: [override] })
    const resolved = resolveProgramSessionForWeek(p, p.weeks[0], p.weeks[0].sessions[0])
    expect(resolved.exercises).toHaveLength(0)
  })

  it('marks the resolved session as deload from the override flag', () => {
    const override: ProgramSessionOverride = {
      id: 'ovr-1',
      weekId: 'week-1',
      sessionId: 'sess-1',
      exerciseOverrides: [],
      isDeload: true,
      createdAt: '',
      updatedAt: '',
    }
    const p = program({ sessionOverrides: [override] })
    const resolved = resolveProgramSessionForWeek(p, p.weeks[0], p.weeks[0].sessions[0])
    expect(resolved.isDeload).toBe(true)
  })

  it('does not mutate the original session or program', () => {
    const p = program()
    const before = JSON.stringify(p)
    resolveProgramSessionForWeek(p, p.weeks[0], p.weeks[0].sessions[0])
    expect(JSON.stringify(p)).toBe(before)
  })
})

describe('resolveProgramSessionSnapshot', () => {
  it('produces a snapshot reflecting resolved values', () => {
    const s = session()
    const resolved = resolveProgramSessionForWeek(program(), week(), s)
    const snap = resolveProgramSessionSnapshot(s, {
      ...resolved,
      exercises: [{ ...resolved.exercises[0], loadKg: 70 }],
    })
    expect(snap.exerciseBlocks[0].exercise.loadKg).toBe(70)
    expect(snap.exerciseBlocks[0].id).toBe('blk-1')
  })
})

// ─── buildManualDeloadOverrides ─────────────────────────────────────────────────

describe('buildManualDeloadOverrides', () => {
  it('applies multipliers and rounds sets/load', () => {
    const p = program()
    const overrides = buildManualDeloadOverrides(p, {
      weekId: 'week-1',
      sessionIds: ['sess-1'],
      setsMultiplier: 0.5,
      loadMultiplier: 0.8,
    })
    expect(overrides).toHaveLength(1)
    expect(overrides[0].isDeload).toBe(true)
    const ex = overrides[0].exerciseOverrides[0]
    expect(ex.sets).toBe(2) // round(4 * 0.5)
    expect(ex.loadKg).toBe(47.5) // floor(60*0.8=48) to nearest 2.5 = 47.5
  })

  it('never produces negative sets or load', () => {
    const p = program({
      weeks: [
        week({
          sessions: [session({ templateSnapshot: snapshot([{ id: 'blk-1', name: 'Supino', sets: 1, loadKg: 2 }]) })],
        }),
      ],
    })
    const overrides = buildManualDeloadOverrides(p, {
      weekId: 'week-1',
      sessionIds: ['sess-1'],
      setsMultiplier: -5,
      loadMultiplier: -5,
    })
    const ex = overrides[0].exerciseOverrides[0]
    expect(ex.sets).toBeGreaterThanOrEqual(0)
    expect(ex.loadKg).toBeGreaterThanOrEqual(0)
  })

  it('returns an empty array when the week does not exist', () => {
    const p = program()
    const overrides = buildManualDeloadOverrides(p, { weekId: 'missing', sessionIds: ['sess-1'] })
    expect(overrides).toEqual([])
  })

  it('skips exercises with no multiplier applied', () => {
    const p = program()
    const overrides = buildManualDeloadOverrides(p, { weekId: 'week-1', sessionIds: ['sess-1'] })
    expect(overrides[0].exerciseOverrides).toHaveLength(0)
  })
})

// ─── compareProgramWeeks ────────────────────────────────────────────────────────

describe('compareProgramWeeks', () => {
  it('returns null when a week is missing', () => {
    const p = program()
    expect(compareProgramWeeks(p, 1, 2)).toBeNull()
  })

  it('reports no changes for identical weeks structure', () => {
    const p = program({ weeks: [week({ id: 'w1', weekNumber: 1 }), week({ id: 'w2', weekNumber: 2, sessions: [session({ id: 'sess-2' })] })] })
    const cmp = compareProgramWeeks(p, 1, 2)
    expect(cmp?.summary.exercisesModified).toBe(0)
    expect(cmp?.summary.sessionsAdded).toBe(0)
    expect(cmp?.summary.sessionsRemoved).toBe(0)
  })

  it('detects load changes via a weekly override', () => {
    const w2Session = session({ id: 'sess-2' })
    const override: ProgramSessionOverride = {
      id: 'ovr-1',
      weekId: 'w2',
      sessionId: 'sess-2',
      exerciseOverrides: [{ exerciseBlockId: 'blk-1', loadKg: 70 }],
      createdAt: '',
      updatedAt: '',
    }
    const p = program({
      weeks: [week({ id: 'w1', weekNumber: 1 }), week({ id: 'w2', weekNumber: 2, sessions: [w2Session] })],
      sessionOverrides: [override],
    })
    const cmp = compareProgramWeeks(p, 1, 2)
    expect(cmp?.summary.loadChanged).toBe(1)
    expect(cmp?.summary.exercisesModified).toBe(1)
  })

  it('flags a session present only in week B as added', () => {
    const p = program({
      weeks: [
        week({ id: 'w1', weekNumber: 1 }),
        week({ id: 'w2', weekNumber: 2, sessions: [session({ id: 'sess-2', name: 'Treino B' })] }),
      ],
    })
    const cmp = compareProgramWeeks(p, 1, 2)
    expect(cmp?.summary.sessionsAdded).toBe(1)
    expect(cmp?.summary.sessionsRemoved).toBe(1)
  })

  it('propagates the deload flag into the summary', () => {
    const w2Session = session({ id: 'sess-2' })
    const override: ProgramSessionOverride = {
      id: 'ovr-1',
      weekId: 'w2',
      sessionId: 'sess-2',
      exerciseOverrides: [],
      isDeload: true,
      createdAt: '',
      updatedAt: '',
    }
    const p = program({
      weeks: [week({ id: 'w1', weekNumber: 1 }), week({ id: 'w2', weekNumber: 2, sessions: [w2Session] })],
      sessionOverrides: [override],
    })
    const cmp = compareProgramWeeks(p, 1, 2)
    expect(cmp?.summary.weekBIsDeload).toBe(true)
  })
})

// ─── validateProgramProgressionIntegrity ────────────────────────────────────────

describe('validateProgramProgressionIntegrity', () => {
  it('reports no issues for a clean program', () => {
    const report = validateProgramProgressionIntegrity(program())
    expect(report.orphanOverrides).toEqual([])
    expect(report.invalidBlockRanges).toEqual([])
    expect(report.overlappingBlocks).toEqual([])
    expect(report.uncoveredWeeks).toEqual([])
    expect(report.emptyDeloadBlocks).toEqual([])
  })

  it('flags an override pointing at a missing session', () => {
    const override: ProgramSessionOverride = {
      id: 'ovr-orphan',
      weekId: 'week-1',
      sessionId: 'missing-session',
      exerciseOverrides: [],
      createdAt: '',
      updatedAt: '',
    }
    const report = validateProgramProgressionIntegrity(program({ sessionOverrides: [override] }))
    expect(report.orphanOverrides).toContain('ovr-orphan')
  })

  it('flags an override referencing a removed exercise block', () => {
    const override: ProgramSessionOverride = {
      id: 'ovr-orphan-ex',
      weekId: 'week-1',
      sessionId: 'sess-1',
      exerciseOverrides: [{ exerciseBlockId: 'blk-removed', loadKg: 10 }],
      createdAt: '',
      updatedAt: '',
    }
    const report = validateProgramProgressionIntegrity(program({ sessionOverrides: [override] }))
    expect(report.orphanOverrides).toContain('ovr-orphan-ex')
  })

  it('flags invalid and overlapping block ranges', () => {
    const blocks: TrainingBlock[] = [
      { id: 'b1', name: 'Base', startWeek: 1, endWeek: 2 },
      { id: 'b2', name: 'Pico', startWeek: 2, endWeek: 3 },
    ]
    const p = program({
      weeks: [week({ id: 'w1', weekNumber: 1 }), week({ id: 'w2', weekNumber: 2 }), week({ id: 'w3', weekNumber: 3 })],
      blocks,
    })
    const report = validateProgramProgressionIntegrity(p)
    expect(report.overlappingBlocks).toEqual(expect.arrayContaining(['b1', 'b2']))
  })

  it('flags weeks not covered by any block', () => {
    const blocks: TrainingBlock[] = [{ id: 'b1', name: 'Base', startWeek: 1, endWeek: 1 }]
    const p = program({
      weeks: [week({ id: 'w1', weekNumber: 1 }), week({ id: 'w2', weekNumber: 2 })],
      blocks,
    })
    const report = validateProgramProgressionIntegrity(p)
    expect(report.uncoveredWeeks).toEqual([2])
  })

  it('flags a deload block with no overrides in its weeks', () => {
    const blocks: TrainingBlock[] = [{ id: 'b1', name: 'Deload', objective: 'deload', startWeek: 1, endWeek: 1 }]
    const p = program({ blocks })
    const report = validateProgramProgressionIntegrity(p)
    expect(report.emptyDeloadBlocks).toContain('b1')
  })

  it('does not flag a deload block that has overrides', () => {
    const blocks: TrainingBlock[] = [{ id: 'b1', name: 'Deload', objective: 'deload', startWeek: 1, endWeek: 1 }]
    const override: ProgramSessionOverride = {
      id: 'ovr-1',
      weekId: 'week-1',
      sessionId: 'sess-1',
      exerciseOverrides: [],
      isDeload: true,
      createdAt: '',
      updatedAt: '',
    }
    const p = program({ blocks, sessionOverrides: [override] })
    const report = validateProgramProgressionIntegrity(p)
    expect(report.emptyDeloadBlocks).not.toContain('b1')
  })
})

// ─── calculatePlannedVolume ──────────────────────────────────────────────────────

describe('calculatePlannedVolume', () => {
  it('sums volume for exercises with numeric sets/reps/load', () => {
    const exercises: ResolvedProgramExercise[] = [
      { exerciseName: 'Supino', sets: 4, reps: '8', loadKg: 60, source: 'template' },
    ]
    const result = calculatePlannedVolume(exercises)
    expect(result.totalVolumeKg).toBe(4 * 8 * 60)
    expect(result.calculableExerciseCount).toBe(1)
    expect(result.unknownExerciseCount).toBe(0)
  })

  it('treats non-numeric reps as unknown rather than zero', () => {
    const exercises: ResolvedProgramExercise[] = [
      { exerciseName: 'Prancha', sets: 3, reps: 'até falha', loadKg: 0, source: 'template' },
    ]
    const result = calculatePlannedVolume(exercises)
    expect(result.unknownExerciseCount).toBe(1)
    expect(result.totalVolumeKg).toBe(0)
  })
})

// ─── findProgramSessionOverride ─────────────────────────────────────────────────

describe('findProgramSessionOverride', () => {
  it('finds the matching override by week and session id', () => {
    const override: ProgramSessionOverride = {
      id: 'ovr-1',
      weekId: 'week-1',
      sessionId: 'sess-1',
      exerciseOverrides: [],
      createdAt: '',
      updatedAt: '',
    }
    expect(findProgramSessionOverride([override], 'week-1', 'sess-1')).toBe(override)
    expect(findProgramSessionOverride([override], 'week-1', 'sess-2')).toBeUndefined()
    expect(findProgramSessionOverride(undefined, 'week-1', 'sess-1')).toBeUndefined()
  })
})
