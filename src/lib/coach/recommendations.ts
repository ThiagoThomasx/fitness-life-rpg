// Montagem de recomendações do Coach — Sprint 26 Parte 2/3.
//
// Roda todas as regras (`rules.ts`) sobre os sinais (`signals.ts`), computa
// prioridade/confiança (`priority.ts`), aplica decisões persistidas do
// usuário (`decisions.ts`) e ordena por prioridade. "Aceitar" ou "ignorar"
// aqui NUNCA aplica a mudança sozinho — só esconde/marca a recomendação,
// igual ao padrão já usado por `adaptive-recommendation-decisions.ts`.

import { buildRecommendationId, comparePriority } from './helpers'
import { computeConfidence, computePriority } from './priority'
import { COACH_RULES } from './rules'
import { getCoachDecisions, type CoachDecision } from './decisions'
import type { CoachRecommendation, CoachRecommendationStatus } from './types'
import type { CoachSignals } from './signals'

/** Uma recomendação "aceita" deixa de ser reforçada como ativa após esse prazo — sinaliza que os dados podem ter mudado e vale reavaliar, sem apagar o histórico da decisão. */
const ACCEPTED_EXPIRY_DAYS = 14

function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(fromIso).getTime()
  return (to.getTime() - from) / (1000 * 60 * 60 * 24)
}

function resolveStatus(decision: CoachDecision | undefined, now: Date): CoachRecommendationStatus {
  if (!decision) return 'nova'
  if (decision.status === 'aceita' && daysBetween(decision.decidedAt, now) > ACCEPTED_EXPIRY_DAYS) {
    return 'expirada'
  }
  return decision.status
}

/**
 * Gera a lista completa de recomendações ativas para os sinais informados.
 * Regras que produzem múltiplos achados (ex.: um por grupo muscular) viram
 * múltiplas recomendações independentes, cada uma com id determinístico
 * próprio (`buildRecommendationId`).
 */
export function assembleRecommendations(
  signals: CoachSignals,
  now: Date = new Date(),
  decisions: CoachDecision[] = getCoachDecisions()
): CoachRecommendation[] {
  const decisionsById = new Map(decisions.map((d) => [d.recommendationId, d]))
  const recommendations: CoachRecommendation[] = []

  for (const rule of COACH_RULES) {
    const findings = rule.evaluate(signals)
    for (const finding of findings) {
      const id = buildRecommendationId(rule.id, signals.period, finding.scopeKey)
      recommendations.push({
        id,
        ruleId: rule.id,
        category: finding.category,
        priority: computePriority(finding),
        confidence: computeConfidence(finding),
        title: finding.title,
        summary: finding.summary,
        evidence: finding.evidence,
        period: signals.period,
        generatedAt: signals.generatedAt,
        suggestion: finding.suggestion,
        actions: finding.actions,
        status: resolveStatus(decisionsById.get(id), now),
      })
    }
  }

  return recommendations.sort((a, b) => comparePriority(a.priority, b.priority))
}
