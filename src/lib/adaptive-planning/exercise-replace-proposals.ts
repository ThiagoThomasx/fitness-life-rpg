// Exercise replacement proposal builder (Sprint 27 Parte 3).
//
// Substituição recorrente detectada pelo Coach (ex.: equipamento indisponível
// com frequência) — aplica só a treinos futuros, nunca a sessões já
// concluídas, e nunca reescreve o histórico de exercícios já registrados.

import type { CoachRecommendation } from '../coach/types'
import type { PlannedWorkout } from '../planned-workouts'
import { buildAdaptiveProposal } from './proposal-builder'
import type { AdaptivePlanProposal, ExerciseChangeSnapshot } from './types'

export interface ReplaceExerciseInput {
  plannedWorkout: PlannedWorkout
  exerciseId?: string
  exerciseName: string
  replacementName: string
  /** Motivo mais comum da substituição recorrente (Fase 17) — só exibição, nunca decide sozinho. */
  reasonLabel?: string
}

function isEligibleTarget(plannedWorkout: PlannedWorkout): boolean {
  return plannedWorkout.status === 'pending' || plannedWorkout.status === 'in_progress'
}

export function buildReplaceExerciseProposal(
  recommendation: CoachRecommendation,
  input: ReplaceExerciseInput,
  now: Date
): AdaptivePlanProposal | null {
  const { plannedWorkout, exerciseId, exerciseName, replacementName, reasonLabel } = input
  if (!isEligibleTarget(plannedWorkout)) return null
  if (exerciseName === replacementName) return null

  const before: ExerciseChangeSnapshot = {
    kind: 'exercise',
    plannedWorkoutId: plannedWorkout.id,
    exerciseId,
    exerciseName,
  }
  const after: ExerciseChangeSnapshot = { ...before, exerciseName: replacementName }

  const summary = reasonLabel ? `${recommendation.summary} Motivo mais comum: ${reasonLabel}.` : recommendation.summary

  return buildAdaptiveProposal({
    recommendation,
    type: 'replace_exercise',
    target: { kind: 'exercise', plannedWorkoutId: plannedWorkout.id, exerciseId, exerciseName },
    before,
    after,
    title: `Substituir ${exerciseName} por ${replacementName}`,
    summary,
    now,
  })
}
