// Planner mínimo (Sprint 20 — Parte 1).
// Antes desta sprint não existia nenhuma agenda persistida de "qual treino
// em qual dia" — /plano era só metas/campanhas/ciclos. Este módulo é a
// fundação necessária para instanciar programas (program-instantiation.ts).
// Escopo desta parte: só estrutura de dados + listagem por data. Sem
// execução real de treino a partir daqui, sem drag-and-drop, sem
// calendário complexo — isso fica para partes futuras da Sprint 20.

import type { WorkoutTemplateSnapshot } from './training-programs'

export type { WorkoutTemplateSnapshot }

const PLANNED_WORKOUTS_KEY = 'lrpg-fit:planned-workouts'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlannedWorkoutStatus = 'pending' | 'done' | 'skipped'

/** Origem opcional para analytics — nunca é dependência viva (Fase 42/43). */
export interface PlannedWorkoutSource {
  programId?: string
  programVersion?: number
  programWeekId?: string
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
  notes?: string
  createdAt: string
  updatedAt: string
}

export type NewPlannedWorkoutInput = Pick<
  PlannedWorkout,
  'date' | 'weekday' | 'name' | 'templateSnapshot' | 'source' | 'isOptional' | 'notes'
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
    (p.status === 'pending' || p.status === 'done' || p.status === 'skipped') &&
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
