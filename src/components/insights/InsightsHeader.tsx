"use client"

import type { InsightsData } from "@/lib/insights"

type Props = {
  data: InsightsData
  totalXp: number
  goal: { label: string; icon: string } | null
}

export function InsightsHeader({ data, totalXp, goal }: Props) {
  const weekWorkouts = data.weekVolumes.at(-1)?.workouts ?? 0

  return (
    <section className="insights-hero">
      <div className="insights-hero__backdrop" />
      <div className="insights-hero__glow" />
      <div className="insights-hero__content">
        <div className="insights-hero__eyebrow">Análise de evolução</div>
        <h1 className="display-heading insights-hero__title">Insights</h1>
        <p className="insights-hero__subtitle">Sua evolução em dados</p>

        <div className="insights-hero__chips">
          <div className="insights-chip">
            <span className="insights-chip__icon" aria-hidden="true">📅</span>
            <div>
              <div className="insights-chip__label">Esta semana</div>
              <div className="insights-chip__value">
                {weekWorkouts} treino{weekWorkouts !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <div className="insights-chip">
            <span className="insights-chip__icon" aria-hidden="true">⭐</span>
            <div>
              <div className="insights-chip__label">XP total</div>
              <div className="insights-chip__value numeric">{totalXp.toLocaleString("pt-BR")}</div>
            </div>
          </div>
          {goal && (
            <div className="insights-chip insights-chip--accent">
              <span className="insights-chip__icon" aria-hidden="true">{goal.icon}</span>
              <div>
                <div className="insights-chip__label">Objetivo</div>
                <div className="insights-chip__value">{goal.label}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
