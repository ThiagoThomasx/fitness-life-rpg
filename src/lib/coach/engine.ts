// Ponto de entrada único do Coach Mode — Sprint 26 Parte 1/3.
//
// Mesmo padrão de `analytics/dashboard.buildDashboardAnalytics`: compõe
// sinais + regras + prioridade + decisões em uma única chamada que a UI
// invoca. Recalcula tudo a cada chamada (regra "RECÁLCULO" da spec) — só as
// decisões do usuário persistem entre chamadas (`decisions.ts`).

import { buildCoachSignals } from './signals'
import { assembleRecommendations } from './recommendations'
import type { AnalyticsPeriod } from '../analytics/types'
import type { CoachRecommendation } from './types'

export interface CoachReport {
  period: AnalyticsPeriod
  generatedAt: string
  recommendations: CoachRecommendation[]
  high: CoachRecommendation[]
  medium: CoachRecommendation[]
  low: CoachRecommendation[]
}

export function runCoachEngine(period: AnalyticsPeriod, now: Date = new Date()): CoachReport {
  const signals = buildCoachSignals(period, now)
  const recommendations = assembleRecommendations(signals, now)

  return {
    period,
    generatedAt: signals.generatedAt,
    recommendations,
    high: recommendations.filter((r) => r.priority === 'high'),
    medium: recommendations.filter((r) => r.priority === 'medium'),
    low: recommendations.filter((r) => r.priority === 'low'),
  }
}
