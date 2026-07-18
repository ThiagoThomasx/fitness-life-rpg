"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getActiveGoals, type TrainingGoal } from "@/lib/training-goals"
import { calculateGoalProgress, type GoalProgress } from "@/lib/training-goal-progress"

const MAX_GOALS_SHOWN = 3

export function ActiveGoalsCard() {
  const [entries, setEntries] = useState<{ goal: TrainingGoal; progress: GoalProgress }[]>([])
  const router = useRouter()

  useEffect(() => {
    const goals = getActiveGoals().slice(0, MAX_GOALS_SHOWN)
    setEntries(goals.map((goal) => ({ goal, progress: calculateGoalProgress(goal) })))
  }, [])

  if (entries.length === 0) return null

  return (
    <section className="card card--sm" aria-label="Metas em andamento">
      <div className="section-label" style={{ marginBottom: 8 }}>Metas em andamento</div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {entries.map(({ goal, progress }) => {
          const pct = Math.max(0, Math.min(100, progress.progressPercentage ?? 0))
          return (
            <div key={goal.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {goal.title}
                </span>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-muted)", flexShrink: 0 }}>
                  {pct}%
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 9999, background: "var(--color-border-subtle)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 9999, background: "var(--color-accent)", width: `${pct}%` }} />
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: 3 }}>
                {progress.headline}
              </div>
            </div>
          )
        })}
      </div>

      <button
        className="btn btn--ghost"
        onClick={() => router.push("/plano")}
        style={{ width: "100%", marginTop: "0.75rem", fontSize: "0.75rem" }}
      >
        Ver todas as metas
      </button>
    </section>
  )
}
