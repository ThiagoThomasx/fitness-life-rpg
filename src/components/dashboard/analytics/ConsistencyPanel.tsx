"use client"

import type { ConsistencyReport } from "@/lib/analytics/consistency"
import { formatMonthLabel } from "./analytics-ui"

type ConsistencyPanelProps = {
  consistency: ConsistencyReport
}

function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`
}

/**
 * Painel Consistência — aderência (semanal/mensal), sequência de dias
 * treinados, semanas perfeitas e melhor/pior mês. Só indicadores
 * independentes em `.stat-cell` (mesmo padrão de `MetricsGrid`/
 * `ReadinessOverviewCard`) — sem score único combinando os campos
 * (CLAUDE.md/brief: "Não criar um score único do usuário").
 */
export function ConsistencyPanel({ consistency }: ConsistencyPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="stat-grid stat-grid--3">
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{formatRate(consistency.weeklyAdherenceRate)}</div>
          <div className="stat-cell__label">Aderência semanal</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{formatRate(consistency.monthlyAdherenceRate)}</div>
          <div className="stat-cell__label">Aderência mensal</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{consistency.perfectWeeksCount}</div>
          <div className="stat-cell__label">Semanas perfeitas</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{consistency.currentStreakDays}</div>
          <div className="stat-cell__label">Sequência atual (dias)</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{consistency.longestStreakDays}</div>
          <div className="stat-cell__label">Maior sequência (dias)</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{consistency.completedSessions}</div>
          <div className="stat-cell__label">Sessões concluídas</div>
        </div>
      </div>

      {consistency.plannedSessions > 0 && (
        <p className="text-xs text-muted">
          {consistency.completedSessions} de {consistency.plannedSessions} sessões planejadas concluídas
          {consistency.missedSessions > 0 ? ` (${consistency.missedSessions} perdidas).` : "."}
        </p>
      )}

      {(consistency.bestMonth || consistency.worstMonth) && (
        <div className="grid gap-3 md:grid-cols-2">
          {consistency.bestMonth && (
            <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
              <span className="text-xs text-muted">Melhor mês</span>
              <span className="text-sm font-semibold text-primary">
                {formatMonthLabel(consistency.bestMonth.label)} — {consistency.bestMonth.completedSessions} sessões
              </span>
            </div>
          )}
          {consistency.worstMonth && (
            <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
              <span className="text-xs text-muted">Mês com menos sessões</span>
              <span className="text-sm font-semibold text-primary">
                {formatMonthLabel(consistency.worstMonth.label)} — {consistency.worstMonth.completedSessions} sessões
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
