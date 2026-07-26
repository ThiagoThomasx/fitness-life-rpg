// Helpers puros compartilhados pelo Coach — Sprint 26 Parte 1.

import type { AnalyticsPeriod } from '../analytics/types'
import type { CoachConfidence, CoachPriority } from './types'

export const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  '7d': 'últimos 7 dias',
  '30d': 'últimos 30 dias',
  '90d': 'últimos 90 dias',
  '6m': 'últimos 6 meses',
  '1y': 'último ano',
  all: 'todo o histórico',
}

export function periodLabel(period: AnalyticsPeriod): string {
  return PERIOD_LABELS[period]
}

export function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

export function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const PRIORITY_ORDER: Record<CoachPriority, number> = { high: 0, medium: 1, low: 2 }
const CONFIDENCE_ORDER: Record<CoachConfidence, number> = { high: 0, medium: 1, low: 2 }

export function comparePriority(a: CoachPriority, b: CoachPriority): number {
  return PRIORITY_ORDER[a] - PRIORITY_ORDER[b]
}

export function compareConfidence(a: CoachConfidence, b: CoachConfidence): number {
  return CONFIDENCE_ORDER[a] - CONFIDENCE_ORDER[b]
}

/** Chave determinística: mesma regra + mesmo escopo + mesmo período sempre produz o mesmo id (permite dedup/decisão persistente). */
export function buildRecommendationId(ruleId: string, period: AnalyticsPeriod, scopeKey?: string): string {
  return scopeKey ? `${ruleId}:${period}:${scopeKey}` : `${ruleId}:${period}`
}
