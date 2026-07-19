// Motor de conclusão automática de metas — Sprint 18.1a.
//
// Função pura e somente-leitura: NUNCA persiste nem chama `completeGoal`.
// "Conclusão é sempre manual" continua valendo (ver `training-goals.ts`) —
// este motor só informa ao chamador (uma UI futura, fora de escopo aqui) que
// há evidência suficiente para *sugerir* a conclusão. Reusa o motor de
// progresso (`calculateGoalProgress`) em vez de duplicar a leitura de dados
// brutos, garantindo que as mesmas regras de baseline/janela/timezone valham
// para exibição e para conclusão.

import { calculateGoalProgress } from './training-goal-progress'
import { getCycleById } from './training-cycles'
import type { TrainingGoal } from './training-goals'

export type GoalCompletionEvidenceSource = 'workout' | 'weekly_summary' | 'cycle' | 'personal_record' | 'manual'

export interface GoalCompletionEvidence {
  source: GoalCompletionEvidenceSource
  sourceId?: string
  value?: number
  unit?: string
  recordedAt: string
  description: string
}

export type GoalCompletionReason =
  | 'not_active'
  | 'manual_only'
  | 'evidence_insufficient'
  | 'cycle_completed_before_goal_created'
  | 'evidence_sufficient'

export interface GoalCompletionEvaluation {
  shouldComplete: boolean
  completedAt?: string
  reason: GoalCompletionReason
  evidence?: GoalCompletionEvidence
}

const EXERCISE_VALUE_UNIT: Partial<Record<TrainingGoal['type'], string>> = {
  exercise_weight: 'kg',
  estimated_1rm: 'kg',
  exercise_reps: 'reps',
  weekly_sessions: 'sessões',
  consistency: 'sessões',
  weekly_volume: 'kg',
}

function evaluateViaProgressEngine(goal: TrainingGoal, now: Date, source: GoalCompletionEvidenceSource): GoalCompletionEvaluation {
  const progress = calculateGoalProgress(goal, now)
  if (progress.status !== 'completed') {
    return { shouldComplete: false, reason: 'evidence_insufficient' }
  }

  const completedAt = now.toISOString()
  return {
    shouldComplete: true,
    completedAt,
    reason: 'evidence_sufficient',
    evidence: {
      source,
      sourceId: goal.exerciseId,
      value: progress.currentValue,
      unit: EXERCISE_VALUE_UNIT[goal.type],
      recordedAt: completedAt,
      description: progress.headline,
    },
  }
}

function evaluateCycleCompletion(goal: TrainingGoal, now: Date): GoalCompletionEvaluation {
  if (!goal.cycleId) return { shouldComplete: false, reason: 'evidence_insufficient' }

  const cycle = getCycleById(goal.cycleId)
  if (!cycle || !cycle.completedAt) return { shouldComplete: false, reason: 'evidence_insufficient' }

  // Regra de segurança: o encerramento do ciclo precisa ter ocorrido depois
  // da criação da meta — nunca conclui por um ciclo já encerrado no passado.
  if (cycle.completedAt < goal.createdAt) {
    return { shouldComplete: false, reason: 'cycle_completed_before_goal_created' }
  }

  return {
    shouldComplete: true,
    completedAt: now.toISOString(),
    reason: 'evidence_sufficient',
    evidence: {
      source: 'cycle',
      sourceId: cycle.id,
      recordedAt: cycle.completedAt,
      description: `Ciclo "${cycle.name}" concluído em ${cycle.completedAt.slice(0, 10)}.`,
    },
  }
}

function evaluatePersonalRecord(goal: TrainingGoal, now: Date): GoalCompletionEvaluation {
  const progress = calculateGoalProgress(goal, now)
  if (progress.status !== 'completed') {
    return { shouldComplete: false, reason: 'evidence_insufficient' }
  }

  return {
    shouldComplete: true,
    completedAt: now.toISOString(),
    reason: 'evidence_sufficient',
    evidence: {
      source: 'personal_record',
      sourceId: goal.exerciseId,
      recordedAt: now.toISOString(),
      description: progress.headline,
    },
  }
}

/**
 * Avalia se há evidência suficiente para concluir a meta — nunca conclui de
 * fato. Regras de segurança (Fase 9): só avalia metas ativas; `custom` nunca
 * é avaliada automaticamente; toda evidência é posterior à criação da meta;
 * semanas parciais nunca contam (herdado do motor de progresso).
 */
export function evaluateGoalCompletion(goal: TrainingGoal, now: Date = new Date()): GoalCompletionEvaluation {
  if (goal.status !== 'active') {
    return { shouldComplete: false, reason: 'not_active' }
  }

  switch (goal.type) {
    case 'exercise_weight':
    case 'estimated_1rm':
    case 'exercise_reps':
      return evaluateViaProgressEngine(goal, now, 'workout')
    case 'weekly_sessions':
    case 'consistency':
    case 'weekly_volume':
      return evaluateViaProgressEngine(goal, now, 'weekly_summary')
    case 'cycle_completion':
      return evaluateCycleCompletion(goal, now)
    case 'personal_record':
      return evaluatePersonalRecord(goal, now)
    case 'custom':
      return { shouldComplete: false, reason: 'manual_only' }
    default:
      return { shouldComplete: false, reason: 'evidence_insufficient' }
  }
}
