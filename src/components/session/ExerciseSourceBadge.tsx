"use client"

import type { ActiveExerciseSource } from "@/lib/active-workout"

const LABELS: Record<"planned" | "substitution" | "extra", string> = {
  planned: "Planejado",
  substitution: "Substituição",
  extra: "Extra",
}

type ExerciseSourceBadgeProps = {
  source?: ActiveExerciseSource
}

/** Treino livre não mostra badge (Fase 9) — só sessões com origem no Planner. */
export function ExerciseSourceBadge({ source }: ExerciseSourceBadgeProps) {
  if (!source || source === "free") return null
  return <span className="badge-pill badge-pill--level">{LABELS[source]}</span>
}
