// Planner mínimo (Sprint 20 — Parte 1).
// Antes desta sprint não existia nenhuma agenda persistida de "qual treino
// em qual dia" — /plano era só metas/campanhas/ciclos. Este módulo é a
// fundação necessária para instanciar programas (program-instantiation.ts).
// Escopo desta parte: só estrutura de dados + listagem por data. Sem
// execução real de treino a partir daqui, sem drag-and-drop, sem
// calendário complexo — isso fica para partes futuras da Sprint 20.

import type { WorkoutTemplateSnapshot } from './training-programs'
import type { TrainingBlockObjective } from './training-blocks'

export type { WorkoutTemplateSnapshot }

const PLANNED_WORKOUTS_KEY = 'lrpg-fit:planned-workouts'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlannedWorkoutStatus = 'pending' | 'done' | 'skipped' | 'cancelled'

/** Motivos descritivos e opcionais — nunca usados para julgar ou recomendar (Fase 9). */
export type SkippedWorkoutReason =
  | 'schedule'
  | 'recovery'
  | 'health'
  | 'travel'
  | 'equipment'
  | 'personal'
  | 'other'

/** Histórico pequeno e explícito — nunca sobrescreve a remarcação anterior (Fase 13). */
export interface PlannedWorkoutReschedule {
  from: string
  to: string
  changedAt: string
  reason?: string
}

/**
 * Metadados de execução — sempre opcionais, nunca duplicam o `status` (Fase 4).
 * `status` continua a única fonte de verdade sobre o estado atual da sessão.
 */
export interface PlannedWorkoutExecution {
  completedWorkoutId?: string
  completedAt?: string
  skippedAt?: string
  skippedReason?: SkippedWorkoutReason
  skippedNote?: string
  cancelledAt?: string
  cancellationReason?: string
  reschedules?: PlannedWorkoutReschedule[]
  updatedAt: string
}

/** Origem opcional para analytics — nunca é dependência viva (Fase 42/43). */
export interface PlannedWorkoutSource {
  programId?: string
  programVersion?: number
  programWeekId?: string
  programWeekNumber?: number
  trainingBlockId?: string
  trainingBlockObjective?: TrainingBlockObjective
  templateId?: string
  templateVersion?: number
}

export interface PlannedWorkout {
  id: string
  date: string // YYYY-MM-DD
  weekday: number // 0-6, 0=domingo
  name: string
  templateSnapshot: WorkoutTemplateSnapshot
  source?: PlannedWorkoutSource
  status: PlannedWorkoutStatus
  isOptional: boolean
  /** Sprint 20 Parte 2 — marcação estrutural, nunca prescrita automaticamente. */
  isDeload?: boolean
  notes?: string
  /** Sprint 20 Parte 3A — opcional, compatível com sessões planejadas antigas. */
  execution?: PlannedWorkoutExecution
  createdAt: string
  updatedAt: string
}

export type NewPlannedWorkoutInput = Pick<
  PlannedWorkout,
  'date' | 'weekday' | 'name' | 'templateSnapshot' | 'source' | 'isOptional' | 'isDeload' | 'notes'
>

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadPlannedWorkouts(): PlannedWorkout[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PLANNED_WORKOUTS_KEY)
    return raw ? (JSON.parse(raw) as PlannedWorkout[]) : []
  } catch {
    return []
  }
}

function persistPlannedWorkouts(items: PlannedWorkout[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PLANNED_WORKOUTS_KEY, JSON.stringify(items))
  } catch {
    // Storage unavailable — silently skip
  }
}

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getPlannedWorkouts(): PlannedWorkout[] {
  return loadPlannedWorkouts().sort((a, b) => a.date.localeCompare(b.date))
}

export function getPlannedWorkoutById(id: string): PlannedWorkout | null {
  return loadPlannedWorkouts().find((p) => p.id === id) ?? null
}

export function getPlannedWorkoutsByDateRange(startDate: string, endDate: string): PlannedWorkout[] {
  return getPlannedWorkouts().filter((p) => p.date >= startDate && p.date <= endDate)
}

export function getPlannedWorkoutsByDate(date: string): PlannedWorkout[] {
  return getPlannedWorkouts().filter((p) => p.date === date)
}

export function savePlannedWorkout(input: NewPlannedWorkoutInput): PlannedWorkout {
  const now = new Date().toISOString()
  const workout: PlannedWorkout = {
    id: `pw-${uniqueSuffix()}`,
    date: input.date,
    weekday: input.weekday,
    name: input.name,
    templateSnapshot: input.templateSnapshot,
    source: input.source,
    status: 'pending',
    isOptional: input.isOptional,
    isDeload: input.isDeload,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  }
  persistPlannedWorkouts([...loadPlannedWorkouts(), workout])
  return workout
}

/** Insere várias sessões de uma vez (instanciação de programa). */
export function savePlannedWorkouts(inputs: NewPlannedWorkoutInput[]): PlannedWorkout[] {
  const now = new Date().toISOString()
  const created = inputs.map(
    (input): PlannedWorkout => ({
      id: `pw-${uniqueSuffix()}-${Math.random().toString(36).slice(2, 6)}`,
      date: input.date,
      weekday: input.weekday,
      name: input.name,
      templateSnapshot: input.templateSnapshot,
      source: input.source,
      status: 'pending',
      isOptional: input.isOptional,
      isDeload: input.isDeload,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    })
  )
  persistPlannedWorkouts([...loadPlannedWorkouts(), ...created])
  return created
}

export function updatePlannedWorkoutStatus(id: string, status: PlannedWorkoutStatus): PlannedWorkout | null {
  const items = loadPlannedWorkouts()
  const index = items.findIndex((p) => p.id === id)
  if (index === -1) return null

  const updated: PlannedWorkout = { ...items[index], status, updatedAt: new Date().toISOString() }
  const next = [...items]
  next[index] = updated
  persistPlannedWorkouts(next)
  return updated
}

function updateExecution(
  workout: PlannedWorkout,
  patch: Partial<PlannedWorkoutExecution>
): PlannedWorkoutExecution {
  return { ...workout.execution, ...patch, updatedAt: new Date().toISOString() }
}

/** Sessão fazia parte do plano mas não foi realizada — nunca é chamada de fracasso na UI (Fase 10). */
export function skipPlannedWorkout(
  id: string,
  reason?: SkippedWorkoutReason,
  note?: string
): PlannedWorkout | null {
  const items = loadPlannedWorkouts()
  const index = items.findIndex((p) => p.id === id)
  if (index === -1) return null

  const now = new Date().toISOString()
  const updated: PlannedWorkout = {
    ...items[index],
    status: 'skipped',
    execution: updateExecution(items[index], { skippedAt: now, skippedReason: reason, skippedNote: note }),
    updatedAt: now,
  }
  const next = [...items]
  next[index] = updated
  persistPlannedWorkouts(next)
  return updated
}

/** Sessão deixou de fazer parte do plano — distinta de pulada (Fase 11). */
export function cancelPlannedWorkout(id: string, reason?: string): PlannedWorkout | null {
  const items = loadPlannedWorkouts()
  const index = items.findIndex((p) => p.id === id)
  if (index === -1) return null

  const now = new Date().toISOString()
  const updated: PlannedWorkout = {
    ...items[index],
    status: 'cancelled',
    execution: updateExecution(items[index], { cancelledAt: now, cancellationReason: reason }),
    updatedAt: now,
  }
  const next = [...items]
  next[index] = updated
  persistPlannedWorkouts(next)
  return updated
}

/** Relata sessões já planejadas na nova data — nunca substitui automaticamente (Fase 14). */
export function checkRescheduleConflict(date: string): PlannedWorkout[] {
  return getPlannedWorkoutsByDate(date)
}

/**
 * Move a sessão para uma nova data, preservando o histórico de remarcações
 * (Fase 12/13). Não cria sessão duplicada e não sobrescreve remarcações
 * anteriores — cada movimento é empilhado em `execution.reschedules`.
 */
export function reschedulePlannedWorkout(
  id: string,
  newDate: string,
  reason?: string
): PlannedWorkout | null {
  const items = loadPlannedWorkouts()
  const index = items.findIndex((p) => p.id === id)
  if (index === -1) return null

  const now = new Date().toISOString()
  const fromDate = items[index].date
  const reschedules = [
    ...(items[index].execution?.reschedules ?? []),
    { from: fromDate, to: newDate, changedAt: now, reason },
  ]
  const updated: PlannedWorkout = {
    ...items[index],
    date: newDate,
    execution: updateExecution(items[index], { reschedules }),
    updatedAt: now,
  }
  const next = [...items]
  next[index] = updated
  persistPlannedWorkouts(next)
  return updated
}

/** Vincula a sessão planejada à sessão concluída correspondente (Fase 5-7). */
export function linkPlannedWorkoutToCompleted(id: string, completedWorkoutId: string): PlannedWorkout | null {
  const items = loadPlannedWorkouts()
  const index = items.findIndex((p) => p.id === id)
  if (index === -1) return null

  const now = new Date().toISOString()
  const updated: PlannedWorkout = {
    ...items[index],
    status: 'done',
    execution: updateExecution(items[index], { completedWorkoutId, completedAt: now }),
    updatedAt: now,
  }
  const next = [...items]
  next[index] = updated
  persistPlannedWorkouts(next)
  return updated
}

/** Remove sessões planejadas num intervalo de datas (usado por "substituir" na instanciação). */
export function deletePlannedWorkoutsInRange(startDate: string, endDate: string): number {
  const items = loadPlannedWorkouts()
  const remaining = items.filter((p) => p.date < startDate || p.date > endDate)
  const removed = items.length - remaining.length
  persistPlannedWorkouts(remaining)
  return removed
}

export function deletePlannedWorkout(id: string): void {
  persistPlannedWorkouts(loadPlannedWorkouts().filter((p) => p.id !== id))
}

// ─── Backup / Import ──────────────────────────────────────────────────────────

function isValidPlannedWorkout(raw: unknown): raw is PlannedWorkout {
  if (typeof raw !== 'object' || raw === null) return false
  const p = raw as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    typeof p.date === 'string' &&
    typeof p.weekday === 'number' &&
    typeof p.name === 'string' &&
    typeof p.templateSnapshot === 'object' &&
    p.templateSnapshot !== null &&
    (p.status === 'pending' || p.status === 'done' || p.status === 'skipped' || p.status === 'cancelled') &&
    typeof p.createdAt === 'string' &&
    typeof p.updatedAt === 'string'
  )
}

export function importPlannedWorkouts(raw: unknown[]): { imported: number; skipped: number } {
  if (!Array.isArray(raw)) return { imported: 0, skipped: 0 }
  const existing = loadPlannedWorkouts()
  const existingIds = new Set(existing.map((p) => p.id))
  const toAdd: PlannedWorkout[] = []
  let imported = 0
  let skipped = 0

  for (const item of raw) {
    if (isValidPlannedWorkout(item) && !existingIds.has(item.id)) {
      toAdd.push(item)
      existingIds.add(item.id)
      imported++
    } else {
      skipped++
    }
  }

  if (toAdd.length > 0) {
    persistPlannedWorkouts([...existing, ...toAdd])
  }
  return { imported, skipped }
}

export function resetPlannedWorkouts(): void {
  persistPlannedWorkouts([])
}
