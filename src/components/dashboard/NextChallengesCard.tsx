"use client"

import { useEffect, useState } from "react"
import { getTopChallenges, type ExerciseIntelligence } from "@/lib/workout-intelligence"

const STATUS_ICON: Record<string, string> = {
  improving: "📈",
  stable: "→",
  stagnant: "⏸",
  regressing: "📉",
  insufficient_data: "💡",
}

const REC_TYPE_COLOR: Record<string, string> = {
  increase_weight: "var(--color-accent)",
  increase_reps: "var(--color-secondary)",
  maintain: "var(--color-text-muted)",
  deload: "var(--color-danger, #f87171)",
  insufficient_data: "var(--color-text-muted)",
}

function formatGoal(item: ExerciseIntelligence): string {
  const { recommendation: rec } = item
  if (rec.suggestedWeight != null && rec.suggestedReps != null) {
    return `${rec.suggestedWeight}kg × ${rec.suggestedReps}`
  }
  if (rec.suggestedReps != null) return `${rec.suggestedReps} reps`
  return rec.reason.slice(0, 40)
}

export function NextChallengesCard() {
  const [challenges, setChallenges] = useState<ExerciseIntelligence[] | undefined>(undefined)

  useEffect(() => {
    setChallenges(getTopChallenges(5))
  }, [])

  if (challenges === undefined) return null

  if (challenges.length === 0) {
    return (
      <section className="card card--dashed flex flex-col items-center gap-2 text-center">
        <span className="text-2xl" aria-hidden="true">🎯</span>
        <p className="text-sm text-muted">
          Complete alguns treinos para ver seus próximos desafios.
        </p>
      </section>
    )
  }

  return (
    <section className="card" aria-label="Próximos desafios">
      <div className="section-label">Próximos Desafios</div>
      <div className="flex flex-col gap-2.5">
        {challenges.map((item) => (
          <div
            key={item.exerciseId}
            className="flex items-center gap-2.5"
          >
            <span aria-hidden="true" className="text-base flex-shrink-0">
              {STATUS_ICON[item.status]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-secondary font-medium">
                {item.exerciseName}
              </div>
              <div
                className="text-xs font-semibold"
                style={{ color: REC_TYPE_COLOR[item.recommendation.type] }}
              >
                🎯 {formatGoal(item)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
