// Recovery insertion proposal builder (Sprint 27 Parte 2).
//
// Quando o Coach sinaliza recuperação incompleta, gera 3 opções INDEPENDENTES
// — nunca escolhe uma automaticamente (Fase 15). A UI (Parte 4) decide como
// apresentá-las; este módulo só monta a lista. Reaproveita os builders de
// reagendamento e redução de volume já existentes em vez de duplicar a lógica
// — só a opção C (sessão de mobilidade) é original deste arquivo.

import type { CoachRecommendation } from '../coach/types'
import type { PlannedWorkout } from '../planned-workouts'
import { buildAdaptiveProposal } from './proposal-builder'
import { buildReduceVolumeProposal, buildVolumeSnapshot } from './volume-proposals'
import { buildRescheduleProposal } from './reschedule-proposals'
import type { AdaptivePlanProposal, VolumeChangeSnapshot } from './types'

const MOBILITY_REDUCTION_PERCENT = 20

function addDaysToDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Opção C: substitui o treino por uma sessão de mobilidade — nunca remove o registro, só descreve a troca no diff. */
function buildMobilitySwapProposal(
  recommendation: CoachRecommendation,
  plannedWorkout: PlannedWorkout,
  now: Date
): AdaptivePlanProposal | null {
  if (plannedWorkout.status !== 'pending' && plannedWorkout.status !== 'in_progress') return null

  const before: VolumeChangeSnapshot = buildVolumeSnapshot(plannedWorkout)
  if (before.exercises.length === 0) return null

  const after: VolumeChangeSnapshot = {
    kind: 'volume',
    workoutId: before.workoutId,
    workoutName: 'Sessão de mobilidade',
    totalSets: 0,
    exercises: [],
  }

  return buildAdaptiveProposal({
    recommendation,
    type: 'insert_recovery',
    target: { kind: 'planned_workout', plannedWorkoutId: plannedWorkout.id, date: plannedWorkout.date },
    before,
    after,
    title: `Substituir ${before.workoutName} por mobilidade`,
    summary: recommendation.summary,
    now,
  })
}

export interface RecoveryProposalOptions {
  conflictingWorkoutNames?: string[]
}

/**
 * Devolve até 3 propostas independentes (reagendar para amanhã / reduzir
 * volume hoje / trocar por mobilidade). Nunca menos que zero — cada opção
 * pode faltar individualmente se o treino não for elegível para aquele tipo
 * específico de mudança, mas isso nunca bloqueia as outras opções.
 */
export function buildRecoveryOptions(
  recommendation: CoachRecommendation,
  plannedWorkout: PlannedWorkout,
  now: Date,
  options: RecoveryProposalOptions = {}
): AdaptivePlanProposal[] {
  const tomorrow = addDaysToDate(plannedWorkout.date, 1)

  const proposals = [
    buildRescheduleProposal(recommendation, plannedWorkout, tomorrow, now, {
      conflictingWorkoutNames: options.conflictingWorkoutNames,
    }),
    buildReduceVolumeProposal(recommendation, plannedWorkout, now, { reductionPercent: MOBILITY_REDUCTION_PERCENT }),
    buildMobilitySwapProposal(recommendation, plannedWorkout, now),
  ]

  return proposals.filter((p): p is AdaptivePlanProposal => p !== null)
}
