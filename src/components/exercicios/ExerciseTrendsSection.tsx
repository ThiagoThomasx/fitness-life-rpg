"use client"

import type { ExerciseTrend, ExerciseTrendMetric } from "@/lib/exercise-intelligence"

const METRIC_LABELS: Record<ExerciseTrendMetric, string> = {
  load: "Carga",
  volume: "Volume",
  reps: "Repetições",
  frequency: "Frequência",
}

const DIRECTION_LABELS: Record<ExerciseTrend["direction"], string> = {
  increasing: "Em alta",
  decreasing: "Em queda",
  stable: "Estável",
  insufficient_data: "Dados insuficientes",
}

const DIRECTION_ICON: Record<ExerciseTrend["direction"], string> = {
  increasing: "↑",
  decreasing: "↓",
  stable: "→",
  insufficient_data: "—",
}

/**
 * Card de tendência — nunca comunica direção só por cor/seta (§14): sempre
 * tem o rótulo textual (`DIRECTION_LABELS`) ao lado do ícone. Tom deliberado
 * neutro em queda (§15): "abaixo da janela anterior", nunca linguagem de
 * "piora" ou prescrição.
 */
function TrendCard({ trend }: { trend: ExerciseTrend }) {
  return (
    <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">{METRIC_LABELS[trend.metric]}</span>
        <span className="badge-pill badge-pill--level">
          {DIRECTION_ICON[trend.direction]} {DIRECTION_LABELS[trend.direction]}
        </span>
      </div>
      <p className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>{trend.explanation}</p>
    </div>
  )
}

type ExerciseTrendsSectionProps = {
  trends: ExerciseTrend[]
}

export function ExerciseTrendsSection({ trends }: ExerciseTrendsSectionProps) {
  const withData = trends.filter((t) => t.direction !== "insufficient_data")
  const withoutData = trends.filter((t) => t.direction === "insufficient_data")

  return (
    <section className="card" aria-labelledby="exercise-trends-title">
      <h2 id="exercise-trends-title" className="section-label">Tendências</h2>

      {withData.length === 0 ? (
        <p className="text-xs text-muted" style={{ marginTop: "var(--space-2)" }}>
          Ainda não há dados suficientes para calcular tendências deste exercício.
        </p>
      ) : (
        <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)" }}>
          {withData.map((trend) => (
            <TrendCard key={trend.metric} trend={trend} />
          ))}
        </div>
      )}

      {withoutData.length > 0 && withData.length > 0 && (
        <p className="text-xs text-muted" style={{ marginTop: "var(--space-2)" }}>
          {withoutData.map((t) => METRIC_LABELS[t.metric]).join(", ")}: amostra ainda insuficiente.
        </p>
      )}
    </section>
  )
}
