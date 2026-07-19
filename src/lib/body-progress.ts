// Progresso corporal — Sprint 19 (parte 1: peso, medidas e tendências).
// Domínio separado do Readiness (que cobre bem-estar) — este módulo só trata
// dados físicos opcionais: peso e medidas. Fotos de progresso ficam para uma
// sub-sprint 19.1 (exigem IndexedDB, inexistente no projeto). Nenhuma análise
// aqui classifica corpos, prescreve metas de peso ou infere causalidade —
// tendências vivem em `body-progress-trends.ts`, nunca neste arquivo.

const BODY_PROGRESS_KEY = 'lrpg-fit:body-progress'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomMeasurement {
  id: string
  label: string
  valueCm: number
}

export interface BodyMeasurements {
  waistCm?: number
  abdomenCm?: number
  chestCm?: number
  hipsCm?: number
  rightArmCm?: number
  leftArmCm?: number
  rightThighCm?: number
  leftThighCm?: number
  rightCalfCm?: number
  leftCalfCm?: number
  neckCm?: number
  custom?: CustomMeasurement[]
}

export interface BodyProgressEntry {
  id: string
  recordedAt: string // YYYY-MM-DD

  weightKg?: number
  measurements?: BodyMeasurements
  notes?: string
  cycleId?: string

  createdAt: string
  updatedAt: string
}

export interface NewBodyProgressInput {
  recordedAt: string
  weightKg?: number
  measurements?: BodyMeasurements
  notes?: string
  cycleId?: string
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadEntries(): BodyProgressEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(BODY_PROGRESS_KEY)
    return raw ? (JSON.parse(raw) as BodyProgressEntry[]) : []
  } catch {
    return []
  }
}

function persistEntries(entries: BodyProgressEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(BODY_PROGRESS_KEY, JSON.stringify(entries))
  } catch {
    // Storage unavailable — silently skip
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value + 'T12:00:00').getTime())
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

const MEASUREMENT_FIELDS = [
  'waistCm', 'abdomenCm', 'chestCm', 'hipsCm',
  'rightArmCm', 'leftArmCm', 'rightThighCm', 'leftThighCm',
  'rightCalfCm', 'leftCalfCm', 'neckCm',
] as const

export type MeasurementField = typeof MEASUREMENT_FIELDS[number]

/** Valida entrada de formulário — todos os campos são opcionais, mas os presentes devem ser positivos. */
export function validateBodyProgressInput(input: NewBodyProgressInput): string | null {
  if (!isValidDate(input.recordedAt)) return 'Informe uma data válida.'

  if (input.weightKg !== undefined && !isPositiveNumber(input.weightKg)) {
    return 'O peso deve ser um número maior que zero.'
  }

  if (input.measurements) {
    for (const field of MEASUREMENT_FIELDS) {
      const value = input.measurements[field]
      if (value !== undefined && !isPositiveNumber(value)) {
        return 'As medidas devem ser números maiores que zero.'
      }
    }
    if (input.measurements.custom) {
      for (const custom of input.measurements.custom) {
        if (!custom.label.trim()) return 'Informe um nome para a medida personalizada.'
        if (!isPositiveNumber(custom.valueCm)) return 'A medida personalizada deve ser maior que zero.'
      }
    }
  }

  if (
    input.weightKg === undefined &&
    !input.measurements &&
    !input.notes?.trim()
  ) {
    return 'Informe ao menos o peso, uma medida ou uma observação.'
  }

  return null
}

function isValidMeasurements(value: unknown): value is BodyMeasurements {
  if (typeof value !== 'object' || value === null) return false
  const m = value as Record<string, unknown>
  for (const field of MEASUREMENT_FIELDS) {
    if (field in m && m[field] !== undefined && !isPositiveNumber(m[field])) return false
  }
  if ('custom' in m && m.custom !== undefined) {
    if (!Array.isArray(m.custom)) return false
    for (const c of m.custom) {
      if (typeof c !== 'object' || c === null) return false
      const custom = c as Record<string, unknown>
      if (typeof custom.id !== 'string' || typeof custom.label !== 'string' || !isPositiveNumber(custom.valueCm)) return false
    }
  }
  return true
}

function isValidEntry(raw: unknown): raw is BodyProgressEntry {
  if (typeof raw !== 'object' || raw === null) return false
  const e = raw as Record<string, unknown>
  if (typeof e.id !== 'string' || e.id.length === 0) return false
  if (typeof e.recordedAt !== 'string' || !isValidDate(e.recordedAt)) return false
  if (typeof e.createdAt !== 'string' || typeof e.updatedAt !== 'string') return false
  if (e.weightKg !== undefined && !isPositiveNumber(e.weightKg)) return false
  if (e.measurements !== undefined && !isValidMeasurements(e.measurements)) return false
  return true
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getBodyProgressEntries(): BodyProgressEntry[] {
  return [...loadEntries()].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
}

export function getBodyProgressEntryById(id: string): BodyProgressEntry | null {
  return loadEntries().find((e) => e.id === id) ?? null
}

export interface CreateBodyProgressResult {
  ok: boolean
  entry?: BodyProgressEntry
  error?: string
}

export function createBodyProgressEntry(input: NewBodyProgressInput): CreateBodyProgressResult {
  const error = validateBodyProgressInput(input)
  if (error) return { ok: false, error }

  const now = new Date().toISOString()
  const entry: BodyProgressEntry = {
    id: `body-progress-${Date.now()}`,
    recordedAt: input.recordedAt,
    weightKg: input.weightKg,
    measurements: input.measurements,
    notes: input.notes?.trim() || undefined,
    cycleId: input.cycleId || undefined,
    createdAt: now,
    updatedAt: now,
  }

  persistEntries([entry, ...loadEntries()])
  return { ok: true, entry }
}

export function updateBodyProgressEntry(
  id: string,
  patch: Partial<Pick<BodyProgressEntry, 'recordedAt' | 'weightKg' | 'measurements' | 'notes' | 'cycleId'>>
): BodyProgressEntry | null {
  const entries = loadEntries()
  const index = entries.findIndex((e) => e.id === id)
  if (index === -1) return null

  const updated: BodyProgressEntry = { ...entries[index], ...patch, updatedAt: new Date().toISOString() }
  if (!isValidEntry(updated)) return null

  const next = [...entries]
  next[index] = updated
  persistEntries(next)
  return updated
}

export function deleteBodyProgressEntry(id: string): boolean {
  const entries = loadEntries()
  const next = entries.filter((e) => e.id !== id)
  if (next.length === entries.length) return false
  persistEntries(next)
  return true
}

export function importBodyProgressEntries(raw: unknown[]): { imported: number; skipped: number } {
  if (!Array.isArray(raw)) return { imported: 0, skipped: 0 }
  const existing = loadEntries()
  const existingIds = new Set(existing.map((e) => e.id))
  let imported = 0
  let skipped = 0
  const toAdd: BodyProgressEntry[] = []

  for (const item of raw) {
    if (isValidEntry(item) && !existingIds.has(item.id)) {
      toAdd.push(item)
      existingIds.add(item.id)
      imported++
    } else {
      skipped++
    }
  }

  if (toAdd.length > 0) {
    persistEntries([...toAdd, ...existing])
  }
  return { imported, skipped }
}
