// Motor de prioridade e confiança do Coach — Sprint 26 Parte 2.
//
// Nunca usa IA nem heurística estatística opaca: prioridade deriva do
// `weight` (0-1) que a própria regra atribuiu ao achado (quantidade de
// evidência, impacto, repetição — calculado em `rules.ts` a partir de
// números reais dos motores), e confiança deriva só do tamanho de amostra.
// Duas escalas fixas e documentadas, nada aprendido.

import type { CoachConfidence, CoachPriority, CoachRuleFinding } from './types'

const HIGH_PRIORITY_WEIGHT = 0.7
const MEDIUM_PRIORITY_WEIGHT = 0.4

const HIGH_CONFIDENCE_SAMPLE = 6
const MEDIUM_CONFIDENCE_SAMPLE = 3

/**
 * `weight` já é o impacto normalizado calculado pela regra. Prioridade "alta"
 * exige tanto impacto alto quanto confiança não-baixa — um achado com pouca
 * amostra nunca vira prioridade alta, mesmo que o desvio pareça grande,
 * porque pouca amostra é justamente o cenário onde o desvio é mais provável
 * de ser ruído.
 */
export function computePriority(finding: CoachRuleFinding): CoachPriority {
  const confidence = computeConfidence(finding)
  if (finding.weight >= HIGH_PRIORITY_WEIGHT && confidence !== 'low') return 'high'
  if (finding.weight >= MEDIUM_PRIORITY_WEIGHT) return 'medium'
  return 'low'
}

export function computeConfidence(finding: CoachRuleFinding): CoachConfidence {
  if (finding.sampleSize >= HIGH_CONFIDENCE_SAMPLE) return 'high'
  if (finding.sampleSize >= MEDIUM_CONFIDENCE_SAMPLE) return 'medium'
  return 'low'
}
