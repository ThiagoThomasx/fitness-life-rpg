"use client"

import type { PlannedPerformedComparison } from "@/lib/planned-performed-comparison"
import type { TrainingWeek } from "@/lib/training-load"

type WorkoutDetailTrainingLoadSectionProps = {
  volumeKg: number
  comparison: PlannedPerformedComparison | null
  trainingWeek: TrainingWeek | null
}

/**
 * Carga da sessão (Sprint 22 Parte 3A §7): planejada × realizada (quando a
 * sessão veio do Planner — via `comparison.sessionSummary`, sem recalcular) e
 * contribuição para o volume da semana (`training-load.ts`).
 */
export function WorkoutDetailTrainingLoadSection({ volumeKg, comparison, trainingWeek }: WorkoutDetailTrainingLoadSectionProps) {
  const plannedVolume = comparison?.sessionSummary.plannedVolume
  const performedVolume = comparison?.sessionSummary.performedVolume
  const weeklyVolume = trainingWeek?.completedVolumeKg ?? 0
  const weeklyContributionPct = weeklyVolume > 0 ? Math.round((volumeKg / weeklyVolume) * 100) : null

  return (
    <section className="card" aria-labelledby="workout-training-load-title">
      <h2 id="workout-training-load-title" className="section-label">Carga de treino</h2>

      <div className="stat-grid stat-grid--3" style={{ marginTop: "var(--space-2)" }}>
        {plannedVolume !== undefined && (
          <div className="stat-cell">
            <div className="stat-cell__label">Volume planejado</div>
            <div className="stat-cell__value">{Math.round(plannedVolume)}kg</div>
          </div>
        )}
        {performedVolume !== undefined && (
          <div className="stat-cell">
            <div className="stat-cell__label">Volume realizado</div>
            <div className="stat-cell__value">{Math.round(performedVolume)}kg</div>
          </div>
        )}
        {weeklyContributionPct !== null && (
          <div className="stat-cell">
            <div className="stat-cell__label">Contribuição semanal</div>
            <div className="stat-cell__value">{weeklyContributionPct}% do volume da semana</div>
          </div>
        )}
      </div>

      {plannedVolume === undefined && weeklyContributionPct === null && (
        <p className="text-xs text-muted" style={{ marginTop: "var(--space-2)" }}>
          Dados insuficientes para calcular carga planejada ou contribuição semanal.
        </p>
      )}
    </section>
  )
}
