import type { TrainingCycleSummary } from "@/lib/training-cycle-summary"

interface CycleReviewPromptProps {
  completedWeeks: number
  plannedWeeks: number
  summary: TrainingCycleSummary
  onReview: () => void
  onDismiss: () => void
}

export function CycleReviewPrompt({ completedWeeks, plannedWeeks, summary, onReview, onDismiss }: CycleReviewPromptProps) {
  const improving = summary.exercises.filter((e) => e.status === "improving").length
  const stagnant = summary.exercises.filter((e) => e.status === "stagnant" || e.status === "regressing").length

  return (
    <section className="card" style={{ border: "1px solid var(--color-accent)" }}>
      <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
        Revisão de meio de ciclo disponível
      </h3>
      <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: 6 }}>
        Você está na semana {completedWeeks} de {plannedWeeks}. Veja como o ciclo está evoluindo antes de continuar.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1.25rem", marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
        <span>{summary.totalSessions} sessões</span>
        <span>{Math.round(summary.totalVolumeKg).toLocaleString("pt-BR")} kg de volume</span>
        <span>{summary.totalPrs} PRs</span>
        {summary.averageReadiness !== null && <span>Prontidão média {summary.averageReadiness.toFixed(1)}</span>}
        {improving > 0 && <span>{improving} exercícios evoluindo</span>}
        {stagnant > 0 && <span>{stagnant} exercícios estagnados</span>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: "0.875rem" }}>
        <button className="btn btn--primary" onClick={onReview} style={{ flex: 1 }}>
          Registrar revisão
        </button>
        <button className="btn btn--ghost" onClick={onDismiss} style={{ flex: 1 }}>
          Agora não
        </button>
      </div>
    </section>
  )
}
