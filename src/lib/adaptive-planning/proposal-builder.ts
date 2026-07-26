// Proposal builder (Sprint 27 Parte 1 — fundação).
//
// Constrói uma `AdaptivePlanProposal` a partir de uma `CoachRecommendation` já
// existente + snapshots antes/depois já resolvidos pelo chamador. Este módulo
// nunca decide QUAL alvo usar nem recalcula sinais — isso é responsabilidade
// de builders especializados por tipo (volume, reagendamento, frequência,
// exercício — Sprint 27 Partes 2/3), que chamam `buildAdaptiveProposal` como
// passo final comum. Aqui entra apenas o que já é genérico: montagem do
// envelope da proposta, diff, expiração e o caso trivial `maintain_plan`.

import type { CoachRecommendation } from '../coach/types'
import { buildProposalDiff } from './proposal-diff'
import { buildProposalId } from './helpers'
import type { AdaptivePlanProposal, AdaptivePlanSnapshot, AdaptiveProposalTarget, AdaptiveProposalType } from './types'

const DEFAULT_EXPIRY_DAYS = 14

export interface BuildProposalInput {
  recommendation: CoachRecommendation
  type: AdaptiveProposalType
  target: AdaptiveProposalTarget
  before: AdaptivePlanSnapshot
  after: AdaptivePlanSnapshot
  title: string
  summary: string
  now: Date
  expiresInDays?: number
}

/** Passo final comum a todo builder especializado: monta o envelope + roda o diff. Nunca persiste — ver `storage.ts`. */
export function buildAdaptiveProposal(input: BuildProposalInput): AdaptivePlanProposal {
  const expiresInDays = input.expiresInDays ?? DEFAULT_EXPIRY_DAYS
  const expiresAt = new Date(input.now.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()

  return {
    id: buildProposalId(input.recommendation.id),
    recommendationId: input.recommendation.id,
    ruleId: input.recommendation.ruleId,
    category: input.recommendation.category,
    type: input.type,
    target: input.target,
    status: 'draft',
    title: input.title,
    summary: input.summary,
    before: input.before,
    after: input.after,
    changes: buildProposalDiff(input.before, input.after),
    evidence: [...input.recommendation.evidence],
    createdAt: input.now.toISOString(),
    expiresAt,
  }
}

/**
 * Caso trivial: recomendação positiva/neutra que não requer nenhuma
 * alteração concreta (ex.: "Excelente consistência"). `before`/`after` são
 * idênticos (`{ kind: 'none' }`), então o diff é sempre vazio.
 */
export function buildMaintainPlanProposal(
  recommendation: CoachRecommendation,
  target: AdaptiveProposalTarget,
  now: Date
): AdaptivePlanProposal {
  return buildAdaptiveProposal({
    recommendation,
    type: 'maintain_plan',
    target,
    before: { kind: 'none' },
    after: { kind: 'none' },
    title: 'Manter plano atual',
    summary: recommendation.summary,
    now,
  })
}

/**
 * Categorias que a UI consegue transformar em proposta concreta SÓ a partir
 * de uma `CoachRecommendation` (via `action.id` apontando pra um treino
 * planejado — ver `coach-proposals.ts`). `frequency`/`progression`/
 * `stagnation` já têm builders especializados e testados
 * (`frequency-proposals.ts`, `exercise-replace-proposals.ts`), mas esses
 * builders precisam de dados que `CoachRecommendation` não carrega
 * estruturados (aderência numérica, nome do exercício substituto) — só
 * `evidence: string[]` em texto livre. Até o Coach expor esses dados de
 * forma estruturada, a UI só oferece "Criar proposta" para categorias fora
 * desta lista via `maintain_plan` (Fase 26 do spec: nem toda recomendação
 * precisa virar uma alteração real).
 */
const ACTIONABLE_CATEGORIES = new Set<CoachRecommendation['category']>(['volume', 'recovery'])

export function isProposalActionable(recommendation: CoachRecommendation): boolean {
  return ACTIONABLE_CATEGORIES.has(recommendation.category)
}
