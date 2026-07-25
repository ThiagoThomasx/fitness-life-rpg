// Decisões do usuário sobre recomendações adaptativas — Sprint 21 Parte 4A.
//
// Só registra a decisão (seção 15 da spec: "nenhuma recomendação deve
// alterar automaticamente o programa"). Aceitar uma recomendação aqui nunca
// aplica a mudança sozinha — é o usuário quem age no Planner/programa depois,
// se quiser. `accepted`/`dismissed` escondem a recomendação de reaparecer
// (idempotência); `review_later` deixa reaparecer no próximo cálculo.

import type { AdaptiveRecommendationType } from './adaptive-recommendations'

const DECISIONS_KEY = 'lrpg-fit:adaptive-recommendation-decisions'

export type RecommendationDecisionStatus = 'accepted' | 'dismissed' | 'review_later'

export interface RecommendationDecision {
  recommendationId: string
  type: AdaptiveRecommendationType
  status: RecommendationDecisionStatus
  decidedAt: string
}

function loadDecisions(): RecommendationDecision[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(DECISIONS_KEY)
    return raw ? (JSON.parse(raw) as RecommendationDecision[]) : []
  } catch {
    return []
  }
}

function persistDecisions(decisions: RecommendationDecision[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DECISIONS_KEY, JSON.stringify(decisions))
  } catch {
    // Storage unavailable — silently skip
  }
}

export function getRecommendationDecisions(): RecommendationDecision[] {
  return loadDecisions()
}

/** Idempotente: decidir de novo sobre o mesmo id substitui a decisão anterior em vez de empilhar. */
export function recordRecommendationDecision(
  recommendationId: string,
  type: AdaptiveRecommendationType,
  status: RecommendationDecisionStatus
): RecommendationDecision {
  const decisions = loadDecisions().filter((d) => d.recommendationId !== recommendationId)
  const decision: RecommendationDecision = { recommendationId, type, status, decidedAt: new Date().toISOString() }
  persistDecisions([...decisions, decision])
  return decision
}

/** Remove recomendações já `accepted`/`dismissed` — `review_later` continua visível na próxima geração. */
export function filterActiveRecommendations<T extends { id: string }>(
  recommendations: T[],
  decisions: RecommendationDecision[] = loadDecisions()
): T[] {
  const hidden = new Set(
    decisions.filter((d) => d.status === 'accepted' || d.status === 'dismissed').map((d) => d.recommendationId)
  )
  return recommendations.filter((r) => !hidden.has(r.id))
}

export function resetRecommendationDecisions(): void {
  persistDecisions([])
}
