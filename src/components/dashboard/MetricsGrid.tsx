"use client"

import type { WeeklyProgress } from "@/lib/weekly-progress"

type Props = {
  weeklyProgress: WeeklyProgress | null
  totalWorkouts: number
  totalXp: number
}

export function MetricsGrid({ weeklyProgress, totalWorkouts, totalXp }: Props) {
  const metrics = [
    {
      icon: "🏋️",
      iconClass: "metric-card__icon--accent",
      label: "Treinos na semana",
      value: weeklyProgress ? `${weeklyProgress.workoutCount}/${weeklyProgress.workoutTarget}` : "–",
      highlight: true,
    },
    {
      icon: "⭐",
      iconClass: "metric-card__icon--streak",
      label: "XP na semana",
      value: weeklyProgress ? `+${weeklyProgress.totalXp}` : "–",
      highlight: false,
    },
    {
      icon: "🎯",
      iconClass: "metric-card__icon--level",
      label: "Total de treinos",
      value: String(totalWorkouts),
      highlight: false,
    },
    {
      icon: "⚡",
      iconClass: "metric-card__icon--info",
      label: "XP acumulado",
      value: Math.floor(totalXp).toLocaleString("pt-BR"),
      highlight: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="metric-card">
          <div className={`metric-card__icon ${metric.iconClass}`} aria-hidden="true">
            {metric.icon}
          </div>
          <div className={`metric-card__value${metric.highlight ? " metric-card__value--accent" : ""}`}>
            {metric.value}
          </div>
          <div className="metric-card__label">{metric.label}</div>
        </div>
      ))}
    </div>
  )
}
