"use client"

import Link from "next/link"
import type { WorkoutRecommendation } from "@/lib/recommendations"

export function RecommendationCard({ rec }: { rec: WorkoutRecommendation }) {
  return (
    <Link
      href="/treinos"
      aria-label={`Treino recomendado: ${rec.workout.name}`}
      className="card card--interactive card--accent-top flex items-center gap-4 no-underline"
      style={{ padding: "var(--space-4) var(--space-5)" }}
    >
      <div
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-card text-xl"
        style={{ background: "var(--color-accent-subtle)", border: "1px solid var(--color-accent-border)" }}
        aria-hidden="true"
      >
        {rec.workout.workout_type.icon ?? "🏋️"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="section-label" style={{ marginBottom: "var(--space-1)", color: "var(--color-accent)" }}>
          Recomendado para hoje
        </div>
        <div className="truncate text-sm font-bold text-primary">{rec.workout.name}</div>
        <div className="mt-0.5 text-xs text-muted">
          {rec.reason} · ~{rec.workout.estimated_minutes}min
        </div>
      </div>
      <span className="text-lg" style={{ color: "var(--color-accent)" }} aria-hidden="true">›</span>
    </Link>
  )
}
