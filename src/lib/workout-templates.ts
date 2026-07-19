// Templates de treino (Sprint 20 — Parte 1).
// Estruturas reutilizáveis de sessão. Nunca prescrevem, nunca são "ideais" —
// só uma forma de reaproveitar uma sequência de exercícios. Editar um
// template não altera snapshots já capturados por programas ou sessões
// planejadas/concluídas (ver training-programs.ts / planned-workouts.ts).

const TEMPLATES_KEY = 'lrpg-fit:workout-templates'

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkoutTemplateObjective =
  | 'strength'
  | 'hypertrophy'
  | 'conditioning'
  | 'mobility'
  | 'recovery'
  | 'technique'
  | 'mixed'
  | 'custom'

export const WORKOUT_TEMPLATE_OBJECTIVE_LABELS: Record<WorkoutTemplateObjective, string> = {
  strength: 'Força',
  hypertrophy: 'Hipertrofia',
  conditioning: 'Condicionamento',
  mobility: 'Mobilidade',
  recovery: 'Recuperação',
  technique: 'Técnica',
  mixed: 'Misto',
  custom: 'Personalizado',
}

export type WorkoutTemplateDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'custom'

export const WORKOUT_TEMPLATE_DIFFICULTY_LABELS: Record<WorkoutTemplateDifficulty, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
  custom: 'Personalizado',
}

export interface WorkoutTemplateExerciseAlternative {
  exerciseId?: string
  exerciseName: string
  notes?: string
}

export interface WorkoutTemplateExercise {
  id: string
  exerciseId?: string
  exerciseName: string
  sets?: number
  reps?: string
  loadKg?: number
  durationSeconds?: number
  distanceMeters?: number
  restSeconds?: number
  rir?: number
  rpe?: number
  tempo?: string
  notes?: string
  alternatives?: WorkoutTemplateExerciseAlternative[]
}

// Só a variante "single" é suportada nesta parte da sprint. Superset/circuit
// ficam documentados aqui como extensão futura (ver WORKOUT-TEMPLATES.md) —
// o discriminante `type` já existe para permitir adicionar variantes sem
// quebrar dados existentes.
export interface WorkoutTemplateSingleExerciseBlock {
  id: string
  type: 'single'
  exercise: WorkoutTemplateExercise
}

export type WorkoutTemplateExerciseBlock = WorkoutTemplateSingleExerciseBlock

export interface WorkoutTemplate {
  id: string
  name: string
  description?: string
  objective?: WorkoutTemplateObjective
  difficulty?: WorkoutTemplateDifficulty
  estimatedDurationMinutes?: number
  exerciseBlocks: WorkoutTemplateExerciseBlock[]
  tags: string[]
  isFavorite: boolean
  isArchived: boolean
  sourceTemplateId?: string
  version: number
  createdAt: string
  updatedAt: string
}

export type NewWorkoutTemplateInput = Omit<
  WorkoutTemplate,
  'id' | 'isFavorite' | 'isArchived' | 'version' | 'createdAt' | 'updatedAt'
> &
  Partial<Pick<WorkoutTemplate, 'isFavorite' | 'isArchived'>>

const MAX_TAGS = 8
const MAX_TAG_LENGTH = 24

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadTemplates(): WorkoutTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(TEMPLATES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WorkoutTemplate[]
    return parsed.map((t) => ({ ...t, tags: t.tags ?? [], exerciseBlocks: t.exerciseBlocks ?? [] }))
  } catch {
    return []
  }
}

function persistTemplates(templates: WorkoutTemplate[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
  } catch {
    // Storage unavailable — silently skip
  }
}

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const raw of tags) {
    const tag = raw.trim().slice(0, MAX_TAG_LENGTH)
    if (!tag || seen.has(tag.toLowerCase())) continue
    seen.add(tag.toLowerCase())
    normalized.push(tag)
    if (normalized.length >= MAX_TAGS) break
  }
  return normalized
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface WorkoutTemplateValidationError {
  field: string
  message: string
}

export interface WorkoutTemplateValidationResult {
  ok: boolean
  errors: WorkoutTemplateValidationError[]
}

export function validateWorkoutTemplate(
  input: Pick<WorkoutTemplate, 'name' | 'exerciseBlocks' | 'tags'>
): WorkoutTemplateValidationResult {
  const errors: WorkoutTemplateValidationError[] = []

  if (!input.name || !input.name.trim()) {
    errors.push({ field: 'name', message: 'Informe um nome para o template.' })
  }

  if (!Array.isArray(input.exerciseBlocks) || input.exerciseBlocks.length === 0) {
    errors.push({ field: 'exerciseBlocks', message: 'Adicione ao menos um exercício.' })
  } else {
    const blockIds = new Set<string>()
    input.exerciseBlocks.forEach((block, index) => {
      if (!block.id) {
        errors.push({ field: `exerciseBlocks[${index}].id`, message: 'Bloco sem identificador.' })
      } else if (blockIds.has(block.id)) {
        errors.push({ field: `exerciseBlocks[${index}].id`, message: 'IDs de bloco duplicados.' })
      } else {
        blockIds.add(block.id)
      }

      if (!block.exercise?.exerciseName?.trim()) {
        errors.push({ field: `exerciseBlocks[${index}].exercise`, message: 'Exercício sem nome.' })
      }
      if (block.exercise?.sets !== undefined && block.exercise.sets < 1) {
        errors.push({ field: `exerciseBlocks[${index}].exercise.sets`, message: 'Séries devem ser positivas.' })
      }
      if (block.exercise?.restSeconds !== undefined && block.exercise.restSeconds < 0) {
        errors.push({ field: `exerciseBlocks[${index}].exercise.restSeconds`, message: 'Descanso não pode ser negativo.' })
      }
      if (block.exercise?.loadKg !== undefined && block.exercise.loadKg < 0) {
        errors.push({ field: `exerciseBlocks[${index}].exercise.loadKg`, message: 'Carga não pode ser negativa.' })
      }
      if (block.exercise?.rir !== undefined && (block.exercise.rir < 0 || block.exercise.rir > 10)) {
        errors.push({ field: `exerciseBlocks[${index}].exercise.rir`, message: 'RIR deve estar entre 0 e 10.' })
      }
      if (block.exercise?.rpe !== undefined && (block.exercise.rpe < 0 || block.exercise.rpe > 10)) {
        errors.push({ field: `exerciseBlocks[${index}].exercise.rpe`, message: 'RPE deve estar entre 0 e 10.' })
      }
      block.exercise?.alternatives?.forEach((alt, altIndex) => {
        if (!alt.exerciseName?.trim()) {
          errors.push({
            field: `exerciseBlocks[${index}].exercise.alternatives[${altIndex}]`,
            message: 'Alternativa sem nome.',
          })
        }
      })
    })
  }

  if (input.tags && input.tags.length > MAX_TAGS) {
    errors.push({ field: 'tags', message: `No máximo ${MAX_TAGS} tags.` })
  }

  return { ok: errors.length === 0, errors }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getWorkoutTemplates(): WorkoutTemplate[] {
  return loadTemplates().sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))
}

export function getActiveWorkoutTemplates(): WorkoutTemplate[] {
  return getWorkoutTemplates().filter((t) => !t.isArchived)
}

export function getArchivedWorkoutTemplates(): WorkoutTemplate[] {
  return getWorkoutTemplates().filter((t) => t.isArchived)
}

export function getWorkoutTemplateById(id: string): WorkoutTemplate | null {
  return loadTemplates().find((t) => t.id === id) ?? null
}

export interface SaveWorkoutTemplateResult {
  ok: boolean
  template?: WorkoutTemplate
  errors?: WorkoutTemplateValidationError[]
}

export function saveWorkoutTemplate(input: NewWorkoutTemplateInput): SaveWorkoutTemplateResult {
  const tags = normalizeTags(input.tags ?? [])
  const validation = validateWorkoutTemplate({ name: input.name, exerciseBlocks: input.exerciseBlocks, tags })
  if (!validation.ok) return { ok: false, errors: validation.errors }

  const now = new Date().toISOString()
  const template: WorkoutTemplate = {
    id: `tpl-${uniqueSuffix()}`,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    objective: input.objective,
    difficulty: input.difficulty,
    estimatedDurationMinutes: input.estimatedDurationMinutes,
    exerciseBlocks: input.exerciseBlocks,
    tags,
    isFavorite: input.isFavorite ?? false,
    isArchived: input.isArchived ?? false,
    sourceTemplateId: input.sourceTemplateId,
    version: 1,
    createdAt: now,
    updatedAt: now,
  }

  const templates = loadTemplates()
  persistTemplates([template, ...templates])
  return { ok: true, template }
}

export type UpdateWorkoutTemplateInput = Partial<
  Pick<
    WorkoutTemplate,
    | 'name'
    | 'description'
    | 'objective'
    | 'difficulty'
    | 'estimatedDurationMinutes'
    | 'exerciseBlocks'
    | 'tags'
    | 'isFavorite'
  >
>

/**
 * Edita um template existente. Isso NUNCA altera programas ou sessões já
 * criados a partir dele — eles guardam snapshot próprio. `version` é
 * incrementado para que a UI possa avisar "alterações valem só para os
 * próximos usos".
 */
export function updateWorkoutTemplate(id: string, input: UpdateWorkoutTemplateInput): SaveWorkoutTemplateResult {
  const templates = loadTemplates()
  const index = templates.findIndex((t) => t.id === id)
  if (index === -1) return { ok: false, errors: [{ field: 'id', message: 'Template não encontrado.' }] }

  const current = templates[index]
  const tags = input.tags ? normalizeTags(input.tags) : current.tags
  const exerciseBlocks = input.exerciseBlocks ?? current.exerciseBlocks
  const name = input.name !== undefined ? input.name : current.name

  const validation = validateWorkoutTemplate({ name, exerciseBlocks, tags })
  if (!validation.ok) return { ok: false, errors: validation.errors }

  const updated: WorkoutTemplate = {
    ...current,
    ...input,
    name: name.trim(),
    tags,
    exerciseBlocks,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
  }

  const next = [...templates]
  next[index] = updated
  persistTemplates(next)
  return { ok: true, template: updated }
}

/** Duplica um template — novos IDs em tudo, sem compartilhar referências. */
export function duplicateWorkoutTemplate(id: string): WorkoutTemplate | null {
  const templates = loadTemplates()
  const original = templates.find((t) => t.id === id)
  if (!original) return null

  const now = new Date().toISOString()
  const copy: WorkoutTemplate = {
    ...original,
    id: `tpl-${uniqueSuffix()}`,
    name: `${original.name} (Cópia)`,
    exerciseBlocks: original.exerciseBlocks.map((block) => ({
      ...block,
      id: `${block.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      exercise: {
        ...block.exercise,
        id: `${block.exercise.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        alternatives: block.exercise.alternatives ? [...block.exercise.alternatives] : undefined,
      },
    })),
    tags: [...original.tags],
    sourceTemplateId: original.id,
    version: 1,
    isFavorite: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  }

  persistTemplates([copy, ...templates])
  return copy
}

export interface ArchiveWorkoutTemplateResult {
  ok: boolean
  template?: WorkoutTemplate
  error?: string
}

export function archiveWorkoutTemplate(id: string): ArchiveWorkoutTemplateResult {
  const templates = loadTemplates()
  const index = templates.findIndex((t) => t.id === id)
  if (index === -1) return { ok: false, error: 'Template não encontrado.' }
  if (templates[index].isArchived) return { ok: false, error: 'Template já está arquivado.' }

  const updated: WorkoutTemplate = { ...templates[index], isArchived: true, updatedAt: new Date().toISOString() }
  const next = [...templates]
  next[index] = updated
  persistTemplates(next)
  return { ok: true, template: updated }
}

export function restoreWorkoutTemplate(id: string): WorkoutTemplate | null {
  const templates = loadTemplates()
  const index = templates.findIndex((t) => t.id === id)
  if (index === -1 || !templates[index].isArchived) return null

  const updated: WorkoutTemplate = { ...templates[index], isArchived: false, updatedAt: new Date().toISOString() }
  const next = [...templates]
  next[index] = updated
  persistTemplates(next)
  return updated
}

export function toggleWorkoutTemplateFavorite(id: string): WorkoutTemplate | null {
  const templates = loadTemplates()
  const index = templates.findIndex((t) => t.id === id)
  if (index === -1) return null

  const updated: WorkoutTemplate = {
    ...templates[index],
    isFavorite: !templates[index].isFavorite,
    updatedAt: new Date().toISOString(),
  }
  const next = [...templates]
  next[index] = updated
  persistTemplates(next)
  return updated
}

/**
 * Exclusão definitiva. Só é permitida quando `isTemplateInUse` (calculado
 * pelo chamador a partir de training-programs.ts) for false — snapshots já
 * capturados por programas continuam intactos de qualquer forma, mas o
 * arquivamento é preferido para impedir novos usos sem perder o histórico.
 */
export function deleteWorkoutTemplate(id: string, isInUse: boolean): { ok: boolean; error?: string } {
  if (isInUse) {
    return { ok: false, error: 'Este template já foi usado em programas ou sessões. Arquive-o em vez de excluir.' }
  }
  persistTemplates(loadTemplates().filter((t) => t.id !== id))
  return { ok: true }
}

/**
 * Transforma um treino (customizado ou concluído) em template novo. Não
 * copia status de conclusão, timestamps históricos, volume calculado ou PRs
 * — só a estrutura reutilizável.
 */
export function createTemplateFromWorkout(source: {
  name: string
  estimatedMinutes?: number
  exercises: Array<{
    exerciseId?: string
    exerciseName: string
    targetSets?: number | null
    targetReps?: number | string | null
    targetWeightKg?: number | null
    targetDurationSecs?: number | null
  }>
}): SaveWorkoutTemplateResult {
  const exerciseBlocks: WorkoutTemplateExerciseBlock[] = source.exercises.map((ex, index) => ({
    id: `blk-${Date.now()}-${index}`,
    type: 'single',
    exercise: {
      id: `ex-${Date.now()}-${index}`,
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      sets: ex.targetSets ?? undefined,
      reps: ex.targetReps !== null && ex.targetReps !== undefined ? String(ex.targetReps) : undefined,
      loadKg: ex.targetWeightKg ?? undefined,
      durationSeconds: ex.targetDurationSecs ?? undefined,
    },
  }))

  return saveWorkoutTemplate({
    name: source.name,
    estimatedDurationMinutes: source.estimatedMinutes,
    exerciseBlocks,
    tags: [],
  })
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function exportWorkoutTemplateMarkdown(template: WorkoutTemplate): string {
  const lines: string[] = [`# ${template.name}`, '']
  if (template.objective) {
    lines.push('## Objetivo', '', WORKOUT_TEMPLATE_OBJECTIVE_LABELS[template.objective], '')
  }
  if (template.description) {
    lines.push(template.description, '')
  }
  lines.push('## Exercícios', '')
  template.exerciseBlocks.forEach((block, index) => {
    const ex = block.exercise
    lines.push(`${index + 1}. ${ex.exerciseName}`)
    if (ex.sets) lines.push(`   - ${ex.sets} séries`)
    if (ex.reps) lines.push(`   - ${ex.reps} repetições`)
    if (ex.loadKg) lines.push(`   - ${ex.loadKg}kg`)
    if (ex.restSeconds) lines.push(`   - ${ex.restSeconds}s de descanso`)
    if (ex.notes) lines.push(`   - Nota: ${ex.notes}`)
  })
  return lines.join('\n')
}

// ─── Backup / Import ──────────────────────────────────────────────────────────

function isValidTemplate(raw: unknown): raw is WorkoutTemplate {
  if (typeof raw !== 'object' || raw === null) return false
  const t = raw as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    t.id.length > 0 &&
    typeof t.name === 'string' &&
    Array.isArray(t.exerciseBlocks) &&
    Array.isArray(t.tags) &&
    typeof t.version === 'number' &&
    typeof t.createdAt === 'string' &&
    typeof t.updatedAt === 'string'
  )
}

export function importWorkoutTemplates(raw: unknown[]): { imported: number; skipped: number } {
  if (!Array.isArray(raw)) return { imported: 0, skipped: 0 }
  const existing = loadTemplates()
  const existingIds = new Set(existing.map((t) => t.id))
  const toAdd: WorkoutTemplate[] = []
  let imported = 0
  let skipped = 0

  for (const item of raw) {
    if (isValidTemplate(item) && !existingIds.has(item.id)) {
      toAdd.push(item)
      existingIds.add(item.id)
      imported++
    } else {
      skipped++
    }
  }

  if (toAdd.length > 0) {
    persistTemplates([...toAdd, ...existing])
  }
  return { imported, skipped }
}

export function resetWorkoutTemplates(): void {
  persistTemplates([])
}
