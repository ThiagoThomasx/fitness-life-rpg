// Metas de treino — Sprint 18 (escopo reduzido) + Sprint 18.1a (novos tipos +
// motor de conclusão automática, sem integração com ciclo/planner/sessão).
// Só persiste o que não pode ser derivado: identidade, alvo e status da meta.
// Progresso, marcos e projeção são sempre recalculados por
// `training-goal-progress.ts`/`training-goal-milestones.ts` a partir do histórico já existente.
//
// Modelo permanece um tipo único com campos opcionais por tipo (não é union
// discriminada) — decisão da Sprint 18.1a documentada no CHANGELOG: uma
// migração completa arriscaria tocar a lógica já validada dos 5 tipos
// originais. `validateGoalInput`/`createGoal` funcionam como validadores
// discriminados sobre esse modelo único.
//
// Tipos suportados: exercise_weight, exercise_reps, estimated_1rm,
// weekly_sessions, consistency (Sprint 18) + weekly_volume, cycle_completion,
// personal_record, custom (Sprint 18.1a). Vínculo genérico com ciclo
// (Fase 15), transferência e integração com Planner/sessão/Insights/Perfil
// ficam para sub-sprints futuras.

const GOALS_KEY = 'lrpg-fit:training-goals'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrainingGoalStatus = 'active' | 'paused' | 'completed' | 'archived'

export type TrainingGoalType =
  | 'exercise_weight'
  | 'exercise_reps'
  | 'estimated_1rm'
  | 'weekly_sessions'
  | 'consistency'
  | 'weekly_volume'
  | 'cycle_completion'
  | 'personal_record'
  | 'custom'

export type PersonalRecordType = 'weight' | 'reps' | 'estimated_1rm' | 'volume'

export const TRAINING_GOAL_TYPE_LABELS: Record<TrainingGoalType, string> = {
  exercise_weight: 'Carga em exercício',
  exercise_reps: 'Repetições em exercício',
  estimated_1rm: '1RM estimado',
  weekly_sessions: 'Frequência semanal',
  consistency: 'Consistência',
  weekly_volume: 'Volume semanal',
  cycle_completion: 'Conclusão de ciclo',
  personal_record: 'Recorde pessoal',
  custom: 'Personalizada',
}

export const PERSONAL_RECORD_TYPE_LABELS: Record<PersonalRecordType, string> = {
  weight: 'Carga',
  reps: 'Repetições',
  estimated_1rm: '1RM estimado',
  volume: 'Volume',
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

  // weekly_volume: alvo de volume semanal (kg) e se as semanas devem ser
  // consecutivas (em vez de acumuladas em qualquer ordem). Reusa targetWeeks.
  targetWeeklyVolumeKg?: number
  consecutiveWeeks?: boolean

  // cycle_completion: ciclo específico que esta meta acompanha. Não é o
  // vínculo genérico meta↔ciclo (Fase 15, fora de escopo) — só existe para
  // este tipo de meta.
  cycleId?: string

  // personal_record: qual tipo de PR conta para esta meta. Reusa exerciseId.
  recordType?: PersonalRecordType

  // custom: progresso manual (0–100), definido pelo usuário via "Marcar progresso".
  manualProgressPercentage?: number

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
  targetWeeklyVolumeKg?: number
  consecutiveWeeks?: boolean
  cycleId?: string
  recordType?: PersonalRecordType
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
    value === 'consistency' ||
    value === 'weekly_volume' ||
    value === 'cycle_completion' ||
    value === 'personal_record' ||
    value === 'custom'
  )
}

function isValidRecordType(value: unknown): value is PersonalRecordType {
  return value === 'weight' || value === 'reps' || value === 'estimated_1rm' || value === 'volume'
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

  if (input.type === 'weekly_volume') {
    if (!input.targetWeeklyVolumeKg || input.targetWeeklyVolumeKg <= 0) {
      return 'Informe um volume semanal-alvo maior que zero.'
    }
    if (!input.targetWeeks || input.targetWeeks <= 0 || !Number.isInteger(input.targetWeeks)) {
      return 'Informe uma duração em semanas válida (número inteiro maior que zero).'
    }
  }

  if (input.type === 'cycle_completion' && !input.cycleId) {
    return 'Selecione um ciclo.'
  }

  if (input.type === 'personal_record') {
    if (!input.exerciseId) return 'Selecione um exercício.'
    if (!isValidRecordType(input.recordType)) return 'Selecione o tipo de recorde acompanhado.'
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
    exerciseId: isExerciseGoalType(input.type) || input.type === 'personal_record' ? input.exerciseId : undefined,
    exerciseName: isExerciseGoalType(input.type) || input.type === 'personal_record' ? input.exerciseName : undefined,
    targetValue: input.targetValue,
    targetReps: input.type === 'exercise_reps' ? input.targetReps : undefined,
    targetWeeks:
      input.type === 'weekly_sessions' || input.type === 'consistency' || input.type === 'weekly_volume'
        ? input.targetWeeks
        : undefined,
    baselineValue: input.baselineValue,
    targetWeeklyVolumeKg: input.type === 'weekly_volume' ? input.targetWeeklyVolumeKg : undefined,
    consecutiveWeeks: input.type === 'weekly_volume' ? Boolean(input.consecutiveWeeks) : undefined,
    cycleId: input.type === 'cycle_completion' ? input.cycleId : undefined,
    recordType: input.type === 'personal_record' ? input.recordType : undefined,
    manualProgressPercentage: input.type === 'custom' ? 0 : undefined,
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

/**
 * Progresso manual de metas customizadas — a única forma de avançar uma meta
 * `custom`, já que ela não tem cálculo automático (sem baseline inferido, sem
 * projeção). Não se aplica a nenhum outro tipo.
 */
export function updateGoalManualProgress(id: string, percentage: number): TrainingGoal | null {
  const goals = loadGoals()
  const index = goals.findIndex((g) => g.id === id)
  if (index === -1) return null

  const current = goals[index]
  if (current.type !== 'custom') return null
  if (current.status !== 'active' && current.status !== 'paused') return null

  const clamped = Math.max(0, Math.min(100, Math.round(percentage)))
  const updated: TrainingGoal = { ...current, manualProgressPercentage: clamped, updatedAt: new Date().toISOString() }
  const next = [...goals]
  next[index] = updated
  persistGoals(next)
  return updated
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
