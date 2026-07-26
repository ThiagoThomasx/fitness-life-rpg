// Fundação do Coach Mode — Sprint 26 Parte 1.
//
// Só vocabulário compartilhado aqui: shapes que `signals.ts`, `rules.ts`,
// `priority.ts`, `explanations.ts`, `recommendations.ts`, `decisions.ts` e
// `engine.ts` reutilizam. Nenhuma lógica de negócio neste arquivo. O Coach
// nunca recalcula dado nenhum dos motores existentes — ele só interpreta o
// que eles já produzem (ver cabeçalho de `engine.ts` para a composição).

import type { AnalyticsPeriod } from '../analytics/types'

/**
 * As 9+ categorias exigidas pela sprint. `program` cobre tanto aderência alta
 * (reforço positivo) quanto baixa; `records` cobre conquistas recentes.
 */
export type CoachCategory =
  | 'recovery'
  | 'consistency'
  | 'frequency'
  | 'progression'
  | 'volume'
  | 'muscle_balance'
  | 'training_load'
  | 'records'
  | 'stagnation'
  | 'program'

export type CoachPriority = 'low' | 'medium' | 'high'

export type CoachConfidence = 'low' | 'medium' | 'high'

/** Estado de decisão do usuário sobre uma recomendação específica. Ver `decisions.ts`. */
export type CoachRecommendationStatus = 'nova' | 'visualizada' | 'ignorada' | 'aceita' | 'expirada'

export type CoachActionKind = 'exercise' | 'workout' | 'program' | 'history' | 'planner'

/**
 * Uma ação sugerida é sempre um link de navegação — nunca uma mutação
 * automática (regra "NÃO IMPLEMENTAR" da sprint). `id` é opcional porque
 * algumas ações apontam para uma rota geral (ex.: Planner) sem entidade.
 */
export interface CoachAction {
  kind: CoachActionKind
  label: string
  id?: string
}

/**
 * Achado bruto de uma regra, antes de prioridade/confiança serem calculadas
 * (isso é responsabilidade de `priority.ts`, nunca da própria regra — mantém
 * a regra descrevendo só "o que foi observado", não "quão importante é").
 * Uma regra pode produzir 0+ achados (ex.: uma por exercício estagnado).
 */
export interface CoachRuleFinding {
  category: CoachCategory
  title: string
  summary: string
  evidence: string[]
  /** Tamanho da amostra que sustenta o achado (sessões, check-ins, execuções) — usado por `computeConfidence`. */
  sampleSize: number
  /** Impacto normalizado (0-1) usado por `computePriority` — quão fora do esperado a condição está. */
  weight: number
  actions: CoachAction[]
  /** Diferencia achados da MESMA regra (ex.: id do exercício, grupo muscular) para gerar ids estáveis e distintos. */
  scopeKey?: string
  suggestion: string
}

export interface CoachRule {
  id: string
  category: CoachCategory
  evaluate: (signals: import('./signals').CoachSignals) => CoachRuleFinding[]
}

/** Recomendação final, pronta para a UI — achado + prioridade/confiança computadas + status de decisão do usuário. */
export interface CoachRecommendation {
  id: string
  ruleId: string
  category: CoachCategory
  priority: CoachPriority
  confidence: CoachConfidence
  title: string
  summary: string
  evidence: string[]
  period: AnalyticsPeriod
  generatedAt: string
  suggestion: string
  actions: CoachAction[]
  status: CoachRecommendationStatus
}
