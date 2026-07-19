// Programas de treino (Sprint 20 — Parte 1).
// Um programa organiza semanas e sessões, reutilizando templates. Cada
// sessão guarda um snapshot congelado do template usado no momento em que
// foi adicionada — editar o template depois não altera o programa, e editar
// o programa depois não altera nenhuma sessão já instanciada no Planner
// (ver program-instantiation.ts / planned-workouts.ts).

import type { WorkoutTemplate, WorkoutTemplateExerciseBlock } from './workout-templates'
import { getWorkoutTemplateById } from './workout-templates'

const PROGRAMS_KEY = 'lrpg-fit:training-programs'

// ─── Types ────────────────────────────────────────────────────────────────────

// 0=Domingo ... 6=Sábado, mesma convenção usada em preferences.ts (DAY_LABELS)
// para o resto do app — reexportado aqui como fonte única para o domínio de
// templates/programas (Fase 13 do spec).
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}

export interface WorkoutTemplateSnapshot {
  sourceTemplateId?: string
  sourceTemplateVersion?: number
  name: string
  description?: string
  estimatedDurationMinutes?: number
  exerciseBlocks: WorkoutTemplateExerciseBlock[]
  capturedAt: string
}

export interface TrainingProgramSession {
  id: string
  dayIndex?: number
  preferredWeekday?: Weekday
  name: string
  templateId?: string
  templateSnapshot: WorkoutTemplateSnapshot
  isOptional: boolean
  notes?: string
}

export interface TrainingProgramWeek {
  id: string
  weekNumber: number
  name?: string
  notes?: string
  sessions: TrainingProgramSession[]
}

export interface TrainingProgram {
  id: string
  name: string
  description?: string
  objective?: string
  level?: string
  weeks: TrainingProgramWeek[]
  tags: string[]
  isFavorite: boolean
  isArchived: boolean
  sourceProgramId?: string
  version: number
  createdAt: string
  updatedAt: string
}

export type NewTrainingProgramInput = Omit<
  TrainingProgram,
  'id' | 'isFavorite' | 'isArchived' | 'version' | 'createdAt' | 'updatedAt'
> &
  Partial<Pick<TrainingProgram, 'isFavorite' | 'isArchived'>>

const MAX_TAGS = 8
const MAX_TAG_LENGTH = 24

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadPrograms(): TrainingProgram[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PROGRAMS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TrainingProgram[]
    return parsed.map((p) => ({ ...p, tags: p.tags ?? [], weeks: p.weeks ?? [] }))
  } catch {
    return []
  }
}

function persistPrograms(programs: TrainingProgram[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs))
  } catch {
    // Storage unavailable — silently skip
  }
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

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Cópia profunda validada — nunca reutiliza objetos/arrays por referência. */
export function createWorkoutTemplateSnapshot(template: WorkoutTemplate): WorkoutTemplateSnapshot {
  return {
    sourceTemplateId: template.id,
    sourceTemplateVersion: template.version,
    name: template.name,
    description: template.description,
    estimatedDurationMinutes: template.estimatedDurationMinutes,
    exerciseBlocks: JSON.parse(JSON.stringify(template.exerciseBlocks)) as WorkoutTemplateExerciseBlock[],
    capturedAt: new Date().toISOString(),
  }
}

/** Cria um snapshot a partir de um templateId vivo, buscando o template atual. */
export function createSnapshotFromTemplateId(templateId: string): WorkoutTemplateSnapshot | null {
  const template = getWorkoutTemplateById(templateId)
  if (!template) return null
  return createWorkoutTemplateSnapshot(template)
}

function cloneSession(session: TrainingProgramSession, newId: string): TrainingProgramSession {
  return {
    ...session,
    id: newId,
    templateSnapshot: {
      ...session.templateSnapshot,
      exerciseBlocks: JSON.parse(JSON.stringify(session.templateSnapshot.exerciseBlocks)) as WorkoutTemplateExerciseBlock[],
    },
  }
}

function cloneWeek(week: TrainingProgramWeek, weekId: string): TrainingProgramWeek {
  return {
    ...week,
    id: weekId,
    sessions: week.sessions.map((s) => cloneSession(s, `sess-${uniqueSuffix()}`)),
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface TrainingProgramValidationError {
  field: string
  message: string
}

export interface TrainingProgramValidationResult {
  ok: boolean
  errors: TrainingProgramValidationError[]
}

export function validateTrainingProgram(
  input: Pick<TrainingProgram, 'name' | 'weeks' | 'tags'>
): TrainingProgramValidationResult {
  const errors: TrainingProgramValidationError[] = []

  if (!input.name || !input.name.trim()) {
    errors.push({ field: 'name', message: 'Informe um nome para o programa.' })
  }

  if (!Array.isArray(input.weeks)) {
    errors.push({ field: 'weeks', message: 'Estrutura de semanas inválida.' })
  } else {
    const weekIds = new Set<string>()
    const weekNumbers = new Set<number>()
    input.weeks.forEach((week, wIndex) => {
      if (!week.id) {
        errors.push({ field: `weeks[${wIndex}].id`, message: 'Semana sem identificador.' })
      } else if (weekIds.has(week.id)) {
        errors.push({ field: `weeks[${wIndex}].id`, message: 'IDs de semana duplicados.' })
      } else {
        weekIds.add(week.id)
      }

      if (weekNumbers.has(week.weekNumber)) {
        errors.push({ field: `weeks[${wIndex}].weekNumber`, message: 'Números de semana duplicados.' })
      } else {
        weekNumbers.add(week.weekNumber)
      }

      const sessionIds = new Set<string>()
      week.sessions?.forEach((session, sIndex) => {
        if (!session.id) {
          errors.push({ field: `weeks[${wIndex}].sessions[${sIndex}].id`, message: 'Sessão sem identificador.' })
        } else if (sessionIds.has(session.id)) {
          errors.push({ field: `weeks[${wIndex}].sessions[${sIndex}].id`, message: 'IDs de sessão duplicados.' })
        } else {
          sessionIds.add(session.id)
        }

        if (!session.name?.trim()) {
          errors.push({ field: `weeks[${wIndex}].sessions[${sIndex}].name`, message: 'Sessão sem nome.' })
        }

        if (
          session.preferredWeekday !== undefined &&
          (session.preferredWeekday < 0 || session.preferredWeekday > 6)
        ) {
          errors.push({
            field: `weeks[${wIndex}].sessions[${sIndex}].preferredWeekday`,
            message: 'Dia da semana inválido.',
          })
        }

        if (!session.templateSnapshot) {
          errors.push({
            field: `weeks[${wIndex}].sessions[${sIndex}].templateSnapshot`,
            message: 'Sessão sem estrutura de treino (snapshot ausente).',
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

export interface TrainingProgramStructuralAlert {
  weekId: string
  sessionId?: string
  message: string
}

/** Avisos neutros — nunca bloqueiam salvamento, nunca qualificam o programa. */
export function getTrainingProgramStructuralAlerts(
  program: Pick<TrainingProgram, 'weeks'>
): TrainingProgramStructuralAlert[] {
  const alerts: TrainingProgramStructuralAlert[] = []

  for (const week of program.weeks) {
    const byDay = new Map<number, number>()
    let consecutiveFixedDays = 0
    for (const session of week.sessions) {
      if (session.dayIndex !== undefined) {
        byDay.set(session.dayIndex, (byDay.get(session.dayIndex) ?? 0) + 1)
      }
      if (session.templateSnapshot.exerciseBlocks.length === 0) {
        alerts.push({ weekId: week.id, sessionId: session.id, message: 'Uma sessão não possui exercícios.' })
      }
    }
    for (const [, count] of Array.from(byDay)) {
      if (count >= 3) {
        alerts.push({ weekId: week.id, message: `Esta semana possui ${count} sessões no mesmo dia.` })
      }
    }
    const fixedDays = Array.from(byDay.keys()).sort((a, b) => a - b)
    for (let i = 0; i < fixedDays.length; i++) {
      consecutiveFixedDays = i === 0 || fixedDays[i] === fixedDays[i - 1] + 1 ? consecutiveFixedDays + 1 : 1
      if (consecutiveFixedDays >= 5) {
        alerts.push({ weekId: week.id, message: 'Há cinco ou mais dias consecutivos com treino planejado.' })
        break
      }
    }
  }

  return alerts
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getTrainingPrograms(): TrainingProgram[] {
  return loadPrograms().sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))
}

export function getActiveTrainingPrograms(): TrainingProgram[] {
  return getTrainingPrograms().filter((p) => !p.isArchived)
}

export function getArchivedTrainingPrograms(): TrainingProgram[] {
  return getTrainingPrograms().filter((p) => p.isArchived)
}

export function getTrainingProgramById(id: string): TrainingProgram | null {
  return loadPrograms().find((p) => p.id === id) ?? null
}

export interface SaveTrainingProgramResult {
  ok: boolean
  program?: TrainingProgram
  errors?: TrainingProgramValidationError[]
}

export function saveTrainingProgram(input: NewTrainingProgramInput): SaveTrainingProgramResult {
  const tags = normalizeTags(input.tags ?? [])
  const validation = validateTrainingProgram({ name: input.name, weeks: input.weeks, tags })
  if (!validation.ok) return { ok: false, errors: validation.errors }

  const now = new Date().toISOString()
  const program: TrainingProgram = {
    id: `prog-${Date.now()}`,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    objective: input.objective,
    level: input.level,
    weeks: input.weeks,
    tags,
    isFavorite: input.isFavorite ?? false,
    isArchived: input.isArchived ?? false,
    sourceProgramId: input.sourceProgramId,
    version: 1,
    createdAt: now,
    updatedAt: now,
  }

  persistPrograms([program, ...loadPrograms()])
  return { ok: true, program }
}

export type UpdateTrainingProgramInput = Partial<
  Pick<TrainingProgram, 'name' | 'description' | 'objective' | 'level' | 'weeks' | 'tags' | 'isFavorite'>
>

export function updateTrainingProgram(id: string, input: UpdateTrainingProgramInput): SaveTrainingProgramResult {
  const programs = loadPrograms()
  const index = programs.findIndex((p) => p.id === id)
  if (index === -1) return { ok: false, errors: [{ field: 'id', message: 'Programa não encontrado.' }] }

  const current = programs[index]
  const tags = input.tags ? normalizeTags(input.tags) : current.tags
  const weeks = input.weeks ?? current.weeks
  const name = input.name !== undefined ? input.name : current.name

  const validation = validateTrainingProgram({ name, weeks, tags })
  if (!validation.ok) return { ok: false, errors: validation.errors }

  const updated: TrainingProgram = {
    ...current,
    ...input,
    name: name.trim(),
    tags,
    weeks,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
  }

  const next = [...programs]
  next[index] = updated
  persistPrograms(next)
  return { ok: true, program: updated }
}

export function duplicateProgramWeek(programId: string, weekId: string): SaveTrainingProgramResult {
  const programs = loadPrograms()
  const index = programs.findIndex((p) => p.id === programId)
  if (index === -1) return { ok: false, errors: [{ field: 'id', message: 'Programa não encontrado.' }] }

  const program = programs[index]
  const week = program.weeks.find((w) => w.id === weekId)
  if (!week) return { ok: false, errors: [{ field: 'weekId', message: 'Semana não encontrada.' }] }

  const nextWeekNumber = Math.max(...program.weeks.map((w) => w.weekNumber), 0) + 1
  const duplicated = cloneWeek(week, `week-${uniqueSuffix()}`)
  duplicated.weekNumber = nextWeekNumber

  const updatedWeeks = [...program.weeks, duplicated]
  const updated: TrainingProgram = { ...program, weeks: updatedWeeks, version: program.version + 1, updatedAt: new Date().toISOString() }

  const next = [...programs]
  next[index] = updated
  persistPrograms(next)
  return { ok: true, program: updated }
}

export function duplicateTrainingProgram(id: string): TrainingProgram | null {
  const programs = loadPrograms()
  const original = programs.find((p) => p.id === id)
  if (!original) return null

  const now = new Date().toISOString()
  const copy: TrainingProgram = {
    ...original,
    id: `prog-${uniqueSuffix()}`,
    name: `${original.name} (Cópia)`,
    weeks: original.weeks.map((w) => cloneWeek(w, `week-${uniqueSuffix()}`)),
    tags: [...original.tags],
    sourceProgramId: original.id,
    version: 1,
    isFavorite: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  }

  persistPrograms([copy, ...programs])
  return copy
}

export interface ArchiveTrainingProgramResult {
  ok: boolean
  program?: TrainingProgram
  error?: string
}

export function archiveTrainingProgram(id: string): ArchiveTrainingProgramResult {
  const programs = loadPrograms()
  const index = programs.findIndex((p) => p.id === id)
  if (index === -1) return { ok: false, error: 'Programa não encontrado.' }
  if (programs[index].isArchived) return { ok: false, error: 'Programa já está arquivado.' }

  const updated: TrainingProgram = { ...programs[index], isArchived: true, updatedAt: new Date().toISOString() }
  const next = [...programs]
  next[index] = updated
  persistPrograms(next)
  return { ok: true, program: updated }
}

export function restoreTrainingProgram(id: string): TrainingProgram | null {
  const programs = loadPrograms()
  const index = programs.findIndex((p) => p.id === id)
  if (index === -1 || !programs[index].isArchived) return null

  const updated: TrainingProgram = { ...programs[index], isArchived: false, updatedAt: new Date().toISOString() }
  const next = [...programs]
  next[index] = updated
  persistPrograms(next)
  return updated
}

export function toggleTrainingProgramFavorite(id: string): TrainingProgram | null {
  const programs = loadPrograms()
  const index = programs.findIndex((p) => p.id === id)
  if (index === -1) return null

  const updated: TrainingProgram = {
    ...programs[index],
    isFavorite: !programs[index].isFavorite,
    updatedAt: new Date().toISOString(),
  }
  const next = [...programs]
  next[index] = updated
  persistPrograms(next)
  return updated
}

export function deleteTrainingProgram(id: string, isInUse: boolean): { ok: boolean; error?: string } {
  if (isInUse) {
    return { ok: false, error: 'Este programa já foi instanciado no Planner. Arquive-o em vez de excluir.' }
  }
  persistPrograms(loadPrograms().filter((p) => p.id !== id))
  return { ok: true }
}

export function isTemplateUsedInPrograms(templateId: string): boolean {
  return loadPrograms().some((p) =>
    p.weeks.some((w) => w.sessions.some((s) => s.templateId === templateId))
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function exportTrainingProgramMarkdown(program: TrainingProgram): string {
  const lines: string[] = [`# ${program.name}`, '']
  for (const week of [...program.weeks].sort((a, b) => a.weekNumber - b.weekNumber)) {
    lines.push(`## Semana ${week.weekNumber}${week.name ? ` — ${week.name}` : ''}`, '')
    for (const session of week.sessions) {
      const dayLabel =
        session.preferredWeekday !== undefined ? WEEKDAY_LABELS[session.preferredWeekday] : 'Dia flexível'
      lines.push(`### ${dayLabel} — ${session.name}`, '')
      session.templateSnapshot.exerciseBlocks.forEach((block, index) => {
        lines.push(`${index + 1}. ${block.exercise.exerciseName}`)
      })
      lines.push('')
    }
  }
  return lines.join('\n')
}

// ─── Backup / Import ──────────────────────────────────────────────────────────

function isValidProgram(raw: unknown): raw is TrainingProgram {
  if (typeof raw !== 'object' || raw === null) return false
  const p = raw as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    typeof p.name === 'string' &&
    Array.isArray(p.weeks) &&
    Array.isArray(p.tags) &&
    typeof p.version === 'number' &&
    typeof p.createdAt === 'string' &&
    typeof p.updatedAt === 'string'
  )
}

export function importTrainingPrograms(raw: unknown[]): { imported: number; skipped: number } {
  if (!Array.isArray(raw)) return { imported: 0, skipped: 0 }
  const existing = loadPrograms()
  const existingIds = new Set(existing.map((p) => p.id))
  const toAdd: TrainingProgram[] = []
  let imported = 0
  let skipped = 0

  for (const item of raw) {
    if (isValidProgram(item) && !existingIds.has(item.id)) {
      toAdd.push(item)
      existingIds.add(item.id)
      imported++
    } else {
      skipped++
    }
  }

  if (toAdd.length > 0) {
    persistPrograms([...toAdd, ...existing])
  }
  return { imported, skipped }
}

export function resetTrainingPrograms(): void {
  persistPrograms([])
}
