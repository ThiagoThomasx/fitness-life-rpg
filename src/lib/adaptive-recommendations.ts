// Motor de recomendações adaptativas — Sprint 21 Parte 4A.
//
// Puro, determinístico, explicável — nada de IA externa, nada de inferência
// estatística. Cada regra cita a evidência exata que a gerou. Dado ausente
// nunca é tratado como "ruim": se não há dados suficientes, o motor não gera
// nenhuma recomendação sobre aquele aspecto em vez de adivinhar. Nenhuma
// recomendação altera o programa sozinha (seção 15 da spec) — "aceitar" só
// registra a decisão do usuário, nunca aplica a mudança automaticamente.

import type { ReadinessStats } from './workout-readiness'

export type AdaptiveRecommendationType =
  | 'maintain_plan'
  | 'reduce_frequency'
  | 'reduce_volume'
  | 'increase_volume'
  | 'reschedule_session'
  | 'insert_recovery'
  | 'review_exercise'
  | 'review_program'

export type AdaptiveRecommendationSeverity = 'info' | 'attention' | 'important'

export interface AdaptivePlanRecommendation {
  /** Determinístico por design: mesma condição + mesma janela produz o mesmo id, permitindo dedup (Fase 15). */
  id: string
  type: AdaptiveRecommendationType
  severity: AdaptiveRecommendationSeverity
  title: string
  explanation: string
  evidence: string[]
  suggestedAction?: string
}

export interface RecurringSubstitution {
  exerciseName: string
  count: number
}

/**
 * Todos os campos são opcionais e vêm de janelas recentes (ex.: últimas 2
 * semanas) — quando ausentes, as regras correspondentes simplesmente não
 * disparam. Montar este objeto é responsabilidade do chamador (que acessa
 * storage); este módulo nunca lê localStorage.
 */
export interface AdaptiveRecommendationInput {
  /** Chave da janela usada para os ids (ex.: '2026-W30') — garante que a mesma condição não gere ids diferentes a cada render. */
  windowKey: string
  programAdherenceRate?: number
  volumeCompletionRate?: number
  plannedSessionsInWindow: number
  skippedSessionsInWindow: number
  readinessStats?: ReadinessStats
  recurringSubstitutions?: RecurringSubstitution[]
}

const MIN_SESSIONS_FOR_SIGNAL = 2
const LOW_VOLUME_THRESHOLD = 0.7
const HIGH_ADHERENCE_THRESHOLD = 0.9
const HIGH_VOLUME_THRESHOLD = 0.9
const HIGH_SKIP_RATIO = 0.4
const ELEVATED_SORENESS_THRESHOLD = 4 // escala 1-5
const LOW_READINESS_SHARE_THRESHOLD = 0.5
const RECURRING_SUBSTITUTION_THRESHOLD = 3

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

export function generateAdaptiveRecommendations(input: AdaptiveRecommendationInput): AdaptivePlanRecommendation[] {
  const recommendations: AdaptivePlanRecommendation[] = []
  const hasEnoughSessions = input.plannedSessionsInWindow >= MIN_SESSIONS_FOR_SIGNAL

  // ─── Reduzir volume ───────────────────────────────────────────────────────
  if (hasEnoughSessions && input.volumeCompletionRate !== undefined && input.volumeCompletionRate < LOW_VOLUME_THRESHOLD) {
    const evidence = [`Volume executado: ${pct(input.volumeCompletionRate)} do planejado nas últimas sessões`]
    if (input.readinessStats && input.readinessStats.averageSoreness >= ELEVATED_SORENESS_THRESHOLD) {
      evidence.push(`Soreness média elevada: ${input.readinessStats.averageSoreness.toFixed(1)}/5`)
    }
    recommendations.push({
      id: `reduce_volume:${input.windowKey}`,
      type: 'reduce_volume',
      severity: 'attention',
      title: 'Considere reduzir o volume da próxima semana',
      explanation: `Você executou menos de ${pct(LOW_VOLUME_THRESHOLD)} do volume planejado recentemente.`,
      evidence,
      suggestedAction: 'Revisar séries/cargas planejadas para a próxima semana',
    })
  }

  // ─── Reduzir frequência ───────────────────────────────────────────────────
  if (hasEnoughSessions) {
    const skipRatio = input.skippedSessionsInWindow / input.plannedSessionsInWindow
    if (skipRatio > HIGH_SKIP_RATIO) {
      recommendations.push({
        id: `reduce_frequency:${input.windowKey}`,
        type: 'reduce_frequency',
        severity: 'attention',
        title: 'A frequência planejada pode não estar cabendo na sua rotina',
        explanation: `${input.skippedSessionsInWindow} de ${input.plannedSessionsInWindow} sessões planejadas foram ignoradas recentemente.`,
        evidence: [`Taxa de sessões ignoradas: ${pct(skipRatio)}`],
        suggestedAction: 'Revisar a frequência semanal do programa',
      })
    }
  }

  // ─── Inserir recuperação ──────────────────────────────────────────────────
  if (input.readinessStats && input.readinessStats.totalCheckIns >= MIN_SESSIONS_FOR_SIGNAL) {
    const stats = input.readinessStats
    const lowShare = stats.lowReadinessCount / stats.totalCheckIns
    const elevatedSoreness = stats.averageSoreness >= ELEVATED_SORENESS_THRESHOLD
    if (lowShare > LOW_READINESS_SHARE_THRESHOLD || elevatedSoreness) {
      const evidence: string[] = []
      if (lowShare > LOW_READINESS_SHARE_THRESHOLD) {
        evidence.push(`Readiness baixa em ${stats.lowReadinessCount} de ${stats.totalCheckIns} check-ins recentes`)
      }
      if (elevatedSoreness) {
        evidence.push(`Soreness média elevada: ${stats.averageSoreness.toFixed(1)}/5`)
      }
      recommendations.push({
        id: `insert_recovery:${input.windowKey}`,
        type: 'insert_recovery',
        severity: 'important',
        title: 'Sinais de recuperação baixa nos últimos check-ins',
        explanation:
          'Considere interromper ou adaptar o treino. Procure avaliação profissional caso a dor seja intensa, persistente ou esteja piorando.',
        evidence,
        suggestedAction: 'Inserir um dia extra de recuperação ou reduzir a intensidade',
      })
    }
  }

  // ─── Rever exercício recorrente ───────────────────────────────────────────
  for (const sub of input.recurringSubstitutions ?? []) {
    if (sub.count >= RECURRING_SUBSTITUTION_THRESHOLD) {
      recommendations.push({
        id: `review_exercise:${input.windowKey}:${sub.exerciseName}`,
        type: 'review_exercise',
        severity: 'info',
        title: `"${sub.exerciseName}" foi substituído repetidamente`,
        explanation: `Substituído em ${sub.count} das últimas sessões. Talvez seja melhor atualizar o próximo bloco do programa.`,
        evidence: [`${sub.count} substituições recentes`],
        suggestedAction: 'Revisar este exercício no programa',
      })
    }
  }

  // ─── Manter plano ─────────────────────────────────────────────────────────
  // Só quando não há nenhum sinal de alerta e há dados suficientes — nunca
  // "por padrão" quando os dados são insuficientes (isso seria inventar
  // estabilidade que não foi observada).
  if (
    recommendations.length === 0 &&
    hasEnoughSessions &&
    input.programAdherenceRate !== undefined &&
    input.programAdherenceRate >= HIGH_ADHERENCE_THRESHOLD &&
    (input.volumeCompletionRate === undefined || input.volumeCompletionRate >= HIGH_VOLUME_THRESHOLD)
  ) {
    const evidence = [`Adesão: ${pct(input.programAdherenceRate)}`]
    if (input.volumeCompletionRate !== undefined) evidence.push(`Volume executado: ${pct(input.volumeCompletionRate)}`)
    recommendations.push({
      id: `maintain_plan:${input.windowKey}`,
      type: 'maintain_plan',
      severity: 'info',
      title: 'O programa está funcionando bem — mantenha o plano',
      explanation: 'Sua adesão e execução recentes estão consistentes. O programa pode continuar sem ajustes.',
      evidence,
    })
  }

  return recommendations
}
