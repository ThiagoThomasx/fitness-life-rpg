// Ponte Coach -> Proposta (Sprint 27 Parte 4b).
//
// `CoachRecommendationCard` só tem uma `CoachRecommendation` (ver
// `coach/types.ts`) — nenhuma regra do Coach hoje emite uma ação com o id de
// um `PlannedWorkout` específico (as ações de volume/recuperação usam
// `{ kind: 'planner' }`, sem id — ver `coach/rules.ts`). Sem um alvo
// estruturado, este módulo usa a mesma heurística sugerida pela sprint
// (Fase 12: "preferir próxima sessão relevante"): a próxima sessão
// pendente do Planner a partir de hoje. Cobre só as categorias em
// `isProposalActionable` (`volume`/`recovery`) — as outras não têm dados
// estruturados suficientes na recomendação (ver comentário em
// `proposal-builder.ts`).

import type { CoachRecommendation } from '../coach/types'
import { getPlannedWorkouts, type PlannedWorkout } from '../planned-workouts'
import { buildIncreaseVolumeProposal, buildReduceVolumeProposal } from './volume-proposals'
import { buildRecoveryOptions } from './recovery-proposals'
import type { AdaptivePlanProposal } from './types'

const INCREASE_KEYWORDS = ['aumente', 'aumentar', 'aumento', 'incluir mais']
// 'redistribua'/'redistribuir' cobre a única regra 'volume' que existe hoje
// (Coach.Volume.Imbalance — "Redistribua parte do volume de X para outros
// grupos negligenciados"): tirar volume do grupo excessivo É uma redução.
const REDUCE_KEYWORDS = ['reduza', 'reduzir', 'diminua', 'diminuir', 'redução', 'redistribua', 'redistribuir']

function textOf(recommendation: CoachRecommendation): string {
  return `${recommendation.suggestion} ${recommendation.summary}`.toLowerCase()
}

function suggestsIncrease(recommendation: CoachRecommendation): boolean {
  const text = textOf(recommendation)
  return INCREASE_KEYWORDS.some((keyword) => text.includes(keyword))
}

function suggestsReduction(recommendation: CoachRecommendation): boolean {
  const text = textOf(recommendation)
  return REDUCE_KEYWORDS.some((keyword) => text.includes(keyword))
}

/** Próxima sessão pendente a partir de hoje — nunca uma já concluída/cancelada/em andamento hoje mesmo. */
function resolveNextPendingWorkout(now: Date): PlannedWorkout | null {
  const today = now.toISOString().slice(0, 10)
  return getPlannedWorkouts().find((pw) => pw.status === 'pending' && pw.date >= today) ?? null
}

/**
 * Devolve 0+ propostas para a recomendação. 0 significa "sem alteração
 * automática disponível agora" (ex.: nenhuma sessão pendente no Planner) —
 * nunca lança, nunca força uma proposta sem alvo resolvido de verdade.
 */
export function buildProposalsForRecommendation(
  recommendation: CoachRecommendation,
  now: Date = new Date()
): AdaptivePlanProposal[] {
  const plannedWorkout = resolveNextPendingWorkout(now)
  if (!plannedWorkout) return []

  if (recommendation.category === 'volume') {
    if (suggestsReduction(recommendation)) {
      const proposal = buildReduceVolumeProposal(recommendation, plannedWorkout, now)
      return proposal ? [proposal] : []
    }
    if (suggestsIncrease(recommendation)) {
      const proposal = buildIncreaseVolumeProposal(recommendation, plannedWorkout, now)
      return proposal ? [proposal] : []
    }
    return []
  }

  if (recommendation.category === 'recovery') {
    return buildRecoveryOptions(recommendation, plannedWorkout, now)
  }

  return []
}
