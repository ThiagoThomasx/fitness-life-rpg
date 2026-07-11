"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { InsightsData } from "@/lib/insights"
import { CHART_COLORS } from "@/lib/theme-colors"
import { ChartHeader, EmptyChart, TOOLTIP_STYLE, GRID_STROKE } from "./ChartCard"

type Props = {
  data: InsightsData
}

const SERIES_COLORS = [CHART_COLORS.primary, CHART_COLORS.tertiary, CHART_COLORS.secondary]

export function ExerciseLoadSection({ data }: Props) {
  return (
    <section className="card">
      <ChartHeader title="Evolução de carga" description="Progressão do peso máximo nos seus exercícios principais" />
      {data.topExerciseLoads.length === 0 ? (
        <EmptyChart
          icon="📈"
          title="Sem dados suficientes"
          description="Registre ao menos 2 sessões do mesmo exercício para ver a evolução de carga"
          ctaLabel="Ir para treinos"
          ctaHref="/treinos"
        />
      ) : (
        <div className="exercise-load">
          {data.topExerciseLoads.map((ex, i) => {
            const color = SERIES_COLORS[i % SERIES_COLORS.length]
            return (
              <div key={ex.exerciseId}>
                <div className="exercise-load__header">
                  <div className="exercise-load__dot" style={{ background: color }} />
                  <span className="exercise-load__label">{ex.exerciseName}</span>
                </div>
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={ex.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "var(--color-text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} unit="kg" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, "Carga máx."]} />
                    <Line type="monotone" dataKey="maxWeight" stroke={color} strokeWidth={2.5} dot={{ fill: color, r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
