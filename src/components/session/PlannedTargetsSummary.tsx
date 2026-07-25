"use client"

import { formatPlannedTargets, type PlannedExerciseTargets } from "@/lib/active-workout"

type PlannedTargetsSummaryProps = {
  targets: PlannedExerciseTargets
}

/** Referência do que foi planejado — nunca os dados realizados (Fase 6/7). */
export function PlannedTargetsSummary({ targets }: PlannedTargetsSummaryProps) {
  return (
    <div className="target-hint">
      <span className="target-hint__goal">📋 Planejado: {formatPlannedTargets(targets)}</span>
    </div>
  )
}
