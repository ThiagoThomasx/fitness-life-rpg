// Volume proposal builders (Sprint 27 Parte 2).
//
// Traduz uma `CoachRecommendation` de categoria `volume` numa proposta
// concreta de redução/aumento, sempre sobre uma `PlannedWorkout` futura.
// Nunca altera sessões concluídas ou canceladas — isso é responsabilidade
// desta camada (guarda de entrada) além de `applicability.ts` (guarda de
// saída, no momento de aplicar).

import type { CoachRecommendation } from '../coach/types'
import type { PlannedWorkout } from '../planned-workouts'
import { buildAdaptiveProposal } from './proposal-builder'
import { computeReducedTarget, increaseVolumeConservatively, reduceVolumeEvenly } from './volume-math'
import type { AdaptivePlanProposal, VolumeChangeSnapshot } from './types'

const DEFAULT_REDUCTION_PERCENT = 15
const DEFAULT_INCREASE_SETS = 2

function isEligibleTarget(plannedWorkout: PlannedWorkout): boolean {
  return plannedWorkout.status === 'pending' || plannedWorkout.status === 'in_progress'
}

export function buildVolumeSnapshot(plannedWorkout: PlannedWorkout): VolumeChangeSnapshot {
  const exercises = plannedWorkout.templateSnapshot.exerciseBlocks.map((block) => ({
    exerciseId: block.exercise.exerciseId ?? block.id,
    name: block.exercise.exerciseName,
    sets: block.exercise.sets ?? 0,
  }))
  return {
    kind: 'volume',
    workoutId: plannedWorkout.id,
    workoutName: plannedWorkout.templateSnapshot.name,
    totalSets: exercises.reduce((sum, ex) => sum + ex.sets, 0),
    exercises,
  }
}

export interface BuildReduceVolumeProposalOptions {
  reductionPercent?: number
}

/**
 * Só sessões futuras (nunca concluídas/canceladas — Fase 12). Retorna `null`
 * quando o treino não é elegível: o Coach pode ter apontado uma sessão que
 * já não é mais um alvo válido, e o chamador deve tratar isso como "nenhuma
 * proposta gerada" em vez de forçar uma proposta inaplicável.
 */
export function buildReduceVolumeProposal(
  recommendation: CoachRecommendation,
  plannedWorkout: PlannedWorkout,
  now: Date,
  options: BuildReduceVolumeProposalOptions = {}
): AdaptivePlanProposal | null {
  if (!isEligibleTarget(plannedWorkout)) return null

  const before = buildVolumeSnapshot(plannedWorkout)
  if (before.exercises.length === 0) return null

  const reductionPercent = options.reductionPercent ?? DEFAULT_REDUCTION_PERCENT
  const targetTotalSets = computeReducedTarget(before.exercises, reductionPercent)
  const reducedExercises = reduceVolumeEvenly(before.exercises, targetTotalSets)

  const after: VolumeChangeSnapshot = {
    ...before,
    totalSets: reducedExercises.reduce((sum, ex) => sum + ex.sets, 0),
    exercises: reducedExercises,
  }

  return buildAdaptiveProposal({
    recommendation,
    type: 'reduce_volume',
    target: { kind: 'planned_workout', plannedWorkoutId: plannedWorkout.id, date: plannedWorkout.date },
    before,
    after,
    title: `Reduzir volume de ${before.workoutName}`,
    summary: recommendation.summary,
    now,
  })
}

export interface BuildIncreaseVolumeProposalOptions {
  increaseSets?: number
  maxExercisesTouched?: number
}

/**
 * Aumento conservador (Fase 13) — nunca aplicado se o treino já foi
 * concluído/cancelado, mesma guarda de `buildReduceVolumeProposal`.
 */
export function buildIncreaseVolumeProposal(
  recommendation: CoachRecommendation,
  plannedWorkout: PlannedWorkout,
  now: Date,
  options: BuildIncreaseVolumeProposalOptions = {}
): AdaptivePlanProposal | null {
  if (!isEligibleTarget(plannedWorkout)) return null

  const before = buildVolumeSnapshot(plannedWorkout)
  if (before.exercises.length === 0) return null

  const increaseSets = options.increaseSets ?? DEFAULT_INCREASE_SETS
  const increasedExercises = increaseVolumeConservatively(
    before.exercises,
    increaseSets,
    options.maxExercisesTouched ?? 2
  )

  const after: VolumeChangeSnapshot = {
    ...before,
    totalSets: increasedExercises.reduce((sum, ex) => sum + ex.sets, 0),
    exercises: increasedExercises,
  }

  return buildAdaptiveProposal({
    recommendation,
    type: 'increase_volume',
    target: { kind: 'planned_workout', plannedWorkoutId: plannedWorkout.id, date: plannedWorkout.date },
    before,
    after,
    title: `Aumentar volume de ${before.workoutName}`,
    summary: recommendation.summary,
    now,
  })
}
