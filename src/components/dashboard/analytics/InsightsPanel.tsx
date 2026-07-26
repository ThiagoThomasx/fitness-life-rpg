"use client"

import type { AnalyticsInsight } from "@/lib/analytics/types"
import { INSIGHT_SEVERITY_LABELS, insightBadgeClass } from "./analytics-ui"

type InsightsPanelProps = {
  insights: AnalyticsInsight[]
}

/**
 * Painel Insights — `generateInsights()` já entrega texto observacional
 * (nunca prescritivo) com evidência numérica citada; esta camada só
 * renderiza como cards, sem reescrever ou intensificar o tom (nada de
 * ícones de alerta/cores agressivas fora do vocabulário de severidade já
 * usado no resto do app).
 */
export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) {
    return (
      <p className="text-xs text-muted">
        Nenhum insight disponível ainda para este período — insights aparecem conforme padrões consistentes surgem no histórico.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {insights.map((insight) => (
        <div key={insight.id} className="target-card" style={{ textAlign: "left", cursor: "default" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-primary">{insight.title}</span>
            <span className={insightBadgeClass(insight.severity)}>{INSIGHT_SEVERITY_LABELS[insight.severity]}</span>
          </div>
          <p className="text-xs text-muted">{insight.explanation}</p>
          <ul className="text-xs text-muted" style={{ marginTop: "var(--space-1)", paddingLeft: "var(--space-4)" }}>
            {insight.evidence.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
