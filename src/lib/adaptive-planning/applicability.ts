// Applicability engine (Sprint 27 Parte 1).
//
// Decide se uma proposta ainda pode ser aplicada. Puro por design: recebe as
// entidades já resolvidas pelo chamador (nunca lê storage sozinho) para ficar
// fácil de testar e para não duplicar os motores de planner/programas.

import type { PlannedWorkout } from '../planned-workouts'
import type { TrainingProgram } from '../training-programs'
import type { AdaptivePlanProposal, ProposalApplicability } from './types'

export interface ApplicabilityContext {
  now: Date
  /** `undefined` = não se aplica a este tipo de alvo. `null` = entidade não encontrada. */
  plannedWorkout?: PlannedWorkout | null
  program?: TrainingProgram | null
}

const TERMINAL_STATUSES: ReadonlySet<AdaptivePlanProposal['status']> = new Set<AdaptivePlanProposal['status']>([
  'accepted',
  'rejected',
  'expired',
  'applied',
  'failed',
])

export function checkProposalApplicability(
  proposal: AdaptivePlanProposal,
  context: ApplicabilityContext
): ProposalApplicability {
  const reasons: string[] = []
  const warnings: string[] = []

  if (proposal.status === 'applied') {
    reasons.push('Esta proposta já foi aplicada.')
  } else if (TERMINAL_STATUSES.has(proposal.status)) {
    reasons.push(`Proposta já está com status "${proposal.status}" e não pode ser reaplicada.`)
  }

  if (proposal.expiresAt && new Date(proposal.expiresAt).getTime() < context.now.getTime()) {
    reasons.push('A recomendação de origem expirou.')
  }

  if (context.plannedWorkout === null) {
    reasons.push('O treino planejado alvo não existe mais.')
  } else if (context.plannedWorkout) {
    if (context.plannedWorkout.status === 'done') {
      reasons.push('O treino já foi concluído — sessões concluídas nunca são alteradas.')
    }
    if (context.plannedWorkout.status === 'cancelled') {
      reasons.push('O treino alvo foi cancelado.')
    }
    if (context.plannedWorkout.status === 'in_progress') {
      warnings.push('O treino está em andamento.')
    }
  }

  if (context.program === null) {
    reasons.push('O programa alvo não existe mais.')
  } else if (context.program) {
    if (context.program.isArchived) {
      reasons.push('O programa alvo foi arquivado.')
    }

    if (proposal.target.kind === 'program' && proposal.target.programVersion !== undefined) {
      if (proposal.target.programVersion !== context.program.version) {
        reasons.push('O programa foi alterado desde que a proposta foi criada — snapshot obsoleto.')
      }
    }
  }

  return { applicable: reasons.length === 0, reasons, warnings }
}
