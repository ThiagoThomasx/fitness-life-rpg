"use client"

import type { WeeklyIntelligenceSummary } from "@/lib/workout-intelligence"

type Props = {
  summary: WeeklyIntelligenceSummary
  improvingCount: number
  stagnantCount: number
}

function volumeDelta(current: number, previous: number): string {
  if (previous === 0) return "—"
  const delta = current - previous
  if (delta === 0) return "="
  const sign = delta > 0 ? "+" : ""
  return `${sign}${Math.round(delta)}kg`
}

export function IntelligenceStatsSection({ summary, improvingCount, stagnantCount }: Props) {
  return (
    <div className="stat-grid stat-grid--2">
      <div className="stat-cell">
        <div className="stat-cell__value numeric" style={{ color: "var(--color-accent)" }}>
          {improvingCount}
        </div>
        <div className="stat-cell__label">Exercícios evoluindo</div>
      </div>
      <div className="stat-cell">
        <div className="stat-cell__value numeric">
          {stagnantCount}
        </div>
        <div className="stat-cell__label">Exercícios estagnados</div>
      </div>
      <div className="stat-cell">
        <div className="stat-cell__value numeric">
          {summary.currentWeekPrs}
        </div>
        <div className="stat-cell__label">PRs esta semana</div>
      </div>
      <div className="stat-cell">
        <div
          className="stat-cell__value numeric"
          style={{
            color:
              summary.currentWeekVolume >= summary.previousWeekVolume
                ? "var(--color-accent)"
                : "var(--color-danger, #f87171)",
          }}
        >
          {volumeDelta(summary.currentWeekVolume, summary.previousWeekVolume)}
        </div>
        <div className="stat-cell__label">Volume vs semana passada</div>
      </div>
    </div>
  )
}
