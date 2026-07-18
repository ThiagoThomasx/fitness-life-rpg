// Analytics puros sobre revisões de ciclo — Sprint 17.1.
// Não infere causalidade: apenas agrega o que o usuário já registrou.

import type { CycleReview, ReviewScale } from './training-cycle-reviews'

export interface CycleReviewAnalytics {
  totalReviews: number
  averagePerceivedProgress: number | null
  averagePerceivedRecovery: number | null
  averageSatisfaction: number | null
  lastReview: CycleReview | null
  midCycleReview: CycleReview | null
  endCycleReview: CycleReview | null
  /** Diferença (final - meio de ciclo) na satisfação percebida, quando ambas existem. */
  satisfactionVariation: number | null
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  const sum = values.reduce((s, v) => s + v, 0)
  return Math.round((sum / values.length) * 10) / 10
}

function collectScale(
  reviews: CycleReview[],
  field: 'perceivedProgress' | 'perceivedRecovery' | 'satisfaction'
): number[] {
  return reviews
    .map((r) => r[field])
    .filter((v): v is ReviewScale => v !== undefined)
}

/** Recebe as revisões já filtradas para um ciclo (ver `getReviewsByCycle`). */
export function buildCycleReviewAnalytics(reviews: CycleReview[]): CycleReviewAnalytics {
  const sorted = [...reviews].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const midCycleReview = sorted.find((r) => r.phase === 'mid_cycle') ?? null
  const endCycleReview = [...sorted].reverse().find((r) => r.phase === 'end_cycle') ?? null

  let satisfactionVariation: number | null = null
  if (midCycleReview?.satisfaction !== undefined && endCycleReview?.satisfaction !== undefined) {
    satisfactionVariation = endCycleReview.satisfaction - midCycleReview.satisfaction
  }

  return {
    totalReviews: sorted.length,
    averagePerceivedProgress: average(collectScale(sorted, 'perceivedProgress')),
    averagePerceivedRecovery: average(collectScale(sorted, 'perceivedRecovery')),
    averageSatisfaction: average(collectScale(sorted, 'satisfaction')),
    lastReview: sorted.length > 0 ? sorted[sorted.length - 1] : null,
    midCycleReview,
    endCycleReview,
    satisfactionVariation,
  }
}
