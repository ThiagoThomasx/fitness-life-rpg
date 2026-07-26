// Camada de explicabilidade do Coach — Sprint 26 Parte 2.
//
// Toda recomendação já carrega título/resumo/evidências/sugestão (ver
// `types.ts`) — este módulo só garante o shape estruturado exigido pela
// spec ("Título, Resumo, Evidências, Período analisado, Regra aplicada,
// Sugestão") para consumo pela UI, e mantém um registro legível do que cada
// id de regra significa (para o usuário poder responder "por que recebi
// esta recomendação?").

import { periodLabel } from './helpers'
import type { CoachRecommendation } from './types'

export interface CoachExplanation {
  title: string
  summary: string
  evidence: string[]
  periodAnalyzed: string
  ruleApplied: string
  suggestion: string
}

export function buildExplanation(recommendation: CoachRecommendation): CoachExplanation {
  return {
    title: recommendation.title,
    summary: recommendation.summary,
    evidence: recommendation.evidence,
    periodAnalyzed: periodLabel(recommendation.period),
    ruleApplied: recommendation.ruleId,
    suggestion: recommendation.suggestion,
  }
}

/** Descrição legível de cada regra — usada em `COACH-EXPLAINABILITY.md` e disponível para a UI exibir "sobre esta regra". */
export const COACH_RULE_DESCRIPTIONS: Record<string, string> = {
  'Coach.Recovery.HighLoadLowReadiness':
    'Dispara quando o volume de treino está em alta ao mesmo tempo em que a prontidão relatada nos check-ins está baixa com frequência.',
  'Coach.Load.HighLoadMajorityFatigued':
    'Dispara quando o volume de treino está em alta ao mesmo tempo em que a maioria dos grupos musculares ainda está em recuperação parcial ou fatigada.',
  'Coach.Consistency.LowAdherence':
    'Dispara quando a aderência semanal ao plano fica abaixo de 60%, com pelo menos 2 sessões planejadas no período.',
  'Coach.Program.HighAdherence':
    'Dispara quando a aderência semanal ao plano é de 90% ou mais — reforço positivo, nunca uma ação a tomar.',
  'Coach.Frequency.LongGap':
    'Dispara por grupo muscular quando o intervalo desde o último treino registrado é de 14 dias ou mais.',
  'Coach.Muscle.Neglected':
    'Dispara por grupo muscular quando o motor de Balanceamento Muscular já o classifica como negligenciado (poucas séries ou nenhuma sessão no período).',
  'Coach.Volume.Imbalance':
    'Dispara por grupo muscular quando o motor de Balanceamento Muscular já o classifica como excessivo (mais que o dobro da fatia proporcional esperada).',
  'Coach.Progress.Stagnation':
    'Dispara por exercício quando a tendência de carga (`getExerciseTrends`) está estável nas últimas execuções, com amostra mínima de 6 execuções.',
  'Coach.Records.RecentAchievement':
    'Dispara quando há pelo menos um recorde pessoal recente registrado — reforço positivo, nunca uma ação a tomar.',
  'Coach.Health.SleepDeficit':
    'Dispara quando Dados de Saúde mostram sono consistentemente abaixo da linha de base por dias seguidos (ver `analytics/fatigue.ts`) — informativo, nunca diagnóstico.',
  'Coach.Health.RestingHrElevated':
    'Dispara quando Dados de Saúde mostram frequência cardíaca de repouso consistentemente acima da linha de base por dias seguidos — informativo, nunca diagnóstico.',
  'Coach.Health.HighExternalActivity':
    'Dispara quando Dados de Saúde mostram passos ou minutos de atividade consistentemente acima da linha de base por dias seguidos, fora do treino planejado.',
  'Coach.Health.RecoveryMismatch':
    'Dispara quando carga de treino em alta coincide com sono baixo e frequência cardíaca de repouso elevada ao mesmo tempo — combinação de sinais objetivos de recuperação insuficiente.',
}
