// Adaptive Planning 2.0 — fundação (Sprint 27 Parte 1).
//
// Vocabulário compartilhado por todo o domínio `adaptive-planning/`. Nenhuma
// lógica de negócio aqui — só shapes. O Coach (`src/lib/coach/`) continua a
// única fonte de recomendações; este domínio nunca recalcula sinais, ele só
// traduz uma `CoachRecommendation` já pronta em uma proposta concreta e
// revisável. Nenhuma proposta muta dado nenhum sozinha — ver `execution.ts`.

import type { CoachCategory } from '../coach/types'

// ─── Tipos de proposta ──────────────────────────────────────────────────────

export type AdaptiveProposalType =
  | 'reduce_volume'
  | 'increase_volume'
  | 'reschedule_workout'
  | 'insert_recovery'
  | 'adjust_frequency'
  | 'replace_exercise'
  | 'review_progression'
  | 'maintain_plan'

export type AdaptiveProposalStatus =
  | 'draft'
  | 'reviewing'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'applied'
  | 'failed'

// ─── Alvos ───────────────────────────────────────────────────────────────────
// Toda proposta aponta para exatamente um alvo. O alvo identifica a entidade
// real que seria alterada — nunca uma cópia, sempre um id resolúvel no
// momento da aplicação (ver `applicability.ts`).

export interface ProgramTarget {
  kind: 'program'
  programId: string
  programVersion?: number
  weekId?: string
  weekNumber?: number
}

export interface PlannedWorkoutTarget {
  kind: 'planned_workout'
  plannedWorkoutId: string
  programId?: string
  week?: number
  date: string
}

export interface WorkoutTemplateTarget {
  kind: 'workout_template'
  templateId: string
  templateVersion?: number
}

export interface ExerciseTarget {
  kind: 'exercise'
  plannedWorkoutId: string
  exerciseId?: string
  exerciseName: string
}

export type AdaptiveProposalTarget =
  | ProgramTarget
  | PlannedWorkoutTarget
  | WorkoutTemplateTarget
  | ExerciseTarget

// ─── Snapshots (antes/depois) ────────────────────────────────────────────────
// Compactos por design — só o suficiente para renderizar o diff e para
// validar aplicabilidade depois. Nunca uma cópia do app inteiro.

export interface VolumeChangeExerciseSnapshot {
  exerciseId?: string
  name: string
  sets: number
}

export interface VolumeChangeSnapshot {
  kind: 'volume'
  workoutId: string
  workoutName: string
  totalSets: number
  exercises: VolumeChangeExerciseSnapshot[]
}

export interface ScheduleChangeSnapshot {
  kind: 'schedule'
  plannedWorkoutId: string
  workoutName: string
  date: string
}

export interface FrequencyChangeSnapshot {
  kind: 'frequency'
  programId?: string
  sessionsPerWeek: number
}

export interface ExerciseChangeSnapshot {
  kind: 'exercise'
  plannedWorkoutId: string
  exerciseId?: string
  exerciseName: string
}

/** Usado por `maintain_plan` — não há alteração, então não há nada a comparar. */
export interface NoChangeSnapshot {
  kind: 'none'
}

export type AdaptivePlanSnapshot =
  | VolumeChangeSnapshot
  | ScheduleChangeSnapshot
  | FrequencyChangeSnapshot
  | ExerciseChangeSnapshot
  | NoChangeSnapshot

// ─── Diff engine ─────────────────────────────────────────────────────────────

export type AdaptiveChangeKind =
  | 'set_count'
  | 'exercise_added'
  | 'exercise_removed'
  | 'exercise_replaced'
  | 'date_changed'
  | 'recovery_inserted'
  | 'frequency_changed'
  | 'volume_changed'

export interface AdaptivePlanChange {
  kind: AdaptiveChangeKind
  /** Rótulo legível do alvo específico da mudança (ex.: nome do exercício). */
  target: string
  before: string | number
  after: string | number
  rationale: string
  /** Descrição curta e legível do impacto (ex.: "-3 séries no total"). */
  impact: string
}

// ─── Applicability ───────────────────────────────────────────────────────────

export interface ProposalApplicability {
  applicable: boolean
  reasons: string[]
  warnings: string[]
}

// ─── Proposta ────────────────────────────────────────────────────────────────

export interface AdaptivePlanProposal {
  id: string

  recommendationId: string
  ruleId: string
  category: CoachCategory

  type: AdaptiveProposalType

  target: AdaptiveProposalTarget

  status: AdaptiveProposalStatus

  title: string
  summary: string

  before: AdaptivePlanSnapshot
  after: AdaptivePlanSnapshot

  changes: AdaptivePlanChange[]

  /** Evidência copiada da `CoachRecommendation` de origem — string[], mesmo formato do Coach. */
  evidence: string[]

  createdAt: string
  expiresAt?: string
  reviewedAt?: string
  appliedAt?: string
}

// ─── Execução / Auditoria ────────────────────────────────────────────────────

export interface ProposalExecutionResult {
  success: boolean
  proposalId: string
  changedEntityIds: string[]
  warnings: string[]
  error?: string
}

export type AdaptiveAuditAction = 'created' | 'accepted' | 'rejected' | 'review_later' | 'applied' | 'failed' | 'expired'

export interface AdaptiveAuditEntry {
  id: string
  proposalId: string
  recommendationId: string
  ruleId: string
  action: AdaptiveAuditAction
  targetSummary: string
  changesSummary: string[]
  previousVersion?: number
  newVersion?: number
  result?: 'success' | 'failure'
  errorMessage?: string
  createdAt: string
}
