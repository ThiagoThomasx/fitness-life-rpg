"use client"

import { useRouter } from "next/navigation"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { NutritionWeek } from "@/lib/insights"
import { CHART_COLORS, MACRO_COLORS } from "@/lib/theme-colors"
import { ChartHeader, TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "./ChartCard"

type Props = {
  weeks: NutritionWeek[]
}

export function NutritionSection({ weeks }: Props) {
  const router = useRouter()

  if (weeks.length === 0) {
    return (
      <section className="card card--interactive nutrition-cta" onClick={() => router.push("/nutricao")}>
        <div className="nutrition-cta__icon" aria-hidden="true">🥗</div>
        <div className="nutrition-cta__body">
          <div className="nutrition-cta__title">Nutrição</div>
          <div className="nutrition-cta__desc">Registre suas refeições para ver insights de macros e calorias</div>
        </div>
        <span className="nutrition-cta__chevron">›</span>
      </section>
    )
  }

  const chartData = weeks.map((w) => ({
    week: w.week,
    kcal: w.avgCalories,
    proteína: w.totalProtein,
    carboidrato: w.totalCarbs,
    gordura: w.totalFat,
  }))

  const macros = [
    { label: "Proteína", key: "proteína" as const, color: MACRO_COLORS.protein },
    { label: "Carboidrato", key: "carboidrato" as const, color: MACRO_COLORS.carbs },
    { label: "Gordura", key: "gordura" as const, color: MACRO_COLORS.fat },
  ]

  return (
    <section className="card">
      <div className="nutrition-card__header">
        <ChartHeader title="Nutrição semanal" description="Média calórica diária por semana" />
        <button onClick={() => router.push("/nutricao")} className="nutrition-card__link">
          Registrar →
        </button>
      </div>

      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={chartData} barSize={18}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} unit=" kcal" />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--color-surface-hover)" }} formatter={(v) => [`${v} kcal`, "Média diária"]} />
          <Bar dataKey="kcal" fill={CHART_COLORS.quaternary} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="nutrition-macros">
        {macros.map(({ label, key, color }) => {
          const total = chartData.reduce((s, w) => s + w[key], 0)
          return (
            <div key={label} className="nutrition-macro">
              <div className="nutrition-macro__label">{label}</div>
              <div className="nutrition-macro__value numeric" style={{ color }}>{total}g</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
