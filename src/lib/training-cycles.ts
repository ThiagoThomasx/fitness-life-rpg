// Ciclos de treino (blocos de várias semanas) — Sprint 17.
// Só persiste o que não pode ser derivado: identidade, meta e status do ciclo.
// Métricas (volume, aderência, PRs, tendência) são sempre recalculadas por
// `training-cycle-summary.ts` a partir do histórico já existente.

const CYCLES_KEY = 'lrpg-fit:training-cycles'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrainingCycleStatus = 'active' | 'completed' | 'archived'

export type TrainingCycleGoal =
  | 'strength'
  | 'hypertrophy'
  | 'consistency'
  | 'technique'
  | 'conditioning'
  | 'general'
  | 'custom'

export const TRAINING_CYCLE_GOAL_LABELS: Record<TrainingCycleGoal, string> = {
  strength: 'Força',
  hypertrophy: 'Hipertrofia',
  consistency: 'Consistência',
  technique: 'Técnica',
  conditioning: 'Condicionamento',
  general: 'Geral',
  custom: 'Personalizado',
}

export interface TrainingCycle {
  id: string
  name: string
  goal: TrainingCycleGoal
  customGoal?: string
  startDate: string
  plannedWeeks?: number
  status: TrainingCycleStatus
  notes?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface NewTrainingCycleInput {
  name: string
  goal: TrainingCycleGoal
  customGoal?: string
  startDate: string
  plannedWeeks?: number
  notes?: string
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadCycles(): TrainingCycle[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CYCLES_KEY)
    return raw ? (JSON.parse(raw) as TrainingCycle[]) : []
  } catch {
    return []
  }
}

function persistCycles(cycles: TrainingCycle[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CYCLES_KEY, JSON.stringify(cycles))
  } catch {
    // Storage unavailable — silently skip
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidGoal(value: unknown): value is TrainingCycleGoal {
  return (
    value === 'strength' ||
    value === 'hypertrophy' ||
    value === 'consistency' ||
    value === 'technique' ||
    value === 'conditioning' ||
    value === 'general' ||
    value === 'custom'
  )
}

function isValidCycle(raw: unknown): raw is TrainingCycle {
  if (typeof raw !== 'object' || raw === null) return false
  const c = raw as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    c.id.length > 0 &&
    typeof c.name === 'string' &&
    c.name.trim().length > 0 &&
    isValidGoal(c.goal) &&
    typeof c.startDate === 'string' &&
    (c.status === 'active' || c.status === 'completed' || c.status === 'archived') &&
    typeof c.createdAt === 'string' &&
    typeof c.updatedAt === 'string'
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getTrainingCycles(): TrainingCycle[] {
  return loadCycles()
}

export function getCycleById(id: string): TrainingCycle | null {
  return loadCycles().find((c) => c.id === id) ?? null
}

export function getActiveCycle(): TrainingCycle | null {
  return loadCycles().find((c) => c.status === 'active') ?? null
}

export function getCompletedCycles(): TrainingCycle[] {
  return loadCycles()
    .filter((c) => c.status === 'completed')
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
}

export function getArchivedCycles(): TrainingCycle[] {
  return loadCycles()
    .filter((c) => c.status === 'archived')
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
}

export interface CreateCycleResult {
  ok: boolean
  cycle?: TrainingCycle
  error?: string
}

/**
 * Cria e ativa um novo ciclo. Recusa se já existir um ciclo ativo — o
 * chamador deve concluir ou o usuário deve confirmar a substituição antes
 * (a UI decide o fluxo; este módulo só garante a invariante).
 */
export function createCycle(input: NewTrainingCycleInput): CreateCycleResult {
  if (getActiveCycle()) {
    return { ok: false, error: 'Já existe um ciclo ativo. Conclua-o antes de iniciar outro.' }
  }
  if (!input.name.trim()) {
    return { ok: false, error: 'Informe um nome para o ciclo.' }
  }

  const now = new Date().toISOString()
  const cycle: TrainingCycle = {
    id: `cycle-${Date.now()}`,
    name: input.name.trim(),
    goal: input.goal,
    customGoal: input.goal === 'custom' ? input.customGoal?.trim() : undefined,
    startDate: input.startDate,
    plannedWeeks: input.plannedWeeks,
    status: 'active',
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  }

  persistCycles([cycle, ...loadCycles()])
  return { ok: true, cycle }
}

export function updateCycle(
  id: string,
  patch: Partial<Pick<TrainingCycle, 'name' | 'goal' | 'customGoal' | 'plannedWeeks' | 'notes'>>
): TrainingCycle | null {
  const cycles = loadCycles()
  const index = cycles.findIndex((c) => c.id === id)
  if (index === -1) return null

  const updated: TrainingCycle = { ...cycles[index], ...patch, updatedAt: new Date().toISOString() }
  if (!isValidCycle(updated)) return null

  const next = [...cycles]
  next[index] = updated
  persistCycles(next)
  return updated
}

/** Encerra o ciclo (antecipadamente ou não) e preserva os dados. */
export function completeCycle(id: string, notes?: string): TrainingCycle | null {
  const cycles = loadCycles()
  const index = cycles.findIndex((c) => c.id === id)
  if (index === -1 || cycles[index].status === 'completed') return null

  const now = new Date().toISOString()
  const updated: TrainingCycle = {
    ...cycles[index],
    status: 'completed',
    completedAt: now,
    updatedAt: now,
    notes: notes?.trim() || cycles[index].notes,
  }

  const next = [...cycles]
  next[index] = updated
  persistCycles(next)
  return updated
}

export interface ArchiveCycleResult {
  ok: boolean
  cycle?: TrainingCycle
  error?: string
}

/**
 * Arquiva um ciclo já concluído — apenas some da lista principal, os dados
 * (sessões, revisões, anotações) continuam intactos e podem ser restaurados.
 * Um ciclo ativo precisa ser encerrado antes de ser arquivado.
 */
export function archiveCycle(id: string): ArchiveCycleResult {
  const cycles = loadCycles()
  const index = cycles.findIndex((c) => c.id === id)
  if (index === -1) return { ok: false, error: 'Ciclo não encontrado.' }
  if (cycles[index].status === 'active') {
    return { ok: false, error: 'Encerre o ciclo antes de arquivá-lo.' }
  }
  if (cycles[index].status === 'archived') return { ok: false, error: 'Ciclo já está arquivado.' }

  const updated: TrainingCycle = { ...cycles[index], status: 'archived', updatedAt: new Date().toISOString() }
  const next = [...cycles]
  next[index] = updated
  persistCycles(next)
  return { ok: true, cycle: updated }
}

/** Restaura um ciclo arquivado de volta para o histórico — nunca reativa automaticamente. */
export function restoreCycle(id: string): TrainingCycle | null {
  const cycles = loadCycles()
  const index = cycles.findIndex((c) => c.id === id)
  if (index === -1 || cycles[index].status !== 'archived') return null

  const updated: TrainingCycle = { ...cycles[index], status: 'completed', updatedAt: new Date().toISOString() }
  const next = [...cycles]
  next[index] = updated
  persistCycles(next)
  return updated
}

export function importCycles(raw: unknown[]): { imported: number; skipped: number } {
  if (!Array.isArray(raw)) return { imported: 0, skipped: 0 }
  const existing = loadCycles()
  const existingIds = new Set(existing.map((c) => c.id))
  let imported = 0
  let skipped = 0
  const toAdd: TrainingCycle[] = []

  for (const item of raw) {
    if (isValidCycle(item) && !existingIds.has(item.id)) {
      toAdd.push(item)
      existingIds.add(item.id)
      imported++
    } else {
      skipped++
    }
  }

  if (toAdd.length > 0) {
    persistCycles([...toAdd, ...existing])
  }
  return { imported, skipped }
}
