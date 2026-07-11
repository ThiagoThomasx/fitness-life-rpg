"use client"

import type { InsightsData } from "@/lib/insights"

type Props = {
  data: InsightsData
  totalXp: number
}

export function SummarySection({ data, totalXp }: Props) {
  const cards = [
    { icon: "🏋️", iconClass: "metric-card__icon--accent", label: "Treinos registrados", value: data.totalWorkouts },
    { icon: "⭐", iconClass: "metric-card__icon--streak", label: "XP total", value: totalXp.toLocaleString("pt-BR") },
    { icon: "🏆", iconClass: "metric-card__icon--level", label: "Recordes pessoais", value: data.totalPrs },
    { icon: "📓", iconClass: "metric-card__icon--info", label: "Entradas no diário", value: Math.floor(data.totalXpDiary / 10) },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((c) => (
        <div key={c.label} className="metric-card">
          <div className={`metric-card__icon ${c.iconClass}`} aria-hidden="true">{c.icon}</div>
          <div className="metric-card__value numeric">{c.value}</div>
          <div className="metric-card__label">{c.label}</div>
        </div>
      ))}
    </div>
  )
}
