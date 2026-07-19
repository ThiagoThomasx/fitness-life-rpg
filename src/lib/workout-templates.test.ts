import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveWorkoutTemplate,
  updateWorkoutTemplate,
  duplicateWorkoutTemplate,
  archiveWorkoutTemplate,
  restoreWorkoutTemplate,
  toggleWorkoutTemplateFavorite,
  deleteWorkoutTemplate,
  getWorkoutTemplates,
  getActiveWorkoutTemplates,
  getArchivedWorkoutTemplates,
  getWorkoutTemplateById,
  validateWorkoutTemplate,
  createTemplateFromWorkout,
  exportWorkoutTemplateMarkdown,
  importWorkoutTemplates,
  resetWorkoutTemplates,
  type WorkoutTemplateExerciseBlock,
} from './workout-templates'

beforeEach(() => {
  window.localStorage.clear()
})

function block(name = 'Supino reto'): WorkoutTemplateExerciseBlock {
  return {
    id: `blk-${Math.random()}`,
    type: 'single',
    exercise: { id: `ex-${Math.random()}`, exerciseName: name, sets: 4, reps: '8-10', restSeconds: 90 },
  }
}

describe('validateWorkoutTemplate', () => {
  it('rejects an empty name', () => {
    const result = validateWorkoutTemplate({ name: '  ', exerciseBlocks: [block()], tags: [] })
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.field === 'name')).toBe(true)
  })

  it('rejects an empty block list', () => {
    const result = validateWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [], tags: [] })
    expect(result.ok).toBe(false)
  })

  it('rejects duplicated block ids', () => {
    const b1 = block()
    const b2 = { ...block(), id: b1.id }
    const result = validateWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [b1, b2], tags: [] })
    expect(result.ok).toBe(false)
  })

  it('rejects RIR/RPE out of range', () => {
    const b = block()
    b.exercise.rir = 15
    const result = validateWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [b], tags: [] })
    expect(result.ok).toBe(false)
  })

  it('accepts a valid template', () => {
    const result = validateWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [block()], tags: ['peito'] })
    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe('saveWorkoutTemplate', () => {
  it('creates a template with version 1', () => {
    const result = saveWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [block()], tags: [] })
    expect(result.ok).toBe(true)
    expect(result.template?.version).toBe(1)
    expect(result.template?.isArchived).toBe(false)
    expect(getWorkoutTemplates()).toHaveLength(1)
  })

  it('rejects invalid input and does not persist', () => {
    const result = saveWorkoutTemplate({ name: '', exerciseBlocks: [], tags: [] })
    expect(result.ok).toBe(false)
    expect(getWorkoutTemplates()).toHaveLength(0)
  })

  it('normalizes and dedupes tags', () => {
    const result = saveWorkoutTemplate({
      name: 'Treino A',
      exerciseBlocks: [block()],
      tags: [' Peito ', 'peito', 'Costas'],
    })
    expect(result.template?.tags).toEqual(['Peito', 'Costas'])
  })
})

describe('updateWorkoutTemplate', () => {
  it('increments version and preserves createdAt', () => {
    const created = saveWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [block()], tags: [] }).template!
    const updated = updateWorkoutTemplate(created.id, { name: 'Treino A editado' })
    expect(updated.ok).toBe(true)
    expect(updated.template?.version).toBe(2)
    expect(updated.template?.createdAt).toBe(created.createdAt)
    expect(updated.template?.name).toBe('Treino A editado')
  })

  it('does not affect a previously captured snapshot object', () => {
    const created = saveWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [block()], tags: [] }).template!
    const snapshotBlocks = JSON.parse(JSON.stringify(created.exerciseBlocks))
    updateWorkoutTemplate(created.id, { exerciseBlocks: [block('Agachamento')] })
    expect(snapshotBlocks[0].exercise.exerciseName).toBe('Supino reto')
  })

  it('fails for unknown id', () => {
    const result = updateWorkoutTemplate('missing', { name: 'X' })
    expect(result.ok).toBe(false)
  })
})

describe('duplicateWorkoutTemplate', () => {
  it('creates an independent copy with new ids and version 1', () => {
    const original = saveWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [block()], tags: ['x'] }).template!
    const copy = duplicateWorkoutTemplate(original.id)!
    expect(copy.id).not.toBe(original.id)
    expect(copy.name).toBe('Treino A (Cópia)')
    expect(copy.sourceTemplateId).toBe(original.id)
    expect(copy.version).toBe(1)
    expect(copy.exerciseBlocks[0].id).not.toBe(original.exerciseBlocks[0].id)
    expect(getWorkoutTemplates()).toHaveLength(2)
  })

  it('returns null for unknown id', () => {
    expect(duplicateWorkoutTemplate('missing')).toBeNull()
  })
})

describe('archive / restore', () => {
  it('archives and restores a template without losing data', () => {
    const created = saveWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [block()], tags: [] }).template!
    const archived = archiveWorkoutTemplate(created.id)
    expect(archived.ok).toBe(true)
    expect(getActiveWorkoutTemplates()).toHaveLength(0)
    expect(getArchivedWorkoutTemplates()).toHaveLength(1)

    const restored = restoreWorkoutTemplate(created.id)
    expect(restored?.isArchived).toBe(false)
    expect(getActiveWorkoutTemplates()).toHaveLength(1)
  })

  it('rejects double archiving', () => {
    const created = saveWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [block()], tags: [] }).template!
    archiveWorkoutTemplate(created.id)
    const second = archiveWorkoutTemplate(created.id)
    expect(second.ok).toBe(false)
  })
})

describe('toggleWorkoutTemplateFavorite', () => {
  it('toggles favorite state', () => {
    const created = saveWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [block()], tags: [] }).template!
    const toggled = toggleWorkoutTemplateFavorite(created.id)
    expect(toggled?.isFavorite).toBe(true)
    const toggledAgain = toggleWorkoutTemplateFavorite(created.id)
    expect(toggledAgain?.isFavorite).toBe(false)
  })
})

describe('deleteWorkoutTemplate', () => {
  it('deletes when not in use', () => {
    const created = saveWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [block()], tags: [] }).template!
    const result = deleteWorkoutTemplate(created.id, false)
    expect(result.ok).toBe(true)
    expect(getWorkoutTemplateById(created.id)).toBeNull()
  })

  it('refuses to delete when in use', () => {
    const created = saveWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [block()], tags: [] }).template!
    const result = deleteWorkoutTemplate(created.id, true)
    expect(result.ok).toBe(false)
    expect(getWorkoutTemplateById(created.id)).not.toBeNull()
  })
})

describe('createTemplateFromWorkout', () => {
  it('builds a template from a workout-like structure without history fields', () => {
    const result = createTemplateFromWorkout({
      name: 'Treino do histórico',
      estimatedMinutes: 45,
      exercises: [{ exerciseId: 'ex-1', exerciseName: 'Remada', targetSets: 3, targetReps: 10 }],
    })
    expect(result.ok).toBe(true)
    expect(result.template?.exerciseBlocks).toHaveLength(1)
    expect(result.template?.exerciseBlocks[0].exercise.exerciseName).toBe('Remada')
    expect(result.template?.version).toBe(1)
  })
})

describe('exportWorkoutTemplateMarkdown', () => {
  it('includes name and exercise list', () => {
    const created = saveWorkoutTemplate({
      name: 'Treino A',
      exerciseBlocks: [block()],
      tags: [],
      objective: 'strength',
    }).template!
    const md = exportWorkoutTemplateMarkdown(created)
    expect(md).toContain('# Treino A')
    expect(md).toContain('Supino reto')
    expect(md).toContain('4 séries')
  })
})

describe('import / reset', () => {
  it('imports valid templates and skips invalid/duplicate ones', () => {
    const created = saveWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [block()], tags: [] }).template!
    const result = importWorkoutTemplates([created, { bad: true }, created])
    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(3)

    resetWorkoutTemplates()
    const fresh = importWorkoutTemplates([created, { bad: true }])
    expect(fresh.imported).toBe(1)
    expect(fresh.skipped).toBe(1)
    expect(getWorkoutTemplates()).toHaveLength(1)
  })

  it('reset clears all templates', () => {
    saveWorkoutTemplate({ name: 'Treino A', exerciseBlocks: [block()], tags: [] })
    resetWorkoutTemplates()
    expect(getWorkoutTemplates()).toHaveLength(0)
  })
})
