// Fundação do módulo de Analytics — Sprint 25 Parte 1.
//
// Só vocabulário compartilhado aqui: tipos primitivos que TODOS os motores
// futuros (Performance, Consistência, Balanceamento Muscular, Fadiga,
// Progresso, Dashboard, Insights — Partes 2-4) vão reutilizar. Tipos de
// resultado específicos de cada motor ficam nos próprios arquivos desses
// motores, importando apenas os primitivos daqui. Nenhuma lógica de negócio
// neste arquivo — só shapes.

/**
 * Filtro de período usado em toda a superfície de Analytics (seletor de
 * período no dashboard). Mantido como union fechada — não é um enum livre —
 * para casar 1:1 com as 6 opções exigidas pela sprint: 7 dias, 30 dias,
 * 90 dias, 6 meses, 1 ano, Tudo.
 */
export type AnalyticsPeriod = '7d' | '30d' | '90d' | '6m' | '1y' | 'all'

export interface DateRange {
  start: Date
  end: Date
}

/**
 * Vocabulário de direção de tendência compartilhado por todos os motores de
 * Analytics. Mesma união usada por `ExerciseTrendDirection`
 * (`exercise-intelligence.ts`) — reaproveitada aqui em vez de redefinida,
 * porque as duas descrevem exatamente o mesmo conceito (comparação
 * janela-atual vs. janela-anterior) e nenhum motor de Analytics precisa do
 * estado extra `irregular` que `TrendClassification`
 * (`trend-math.ts`, usado por séries de regressão linear) expõe.
 */
export type TrendDirection = 'increasing' | 'stable' | 'decreasing' | 'insufficient_data'

/**
 * Shape genérico usado pelo futuro motor de Performance (Parte 2) para
 * descrever a evolução de uma métrica ao longo de um período.
 */
export interface MetricEvolution {
  metric: string
  direction: TrendDirection
  changePercent: number | null
  velocity: number | null
  stability: 'stable' | 'volatile' | 'unknown'
  sampleConfidence: 'low' | 'medium' | 'high' | 'insufficient'
  explanation: string
  period: AnalyticsPeriod
}

/**
 * Shape genérico de insight observacional (não uma recomendação de ação —
 * ver `AdaptivePlanRecommendation` em `adaptive-recommendations.ts` para o
 * padrão irmão voltado a ações sugeridas). Usado pelos futuros motores de
 * Insights/Dashboard (Partes 3-4).
 */
export interface AnalyticsInsight {
  id: string
  category: string
  severity: 'info' | 'attention' | 'notable'
  title: string
  explanation: string
  evidence: string[]
  period: AnalyticsPeriod
}
