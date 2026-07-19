import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveTrainingProgram,
  updateTrainingProgram,
  duplicateProgramWeek,
  duplicateTrainingProgram,
  archiveTrainingProgram,
  restoreTrainingProgram,
  toggleTrainingProgramFavorite,
  deleteTrainingProgram,
  getTrainingPrograms,
  getActiveTrainingPrograms,
  getArchivedTrainingPrograms,
  getTrainingProgramById,
  validateTrainingProgram,
  getTrainingProgramStructuralAlerts,
  createWorkoutTemplateSnapshot,
  exportTrainingProgramMarkdown,
  importTrainingPrograms,
  resetTrainingPrograms,
  isTemplateUsedInPrograms,
  type TrainingProgramWeek,
  type TrainingProgramSession,
  type WorkoutTemplateSnapshot,
} from './training-programs'
import { saveWorkoutTemplate } from './workout-templates'

beforeEach(() => {
  window.localStorage.clear()
})

function snapshot(name = 'Treino A'): WorkoutTemplateSnapshot {
  return {
    name,
    exerciseBlocks: [
      { id: `blk-${Math.random()}`, type: 'single', exercise: { id: `ex-${Math.random()}`, exerciseName: 'Supino' } },
    ],
    capturedAt: new Date().toISOString(),
  }
}

function session(overrides: Partial<TrainingProgramSession> = {}): TrainingProgramSession {
  return {
    id: `sess-${Math.random()}`,
    name: 'Treino A',
    templateSnapshot: snapshot(),
    isOptional: false,
    ...overrides,
  }
}

function week(weekNumber = 1, sessions: TrainingProgramSession[] = [session()]): TrainingProgramWeek {
  return { id: `week-${Math.random()}`, weekNumber, sessions }
}

describe('validateTrainingProgram', () => {
  it('rejects an empty name', () => {
    const result = validateTrainingProgram({ name: '  ', weeks: [week()], tags: [] })
    expect(result.ok).toBe(false)
  })

  it('allows an empty program as draft', () => {
    const result = validateTrainingProgram({ name: 'Programa vazio', weeks: [], tags: [] })
    expect(result.ok).toBe(true)
  })

  it('rejects duplicated week numbers', () => {
    const result = validateTrainingProgram({ name: 'P', weeks: [week(1), week(1)], tags: [] })
    expect(result.ok).toBe(false)
  })

  it('rejects a session without templateSnapshot', () => {
    const badSession = { ...session(), templateSnapshot: undefined } as unknown as TrainingProgramSession
    const result = validateTrainingProgram({ name: 'P', weeks: [week(1, [badSession])], tags: [] })
    expect(result.ok).toBe(false)
  })

  it('rejects invalid preferredWeekday', () => {
    const badSession = session({ preferredWeekday: 9 as never })
    const result = validateTrainingProgram({ name: 'P', weeks: [week(1, [badSession])], tags: [] })
    expect(result.ok).toBe(false)
  })
})

describe('saveTrainingProgram', () => {
  it('creates a program with version 1', () => {
    const result = saveTrainingProgram({ name: 'Programa A', weeks: [week()], tags: [] })
    expect(result.ok).toBe(true)
    expect(result.program?.version).toBe(1)
    expect(getTrainingPrograms()).toHaveLength(1)
  })
})

describe('updateTrainingProgram', () => {
  it('increments version and preserves createdAt', () => {
    const created = saveTrainingProgram({ name: 'Programa A', weeks: [week()], tags: [] }).program!
    const updated = updateTrainingProgram(created.id, { name: 'Programa A editado' })
    expect(updated.program?.version).toBe(2)
    expect(updated.program?.createdAt).toBe(created.createdAt)
  })
})

describe('duplicateProgramWeek', () => {
  it('appends a new week with independent ids and next week number', () => {
    const created = saveTrainingProgram({ name: 'Programa A', weeks: [week(1)], tags: [] }).program!
    const result = duplicateProgramWeek(created.id, created.weeks[0].id)
    expect(result.ok).toBe(true)
    expect(result.program?.weeks).toHaveLength(2)
    expect(result.program?.weeks[1].weekNumber).toBe(2)
    expect(result.program?.weeks[1].id).not.toBe(created.weeks[0].id)
    expect(result.program?.weeks[1].sessions[0].id).not.toBe(created.weeks[0].sessions[0].id)
  })
})

describe('duplicateTrainingProgram', () => {
  it('creates an independent copy', () => {
    const original = saveTrainingProgram({ name: 'Programa A', weeks: [week()], tags: [] }).program!
    const copy = duplicateTrainingProgram(original.id)!
    expect(copy.id).not.toBe(original.id)
    expect(copy.sourceProgramId).toBe(original.id)
    expect(copy.version).toBe(1)
    expect(copy.weeks[0].id).not.toBe(original.weeks[0].id)
    expect(copy.weeks[0].sessions[0].id).not.toBe(original.weeks[0].sessions[0].id)
  })
})

describe('archive / restore / favorite', () => {
  it('archives and restores', () => {
    const created = saveTrainingProgram({ name: 'Programa A', weeks: [week()], tags: [] }).program!
    archiveTrainingProgram(created.id)
    expect(getActiveTrainingPrograms()).toHaveLength(0)
    expect(getArchivedTrainingPrograms()).toHaveLength(1)
    restoreTrainingProgram(created.id)
    expect(getActiveTrainingPrograms()).toHaveLength(1)
  })

  it('toggles favorite', () => {
    const created = saveTrainingProgram({ name: 'Programa A', weeks: [week()], tags: [] }).program!
    expect(toggleTrainingProgramFavorite(created.id)?.isFavorite).toBe(true)
  })
})

describe('deleteTrainingProgram', () => {
  it('deletes when not in use, refuses when in use', () => {
    const created = saveTrainingProgram({ name: 'Programa A', weeks: [week()], tags: [] }).program!
    expect(deleteTrainingProgram(created.id, true).ok).toBe(false)
    expect(deleteTrainingProgram(created.id, false).ok).toBe(true)
    expect(getTrainingProgramById(created.id)).toBeNull()
  })
})

describe('getTrainingProgramStructuralAlerts', () => {
  it('flags three sessions on the same day', () => {
    const w = week(1, [
      session({ dayIndex: 1 }),
      session({ dayIndex: 1 }),
      session({ dayIndex: 1 }),
    ])
    const program = saveTrainingProgram({ name: 'P', weeks: [w], tags: [] }).program!
    const alerts = getTrainingProgramStructuralAlerts(program)
    expect(alerts.some((a) => a.message.includes('mesmo dia'))).toBe(true)
  })

  it('flags a session without exercises', () => {
    const emptySession = session({ templateSnapshot: { ...snapshot(), exerciseBlocks: [] } })
    const program = saveTrainingProgram({ name: 'P', weeks: [week(1, [emptySession])], tags: [] }).program!
    const alerts = getTrainingProgramStructuralAlerts(program)
    expect(alerts.some((a) => a.message.includes('não possui exercícios'))).toBe(true)
  })

  it('does not block saving even with alerts', () => {
    const w = week(1, [session({ dayIndex: 1 }), session({ dayIndex: 1 }), session({ dayIndex: 1 })])
    const result = saveTrainingProgram({ name: 'P', weeks: [w], tags: [] })
    expect(result.ok).toBe(true)
  })
})

describe('createWorkoutTemplateSnapshot', () => {
  it('deep copies exerciseBlocks so future template edits do not leak in', () => {
    const template = saveWorkoutTemplate({
      name: 'Treino A',
      exerciseBlocks: [
        { id: 'blk-1', type: 'single', exercise: { id: 'ex-1', exerciseName: 'Supino' } },
      ],
      tags: [],
    }).template!

    const snap = createWorkoutTemplateSnapshot(template)
    template.exerciseBlocks[0].exercise.exerciseName = 'Mutated'
    expect(snap.exerciseBlocks[0].exercise.exerciseName).toBe('Supino')
    expect(snap.sourceTemplateId).toBe(template.id)
    expect(snap.sourceTemplateVersion).toBe(template.version)
  })
})

describe('exportTrainingProgramMarkdown', () => {
  it('includes week and session headings', () => {
    const program = saveTrainingProgram({ name: 'Programa A', weeks: [week(1, [session({ preferredWeekday: 1 })])], tags: [] }).program!
    const md = exportTrainingProgramMarkdown(program)
    expect(md).toContain('# Programa A')
    expect(md).toContain('## Semana 1')
    expect(md).toContain('Segunda')
  })
})

describe('isTemplateUsedInPrograms', () => {
  it('detects usage by templateId', () => {
    const s = session({ templateId: 'tpl-123' })
    saveTrainingProgram({ name: 'P', weeks: [week(1, [s])], tags: [] })
    expect(isTemplateUsedInPrograms('tpl-123')).toBe(true)
    expect(isTemplateUsedInPrograms('tpl-999')).toBe(false)
  })
})

describe('import / reset', () => {
  it('imports valid, skips invalid/duplicate; old backups (no keys) import as empty', () => {
    const created = saveTrainingProgram({ name: 'Programa A', weeks: [week()], tags: [] }).program!
    const result = importTrainingPrograms([created, { bad: true }, created])
    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(3)

    resetTrainingPrograms()
    expect(getTrainingPrograms()).toHaveLength(0)

    const emptyImport = importTrainingPrograms(undefined as unknown as unknown[])
    expect(emptyImport).toEqual({ imported: 0, skipped: 0 })
  })
})
