"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { InsightsData } from "@/lib/insights"
import { CHART_COLORS } from "@/lib/theme-colors"
import { ChartHeader, EmptyChart, TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "./ChartCard"

type Props = {
  data: InsightsData
}

export function DayFrequencySection({ data }: Props) {
  const total = data.dayFrequency.reduce((s, d) => s + d.count, 0)

  return (
    <section className="card">
      <ChartHeader title="Dias mais treinados" description="Distribuição de frequência por dia da semana" />
      {total === 0 ? (
        <EmptyChart icon="📅" title="Sem dados" description="Complete treinos para ver seus dias favoritos" />
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data.dayFrequency} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--color-surface-hover)" }} formatter={(v) => [`${v} treinos`, ""]} />
            <Bar dataKey="count" fill={CHART_COLORS.secondary} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
