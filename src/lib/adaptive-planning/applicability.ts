// Applicability engine (Sprint 27 Parte 1).
//
// Decide se uma proposta ainda pode ser aplicada. Puro por design: recebe as
// entidades já resolvidas pelo chamador (nunca lê storage sozinho) para ficar
// fácil de testar e para não duplicar os motores de planner/programas.

import type { PlannedWorkout } from '../planned-workouts'
import type { TrainingProgram } from '../training-programs'
import { isProgramVersionStale } from './versioning'
import type { AdaptivePlanProposal, ProposalApplicability } from './types'

export interface ApplicabilityContext {
  now: Date
  /** `undefined` = não se aplica a este tipo de alvo. `null` = entidade não encontrada. */
  plannedWorkout?: PlannedWorkout | null
  program?: TrainingProgram | null
  /** Treinos já existentes na data de destino de um `reschedule_workout` (ver `checkRescheduleConflict`). Nunca bloqueia sozinho — só vira warning, a resolução de estratégia acontece na aplicação. */
  rescheduleConflicts?: PlannedWorkout[]
}

// 'accepted' NÃO é terminal aqui — é justamente o estado esperado antes de
// `applyProposal` (execution.ts) rodar. Só estados que nunca deveriam gerar
// uma nova execução entram nesta lista.
const TERMINAL_STATUSES: ReadonlySet<AdaptivePlanProposal['status']> = new Set<AdaptivePlanProposal['status']>([
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

    if (proposal.target.kind === 'program' && isProgramVersionStale(proposal.target, context.program.version)) {
      reasons.push('O programa foi alterado desde que a proposta foi criada — snapshot obsoleto.')
    }
  }

  if (context.rescheduleConflicts && context.rescheduleConflicts.length > 0) {
    const names = context.rescheduleConflicts.map((w) => w.templateSnapshot.name).join(', ')
    warnings.push(`Já existe(m) treino(s) na data de destino: ${names}.`)
  }

  return { applicable: reasons.length === 0, reasons, warnings }
}
