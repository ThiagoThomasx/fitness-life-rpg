// Revisões de ciclo (percepção subjetiva) — Sprint 17.1.
// Persiste apenas o input do usuário; nunca recalcula ou armazena métricas —
// aquilo continua vindo de `training-cycle-summary.ts`.

const CYCLE_REVIEWS_KEY = 'lrpg-fit:cycle-reviews'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CycleReviewPhase = 'mid_cycle' | 'end_cycle' | 'manual'

export type ReviewScale = 1 | 2 | 3 | 4 | 5

export interface CycleReview {
  id: string
  cycleId: string

  phase: CycleReviewPhase
  createdAt: string

  perceivedProgress?: ReviewScale
  perceivedRecovery?: ReviewScale
  satisfaction?: ReviewScale

  notes?: string
}

export interface NewCycleReviewInput {
  cycleId: string
  phase: CycleReviewPhase
  perceivedProgress?: ReviewScale
  perceivedRecovery?: ReviewScale
  satisfaction?: ReviewScale
  notes?: string
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadReviews(): CycleReview[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CYCLE_REVIEWS_KEY)
    return raw ? (JSON.parse(raw) as CycleReview[]) : []
  } catch {
    return []
  }
}

function persistReviews(reviews: CycleReview[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CYCLE_REVIEWS_KEY, JSON.stringify(reviews))
  } catch {
    // Storage unavailable — silently skip
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidPhase(value: unknown): value is CycleReviewPhase {
  return value === 'mid_cycle' || value === 'end_cycle' || value === 'manual'
}

function isValidScale(value: unknown): value is ReviewScale {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5
}

function isValidReview(raw: unknown): raw is CycleReview {
  if (typeof raw !== 'object' || raw === null) return false
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || r.id.length === 0) return false
  if (typeof r.cycleId !== 'string' || r.cycleId.length === 0) return false
  if (!isValidPhase(r.phase)) return false
  if (typeof r.createdAt !== 'string') return false
  if (r.perceivedProgress !== undefined && !isValidScale(r.perceivedProgress)) return false
  if (r.perceivedRecovery !== undefined && !isValidScale(r.perceivedRecovery)) return false
  if (r.satisfaction !== undefined && !isValidScale(r.satisfaction)) return false
  if (r.notes !== undefined && typeof r.notes !== 'string') return false
  return true
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getCycleReviews(): CycleReview[] {
  return loadReviews()
}

export function getReviewsByCycle(cycleId: string): CycleReview[] {
  return loadReviews()
    .filter((r) => r.cycleId === cycleId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function getReviewById(id: string): CycleReview | null {
  return loadReviews().find((r) => r.id === id) ?? null
}

export interface CreateReviewResult {
  ok: boolean
  review?: CycleReview
  error?: string
}

export function createCycleReview(input: NewCycleReviewInput): CreateReviewResult {
  if (!input.cycleId) {
    return { ok: false, error: 'Ciclo inválido.' }
  }

  const review: CycleReview = {
    id: `review-${Date.now()}`,
    cycleId: input.cycleId,
    phase: input.phase,
    createdAt: new Date().toISOString(),
    perceivedProgress: input.perceivedProgress,
    perceivedRecovery: input.perceivedRecovery,
    satisfaction: input.satisfaction,
    notes: input.notes?.trim() || undefined,
  }

  persistReviews([review, ...loadReviews()])
  return { ok: true, review }
}

export function updateCycleReview(
  id: string,
  patch: Partial<Pick<CycleReview, 'perceivedProgress' | 'perceivedRecovery' | 'satisfaction' | 'notes'>>
): CycleReview | null {
  const reviews = loadReviews()
  const index = reviews.findIndex((r) => r.id === id)
  if (index === -1) return null

  const updated: CycleReview = { ...reviews[index], ...patch }
  if (!isValidReview(updated)) return null

  const next = [...reviews]
  next[index] = updated
  persistReviews(next)
  return updated
}

export function deleteCycleReview(id: string): boolean {
  const reviews = loadReviews()
  const next = reviews.filter((r) => r.id !== id)
  if (next.length === reviews.length) return false
  persistReviews(next)
  return true
}

/**
 * Verdadeiro quando o ciclo tem duração planejada, já passou de
 * aproximadamente metade do trajeto e ainda não tem uma revisão de
 * meio de ciclo registrada. Não bloqueia o ciclo — é só um convite.
 */
export function isMidCycleReviewAvailable(
  plannedWeeks: number | undefined,
  completedWeeks: number,
  reviews: CycleReview[]
): boolean {
  if (!plannedWeeks || plannedWeeks < 2) return false
  const halfway = Math.ceil(plannedWeeks / 2)
  if (completedWeeks < halfway) return false
  return !reviews.some((r) => r.phase === 'mid_cycle')
}

export function importCycleReviews(raw: unknown[]): { imported: number; skipped: number } {
  if (!Array.isArray(raw)) return { imported: 0, skipped: 0 }
  const existing = loadReviews()
  const existingIds = new Set(existing.map((r) => r.id))
  let imported = 0
  let skipped = 0
  const toAdd: CycleReview[] = []

  for (const item of raw) {
    if (isValidReview(item) && !existingIds.has(item.id)) {
      toAdd.push(item)
      existingIds.add(item.id)
      imported++
    } else {
      skipped++
    }
  }

  if (toAdd.length > 0) {
    persistReviews([...toAdd, ...existing])
  }
  return { imported, skipped }
}
