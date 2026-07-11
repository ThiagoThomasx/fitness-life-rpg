"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { InsightsData } from "@/lib/insights"
import { CHART_COLORS } from "@/lib/theme-colors"
import { ChartHeader, EmptyChart, TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "./ChartCard"

type Props = {
  data: InsightsData
}

export function WeekVolumeSection({ data }: Props) {
  return (
    <section className="card">
      <ChartHeader title="Volume semanal" description="Número de treinos registrados por semana" />
      {data.weekVolumes.length === 0 ? (
        <EmptyChart icon="📊" title="Sem dados" description="Complete treinos para ver o volume semanal" ctaLabel="Iniciar treino" ctaHref="/treinos" />
      ) : (
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={data.weekVolumes} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--color-surface-hover)" }} formatter={(v) => [`${v} treinos`, "Volume"]} />
            <Bar dataKey="workouts" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
