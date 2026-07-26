"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts"
import { TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK, ChartHeader, EmptyChart } from "@/components/insights/ChartCard"
import { CHART_COLORS } from "@/lib/theme-colors"
import type { DashboardMuscleBalanceSection } from "@/lib/analytics/dashboard"

type MuscleBalancePanelProps = {
  muscleBalance: DashboardMuscleBalanceSection
}

function formatRatio(ratio: number | null): string {
  return ratio === null ? "—" : `${ratio.toFixed(2)}:1`
}

/**
 * Painel Músculos — distribuição de séries por grupo muscular (bar chart —
 * único gráfico que agrega valor real aqui, mostra a fatia de cada grupo de
 * uma vez) e razões push/pull e superior/inferior. Um radar com só 2-4 eixos
 * ficaria esparso e menos honesto que um comparativo direto de duas barras —
 * por isso as razões são renderizadas como par de `.stat-cell`, não radar
 * (brief: "apenas se realmente útil").
 */
export function MuscleBalancePanel({ muscleBalance }: MuscleBalancePanelProps) {
  const chartData = muscleBalance.distribution
    .slice()
    .sort((a, b) => b.participationPercent - a.participationPercent)
    .map((d) => ({
      label: d.label,
      participationPercent: Math.round(d.participationPercent),
      muscleGroup: d.muscleGroup,
    }))

  const { neglectedGroups, excessiveGroups, pushPullRatio, upperLowerRatio } = muscleBalance.imbalances

  return (
    <div className="flex flex-col gap-4">
      <section>
        <ChartHeader title="Distribuição por grupo muscular" description="Percentual do total de séries do período" />
        {chartData.every((d) => d.participationPercent === 0) ? (
          <EmptyChart icon="🏋️" title="Sem séries registradas" description="Registre treinos para ver a distribuição por grupo muscular" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Participação"]} />
              <Bar dataKey="participationPercent" radius={[0, 4, 4, 0]}>
                {chartData.map((d) => (
                  <Cell
                    key={d.muscleGroup}
                    fill={excessiveGroups.includes(d.muscleGroup) ? CHART_COLORS.tertiary : CHART_COLORS.primary}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <div className="stat-grid stat-grid--2">
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{formatRatio(pushPullRatio.ratio)}</div>
          <div className="stat-cell__label">Empurrar : Puxar</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{formatRatio(upperLowerRatio.ratio)}</div>
          <div className="stat-cell__label">Superior : Inferior</div>
        </div>
      </div>

      {(neglectedGroups.length > 0 || excessiveGroups.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {neglectedGroups.length > 0 && (
            <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
              <span className="text-xs text-muted">Grupos negligenciados</span>
              <span className="text-sm font-semibold text-primary">
                {neglectedGroups.map((g) => chartData.find((d) => d.muscleGroup === g)?.label ?? g).join(", ")}
              </span>
            </div>
          )}
          {excessiveGroups.length > 0 && (
            <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
              <span className="text-xs text-muted">Grupos excessivos</span>
              <span className="text-sm font-semibold text-primary">
                {excessiveGroups.map((g) => chartData.find((d) => d.muscleGroup === g)?.label ?? g).join(", ")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
