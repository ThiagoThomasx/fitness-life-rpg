// Progresso de metas de recorde pessoal — Sprint 18.1a.
// Estado binário: a meta é concluída quando um PR do tipo escolhido é
// registrado em uma sessão posterior à data de início da meta. PRs
// anteriores nunca contam — evita concluir por dado histórico.

import { getWorkoutHistory } from './workout-history'
import { baseProgress, resolveMilestones, type GoalProgress } from './training-goal-progress'
import type { PersonalRecordType, TrainingGoal } from './training-goals'

function matchesRecordType(
  flags: { isWeightPr?: boolean; isRepsPr?: boolean; isVolumePr?: boolean; isFirstTime?: boolean },
  recordType: PersonalRecordType
): boolean {
  switch (recordType) {
    case 'weight':
      return Boolean(flags.isWeightPr)
    case 'reps':
      return Boolean(flags.isRepsPr)
    case 'volume':
      return Boolean(flags.isVolumePr)
    case 'estimated_1rm':
      // Não há flag dedicada de PR de 1RM estimado no histórico — carga é o
      // proxy mais próximo, já que 1RM estimado cresce com carga ou reps.
      return Boolean(flags.isWeightPr)
  }
}

export function computePersonalRecordProgress(goal: TrainingGoal): GoalProgress {
  if (!goal.exerciseId || !goal.recordType) {
    return baseProgress(goal, 'insufficient_data', 'Meta incompleta — faltam exercício ou tipo de recorde.')
  }

  const history = getWorkoutHistory()
  const prAfterStart = [...history]
    .reverse()
    .find((workout) => {
      if (workout.completedAt < goal.startDate) return false
      const exercise = workout.exercises.find((ex) => ex.exerciseId === goal.exerciseId)
      return exercise ? matchesRecordType(exercise, goal.recordType!) : false
    })

  if (!prAfterStart) {
    return {
      goalId: goal.id,
      baselineValue: 0,
      baselineInferred: true,
      currentValue: 0,
      targetValue: 1,
      progressPercentage: 0,
      status: 'in_progress',
      confidence: 'medium',
      headline: 'Ainda sem novo recorde registrado',
      explanation: 'A meta é concluída automaticamente quando um recorde do tipo escolhido for registrado.',
      milestones: resolveMilestones(goal.id, 0),
    }
  }

  return {
    goalId: goal.id,
    baselineValue: 0,
    baselineInferred: true,
    currentValue: 1,
    targetValue: 1,
    progressPercentage: 100,
    status: 'completed',
    confidence: 'high',
    headline: 'Novo recorde registrado',
    explanation: `Recorde alcançado em ${prAfterStart.completedAt.slice(0, 10)}.`,
    milestones: resolveMilestones(goal.id, 100),
  }
}
