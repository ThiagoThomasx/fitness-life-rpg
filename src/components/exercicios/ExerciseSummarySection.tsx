"use client"

import type { ExerciseHistorySummary } from "@/lib/exercise-intelligence"
import type { ExerciseDataQuality } from "@/lib/exercise-detail-engine"

const DATA_QUALITY_LABELS: Record<ExerciseDataQuality["status"], string> = {
  no_data: "Sem dados",
  single_execution: "Poucas execuções",
  no_load_recorded: "Sem carga registrada",
  partial_history: "Histórico parcial",
  full_history: "Histórico completo",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

type ExerciseSummarySectionProps = {
  summary: ExerciseHistorySummary
  dataQuality: ExerciseDataQuality
}

/**
 * Resumo executivo (Sprint 22 §10) — só mostra métricas válidas, nunca
 * mistura "execuções" e "treinos" na mesma célula sem diferenciar
 * explicitamente. Data quality (§11) explica, sem tom de alerta, por que
 * algumas seções abaixo podem estar incompletas.
 */
export function ExerciseSummarySection({ summary, dataQuality }: ExerciseSummarySectionProps) {
  const frequency =
    summary.averageDaysBetweenExecutions !== undefined && summary.averageDaysBetweenExecutions > 0
      ? (7 / summary.averageDaysBetweenExecutions).toFixed(1)
      : undefined

  return (
    <section className="card" aria-labelledby="exercise-summary-title">
      <h2 id="exercise-summary-title" className="section-label">Resumo</h2>

      <div className="stat-grid stat-grid--3" style={{ marginTop: "var(--space-2)" }}>
        <div className="stat-cell">
          <div className="stat-cell__label">Execuções</div>
          <div className="stat-cell__value">
            {summary.totalExecutions} em {summary.totalWorkouts} treino{summary.totalWorkouts !== 1 ? "s" : ""}
          </div>
        </div>
        {frequency && (
          <div className="stat-cell">
            <div className="stat-cell__label">Frequência</div>
            <div className="stat-cell__value">{frequency}x/semana</div>
          </div>
        )}
        {summary.totalVolumeKg > 0 && (
          <div className="stat-cell">
            <div className="stat-cell__label">Volume total</div>
            <div className="stat-cell__value">{Math.round(summary.totalVolumeKg)}kg</div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted" style={{ marginTop: "var(--space-2)" }}>
        <span className="badge-pill badge-pill--level" style={{ marginRight: "var(--space-2)" }}>
          {DATA_QUALITY_LABELS[dataQuality.status]}
        </span>
        {dataQuality.explanation}
      </p>

      {(summary.substitutionsIn > 0 || summary.substitutionsOut > 0) && (
        <p className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
          {summary.substitutionsIn > 0 && `Usado como substituto ${summary.substitutionsIn}x`}
          {summary.substitutionsIn > 0 && summary.substitutionsOut > 0 && " · "}
          {summary.substitutionsOut > 0 && `Substituído ${summary.substitutionsOut}x`}
        </p>
      )}

      <p className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
        Primeira execução: {summary.firstPerformedAt ? formatDate(summary.firstPerformedAt) : "—"}
      </p>
    </section>
  )
}
