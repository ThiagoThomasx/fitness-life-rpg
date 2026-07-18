// Classificação manual de semanas dentro de um ciclo — Sprint 17.1.
// Puramente analítico: não altera treinos, volume ou recomendações. Uma
// semana sem anotação é implicitamente "normal" e não precisa ser persistida.

import { getWeekStart } from './weekly-plan'

const CYCLE_WEEK_ANNOTATIONS_KEY = 'lrpg-fit:cycle-week-annotations'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CycleWeekType = 'normal' | 'recovery' | 'test' | 'transition'

export const CYCLE_WEEK_TYPE_LABELS: Record<CycleWeekType, string> = {
  normal: 'Normal',
  recovery: 'Recuperação',
  test: 'Teste',
  transition: 'Transição',
}

export interface CycleWeekAnnotation {
  id: string
  cycleId: string
  weekStartDate: string

  type: CycleWeekType
  notes?: string

  createdAt: string
  updatedAt: string
}

export interface UpsertCycleWeekAnnotationInput {
  cycleId: string
  weekStartDate: string
  type: CycleWeekType
  notes?: string
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadAnnotations(): CycleWeekAnnotation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CYCLE_WEEK_ANNOTATIONS_KEY)
    return raw ? (JSON.parse(raw) as CycleWeekAnnotation[]) : []
  } catch {
    return []
  }
}

function persistAnnotations(annotations: CycleWeekAnnotation[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CYCLE_WEEK_ANNOTATIONS_KEY, JSON.stringify(annotations))
  } catch {
    // Storage unavailable — silently skip
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidType(value: unknown): value is CycleWeekType {
  return value === 'normal' || value === 'recovery' || value === 'test' || value === 'transition'
}

function isValidAnnotation(raw: unknown): raw is CycleWeekAnnotation {
  if (typeof raw !== 'object' || raw === null) return false
  const a = raw as Record<string, unknown>
  if (typeof a.id !== 'string' || a.id.length === 0) return false
  if (typeof a.cycleId !== 'string' || a.cycleId.length === 0) return false
  if (typeof a.weekStartDate !== 'string' || a.weekStartDate.length === 0) return false
  if (!isValidType(a.type)) return false
  if (typeof a.createdAt !== 'string') return false
  if (typeof a.updatedAt !== 'string') return false
  if (a.notes !== undefined && typeof a.notes !== 'string') return false
  return true
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getCycleWeekAnnotations(): CycleWeekAnnotation[] {
  return loadAnnotations()
}

export function getAnnotationsByCycle(cycleId: string): CycleWeekAnnotation[] {
  return loadAnnotations()
    .filter((a) => a.cycleId === cycleId)
    .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate))
}

export function getAnnotationForWeek(cycleId: string, weekStartDate: string): CycleWeekAnnotation | null {
  const normalized = getWeekStart(new Date(weekStartDate + 'T00:00:00'))
  return loadAnnotations().find((a) => a.cycleId === cycleId && a.weekStartDate === normalized) ?? null
}

/**
 * Cria ou atualiza a anotação de uma semana (uma por ciclo+semana). Semanas
 * "normal" sem nenhuma nota não precisam ser persistidas — se já não houver
 * anotação existente, o upsert de um "normal" sem notas é ignorado.
 */
export function upsertCycleWeekAnnotation(input: UpsertCycleWeekAnnotationInput): CycleWeekAnnotation | null {
  if (!input.cycleId || !input.weekStartDate) return null

  const normalizedWeek = getWeekStart(new Date(input.weekStartDate + 'T00:00:00'))
  const annotations = loadAnnotations()
  const index = annotations.findIndex((a) => a.cycleId === input.cycleId && a.weekStartDate === normalizedWeek)
  const trimmedNotes = input.notes?.trim() || undefined

  if (index === -1) {
    if (input.type === 'normal' && !trimmedNotes) return null
    const now = new Date().toISOString()
    const created: CycleWeekAnnotation = {
      id: `week-annotation-${Date.now()}`,
      cycleId: input.cycleId,
      weekStartDate: normalizedWeek,
      type: input.type,
      notes: trimmedNotes,
      createdAt: now,
      updatedAt: now,
    }
    persistAnnotations([created, ...annotations])
    return created
  }

  const updated: CycleWeekAnnotation = {
    ...annotations[index],
    type: input.type,
    notes: trimmedNotes,
    updatedAt: new Date().toISOString(),
  }
  const next = [...annotations]
  next[index] = updated
  persistAnnotations(next)
  return updated
}

export function deleteCycleWeekAnnotation(id: string): boolean {
  const annotations = loadAnnotations()
  const next = annotations.filter((a) => a.id !== id)
  if (next.length === annotations.length) return false
  persistAnnotations(next)
  return true
}

export function importCycleWeekAnnotations(raw: unknown[]): { imported: number; skipped: number } {
  if (!Array.isArray(raw)) return { imported: 0, skipped: 0 }
  const existing = loadAnnotations()
  const existingIds = new Set(existing.map((a) => a.id))
  const existingKeys = new Set(existing.map((a) => `${a.cycleId}::${a.weekStartDate}`))
  let imported = 0
  let skipped = 0
  const toAdd: CycleWeekAnnotation[] = []

  for (const item of raw) {
    if (!isValidAnnotation(item)) {
      skipped++
      continue
    }
    const key = `${item.cycleId}::${item.weekStartDate}`
    if (existingIds.has(item.id) || existingKeys.has(key)) {
      skipped++
      continue
    }
    toAdd.push(item)
    existingIds.add(item.id)
    existingKeys.add(key)
    imported++
  }

  if (toAdd.length > 0) {
    persistAnnotations([...toAdd, ...existing])
  }
  return { imported, skipped }
}
