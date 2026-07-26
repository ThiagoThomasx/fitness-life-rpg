"use client"

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartHeader, EmptyChart, GRID_STROKE, AXIS_TICK, TOOLTIP_STYLE } from "@/components/insights/ChartCard"
import { CHART_COLORS } from "@/lib/theme-colors"
import { summaryMetricValue, type DailyHealthSummary, type HealthMetricType } from "@/lib/health-data"
import type { HealthRecoveryMetricView } from "@/lib/health-data"
import { formatDateShort, formatDelta, trendBadgeClass, TREND_LABELS } from "./health-recovery-ui"

type Props = {
  icon: string
  title: string
  description: string
  view: HealthRecoveryMetricView
  dailySeries: DailyHealthSummary[]
  metric: HealthMetricType
  unit: string
  formatValue?: (value: number) => string
  emptyDescription: string
  chartColor?: string
}

/**
 * Seção genérica reutilizada por sono, FC de repouso, passos, atividade,
 * calorias ativas e distância — evita seis componentes quase idênticos
 * (DRY). A diferença entre métricas é só rótulo, unidade e formatação de
 * valor, passados como props.
 */
export function HealthRecoveryMetricSection({
  icon,
  title,
  description,
  view,
  dailySeries,
  metric,
  unit,
  formatValue,
  emptyDescription,
  chartColor = CHART_COLORS.primary,
}: Props) {
  const format = formatValue ?? ((v: number) => `${Math.round(v)}${unit}`)

  const series = dailySeries
    .map((s) => ({ date: s.date, value: summaryMetricValue(s, metric) }))
    .filter((p): p is { date: string; value: number } => p.value !== undefined)

  return (
    <section className="card" aria-labelledby={`health-${metric}-title`}>
      <ChartHeader title={`${icon} ${title}`} description={description} />

      {series.length === 0 ? (
        <EmptyChart icon={icon} title="Sem dados suficientes" description={emptyDescription} />
      ) : (
        <>
          <div className="stat-grid stat-grid--3" style={{ marginBottom: "var(--space-3)" }}>
            <div className="stat-cell">
              <div className="stat-cell__value numeric">{view.latestValue !== null ? format(view.latestValue) : "—"}</div>
              <div className="stat-cell__label">Mais recente</div>
            </div>
            <div className="stat-cell">
              <div className="stat-cell__value numeric">{view.baseline ? format(view.baseline.value) : "—"}</div>
              <div className="stat-cell__label">
                {view.baseline ? `Baseline (${view.baseline.sampleSize}d)` : "Sem baseline"}
              </div>
            </div>
            <div className="stat-cell">
              <div className="stat-cell__value numeric">
                {view.baseline ? formatDelta(view.deltaFromBaseline, unit, unit === "km" ? 1 : 0) : "—"}
              </div>
              <div className="stat-cell__label">Vs. baseline</div>
            </div>
          </div>

          {!view.baseline && (
            <p className="text-xs text-muted" style={{ marginBottom: "var(--space-2)" }}>
              São necessários mais dados para criar uma linha de base.
            </p>
          )}

          <span className={trendBadgeClass(view.trend.direction)} style={{ marginBottom: "var(--space-2)", display: "inline-block" }}>
            {TREND_LABELS[view.trend.direction]}
          </span>

          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDateShort} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => formatDateShort(String(v))} formatter={(v) => [format(Number(v)), title]} />
              <Line type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2.5} dot={{ fill: chartColor, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>

          <p className="text-xs text-muted" style={{ marginTop: "var(--space-2)" }}>
            {view.sampleDays} dia(s) com dado no período
            {view.baseline ? `, ${view.daysAboveBaseline} acima e ${view.daysBelowBaseline} abaixo da baseline` : ""}.
          </p>
        </>
      )}
    </section>
  )
}
