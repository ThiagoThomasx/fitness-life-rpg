// Execution engine (Sprint 27 Parte 4).
//
// Único lugar do domínio que muta programa/planner de verdade. Fluxo
// obrigatório: build → validate → preview → accept (decisions.ts) → execute
// (aqui) → persist audit. `applyProposal` exige status `accepted` — nunca
// aplica um `draft` direto, mesmo que o chamador tente.
//
// Atomicidade: cada tipo de proposta mapeia para UMA única chamada de escrita
// (`updatePlannedWorkoutTemplateSnapshot`, `reschedulePlannedWorkout`) —
// essas funções já são atômicas (um único `persistPlannedWorkouts`), então
// não existe estado parcialmente escrito: ou a chamada de escrita acontece
// inteira, ou nada muda e a proposta vira `failed`. Idempotência: aplicar uma
// proposta já `applied` é um no-op bem-sucedido, nunca um erro nem uma
// segunda mutação.

import { getPlannedWorkoutById, reschedulePlannedWorkout, updatePlannedWorkoutTemplateSnapshot, checkRescheduleConflict } from '../planned-workouts'
import { getTrainingProgramById } from '../training-programs'
import type { WorkoutTemplateExerciseBlock } from '../workout-templates'
import { checkProposalApplicability, type ApplicabilityContext } from './applicability'
import { buildAuditEntryId } from './helpers'
import { formatChangesAsText } from './proposal-diff'
import { appendAdaptivePlanAuditEntry, getAdaptivePlanProposalById, updateAdaptivePlanProposal } from './storage'
import type {
  AdaptivePlanProposal,
  ExerciseChangeSnapshot,
  ExerciseTarget,
  PlannedWorkoutTarget,
  ProposalExecutionResult,
  ScheduleChangeSnapshot,
  VolumeChangeSnapshot,
} from './types'

/** Sem escritor determinístico nesta versão (Fase 18/48 — sem prescrição/schema novos). Falha explícita em vez de fingir aplicar. */
const UNSUPPORTED_EXECUTION_TYPES: ReadonlySet<AdaptivePlanProposal['type']> = new Set<AdaptivePlanProposal['type']>([
  'adjust_frequency',
  'review_progression',
])

function applyVolumeSnapshotToExerciseBlocks(
  blocks: WorkoutTemplateExerciseBlock[],
  after: VolumeChangeSnapshot
): WorkoutTemplateExerciseBlock[] {
  const afterByKey = new Map(after.exercises.map((ex) => [ex.exerciseId ?? ex.name, ex]))
  return blocks
    .filter((block) => afterByKey.has(block.exercise.exerciseId ?? block.id))
    .map((block) => {
      const afterEx = afterByKey.get(block.exercise.exerciseId ?? block.id)!
      return { ...block, exercise: { ...block.exercise, sets: afterEx.sets } }
    })
}

function resolveApplicabilityContext(proposal: AdaptivePlanProposal, now: Date): ApplicabilityContext {
  if (proposal.target.kind === 'planned_workout' || proposal.target.kind === 'exercise') {
    const plannedWorkoutId = proposal.target.plannedWorkoutId
    const plannedWorkout = getPlannedWorkoutById(plannedWorkoutId)
    const rescheduleConflicts =
      proposal.type === 'reschedule_workout'
        ? checkRescheduleConflict((proposal.after as ScheduleChangeSnapshot).date).filter((w) => w.id !== plannedWorkoutId)
        : undefined
    return { now, plannedWorkout, rescheduleConflicts }
  }
  if (proposal.target.kind === 'program') {
    return { now, program: getTrainingProgramById(proposal.target.programId) }
  }
  return { now }
}

function recordAudit(
  proposal: AdaptivePlanProposal,
  action: 'applied' | 'failed',
  result: 'success' | 'failure',
  now: Date,
  errorMessage?: string
): void {
  appendAdaptivePlanAuditEntry({
    id: buildAuditEntryId(),
    proposalId: proposal.id,
    recommendationId: proposal.recommendationId,
    ruleId: proposal.ruleId,
    action,
    targetSummary: proposal.title,
    changesSummary: formatChangesAsText(proposal.changes),
    result,
    errorMessage,
    createdAt: now.toISOString(),
  })
}

function fail(proposal: AdaptivePlanProposal, error: string, now: Date, warnings: string[] = []): ProposalExecutionResult {
  updateAdaptivePlanProposal(proposal.id, { status: 'failed' })
  recordAudit(proposal, 'failed', 'failure', now, error)
  return { success: false, proposalId: proposal.id, changedEntityIds: [], warnings, error }
}

/**
 * Aplica uma proposta já aceita. Exige `status === 'accepted'` — uma
 * proposta `draft`/`reviewing` nunca é aplicada direto, ela precisa passar
 * por `acceptProposal` (decisions.ts) primeiro. Reaplicar uma proposta já
 * `applied` é um no-op bem-sucedido (idempotência).
 */
export function applyProposal(proposalId: string, now: Date = new Date()): ProposalExecutionResult {
  const proposal = getAdaptivePlanProposalById(proposalId)
  if (!proposal) {
    return { success: false, proposalId, changedEntityIds: [], warnings: [], error: 'Proposta não encontrada.' }
  }

  if (proposal.status === 'applied') {
    return {
      success: true,
      proposalId,
      changedEntityIds: [],
      warnings: ['Proposta já havia sido aplicada anteriormente — nenhuma ação repetida.'],
    }
  }

  if (proposal.status !== 'accepted') {
    return {
      success: false,
      proposalId,
      changedEntityIds: [],
      warnings: [],
      error: 'Proposta precisa ser aceita antes de ser aplicada.',
    }
  }

  if (UNSUPPORTED_EXECUTION_TYPES.has(proposal.type)) {
    return fail(proposal, 'Este tipo de proposta ainda não suporta aplicação automática — ajuste manualmente no Planner/Programa.', now)
  }

  const context = resolveApplicabilityContext(proposal, now)
  const applicability = checkProposalApplicability(proposal, context)
  if (!applicability.applicable) {
    return fail(proposal, applicability.reasons.join(' '), now, applicability.warnings)
  }

  const changedEntityIds: string[] = []

  try {
    switch (proposal.type) {
      case 'maintain_plan':
        break

      case 'reduce_volume':
      case 'increase_volume':
      case 'insert_recovery': {
        const target = proposal.target as PlannedWorkoutTarget
        const plannedWorkout = context.plannedWorkout!
        const after = proposal.after as VolumeChangeSnapshot
        const updated = updatePlannedWorkoutTemplateSnapshot(target.plannedWorkoutId, {
          name: after.workoutName,
          exerciseBlocks: applyVolumeSnapshotToExerciseBlocks(plannedWorkout.templateSnapshot.exerciseBlocks, after),
        })
        if (!updated) throw new Error('Não foi possível atualizar o treino planejado.')
        changedEntityIds.push(updated.id)
        break
      }

      case 'reschedule_workout': {
        const target = proposal.target as PlannedWorkoutTarget
        const after = proposal.after as ScheduleChangeSnapshot
        const updated = reschedulePlannedWorkout(target.plannedWorkoutId, after.date, 'Aceito via Adaptive Planning')
        if (!updated) throw new Error('Não foi possível reagendar o treino planejado.')
        changedEntityIds.push(updated.id)
        break
      }

      case 'replace_exercise': {
        const target = proposal.target as ExerciseTarget
        const plannedWorkout = context.plannedWorkout!
        const after = proposal.after as ExerciseChangeSnapshot
        const exerciseBlocks = plannedWorkout.templateSnapshot.exerciseBlocks.map((block) => {
          const matches = target.exerciseId
            ? block.exercise.exerciseId === target.exerciseId
            : block.exercise.exerciseName === target.exerciseName
          if (!matches) return block
          return { ...block, exercise: { ...block.exercise, exerciseId: undefined, exerciseName: after.exerciseName } }
        })
        const updated = updatePlannedWorkoutTemplateSnapshot(target.plannedWorkoutId, { exerciseBlocks })
        if (!updated) throw new Error('Não foi possível substituir o exercício.')
        changedEntityIds.push(updated.id)
        break
      }

      default:
        throw new Error('Tipo de proposta desconhecido.')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida ao aplicar a proposta.'
    return fail(proposal, message, now)
  }

  updateAdaptivePlanProposal(proposalId, { status: 'applied', appliedAt: now.toISOString() })
  recordAudit(proposal, 'applied', 'success', now)
  return { success: true, proposalId, changedEntityIds, warnings: applicability.warnings }
}
