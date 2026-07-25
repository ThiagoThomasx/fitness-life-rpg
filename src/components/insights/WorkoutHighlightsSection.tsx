"use client"

import Link from "next/link"
import type { WorkoutHighlight, WorkoutHighlightReason } from "@/lib/workout-detail-engine"

const REASON_LABELS: Record<WorkoutHighlightReason, string> = {
  volume: "Maior volume",
  load: "Maior carga",
  duration: "Maior duração",
  xp: "Maior XP",
  records: "Mais recordes",
}

function formatValue(reason: WorkoutHighlightReason, value: number): string {
  switch (reason) {
    case "volume":
      return `${Math.round(value)}kg`
    case "load":
      return `${value}kg`
    case "duration":
      return `${Math.round(value / 60)} min`
    case "xp":
      return `${Math.floor(value)} XP`
    case "records":
      return `${value} recorde${value !== 1 ? "s" : ""}`
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

type WorkoutHighlightsSectionProps = {
  highlights: WorkoutHighlight[]
}

/**
 * "Sessões Destaque" (Sprint 22 Parte 3A §17): uma sessão por categoria
 * (volume/carga/duração/XP/recordes), cada card abrindo `/historico/[id]`.
 * Reaproveita `getHighlightSessions` (`workout-detail-engine.ts`) — nenhum
 * cálculo aqui, só apresentação.
 */
export function WorkoutHighlightsSection({ highlights }: WorkoutHighlightsSectionProps) {
  if (highlights.length === 0) return null

  return (
    <section className="insights-section" aria-labelledby="workout-highlights-heading">
      <h2 id="workout-highlights-heading" className="insights-section__title">Sessões Destaque</h2>
      <div className="insights-chart-grid">
        {highlights.map((highlight) => (
          <Link
            key={`${highlight.reason}-${highlight.workout.id}`}
            href={`/historico/${highlight.workout.id}`}
            className="card target-card"
            style={{ textAlign: "left", display: "block" }}
          >
            <span className="badge-pill badge-pill--accent">{REASON_LABELS[highlight.reason]}</span>
            <div className="text-sm font-semibold text-primary" style={{ marginTop: "var(--space-1)" }}>
              {highlight.workout.workoutName}
            </div>
            <div className="text-xs text-muted">
              {formatDate(highlight.workout.completedAt)} · {formatValue(highlight.reason, highlight.value)}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
