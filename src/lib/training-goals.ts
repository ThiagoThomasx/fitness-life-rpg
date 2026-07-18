// Metas de treino — Sprint 18 (escopo reduzido, confirmado com o usuário).
// Só persiste o que não pode ser derivado: identidade, alvo e status da meta.
// Progresso, marcos e projeção são sempre recalculados por
// `training-goal-progress.ts`/`training-goal-milestones.ts` a partir do histórico já existente.
//
// Tipos suportados nesta sprint: exercise_weight, exercise_reps, estimated_1rm,
// weekly_sessions, consistency. weekly_volume, cycle_completion, personal_record
// e custom ficam para a Sprint 18.1 (junto com integração de ciclo/planner/sessão).

const GOALS_KEY = 'lrpg-fit:training-goals'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrainingGoalStatus = 'active' | 'paused' | 'completed' | 'archived'

export type TrainingGoalType =
  | 'exercise_weight'
  | 'exercise_reps'
  | 'estimated_1rm'
  | 'weekly_sessions'
  | 'consistency'

export const TRAINING_GOAL_TYPE_LABELS: Record<TrainingGoalType, string> = {
  exercise_weight: 'Carga em exercício',
  exercise_reps: 'Repetições em exercício',
  estimated_1rm: '1RM estimado',
  weekly_sessions: 'Frequência semanal',
  consistency: 'Consistência',
}

export interface TrainingGoal {
  id: string
  title: string
  description?: string
  type: TrainingGoalType
  status: TrainingGoalStatus

  createdAt: string
  updatedAt: string
  startDate: string
  targetDate?: string
  completedAt?: string

  // exercise_weight | exercise_reps | estimated_1rm
  exerciseId?: string
  exerciseName?: string

  // Unidade implícita pelo tipo: kg (weight/1rm), reps (reps), sessões/semana (weekly_sessions/consistency).
  targetValue?: number
  targetReps?: number // só exercise_reps: reps mínimas na carga-alvo
  targetWeeks?: number // só weekly_sessions/consistency: duração da meta

  // Baseline manual opcional — se ausente, o motor de progresso infere.
  baselineValue?: number

  notes?: string
}

export interface NewTrainingGoalInput {
  title: string
  description?: string
  type: TrainingGoalType
  startDate: string
  targetDate?: string
  exerciseId?: string
  exerciseName?: string
  targetValue?: number
  targetReps?: number
  targetWeeks?: number
  baselineValue?: number
  notes?: string
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadGoals(): TrainingGoal[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(GOALS_KEY)
    return raw ? (JSON.parse(raw) as TrainingGoal[]) : []
  } catch {
    return []
  }
}

function persistGoals(goals: TrainingGoal[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
  } catch {
    // Storage unavailable — silently skip
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidType(value: unknown): value is TrainingGoalType {
  return (
    value === 'exercise_weight' ||
    value === 'exercise_reps' ||
    value === 'estimated_1rm' ||
    value === 'weekly_sessions' ||
    value === 'consistency'
  )
}

function isValidStatus(value: unknown): value is TrainingGoalStatus {
  return value === 'active' || value === 'paused' || value === 'completed' || value === 'archived'
}

function isExerciseGoalType(type: TrainingGoalType): boolean {
  return type === 'exercise_weight' || type === 'exercise_reps' || type === 'estimated_1rm'
}

/** Valida os campos exigidos por cada tipo — a UI mostra os erros inline. */
export function validateGoalInput(input: NewTrainingGoalInput): string | null {
  if (!input.title.trim()) return 'Informe um título para a meta.'

  if (isExerciseGoalType(input.type)) {
    if (!input.exerciseId) return 'Selecione um exercício.'
    if (!input.targetValue || input.targetValue <= 0) return 'Informe uma meta de carga maior que zero.'
    if (input.type === 'exercise_reps' && (!input.targetReps || input.targetReps <= 0)) {
      return 'Informe uma meta de repetições maior que zero.'
    }
  }

  if (input.type === 'weekly_sessions' || input.type === 'consistency') {
    if (!input.targetValue || input.targetValue <= 0 || !Number.isInteger(input.targetValue)) {
      return 'Informe uma frequência semanal válida (número inteiro maior que zero).'
    }
    if (!input.targetWeeks || input.targetWeeks <= 0 || !Number.isInteger(input.targetWeeks)) {
      return 'Informe uma duração em semanas válida (número inteiro maior que zero).'
    }
  }

  if (input.targetDate && input.targetDate <= input.startDate) {
    return 'A data-alvo deve ser posterior à data inicial.'
  }

  return null
}

function isValidGoal(raw: unknown): raw is TrainingGoal {
  if (typeof raw !== 'object' || raw === null) return false
  const g = raw as Record<string, unknown>
  return (
    typeof g.id === 'string' &&
    g.id.length > 0 &&
    typeof g.title === 'string' &&
    g.title.trim().length > 0 &&
    isValidType(g.type) &&
    isValidStatus(g.status) &&
    typeof g.startDate === 'string' &&
    typeof g.createdAt === 'string' &&
    typeof g.updatedAt === 'string'
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getTrainingGoals(): TrainingGoal[] {
  return loadGoals()
}

export function getGoalById(id: string): TrainingGoal | null {
  return loadGoals().find((g) => g.id === id) ?? null
}

export function getActiveGoals(): TrainingGoal[] {
  return loadGoals()
    .filter((g) => g.status === 'active')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getPausedGoals(): TrainingGoal[] {
  return loadGoals()
    .filter((g) => g.status === 'paused')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getCompletedGoals(): TrainingGoal[] {
  return loadGoals()
    .filter((g) => g.status === 'completed')
    .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt))
}

export function getArchivedGoals(): TrainingGoal[] {
  return loadGoals()
    .filter((g) => g.status === 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export interface CreateGoalResult {
  ok: boolean
  goal?: TrainingGoal
  error?: string
}

export function createGoal(input: NewTrainingGoalInput): CreateGoalResult {
  const error = validateGoalInput(input)
  if (error) return { ok: false, error }

  const now = new Date().toISOString()
  const goal: TrainingGoal = {
    id: `goal-${Date.now()}`,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    type: input.type,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    startDate: input.startDate,
    targetDate: input.targetDate || undefined,
    exerciseId: isExerciseGoalType(input.type) ? input.exerciseId : undefined,
    exerciseName: isExerciseGoalType(input.type) ? input.exerciseName : undefined,
    targetValue: input.targetValue,
    targetReps: input.type === 'exercise_reps' ? input.targetReps : undefined,
    targetWeeks: input.type === 'weekly_sessions' || input.type === 'consistency' ? input.targetWeeks : undefined,
    baselineValue: input.baselineValue,
    notes: input.notes?.trim() || undefined,
  }

  persistGoals([goal, ...loadGoals()])
  return { ok: true, goal }
}

export function updateGoal(
  id: string,
  patch: Partial<Pick<TrainingGoal, 'title' | 'description' | 'targetDate' | 'targetValue' | 'targetReps' | 'targetWeeks' | 'notes'>>
): TrainingGoal | null {
  const goals = loadGoals()
  const index = goals.findIndex((g) => g.id === id)
  if (index === -1) return null

  const updated: TrainingGoal = { ...goals[index], ...patch, updatedAt: new Date().toISOString() }
  if (!isValidGoal(updated)) return null

  const next = [...goals]
  next[index] = updated
  persistGoals(next)
  return updated
}

function transitionStatus(id: string, allowedFrom: TrainingGoalStatus[], to: TrainingGoalStatus, extra?: Partial<TrainingGoal>): TrainingGoal | null {
  const goals = loadGoals()
  const index = goals.findIndex((g) => g.id === id)
  if (index === -1 || !allowedFrom.includes(goals[index].status)) return null

  const updated: TrainingGoal = { ...goals[index], ...extra, status: to, updatedAt: new Date().toISOString() }
  const next = [...goals]
  next[index] = updated
  persistGoals(next)
  return updated
}

export function pauseGoal(id: string): TrainingGoal | null {
  return transitionStatus(id, ['active'], 'paused')
}

export function resumeGoal(id: string): TrainingGoal | null {
  return transitionStatus(id, ['paused'], 'active')
}

/** Conclusão é sempre manual — o motor de progresso nunca conclui uma meta sozinho. */
export function completeGoal(id: string, notes?: string): TrainingGoal | null {
  const goals = loadGoals()
  const index = goals.findIndex((g) => g.id === id)
  if (index === -1) return null
  const current = goals[index]
  if (current.status !== 'active' && current.status !== 'paused') return null

  const now = new Date().toISOString()
  return transitionStatus(id, ['active', 'paused'], 'completed', {
    completedAt: now,
    notes: notes?.trim() || current.notes,
  })
}

/** Reabrir uma meta concluída exige confirmação explícita da UI. */
export function reopenGoal(id: string): TrainingGoal | null {
  return transitionStatus(id, ['completed'], 'active', { completedAt: undefined })
}

export function archiveGoal(id: string): TrainingGoal | null {
  return transitionStatus(id, ['active', 'paused', 'completed'], 'archived')
}

/** Restaura sempre para pausada — nunca reativa automaticamente. */
export function restoreGoal(id: string): TrainingGoal | null {
  return transitionStatus(id, ['archived'], 'paused')
}

export function importGoals(raw: unknown[]): { imported: number; skipped: number } {
  if (!Array.isArray(raw)) return { imported: 0, skipped: 0 }
  const existing = loadGoals()
  const existingIds = new Set(existing.map((g) => g.id))
  let imported = 0
  let skipped = 0
  const toAdd: TrainingGoal[] = []

  for (const item of raw) {
    if (isValidGoal(item) && !existingIds.has(item.id)) {
      toAdd.push(item)
      existingIds.add(item.id)
      imported++
    } else {
      skipped++
    }
  }

  if (toAdd.length > 0) {
    persistGoals([...toAdd, ...existing])
  }
  return { imported, skipped }
}
