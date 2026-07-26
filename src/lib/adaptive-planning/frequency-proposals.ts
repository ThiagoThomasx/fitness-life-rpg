// Frequency adjustment proposal builder (Sprint 27 Parte 3).
//
// Baseado em aderência histórica real (Fase 16) — nunca interpreta falhas
// como falta de esforço, só ajusta a expectativa à média observada. O alvo é
// sempre o programa (semanas futuras), nunca reescreve semanas já concluídas
// — ver `versioning.ts` para o rastreio de versão usado no audit trail.

import type { CoachRecommendation } from '../coach/types'
import type { TrainingProgram } from '../training-programs'
import { buildAdaptiveProposal } from './proposal-builder'
import type { AdaptivePlanProposal, FrequencyChangeSnapshot } from './types'

export interface AdjustFrequencyInput {
  program: TrainingProgram
  currentSessionsPerWeek: number
  /** Aderência real observada (ex.: 3.1 sessões/semana) — usada só como evidência, nunca sobrescreve `evidence` da recomendação. */
  averageAdherenceSessionsPerWeek: number
  proposedSessionsPerWeek: number
}

/**
 * Retorna `null` quando o programa já está arquivado (nunca propor mudança
 * num programa que o usuário já encerrou) ou quando a frequência proposta é
 * igual à atual (nada a ajustar).
 */
export function buildAdjustFrequencyProposal(
  recommendation: CoachRecommendation,
  input: AdjustFrequencyInput,
  now: Date
): AdaptivePlanProposal | null {
  const { program, currentSessionsPerWeek, proposedSessionsPerWeek } = input
  if (program.isArchived) return null
  if (proposedSessionsPerWeek === currentSessionsPerWeek) return null
  if (proposedSessionsPerWeek < 1) return null

  const before: FrequencyChangeSnapshot = {
    kind: 'frequency',
    programId: program.id,
    sessionsPerWeek: currentSessionsPerWeek,
  }
  const after: FrequencyChangeSnapshot = { ...before, sessionsPerWeek: proposedSessionsPerWeek }

  return buildAdaptiveProposal({
    recommendation,
    type: 'adjust_frequency',
    target: { kind: 'program', programId: program.id, programVersion: program.version },
    before,
    after,
    title: `Ajustar frequência de ${program.name}`,
    summary: recommendation.summary,
    now,
  })
}
