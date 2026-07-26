// Reschedule proposal builder (Sprint 27 Parte 2).
//
// Reutiliza o motor de conflito já existente (`checkRescheduleConflict` em
// `planned-workouts.ts`) em vez de duplicar a lógica — este módulo só monta
// a proposta a partir de um conflito já verificado pelo chamador. Nunca
// resolve o conflito sozinho (isso continua sendo escolha explícita do
// usuário, ver `ProgramInstantiationConflictStrategy` para o padrão
// equivalente em `program-instantiation.ts`).

import type { CoachRecommendation } from '../coach/types'
import type { PlannedWorkout } from '../planned-workouts'
import { buildAdaptiveProposal } from './proposal-builder'
import type { AdaptivePlanProposal, ScheduleChangeSnapshot } from './types'

function isEligibleTarget(plannedWorkout: PlannedWorkout): boolean {
  return plannedWorkout.status === 'pending'
}

export interface BuildRescheduleProposalOptions {
  /** Nomes dos treinos já existentes na data de destino — só para exibição/warning, não bloqueia a proposta (a decisão de estratégia de conflito acontece na aplicação). */
  conflictingWorkoutNames?: string[]
}

/**
 * Só treinos ainda pendentes podem ser remarcados (Fase 14) — em andamento,
 * concluído ou cancelado retornam `null`. A data original nunca é perdida:
 * ela continua em `before.date`.
 */
export function buildRescheduleProposal(
  recommendation: CoachRecommendation,
  plannedWorkout: PlannedWorkout,
  newDate: string,
  now: Date,
  options: BuildRescheduleProposalOptions = {}
): AdaptivePlanProposal | null {
  if (!isEligibleTarget(plannedWorkout)) return null
  if (newDate === plannedWorkout.date) return null

  const before: ScheduleChangeSnapshot = {
    kind: 'schedule',
    plannedWorkoutId: plannedWorkout.id,
    workoutName: plannedWorkout.templateSnapshot.name,
    date: plannedWorkout.date,
  }
  const after: ScheduleChangeSnapshot = { ...before, date: newDate }

  const conflictNote =
    options.conflictingWorkoutNames && options.conflictingWorkoutNames.length > 0
      ? ` Atenção: já existe(m) treino(s) nesta data (${options.conflictingWorkoutNames.join(', ')}).`
      : ''

  return buildAdaptiveProposal({
    recommendation,
    type: 'reschedule_workout',
    target: { kind: 'planned_workout', plannedWorkoutId: plannedWorkout.id, date: plannedWorkout.date },
    before,
    after,
    title: `Reagendar ${before.workoutName}`,
    summary: `${recommendation.summary}${conflictNote}`,
    now,
  })
}
