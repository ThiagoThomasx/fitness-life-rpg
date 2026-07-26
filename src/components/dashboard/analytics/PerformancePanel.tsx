"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts"
import { TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK, ChartHeader, EmptyChart } from "@/components/insights/ChartCard"
import { CHART_COLORS } from "@/lib/theme-colors"
import type { DashboardPerformanceSection } from "@/lib/analytics/dashboard"
import { METRIC_LABELS, DIRECTION_LABELS, DIRECTION_ICON, directionBadgeClass, formatPercent, formatKg } from "./analytics-ui"

type PerformancePanelProps = {
  performance: DashboardPerformanceSection
}

/**
 * Painel Performance — evolução das 5 métricas agregadas do período (vs.
 * período anterior), exercícios em maior evolução e exercícios estagnados.
 * Único gráfico desta seção: barras de variação percentual por métrica — não
 * há série temporal diária disponível no motor (`computePerformanceEvolution`
 * só compara janela atual vs. anterior), então um gráfico de linha "bonito"
 * inventaria pontos que não existem. A barra de variação é o gráfico que
 * agrega valor real aqui (CLAUDE.md: nada de gráfico decorativo).
 */
export function PerformancePanel({ performance }: PerformancePanelProps) {
  const chartData = performance.evolution
    .filter((e) => e.changePercent !== null)
    .map((e) => ({
      metric: METRIC_LABELS[e.metric as keyof typeof METRIC_LABELS],
      changePercent: Math.round(e.changePercent as number),
    }))

  return (
    <div className="flex flex-col gap-4">
      <section>
        <ChartHeader title="Variação por métrica" description="Comparação com o período anterior de duração igual" />
        {chartData.length === 0 ? (
          <EmptyChart icon="📊" title="Sem comparação disponível" description="Dados insuficientes para comparar com o período anterior" />
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="metric" tick={AXIS_TICK} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Variação"]} />
              <Bar dataKey="changePercent" radius={[0, 4, 4, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.changePercent >= 0 ? CHART_COLORS.primary : CHART_COLORS.tertiary} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section>
        <h3 className="section-label">Evolução das métricas</h3>
        <div className="flex flex-col gap-2">
          {performance.evolution.map((e) => (
            <div key={e.metric} className="target-card" style={{ textAlign: "left", cursor: "default" }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">{METRIC_LABELS[e.metric as keyof typeof METRIC_LABELS]}</span>
                <span className={directionBadgeClass(e.direction)}>
                  {DIRECTION_ICON[e.direction]} {DIRECTION_LABELS[e.direction]}
                </span>
              </div>
              <p className="text-xs text-muted">{e.explanation}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <section>
          <h3 className="section-label">Maior evolução</h3>
          {performance.topEvolving.length === 0 ? (
            <p className="text-xs text-muted">Sem exercícios com evolução suficiente no histórico ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {performance.topEvolving.map((entry) => (
                <div key={entry.exerciseId} className="exercise-record-card">
                  <span className="text-sm font-semibold text-primary">{entry.exerciseName}</span>
                  <span className="text-xs text-muted">
                    {formatKg(entry.earliestWeightKg)} → {formatKg(entry.latestWeightKg)} ({formatPercent(entry.deltaPercent)})
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="section-label">Exercícios estagnados</h3>
          {performance.stagnant.length === 0 ? (
            <p className="text-xs text-muted">Nenhum exercício estagnado identificado no histórico.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {performance.stagnant.map((entry) => (
                <div key={entry.exerciseId} className="exercise-record-card">
                  <span className="text-sm font-semibold text-primary">{entry.exerciseName}</span>
                  <span className="text-xs text-muted">
                    {formatKg(entry.earliestWeightKg)} → {formatKg(entry.latestWeightKg)} ({formatPercent(entry.deltaPercent)})
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
