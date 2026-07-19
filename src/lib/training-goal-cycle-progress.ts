// Progresso de metas de conclusão de ciclo — Sprint 18.1a.
// Estado binário derivado do status do ciclo vinculado — nunca projeta prazo
// (conclusão de ciclo não é uma tendência numérica).

import { getCycleById } from './training-cycles'
import { baseProgress, resolveMilestones, type GoalProgress } from './training-goal-progress'
import type { TrainingGoal } from './training-goals'

export function computeCycleCompletionProgress(goal: TrainingGoal): GoalProgress {
  if (!goal.cycleId) {
    return baseProgress(goal, 'insufficient_data', 'Meta incompleta — falta o ciclo vinculado.')
  }

  const cycle = getCycleById(goal.cycleId)
  if (!cycle) {
    return baseProgress(goal, 'insufficient_data', 'O ciclo vinculado a esta meta não existe mais.')
  }

  // `completedAt`, não `status`, é o sinal de conclusão: um ciclo concluído e
  // depois arquivado perde `status === 'completed'` (vira 'archived'), mas
  // continua tendo sido concluído — arquivar não deve "desconcluir" a meta.
  if (cycle.completedAt) {
    return {
      goalId: goal.id,
      baselineValue: 0,
      baselineInferred: true,
      currentValue: 1,
      targetValue: 1,
      progressPercentage: 100,
      status: 'completed',
      confidence: 'high',
      headline: `Ciclo "${cycle.name}" concluído`,
      explanation: cycle.completedAt ? `Concluído em ${cycle.completedAt.slice(0, 10)}.` : 'Ciclo concluído.',
      milestones: resolveMilestones(goal.id, 100),
    }
  }

  if (cycle.status === 'archived') {
    return {
      goalId: goal.id,
      baselineValue: 0,
      baselineInferred: true,
      currentValue: 0,
      targetValue: 1,
      progressPercentage: 0,
      status: 'insufficient_data',
      confidence: 'low',
      headline: `Ciclo "${cycle.name}" arquivado sem conclusão`,
      explanation: 'O ciclo foi arquivado antes de ser concluído — esta meta não é encerrada automaticamente por arquivamento.',
      milestones: resolveMilestones(goal.id, 0),
    }
  }

  return {
    goalId: goal.id,
    baselineValue: 0,
    baselineInferred: true,
    currentValue: 0,
    targetValue: 1,
    progressPercentage: 0,
    status: 'in_progress',
    confidence: 'high',
    headline: `Ciclo "${cycle.name}" em andamento`,
    explanation: 'A meta é concluída automaticamente quando o ciclo vinculado for encerrado.',
    milestones: resolveMilestones(goal.id, 0),
  }
}
